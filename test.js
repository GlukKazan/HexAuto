"use strict";

const graph = require('./graph');
const utils = require('./utils');

const SIZE   = 11;
const FEN    = '92/4A4A1/3c3A1/3A2aA3/4A1b3/5A2a2/6a4/4A1A4/92/92/92';
const PLAYER = 1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
    utils.dump(board, SIZE, 0);
    const e = graph.estimate(board, PLAYER);
    console.log('Estimate: ' + e);
}

(async () => { await run(); })();
