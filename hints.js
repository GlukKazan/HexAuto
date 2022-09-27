"use strict";

const _ = require('underscore');

const DEFENCE = 0.9; // Защита от разрезания
const HALF    = 0.5; // Ход на вторую линию
const BETWEEN = 0.4; // Ход между камнями противника
const BLOCK   = 0.4; // Помеха противнику
const BRIDGE  = 0.3; // Построение моста
const CUT     = 0.2; // Попытка разрезания
const NEAR    = 0.1; // Ход вплотную
const DIR     = 0.1; // Ход к своей стороне

const N   = 0;
const NNE = 1;
const NE  = 2;
const NEE = 3;
const E   = 4;
const SE  = 5;
const S   = 6;
const SSW = 7;
const SW  = 8;
const SWW = 9;
const W   = 10;
const NW  = 11;

let dirs = null;

function getDir(size, ix) {
    if (dirs === null) {
        dirs = [
            -size,           // N
            -size * 2 + 1,   // NNE
            -size + 1,       // NE
            -size + 2,       // NEE
            1,               // E
            size + 1,        // SE
            size,            // S
            size * 2 - 1,    // SSW
            size - 1,        // SW
            size - 2,        // SWW
            -1,              // W
            -size - 1        // NW
        ];
    }
    return dirs[ix];
}

function checkNear(board, size, player, pos, dir, moves) {
    const p = pos + getDir(size, dir);
    if (board[p] * player > 0.01) {
        moves[pos] += NEAR;
        if (player > 0.01) {
            if ((dir == N) || (dir == S)) moves[pos] += DIR;
        } else {
            if ((dir == E) || (dir == W)) moves[pos] += DIR;
        }
    }
}

function checkBetween(board, size, player, pos, a, b, moves) {
    const p = pos + getDir(size, a);
    const q = pos + getDir(size, b);
    if ((board[p] * player < -0.01) && (board[q] * player < -0.01)) {
        moves[pos] += BETWEEN;
    }
}

function checkCut(board, size, player, pos, dir, a, b, moves, z) {
    const t = pos + getDir(size, dir);
    const p = pos + getDir(size, a);
    const q = pos + getDir(size, b);
    if ((board[p] * player < -0.01) && (board[q] * player < -0.01)) {
        if (Math.abs(board[t]) < 0.01) {
            moves[pos] += CUT;
        } else {
            if (_.indexOf(z, pos) < 0) z.push(pos);
        }
    }
    if ((board[p] * player > 0.01) && (board[q] * player > 0.01)) {
        if (board[t] * player < -0.01) moves[pos] += DEFENCE;
        if (Math.abs(board[t]) < 0.01) {
            if (_.indexOf(z, pos) < 0) z.push(pos);
        }
    }
}

function checkEdge(board, size, player, pos, dir, a, moves) {
    const t = pos + getDir(size, dir);
    const p = pos + getDir(size, a);
    if ((board[t] * player < -0.01) && (board[p] * player > 0.01)) {
        moves[pos] += DEFENCE;
    }
}

function checkBridge(board, size, player, pos, dir, a, b, moves) {
    const t = pos + getDir(size, dir);
    const p = pos + getDir(size, a);
    const q = pos + getDir(size, b);
    if ((Math.abs(board[p]) < 0.01) && (Math.abs(board[q]) < 0.01)) {
        if (board[t] * player > 0.01) {
            moves[pos] += BRIDGE;
            if (player > 0.01) {
                if ((dir == N) || (dir == S)) moves[pos] += DIR;
            } else {
                if ((dir == E) || (dir == W)) moves[pos] += DIR;
            }
        }
        if (board[t] * player < 0.01) {
            moves[pos] += BLOCK;
            if (player > 0.01) {
                if ((dir == E) || (dir == W)) moves[pos] += DIR;
            } else {
                if ((dir == N) || (dir == S)) moves[pos] += DIR;
            }
        }
    }
}

