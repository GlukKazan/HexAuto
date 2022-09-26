"use strict";

const model = require('./model');
const hints = require('./forced');
const graph = require('./graph');
const z = require('./zobrist');
const utils = require('./utils');

const MAX_PLY = 10;
const NOISE_FACTOR = 0; //5;
const g_timeout = 5000;

const minEval = -100000;
const maxEval = +100000;
const minMateBuffer = minEval + 2000;
const maxMateBuffer = maxEval - 2000;

const g_hashSize = 1 << 22;
const g_hashMask = g_hashSize - 1;

const hashflagAlpha = 1;
const hashflagBeta  = 2;
const hashflagExact = 3;

function HashEntry(lock, value, flags, hashDepth, bestMove) {
    this.lock = lock;
    this.value = value;
    this.flags = flags;
    this.hashDepth = hashDepth;
    this.bestMove = bestMove;
}

function ai(size, model) {
    this.size = size;
    this.model = model;
}

ai.prototype.move = async function(board, player) {
    this.board = board;
    this.player = player;

    let b = new Float32Array(this.size * this.size);
    for (let pos = 0; pos < this.size * this.size; pos++) {
        b[pos] = board[pos] * player;
    }
    this.hints = await model.predict(this.model, b, this.size);
    hints.analyze(board, player, this.size, this.hints);
    
    this.resetGame();
    this.setHash();

    return this.search(MAX_PLY);
}

ai.prototype.resetGame = function() {
    this.g_searchValid = true;
    this.g_startTime = (new Date()).getTime();
    this.g_nodeCount = 0;
    this.g_hashTable = new Array(g_hashSize);

    let mt = z.create();
    this.g_zobristLow = new Array(this.size * this.size);
    this.g_zobristHigh = new Array(this.size * this.size);
    for (let i = 0; i < this.size * this.size; i++) {
        this.g_zobristLow[i] = new Array(2);
        this.g_zobristHigh[i] = new Array(2);
        for (let j = 0; j < 2; j++) {
            this.g_zobristLow[i][j] = mt.next();
            this.g_zobristHigh[i][j] = mt.next();
        }
    }
    this.g_zobristBlackLow = mt.next();
    this.g_zobristBlackHigh = mt.next();
}

ai.prototype.setHash = function() {
    this.g_hashKeyLow = 0;
    this.g_hashKeyHigh = 0;

    for (let pos = 0; pos < this.size * this.size; pos++) {
        if (Math.abs(this.board[pos]) < 0.01) continue;
        this.hashKeyLow ^= this.g_zobristLow[pos][this.board[pos] > 0.01 ? 1 : 0];
        this.hashKeyHigh ^= this.g_zobristHigh[pos][this.board[pos] > 0.01 ? 1 : 0];
    }
    if (this.player < -0.01) {
        this.hashKeyLow ^= this.g_zobristBlackLow;
        this.hashKeyHigh ^= this.g_zobristBlackHigh;
    }
}

ai.prototype.search = function(maxPly) {
    let alpha = minEval;
    let beta = maxEval;
    
    let bestMove = -1;
    let value;
    
    for (let ply = 1; (ply <= maxPly) && this.g_searchValid; ply++) {
        let tmp = this.alphaBeta(ply, 0, alpha, beta);
        if (!this.g_searchValid) break;

        value = tmp;
        if ((value > alpha) && (value < beta)) {
            alpha = value - 500;
            beta = value + 500;

            if (alpha < minEval) alpha = minEval;
            if (beta > maxEval) beta = maxEval;
        } else if (alpha != minEval) {
            alpha = minEval;
            beta = maxEval;
            ply--;
        }

        if (!_.isUndefined(this.g_hashTable[this.g_hashKeyLow & g_hashMask])) {
            bestMove = this.g_hashTable[this.g_hashKeyLow & g_hashMask].bestMove;
        }
        console.log(utils.FormatMove(bestMove, this.size) + ', v = ' + value + ', t = ' + time + ', ply = ' + ply);
    }
    return bestMove;
}

