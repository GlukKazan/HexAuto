"use strict";

const ai = require('./sample-ai');
const mcts = require('./mcts-ai');
const model = require('./model');
const utils = require('./utils');

const DO_TOTAL = 10;
const SIZE  = 11;
const URL_A = 'https://games.dtco.ru/hex-a/model.json';
const URL_B = 'https://games.dtco.ru/hex-b/model.json';

var winston = require('winston');
require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(
        info => `${info.level}: ${info.timestamp} - ${info.message}`
    )
);

var transport = new winston.transports.DailyRotateFile({
    dirname: '',
    filename: 'hexbot-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

var logger = winston.createLogger({
    format: logFormat,
    transports: [
      transport
    ]
});

function estimate(v) {
    let r = '';
    if (v < 0) {
        r = '-';
        v = -v;
    }
    for (let i = 0; i < 2; i++) {
        if (Math.abs(v) < 0.01) break;
        v = v * 10;
        r = r + (v | 0);
    }
    return r;
}

async function run() {
    const model_a = await model.load(URL_A);
    const model_b = await model.load(URL_B);

    const b = ai.create(SIZE, model_a, 1);
    const a = mcts.create(SIZE, model_b, 2);

    const t0 = Date.now();
    let w = 0; let l = 0;
    for (let i = 0; i < DO_TOTAL; i++) {
        const board = new Float32Array(SIZE * SIZE);
        let r = '';

        for (let j = 0; j < (SIZE * SIZE) / 2; j++) {
            let player = 1;
            let e = [];
            let m = await a.move(board, player, e);
            if (m === null) break;
            if (e.length > 0) {
                r = r + estimate(e[0]);
            }
            r = r + utils.FormatMove(m, SIZE);
            board[m] = player;
            let g = utils.checkGoal(board, player, SIZE);
            if (g !== null) {
                if (g > 0) {
                    w++;
                    console.log('Won [1]: ' + r);
                    logger.info('Won [1]: ' + r);
                } else {
                    l++;
                    console.log('Lose [1]: ' + r);
                    logger.info('Lose [1]: ' + r);
                }
                utils.dump(board, SIZE, 0);
                const fen = utils.getFen(board, SIZE, 1);
                console.log('FEN: ' + fen);
                logger.info('FEN: ' + fen);
                break;
            }

            player = -1;
            e = [];
            m = await b.move(board, player, e);
            if (m === null) break;
            if (e.length > 0) {
                r = r + estimate(e[0]);
            }
            r = r + utils.FormatMove(m, SIZE);
            board[m] = player;
            g = utils.checkGoal(board, player, SIZE);
            if (g !== null) {
                if (g < 0) {
                    w++;
                    console.log('Won [2]:' + r);
                    logger.info('Won [2]:' + r);
                } else {
                    l++;
                    console.log('Lose [2]:' + r);
                    logger.info('Lose [2]:' + r);
                }
                utils.dump(board, SIZE, 0);
                const fen = utils.getFen(board, SIZE, 1);
                console.log('FEN: ' + fen);
                logger.info('FEN: ' + fen);
                break;
            }
        }
    }
    const t1 = Date.now();

    console.log('Total: ' + w + '/' + l + ' (' + (+w + +l) + '), time = ' + (t1 - t0) / 1000);
    logger.info('Total: ' + w + '/' + l + ' (' + (+w + +l) + '), time = ' + (t1 - t0) / 1000);
}

(async () => { await run(); })();
