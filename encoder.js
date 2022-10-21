"use strict";

function flip(pos, size, player) {
    if (player > 0) return pos;
    const x = pos % size;
    const y = (pos / size) | 0;
    return x * size + y;
}

function encode(board, size, player, planes, out) {
    if (planes == 1) {
        for (let pos = 0; pos < size * size; pos++) {
            out[flip(pos, size,player)] = board[pos] * player;
        }
    } else {
        const offset = size * size;
        for (let pos = 0; pos < size * size; pos++) {
            if (board[pos] * player > 0.01) {
                out[flip(pos, size,player)] = 1;
            }
            if (board[pos] * player < -0.01) {
                out[offset + flip(pos, size,player)] = 1;
            }
        }
    }
}

module.exports.flip = flip;
module.exports.encode = encode;
