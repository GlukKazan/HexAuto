"use strict";

const graph = require('./graph');
const utils = require('./utils');

const SIZE   = 11;
const FEN    = '3A7/92/2a2A5/7A1Aa/A2AaAbAaA/4bAbA1/1Ab7/92/92/92/2A8';
const PLAYER = 1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
    utils.dump(board, SIZE, 0);
    const e = graph.estimate(board, PLAYER);
    console.log('Estimate: ' + e);
}

(async () => { await run(); })();
