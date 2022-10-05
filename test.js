"use strict";

const model = require('./model');
const utils = require('./utils');

const SIZE   = 11;
const URL = 'https://games.dtco.ru/hex-1-11/model.json';
const FEN    = '92/92/A91/92/7a3/5aB3/7A3/7a3/4b5/6A4/92';
const PLAYER = 1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);

    let b = new Float32Array(SIZE * SIZE);
    for (let pos = 0; pos < SIZE * SIZE; pos++) {
        b[pos] = board[pos] * PLAYER;
    }

    const m = await model.load(URL);
    const p = await model.predictEx(m, b, SIZE);
    utils.dump(board, SIZE, 0, p.moves);
    console.log('Estimate: ' + p.estimate);
}

(async () => { await run(); })();
