"use strict";

const utils = require('./utils');

const SIZE   = 11;
const FEN    = '4C1c/3AbE/1aAaAaBa2/1Aa2bA3/1aDaA3/1dAc2/2AaAa1Aa2/1b1AaAa1a1/Ba1BaA2A/bA1b2A2/1aAaB5';
const PLAYER = -1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
    utils.dump(board, SIZE, 0);

    const g = utils.checkGoal(board, -PLAYER, SIZE);
    if (g !== null) {
        console.log('Goal: ' + g);
    }
    const fen = utils.getFen(board, SIZE, 1);
    console.log('FEN: ' + fen);
}

(async () => { await run(); })();
