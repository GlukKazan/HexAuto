"use strict";

const model = require('./model');
const garbo = require('./garbo-ai');
const utils = require('./utils');

const SIZE   = 11;
const URL = 'https://games.dtco.ru/hex-' + SIZE + '/model.json';
const FEN    = '92/92/92/7A3/5A2A2/6a4/4a6/92/92/92/92';
const PLAYER = -1;

async function run() {
    const m = await model.load(URL);
    const ai = garbo.create(SIZE, m);

    const board = new Float32Array(SIZE * SIZE);
    utils.InitializeFromFen(FEN, board, SIZE, PLAYER);
//  utils.dump(board, SIZE, 0);

    const moves = new Float32Array(SIZE * SIZE);
    const r = await ai.move(board, PLAYER);
    moves[r] = 1;
    console.log('Move: ' + utils.FormatMove(r, SIZE));
    utils.dump(board, SIZE, 0, moves);
}

(async () => { await run(); })();
