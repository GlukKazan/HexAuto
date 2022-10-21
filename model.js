"use strict";

const tf = require('@tensorflow/tfjs');
const _ = require('underscore');

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
    let m = null;
    let e = [0];
    if (_.isArray(ys)) {
        m = await ys[0].data();
        e = await ys[1].data();
        ys[0].dispose();
        ys[1].dispose();
    } else {
        m = await ys.data();
        ys.dispose();
    }
    xs.dispose();
    return {
        moves: m,
        estimate: e
    };
}

module.exports.load = load;
module.exports.predict = predict;
