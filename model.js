"use strict";

const tf = require('@tensorflow/tfjs');

let model = null;

async function init() {
    await tf.ready();
    console.log(tf.getBackend());
}

async function load(url) {
    if (model === null) {
        await init();
        model = await tf.loadLayersModel(url);
    }
    return model;
}

async function predict(model, board, size) {
    const shape = [1, 1, size, size];
    const xs = tf.tensor4d(board, shape, 'float32');
    const ys = await model.predict(xs);
    const moves = await ys.data();
    xs.dispose();
    ys.dispose();
    return moves;
}

module.exports.load = load;
module.exports.predict = predict;
