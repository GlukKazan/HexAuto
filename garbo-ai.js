"use strict";

const _ = require('underscore');

const model = require('./model');
const hints = require('./hints');
const graph = require('./graph');
const utils = require('./utils');
const z = require('./zobrist');

const MAX_PLY = 5; //10;
const MAX_TIMEOUT = 5000;
const NOISE_FACTOR = 0; //5;

const MIN_AVAL = -100000;
const MAX_EVAL = +100000;
const MIN_MATE = MIN_AVAL + 2000;
const MAX_MATE = MAX_EVAL - 2000;

const HASH_SIZE = 1 << 22;
const HASH_MASK = HASH_SIZE - 1;

const FLAG_ALPHA = 1;
const FLAG_BETA  = 2;
const FLAG_EXACT = 3;

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
    this.searchValid = true;
    this.startTime = (new Date()).getTime();
    this.nodeCount = 0;
    this.hashTable = new Array(HASH_SIZE);

    let mt = z.create();
    this.zobristLow = new Array(this.size * this.size);
    this.zobristHigh = new Array(this.size * this.size);
    for (let i = 0; i < this.size * this.size; i++) {
        this.zobristLow[i] = new Array(2);
        this.zobristHigh[i] = new Array(2);
        for (let j = 0; j < 2; j++) {
            this.zobristLow[i][j] = mt.next();
            this.zobristHigh[i][j] = mt.next();
        }
    }
    this.zobristBlackLow = mt.next();
    this.zobristBlackHigh = mt.next();
}

ai.prototype.setHash = function() {
    this.hashKeyLow = 0;
    this.hashKeyHigh = 0;

    for (let pos = 0; pos < this.size * this.size; pos++) {
        if (Math.abs(this.board[pos]) < 0.01) continue;
        this.hashKeyLow ^= this.zobristLow[pos][this.board[pos] > 0.01 ? 1 : 0];
        this.hashKeyHigh ^= this.zobristHigh[pos][this.board[pos] > 0.01 ? 1 : 0];
    }
    if (this.player < -0.01) {
        this.hashKeyLow ^= this.zobristBlackLow;
        this.hashKeyHigh ^= this.zobristBlackHigh;
    }
}

ai.prototype.search = function(maxPly) {
    let alpha = MIN_AVAL;
    let beta = MAX_EVAL;
    
    let bestMove = -1;
    let value;
    
    for (let ply = 1; (ply <= maxPly) && this.searchValid; ply++) {
        let tmp = this.alphaBeta(ply, 0, alpha, beta);
        if (!this.searchValid) break;

        value = tmp;
        if ((value > alpha) && (value < beta)) {
            alpha = value - 500;
            beta = value + 500;

            if (alpha < MIN_AVAL) alpha = MIN_AVAL;
            if (beta > MAX_EVAL) beta = MAX_EVAL;
        } else if (alpha != MIN_AVAL) {
            alpha = MIN_AVAL;
            beta = MAX_EVAL;
            ply--;
        }

        if (!_.isUndefined(this.hashTable[this.hashKeyLow & HASH_MASK])) {
            bestMove = this.hashTable[this.hashKeyLow & HASH_MASK].bestMove;
        }

        const t = (new Date()).getTime();
        console.log(utils.FormatMove(bestMove, this.size) + ', v = ' + value + ', t = ' + (t - this.startTime)/1000 + ', ply = ' + ply);
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

    if ((this.nodeCount & 127) == 127) {
        if ((new Date()).getTime() - this.startTime > MAX_TIMEOUT) {
            // Time cutoff
            this.searchValid = false;
            return beta - 1;
        }
    }
    this.nodeCount++;

    // Mate distance pruning
    if (MIN_AVAL + depth >= beta) return beta;
    if (MAX_EVAL - (depth + 1) < beta) return beta - 1;

    let hashMove = null;
    let hashNode = this.hashTable[this.hashKeyLow & HASH_MASK];
    if (!_.isUndefined(hashMove) && !_.isUndefined(this.hashTable[this.hashKeyLow & HASH_MASK])) {
        hashMove = hashNode.bestMove;
        if (hashNode.hashDepth >= ply) {
            let hashValue = hashNode.value;

            // Fixup mate scores
            if (hashValue >= MAX_MATE) hashValue -= depth;
                else if (hashValue <= MIN_MATE) hashValue += depth;

            if (hashNode.flags == FLAG_EXACT) return hashValue;
            if (hashNode.flags == FLAG_ALPHA && hashValue < beta) return hashValue;
            if (hashNode.flags == FLAG_BETA && hashValue >= beta) return hashValue;
        }
    }

    let moveMade = false;
    let realEval = MIN_AVAL - 1;

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

        if (!this.searchValid) return beta - 1;

        if (value > realEval) {
            if (value >= beta) {
                this.storeHash(value, FLAG_BETA, ply, currentMove, depth);
                return value;
            }
            realEval = value;
            hashMove = currentMove;
        }
    }

    if (!moveMade) return MIN_AVAL + depth;

    this.storeHash(realEval, FLAG_ALPHA, ply, hashMove, depth);
    return realEval;
}

ai.prototype.alphaBeta = function(ply, depth, alpha, beta) {
    if (ply <= 0)return this.qSearch(alpha, beta, 0, depth + 1);
    this.nodeCount++;

    // Mate distance pruning
    let oldAlpha = alpha;
    alpha = alpha < MIN_AVAL + depth ? alpha : MIN_AVAL + depth;
    beta = beta > MAX_EVAL - (depth + 1) ? beta : MAX_EVAL - (depth + 1);
    if (alpha >= beta) return alpha;

    let hashMove = null;
    let hashFlag = FLAG_ALPHA;
    let hashNode = this.hashTable[this.hashKeyLow & HASH_MASK];
    if (!_.isUndefined(hashNode) && (hashNode.lock == this.hashKeyHigh)) {
        hashMove = hashNode.bestMove;
    }

    let moveMade = false;
    let realEval = MIN_AVAL;

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

        if (!this.searchValid) return alpha;

        if (value > realEval) {
            if (value >= beta) {
                this.storeHash(value, FLAG_BETA, ply, currentMove, depth);
                return value;
            }
        }

        if (value > oldAlpha) {
            hashFlag = FLAG_EXACT;
            alpha = value;
        }

        realEval = value;
        hashMove = currentMove;
    }

    if (!moveMade) return MIN_AVAL + depth;

    this.storeHash(realEval, hashFlag, ply, hashMove, depth);
    return realEval;
}

ai.prototype.storeHash = function(value, flags, ply, move, depth) {
	if (value >= MAX_MATE)
		value += depth;
	else if (value <= MIN_MATE)
		value -= depth;
	this.hashTable[this.hashKeyLow & HASH_MASK] = new HashEntry(this.hashKeyHigh, value, flags, ply, move);
}

ai.prototype.makeMove = function(to) {
    const me = (this.player > 0) ? 0 : 1;
    this.hashKeyLow ^= this.zobristLow[to][me];
    this.hashKeyHigh ^= this.zobristHigh[to][me];
    this.hashKeyLow ^= this.zobristBlackLow;
    this.hashKeyHigh ^= this.zobristBlackHigh;
    this.board[to] = this.player;
    this.player = -this.player;
}

ai.prototype.unmakeMove = function(to) {
    this.player = -this.player;
    const me = (this.player > 0) ? 0 : 1;
    this.hashKeyLow ^= this.zobristLow[to][me];
    this.hashKeyHigh ^= this.zobristHigh[to][me];
    this.hashKeyLow ^= this.zobristBlackLow;
    this.hashKeyHigh ^= this.zobristBlackHigh;
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
