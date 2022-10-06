"use strict";

function encode(board, size, player, planes, out) {
    if (planes == 1) {
        for (let pos = 0; pos < size * size; pos++) {
            out[pos] = board[pos] * player;
        }
    } else {
        const offset = size * size;
        for (let pos = 0; pos < size * size; pos++) {
            if (board[pos] * player > 0.01) {
                out[pos] = 1;
            }
            if (board[pos] * player < -0.01) {
                out[offset + pos] = 1;
            }
        }
    }
}

module.exports.encode = encode;
