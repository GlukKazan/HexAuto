"use strict";

const _ = require('underscore');

const LETTERS = 'ABCDEFGHIJKabcdefghijk';
const EPS = 0.001;

let edges = null;

function dump(board, size, offset, moves) {
    for (let y = 0; y < size; y++) {
        let s = '';
        for (let i = 0; i <= y; i++) {
            s = s + ' ';
        }
        for (let x = 0; x < size; x++) {
            const pos = y * size + x;
            if (board[offset + pos] > 0) {
                s = s + '* ';
            } else if (board[offset + pos] < 0) {
                s = s + 'o ';
            }  else if (!_.isUndefined(moves) && (moves[offset + pos] > 1 / (size * size))) {
                s = s + '+ ';
            }  else if (!_.isUndefined(moves) && (moves[offset + pos] < -1 / (size * size))) {
                s = s + 'X ';
            }  else {
                s = s + '. ';
            }
        }
        console.log(s);
    }
    console.log('');
}

function pieceNotation(c, p, size) {
    if (p == 0) return '' + c;
    c--;
    if (p < -0.01) c += size;
    return LETTERS[c];
}

function getFen(board, size, player) {
    let str = '';
    let k = 0; let c = 0; let p = 0;
    for (let pos = 0; pos < size * size; pos++) {
        if (k >= size) {
            if (c > 0) {
                str += pieceNotation(c, p, size);
            }
            str += "/";
            k = 0;
            c = 0;
            p = 0;
        }
        k++;
        const v = board[pos];
        if (Math.abs(v) < 0.01) {
            if ((p != 0) || ((c > 8) && (p == 0))) {
                str += pieceNotation(c, p, size);
                c = 0;
            }
            c++;
            p = 0;
        } else {
            if (v * p < 0.01) {
                if (c > 0) {
                    str += pieceNotation(c, p, size);
                    c = 0;
                }
                p = v;
                c = 1;
            } else {
                c++;
            }
        }
    }
    if (c > 0) {
        str += pieceNotation(c, p, size);
    }
    str += (player > 0) ? '-w' : '-b';
    return str;
}

function InitializeFromFen(fen, board, size, player) {
    let pos = 0;
    for (let i = 0; i < fen.length; i++) {
        const c = fen[i];
        if (c != '/') {
            if ((c >= '0') && (c <= '9')) {
                pos += +c;
            } else {
                let ix = _.indexOf(LETTERS, c);
                if (ix >= 0) {
                    let p = 1;
                    if (ix >= size) {
                        p = -p;
                        ix -= size;
                    }
                    ix++;
                    for (; ix > 0; ix--) {
                        board[pos] = -p;// <--
                        pos++;
                    }
                }
            }
            if (pos >= size * size) break;
        } 
    }
}

function FormatMove(move, size) {
    const col = move % size;
    const row = (move / size) | 0;
    return LETTERS[col] + LETTERS[row].toLowerCase();
}

function getMoves(board, size) {
    return _.filter(_.range(size * size), function(pos) {
        return Math.abs(board[pos]) < EPS;
    });
}

function navigate(pos, dir, size) {
    const x = pos % size;
    const y = (pos / size) | 0;
    if (dir < 0) {
        if (dir >= -1) {
            if (x == 0) return null;
        } else {
            if (y == 0) return null;
            if (dir > -size) {
                if (x == size - 1) return null;
            }
        }
    }
    if (dir > 0) {
        if (dir <= 1) {
            if (x == size - 1) return null;
        } else {
            if (y == size - 1) return null;
            if (dir < size) {
                if (x == 0) return null;
            }
        }
    }
    return pos + dir;
}

function checkGoal(board, player, size) {
    if (edges === null) {
        edges = [];
        let e = [];
        for (let i = 0; i < size; i++) e.push(i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * (size - 1) + i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * i);
        edges.push(e);
        e = [];
        for (let i = 0; i < size; i++) e.push(size * i + (size - 1));
        edges.push(e);
    }
    let ix = 0;
    let group = [];
    _.each(edges[ix], function(p) {
        if (board[p] < EPS) return;
        group.push(p);
    });
    let f = false;
    for (let i = 0; i < group.length; i++) {
        if (f) break;
        _.each([-size, -size + 1, 1, size, size - 1, -1], function(dir) {
            const p = navigate(group[i], dir, size);
            if (p === null) return;
            if (_.indexOf(group, p) >= 0) return;
            if (board[p] < EPS) return;
            if (_.indexOf(edges[ix + 1], p) >= 0) f = true;
            group.push(p);
        });
    }
    if (f) return player;
    ix += 2;
    group = [];
    _.each(edges[ix], function(p) {
        if (board[p] > -EPS) return;
        group.push(p);
    });
    f = false;
    for (let i = 0; i < group.length; i++) {
        if (f) break;
        _.each([-size, -size + 1, 1, size, size - 1, -1], function(dir) {
            const p = navigate(group[i], dir, size);
            if (p === null) return;
            if (_.indexOf(group, p) >= 0) return;
            if (board[p] > -EPS) return;
            if (_.indexOf(edges[ix + 1], p) >= 0) f = true;
            group.push(p);
        });
    }
    if (f) return -player;
    return null;
}

module.exports.dump = dump;
module.exports.getFen = getFen;
module.exports.InitializeFromFen = InitializeFromFen;
module.exports.FormatMove = FormatMove;
module.exports.getMoves = getMoves;
module.exports.checkGoal = checkGoal;
