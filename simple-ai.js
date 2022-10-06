"use strict";

const _ = require('underscore');

const model = require('./model');
const forced = require('./forced');
const encoder = require('./encoder');
const utils = require('./utils');

function ai(size, model, planes) {
    this.size = size;
    this.model = model;
    this.planes = planes;
}

ai.prototype.move = async function(board, player, estimate) {
    let b = new Float32Array(this.size * this.size * this.planes);
    encoder.encode(board, this.size, player, this.planes, b);

    let m = utils.getMoves(board, this.size);
    if (m.length == this.size * this.size) {
        const ix = _.random(0, m.length - 1);
        return m[ix];
    }

//  utils.dump(board, this.size, 0);
    let p = await model.predictEx(this.model, b, this.size, this.planes);
//  utils.dump(board, this.size, 0, p.moves);
    forced.analyze(board, player, this.size, p.moves);
//  utils.dump(board, this.size, 0, p.moves);

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

function create(size, model, planes) {
    return new ai(size, model, planes);
}

module.exports.create = create;
