"use strict";

const _ = require('underscore');

const model = require('./model');
const forced = require('./forced');
const encoder = require('./encoder');

function ai(size, model) {
    this.size = size;
    this.model = model;
}

ai.prototype.move = async function(board, player, estimate) {
    let b = new Float32Array(this.size * this.size);
    encoder.encode(board, this.size, player, b);

    let w = await model.predict(this.model, b, this.size);
    forced.analyze(board, player, this.size, w.moves);

    let moves = []; let total = 0;
    for (let p = 0; p < this.size * this.size; p++) {
        if (Math.abs(board[p]) < 0.01) {
            moves.push({
                pos: p,
                weight: w.moves[p]
            });
            total += w.moves[p];
        }
    }

    _.each(moves, function(m) {
        m.weight = m.weight / total;
    });
    moves = _.sortBy(moves, function(m) {
        return -m.weight;
    });

    const h = _.random(0, 999);
    let c = 0; let ix = 0;
    for (let i = 0; i < moves.length; i++) {
        c += moves[i].weight * 1000;
        if (c >= h) {
            ix = i;
            break;
        }
    }

    if (!_.isUndefined(estimate) && !_.isUndefined(w.estimate)) {
        estimate.push(w.estimate[0]);
    }
    return moves[ix].pos;
}

function create(size, model) {
    return new ai(size, model);
}

module.exports.create = create;
