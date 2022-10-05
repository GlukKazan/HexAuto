"use strict";

const _ = require('underscore');

const model = require('./model');
const forced = require('./forced');
const hints = require('./hints');
const utils = require('./utils');

function ai(size, model, mode) {
    this.size = size;
    this.model = model;
    this.mode = mode;
}

ai.prototype.move = async function(board, player, estimate) {
    let b = new Float32Array(this.size * this.size);
    for (let pos = 0; pos < this.size * this.size; pos++) {
        b[pos] = board[pos] * player;
    }

    let m = utils.getMoves(b, this.size);
    if (m.length == this.size * this.size) {
        const ix = _.random(0, m.length - 1);
        return m[ix];
    }

//  utils.dump(board, this.size, 0);
    let p = await model.predict(this.model, b, this.size);
//  utils.dump(board, this.size, 0, p.moves);
    if (this.mode == 1) {
        forced.analyze(board, player, this.size, p.moves);
    } else {
        hints.analyze(board, player, this.size, p.moves);
    }
//  utils.dump(board, this.size, 0, p);

    let r = [];
    for (let i = 0; i < this.size * this.size; i++) {
        if (_.indexOf(m, i) < 0) continue;
        r.push({
            pos: i,
            weight: p.moves[i]
        });
    }

    r = _.sortBy(r, function(x) {
        return -x.weight;
    });

    if (r.length == 0) return null;

    if (!_.isUndefined(estimate) && !_.isUndefined(p.estimate)) {
        estimate.push(p.estimate[0]);
    }
    return r[0].pos;
}

function create(size, model) {
    return new ai(size, model);
}

module.exports.create = create;