ai.prototype.qSearch = function(alpha, beta, ply, depth) {
    let realEval = graph.estimate(this.board, this.player);
    if (depth % 2 == 0) return realEval;

    if (realEval >= beta) return realEval;
    if (realEval > alpha) alpha = realEval;

    let movePicker = new MovePicker(this, depth, true);
    for (;;) {
        let currentMove = movePicker.nextMove();
        if (currentMove === null) break;
        this.makeMove(currentMove);
        let value = -this.qSearch(-beta, -alpha, ply - 1, depth + 1);
        this.unmakeMove(currentMove);
        if (value > realEval) {
            if (value >= beta) return value;
            if (value > alpha) alpha = value;
            realEval = value;
        }
    }
    return realEval;
}

ai.prototype.allCutNode = function(ply, depth, beta) {
    if (ply <= 0) return this.qSearch(beta - 1, beta, 0, depth + 1);

    if ((this.g_nodeCount & 127) == 127) {
        if ((new Date()).getTime() - this.g_startTime > g_timeout) {
            // Time cutoff
            this.g_searchValid = false;
            return beta - 1;
        }
    }
    this.g_nodeCount++;

    // Mate distance pruning
    if (minEval + depth >= beta) return beta;
    if (maxEval - (depth + 1) < beta) return beta - 1;

    let hashMove = null;
    let hashNode = this.g_hashTable[this.g_hashKeyLow & g_hashMask];
    if (!_.isUndefined(hashMove) && !_.isUndefined(this.g_hashTable[this.g_hashKeyLow & g_hashMask])) {
        hashMove = hashNode.bestMove;
        if (hashNode.hashDepth >= ply) {
            let hashValue = hashNode.value;

            // Fixup mate scores
            if (hashValue >= maxMateBuffer) hashValue -= depth;
                else if (hashValue <= minMateBuffer) hashValue += depth;

            if (hashNode.flags == hashflagExact) return hashValue;
            if (hashNode.flags == hashflagAlpha && hashValue < beta) return hashValue;
            if (hashNode.flags == hashflagBeta && hashValue >= beta) return hashValue;
        }
    }

    let moveMade = false;
    let realEval = minEval - 1;

    let movePicker = new MovePicker(this, depth, false, hashMove);
    for (;;) {
        let currentMove = movePicker.nextMove();
        if (currentMove === null) break;

        let plyToSearch = ply - 1;
        this.makeMove(currentMove);

        let value;
        let doFullSearch = true;

        let reduced = plyToSearch - (movePicker.atMove > 14 ? 2 : 1);
        // Late move reductions
        if ((movePicker.atMove > 5) && (ply >= 3)) {
            value = -this.allCutNode(reduced, depth + 1, -(beta - 1));
            doFullSearch = (value >= beta);
        }

        if (doFullSearch) {
            value = -this.allCutNode(plyToSearch, depth + 1, -(beta  - 1));
        }

        moveMade = true;
        this.unmakeMove(currentMove);

        if (!this.g_searchValid) return beta - 1;

        if (value > realEval) {
            if (value >= beta) {
                this.storeHash(value, hashflagBeta, ply, currentMove, depth);
                return value;
            }
            realEval = value;
            hashMove = currentMove;
        }
    }

    if (!moveMade) return minEval + depth;

    this.storeHash(realEval, hashflagAlpha, ply, hashMove, depth);
    return realEval;
}

