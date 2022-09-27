"use strict";

const _ = require('underscore');

const model = require('./model');
const forced = require('./forced');
const hints = require('./hints');

function ai(size, model, mode) {
    this.size = size;
    this.model = model;
    this.mode = mode;
}

ai.prototype.move = async function(board, player, f) {
    let b = new Float32Array(this.size * this.size);
    for (let pos = 0; pos < this.size * this.size; pos++) {
        b[pos] = board[pos] * player;
    }

    let w = await model.predict(this.model, b, this.size);
    if (this.mode == 1) {
        forced.analyze(board, player, this.size, w);
    } else {
        hints.analyze(board, player, this.size, w);
    }

    let moves = []; let total = 0;
    for (let p = 0; p < this.size * this.size; p++) {
        if (Math.abs(board[p]) < 0.01) {
            moves.push({
                pos: p,
                weight: w[p]
            });
            total += w[p];
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

    return moves[ix].pos;
}

function create(size, model) {
    return new ai(size, model);
}

module.exports.create = create;
