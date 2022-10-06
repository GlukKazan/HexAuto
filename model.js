"use strict";

const tf = require('@tensorflow/tfjs');

let isReady = false;

async function init() {
    await tf.ready();
    console.log(tf.getBackend());
}

async function load(url) {
    if (!isReady) {
        await init();
        isReady = true;
    }
    const model = await tf.loadLayersModel(url);
    return model;
}

async function predict(model, board, size) {
    const shape = [1, 1, size, size];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const m = await ys.data();
    xs.dispose();
    ys.dispose();
    return {
        moves: m
    };
}

async function predictEx(model, board, size, planes) {
    const shape = [1, planes, size, size];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const m = await ys[0].data();
    const e = await ys[1].data();
    xs.dispose();
    ys[0].dispose();
    ys[1].dispose();
    return {
        moves: m,
        estimate: e
    };
}

module.exports.load = load;
module.exports.predict = predict;
module.exports.predictEx = predictEx;
