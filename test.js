"use strict";

const model = require('./model');
const encoder = require('./encoder');
const utils = require('./utils');

const SIZE   = 11;
const PLANES = 2;
const URL = 'https://games.dtco.ru/hex-b/model.json';
const FEN    = '92/92/A91/92/7a3/5aB3/7A3/7a3/4b5/6A4/92';
const PLAYER = 1;

async function run() {
    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE);

    let b = new Float32Array(SIZE * SIZE * PLANES);
    encoder.encode(board, SIZE, PLAYER, PLANES, b);

    const m = await model.load(URL);
    const p = await model.predict(m, b, SIZE, PLANES);
    utils.dump(board, SIZE, p.moves);
    console.log('Estimate: ' + p.estimate);
}

(async () => { await run(); })();