ai.prototype.alphaBeta = function(ply, depth, alpha, beta) {
    if (ply <= 0)return this.qSearch(alpha, beta, 0, depth + 1);
    this.g_nodeCount++;

    // Mate distance pruning
    let oldAlpha = alpha;
    alpha = alpha < minEval + depth ? alpha : minEval + depth;
    beta = beta > maxEval - (depth + 1) ? beta : maxEval - (depth + 1);
    if (alpha >= beta) return alpha;

    let hashMove = null;
    let hashFlag = hashflagAlpha;
    let hashNode = this.g_hashTable[this.g_hashKeyLow & g_hashMask];
    if (!_.isUndefined(hashNode) && (hashNode.lock == this.g_hashKeyHigh)) {
        hashMove = hashNode.bestMove;
    }

    let moveMade = false;
    let realEval = minEval;

    let movePicker = new MovePicker(this, depth, false, hashMove);

    for (;;) {
        let currentMove = movePicker.nextMove();
        if (currentMove === null) break;

        let plyToSearch = ply - 1;
        this.makeMove(currentMove);

        let w = 0;
        if (NOISE_FACTOR && (depth == 0)) {
            w = _.random(0, NOISE_FACTOR);
        }

        let value;
        if (moveMade) {
            value = w - this.allCutNode(plyToSearch, depth + 1, -alpha);
            if (value > alpha) {
                value = w - this.alphaBeta(plyToSearch, depth + 1, -beta, -alpha);
            }
        } else {
            value = w - this.alphaBeta(plyToSearch, depth + 1, -beta, -alpha);
        }

        moveMade = true;
        this.unmakeMove(currentMove);

        if (!this.g_searchValid) return alpha;

        if (value > realEval) {
            if (value >= beta) {
                this.storeHash(value, hashflagBeta, ply, currentMove, depth);
                return value;
            }
        }

        if (value > oldAlpha) {
            hashFlag = hashflagExact;
            alpha = value;
        }

        realEval = value;
        hashMove = currentMove;
    }

    if (!moveMade) return minEval + depth;

    this.storeHash(realEval, hashFlag, ply, hashMove, depth);
    return realEval;
}

ai.prototype.storeHash = function(value, flags, ply, move, depth) {
	if (value >= maxMateBuffer)
		value += depth;
	else if (value <= minMateBuffer)
		value -= depth;
	this.g_hashTable[this.g_hashKeyLow & g_hashMask] = new HashEntry(this.g_hashKeyHigh, value, flags, ply, move);
}

ai.prototype.makeMove = function(to) {
    const me = (this.player > 0) ? 0 : 1;
    this.g_hashKeyLow ^= this.g_zobristLow[to][me];
    this.g_hashKeyHigh ^= this.g_zobristHigh[to][me];
    this.g_hashKeyLow ^= this.g_zobristBlackLow;
    this.g_hashKeyHigh ^= this.g_zobristBlackHigh;
    this.board[to] = this.player;
    this.player = -this.player;
}

ai.prototype.unmakeMove = function(to) {
    this.player = -this.player;
    const me = (this.player > 0) ? 0 : 1;
    this.g_hashKeyLow ^= this.g_zobristLow[to][me];
    this.g_hashKeyHigh ^= this.g_zobristHigh[to][me];
    this.g_hashKeyLow ^= this.g_zobristBlackLow;
    this.g_hashKeyHigh ^= this.g_zobristBlackHigh;
    this.board[to] = 0;
}

function MovePicker(ai, depth, isForced, hashMove) {
    let h = ai.hints;
    if (depth > 0) {
        h = new Float32Array(ai.size * ai.size);
        hints.analyze(ai.board, ai.player, ai.size, h);
    }
    let moves = [];
    for (let pos = 0; pos < ai.size * ai.size; pos++) {
        if (Math.abs(ai.board[pos]) > 0.01) continue;
        if (isForced && (Math.abs(h[pos]) < 0.01)) continue;
        moves.push(pos);
    }
    if (_.isUndefined(hashMove)) {
        h[hashMove] = 1;
    }
    this.moves = _.sortBy(moves, function(m) {
        return -h[m];
    });
    this.atMove = -1;

    this.nextMove = function () {
        this.atMove++;
        if (this.atMove >= this.moves.length) return null;
        return this.moves[this.atMove];
    }
}

function create(size, model) {
    return new ai(size, model);
}

module.exports.create = create;
