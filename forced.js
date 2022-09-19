"use strict";

const _ = require('underscore');

const RESULT_VALUE = 0.9;

function analyze(board, player, size, moves) {
    const dirs = [
        { f: -size - 1, p: [-1, -size], minx: 1, maxx: size - 1, miny: 1, maxy: size - 1},
        { f: -(size * 2) + 1, p: [-size, -size + 1], minx: 0, maxx: size - 2, miny: 2, maxy: size - 1},
        { f: -size + 2, p: [-size + 1, 1], minx: 0, maxx: size - 3, miny: 1, maxy:  size - 1},
        { f: size + 1, p: [1, size], minx: 0, maxx: size - 2, miny: 0, maxy: size - 2},
        { f: size * 2 - 1, p: [size, size - 1], minx: 1, maxx: size - 1, miny: 0, maxy: size - 3},
        { f: size - 2, p: [size - 1, -1], minx: 2, maxx: size - 1, miny: 0, maxy: size - 2}
    ];
    let r = [];
    _.each(dirs, function(d) {
        for (let pos = 0; pos < size * size; pos++) {
            if (board[pos] < 0.01) continue;
            const x = pos % size;
            if ((x < d.minx) || (x > d.maxx)) continue;
            const y = (pos / size) | 0;
            if ((y < d.miny) || (y > d.maxy)) continue;
            if (board[pos + d.f] < 0.01) continue;
            let p = null;
            if (board[pos + d.p[0]] < -0.01) {
                if (Math.abs(board[pos + d.p[1]]) < 0.01) p = pos + d.p[1];
            }
            if (board[pos + d.p[1]] < -0.01) {
                if (Math.abs(board[pos + d.p[0]]) < 0.01) p = pos + d.p[0];
            }
            if (p === null) continue;
            if (_.indexOf(r, p) >= 0) continue;
            r.push(p);
        }
    });
    if (player > 0) {
        let y = 1;
        for (let x = 0; x < size - 1; x++) {
            const pos = y * size + x;
            let p = null;
            if (board[pos] < 0.01) continue;
            if (board[pos - size] < -0.01) {
                if (Math.abs(board[pos - size + 1]) < 0.01) p = pos - size + 1;
            }
            if (board[pos - size + 1] < -0.01) {
                if (Math.abs(board[pos - size]) < 0.01) p = pos - size;
            }
            if (p === null) continue;
            if (_.indexOf(r, p) >= 0) continue;
            r.push(p);
        }
        y = size - 2;
        for (let x = 1; x < size; x++) {
            const pos = y * size + x;
            let p = null;
            if (board[pos] < 0.01) continue;
            if (board[pos + size - 1] < -0.01) {
                if (Math.abs(board[pos + size]) < 0.01) p = pos + size;
            }
            if (board[pos + size] < -0.01) {
                if (Math.abs(board[pos + size - 1]) < 0.01) p = pos + size - 1;
            }
            if (p === null) continue;
            if (_.indexOf(r, p) >= 0) continue;
            r.push(p);
        }
    } else {
        let x = 1;
        for (let y = 0; y < size - 1; y++) {
            const pos = y * size + x;
            let p = null;
            if (board[pos] < 0.01) continue;
            if (board[pos - 1] < -0.01) {
                if (Math.abs(board[pos + size - 1]) < 0.01) p = pos + size - 1;
            }
            if (board[pos + size - 1] < -0.01) {
                if (Math.abs(board[pos - 1]) < 0.01) p = pos - 1;
            }
            if (p === null) continue;
            if (_.indexOf(r, p) >= 0) continue;
            r.push(p);
        }
        x = size - 2;
        for (let y = 1; y < size; y++) {
            const pos = y * size + x;
            let p = null;
            if (board[pos] < 0.01) continue;
            if (board[pos + 1] < -0.01) {
                if (Math.abs(board[pos - size + 1]) < 0.01) p = pos - size + 1;
            }
            if (board[pos - size + 1] < -0.01) {
                if (Math.abs(board[pos + 1]) < 0.01) p = pos + 1;
            }
            if (p === null) continue;
            if (_.indexOf(r, p) >= 0) continue;
            r.push(p);
        }
    }
    if (!_.isUndefined(moves)) {
        _.each(r, function(pos) {
            moves[pos] += RESULT_VALUE;
        });
    }
    return r;
}

module.exports.analyze = analyze;