function checkHalf(board, size, pos, a, b, moves) {
    const p = pos + getDir(size, a);
    const q = pos + getDir(size, b);
    if ((Math.abs(board[p]) < 0.01) && (Math.abs(board[q]) < 0.01)) {
        moves[pos] += HALF;
    }
}

function analyze(board, player, size, moves) {
    const z = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const pos = y * size + x;
            if (Math.abs(board[pos]) > 0.01) {
                z.push(pos);
                continue;
            }
            if (y > 0) {
                checkNear(board, size, player, pos, N, moves);
                if (y < size - 1) checkBetween(board, size, player, pos, N, S, moves);
                if (x < size - 1) {
                    checkNear(board, size, player, pos, NE, moves);
                    if ((y < size - 1) && (x > 0)) checkBetween(board, size, player, pos, NE, SW, moves);
                }
            }
            if (x < size - 1) {
                checkNear(board, size, player, pos, E, moves);
                if (x > 0) checkBetween(board, size, player, pos, E, W, moves);

            }
            if (y < size - 1) {
                checkNear(board, size, player, pos, S, moves);
                if (x > 0) checkNear(board, size, player, pos, SW, moves);
            }
            if (x > 0) checkNear(board, size, player, pos, W, moves);
            if ((y > 0) && (y < size - 1)) {
                if (x < size - 1) checkCut(board, size, player, pos, E, NE, S, moves, z);
                if (x > 0) checkCut(board, size, player, pos, W, SW, N, moves, z);
            }
            if ((x > 0) && (x < size - 1)) {
                if (y < size - 1) checkCut(board, size, player, pos, S, E, SW, moves, z);
                if (y > 0) checkCut(board, size, player, pos, N, W, NE, moves, z);
            }
            if ((y > 0) && (x < size - 1)) checkCut(board, size, player, pos, NE, N, E, moves, z);
            if ((y < size - 1) && (x > 0)) checkCut(board, size, player, pos, SW, S, W, moves, z);
            if ((y > 1) && (x < size - 1)) checkBridge(board, size, player, pos, NNE, N, NE, moves);
            if ((y > 0) && (x < size - 2)) checkBridge(board, size, player, pos, NEE, NE, N, moves);
            if ((y < size - 2) && (x > 0)) checkBridge(board, size, player, pos, SSW, S, SW, moves);
            if ((y < size - 1) && (x > 1)) checkBridge(board, size, player, pos, SWW, SW, W, moves);
            if ((y > 0) && (x > 0)) checkBridge(board, size, player, pos, NW, N, W, moves);
            if ((y < size - 1) && (x < size - 1)) checkBridge(board, size, player, pos, SE, S, E, moves);
            if (player > 0) {
                if (y == 0) {
                    if (x < size - 1) checkEdge(board, size, player, pos, E, S, moves);
                    if (x > 0) checkEdge(board, size, player, pos, W, SW, moves);
                }
                if (y == size - 1) {
                    if (x < size - 1) checkEdge(board, size, player, pos, E, NE, moves);
                    if (x > 0) checkEdge(board, size, player, pos, W, N, moves);
                }
                if ((y == 1) && (x < size - 1)) checkHalf(board, size, pos, N, NE, moves);
                if ((y == size - 2) && (x > 0)) checkHalf(board, size, pos, S, SW, moves);
            } else {
                if (x == 0) {
                    if (y > 0) checkEdge(board, size, player, pos, N, NE, moves);
                    if (y < size - 1) checkEdge(board, size, player, pos, S, E, moves);
                }
                if (x == size - 1) {
                    if (y > 0) checkEdge(board, size, player, pos, N, W, moves);
                    if (y < size - 1) checkEdge(board, size, player, pos, S, SW, moves);
                }

                if ((x == 1) && (y < size - 1)) checkHalf(board, size, pos, W, SW, moves);
                if ((x == size - 2) && (y > 0)) checkHalf(board, size, pos, E, NE, moves);
            }
        }
    }
    _.each(z, function(pos) {
        moves[pos] = 0;
    });
}

module.exports.analyze = analyze;
