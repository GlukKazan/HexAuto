"use strict";

const graph = require('./graph');
const utils = require('./utils');

const SIZE   = 11;
const FEN    = '92/92/1a9/92/1AaAaAb3/1AaAbA4/1AaA2A4/1Ac6/1AaA7/92/A91';
const PLAYER = 1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
    utils.dump(board, SIZE, 0);
    const e = graph.estimate(board, PLAYER);
    console.log('Estimate: ' + e);
}

(async () => { await run(); })();
