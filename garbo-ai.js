"use strict";

const model = require('./model');
const hints = require('./forced');
const graph = require('./graph');
const z = require('./zobrist');
const utils = require('./utils');

const MAX_PLY = 10;
const NOISE_FACTOR = 5;
const g_timeout = 3000;

const minEval = -100000;
const maxEval = +100000;
const minMateBuffer = minEval + 2000;
const maxMateBuffer = maxEval - 2000;

const g_hashSize = 1 << 22;
const g_hashMask = g_hashSize - 1;

const hashflagAlpha = 1;
const hashflagBeta  = 2;
const hashflagExact = 3;

let g_startTime;
let g_nodeCount;
let g_qNodeCount;
let g_searchValid;
let g_globalPly = 0;

let g_hashTable;
let g_zobristLow;
let g_zobristHigh;
let g_zobristBlackLow;
let g_zobristBlackHigh;

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
    // TODO: init

    return this.search(MAX_PLY);
}

ai.prototype.search = function(maxPly) {
    let alpha = minEval;
    let beta = maxEval;
    
	g_globalPly++;
    g_nodeCount = 0;
    g_qNodeCount = 0;
    g_searchValid = true;

    let bestMove = -1;
    let value;
    
    g_startTime = (new Date()).getTime();
    for (let i = 1; i <= maxPly && g_searchValid; i++) {
        let tmp = AlphaBeta(i, 0, alpha, beta);
        if (!g_searchValid) break;

        value = tmp;
        if (value > alpha && value < beta) {
            alpha = value - 500;
            beta = value + 500;

            if (alpha < minEval) alpha = minEval;
            if (beta > maxEval) beta = maxEval;
        } else if (alpha != minEval) {
            alpha = minEval;
            beta = maxEval;
            i--;
        }

        if (g_hashTable[g_hashKeyLow & g_hashMask] != null) {
            bestMove = g_hashTable[g_hashKeyLow & g_hashMask].bestMove;
        }
        console.log(utils.FormatMove(bestMove, this.size) + ', v = ' + value + ', t = ' + time + ', ply = ' + ply);
    }
    return bestMove;
}

ai.prototype.alphaBeta = function(ply, depth, alpha, beta) {
    if (ply <= 0) {
        return graph.estimate(this.board, this.player);
    }
    g_nodeCount++;

    // Mate distance pruning
    let oldAlpha = alpha;
    alpha = alpha < minEval + depth ? alpha : minEval + depth;
    beta = beta > maxEval - (depth + 1) ? beta : maxEval - (depth + 1);
    if (alpha >= beta) return alpha;

    let hashMove = null;
    let hashFlag = hashflagAlpha;
    let hashNode = g_hashTable[g_hashKeyLow & g_hashMask];
    if (hashNode != null && hashNode.lock == g_hashKeyHigh) {
        hashMove = hashNode.bestMove;
    }

    let moveMade = false;
    let realEval = minEval;

    let movePicker = new MovePicker(this.board, this.player, hashMove, depth);

    for (;;) {
        let currentMove = movePicker.nextMove();
        if (currentMove == 0) break;

        let plyToSearch = ply - 1;
        this.makeMove(currentMove);

        const w = 0;
        if (NOISE_FACTOR && (depth == 0)) {
            w = _.random(0, NOISE_FACTOR);
        }
        let value = w - this.alphaBeta(plyToSearch, depth + 1, -beta, -alpha);

        moveMade = true;
        this.unmakeMove(currentMove);

        if (!g_searchValid) return alpha;

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
	g_hashTable[g_hashKeyLow & g_hashMask] = new HashEntry(g_hashKeyHigh, value, flags, ply, move);
}

ai.prototype.makeMove = function(move) {
    // TODO:

}

ai.prototype.unmakeMove = function(move) {
    // TODO:

}

function MovePicker(board, player, hashMove, depth) {
    // TODO: Goal

}

function create(size, model) {
    return new ai(size, model);
}

module.exports.create = create;
