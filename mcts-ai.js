"use strict";

const _ = require('underscore');

const model = require('./model');
const hints = require('./forced');
const encoder = require('./encoder');
const utils = require('./utils');

const C = 1.5;
const D = 30.5;

const MAX_TIME = 5000;
const DO_TOTAL = 10000;

function uct(parent, node) {
    return (node.w / node.n) + C * Math.sqrt(Math.log(parent.n) / node.n) + D * (node.p / node.n);
}

function Node(avail) {
    this.avail = avail;
    this.n = 0;
    this.childs = [];
}

Node.prototype.getUCT = function(board, size, probs) {
    const m = getAvail(this);
    if (m !== null) {
        const moves = utils.getMoves(board, size, m);
        const h = hints.analyze(board, -1, size, new Float32Array(size * size));
        const r = new Child(m, moves, h, probs[m]);
        this.childs.push(r);
        return r;
    }
    if (this.childs.length == 0) return null;
    return _.max(this.childs, function(node) {
        return uct(this, node);
    }, this);
}

function Child(move, prior, avail, p) {
    this.prior = prior;
    this.move  = move;
    this.avail = avail;
    this.n = 1;
    this.w = 0;
    this.p = p;
    this.moves = [];
}

Child.prototype.getRandom = function() {
    let m = null;
    if (this.prior.length > 0) {
        m = this.prior.pop();
    } else {
        m = getAvail(this);
    }
    if (m !== null) {
        this.moves.push(m);
        return m;
    }
    if (this.moves.length == 0) return null;
    if (this.moves.length == 1) return this.moves[0];
    const ix = _.random(0, this.moves.length - 1);
    return this.moves[ix];
}

function getAvail(node) {
    if (node.avail.length == 0) return null;
    if (node.avail.length == 1) {
        const r = node.avail[0];
        node.avail = [];
        return r;
    }
    const ix = _.random(0, node.avail.length - 1);
    const r = node.avail[ix];
    node.avail = _.without(node.avail, r);
    return r;
}

function simulate(board, player, size, move) {
    let undo = [];
    if (move !== null) {
        undo.push(move);
        board[move] = -1;
        let p = player;
        for (let i = 0; i < size * size; i++) {
            let moves = hints.analyze(board, p, size, new Float32Array(size * size));
            if (moves.length == 0) {
                moves = utils.getMoves(board, size);
            }
            if (moves.length == 0) break;
            let ix = 0;
            if (moves.length > 1) ix = _.random(0, moves.length - 1);
            const m = moves[ix];
            undo.push(m);
            board[m] = p;
//          utils.dump(board, size);
            p = -p;
        }
    }
    const g = utils.checkGoal(board, size);
    _.each(undo, function(p) {
        board[p] = 0;
    });
    return g;
}

function ai(size, model, planes) {
    this.size = size;
    this.model = model;
    this.planes = planes;
}

ai.prototype.move = async function(inp, player, estimate, logger) {
    const t0 = Date.now();
    let b = new Float32Array(this.size * this.size * this.planes);
    encoder.encode(inp, this.size, player, this.planes, b);
    let board = new Float32Array(this.size * this.size);
    encoder.encode(inp, this.size, player, 1, board);

    let m = utils.getMoves(board, this.size);
    if (m.length == this.size * this.size) {
        const ix = _.random(0, m.length - 1);
        return encoder.flip(m[ix], this.size, player);
    }

    let w = await model.predict(this.model, b, this.size, this.planes);
    hints.analyze(board, 1, this.size, w.moves);
//  utils.dump(board, this.size, w.moves, player);

    let moves = utils.getMoves(board, this.size);
    const root = new Node(moves);

    for (let i = 0; i < DO_TOTAL; i++) {
        const c = root.getUCT(board, this.size, w.moves);
        if (c === null) break;
        board[c.move] = 1;
        const move = c.getRandom(board, this.size);
        if (simulate(board, player, this.size, move) > 0) {
            c.w++;
        }
        c.n++;
        root.n++;
        board[c.move] = 0;
        if (i % 100 == 0) {
            if (Date.now() - t0 > MAX_TIME) break;
        }
    }

    const r = _.sortBy(root.childs, function(c) {
        return -c.n;
    });

    let mx = r[0].w; let ix = 0;
    for (let i = 0; i < r.length; i++) {
        const m = encoder.flip(r[i].move, this.size, player);
/*      console.log(utils.FormatMove(m, this.size) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p + ', e = ' + w.estimate);
        if (logger) {
            logger.info(utils.FormatMove(m, this.size) + ': n = ' + r[i].n + ', w = ' + r[i].w + ', p = ' + r[i].p + ', e = ' + w.estimate);
        }*/
        if (r[i].w > mx) {
            mx = r[i].w;
            ix = i;
        }
        if (i >= 9) break;
    }

    if (!_.isUndefined(estimate) && !_.isUndefined(w.estimate)) {
        estimate.push(w.estimate[0]);
    }
    return encoder.flip(r[ix].move, this.size, player);
}

function create(size, model, planes) {
    return new ai(size, model, planes);
}

module.exports.create = create;
