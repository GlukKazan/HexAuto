"use strict";

const ai = require('./simple-ai');
const model = require('./model');
const utils = require('./utils');

const DO_TOTAL = 100;
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

async function run() {
    const model_a = await model.load(URL_A);
    const model_b = await model.load(URL_B);

    const a = ai.create(SIZE, model_a, 1);
    const b = ai.create(SIZE, model_b, 1);

    const t0 = Date.now();
    let w = 0; let l = 0;
    for (let i = 0; i < DO_TOTAL; i++) {
        const board = new Float32Array(SIZE * SIZE);
        let r = '';

        for (let j = 0; j < (SIZE * SIZE) / 2; j++) {
            let player = 1;
            let m = await a.move(board, player);
            if (m === null) break;
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
            m = await b.move(board, player);
            if (m === null) break;
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
