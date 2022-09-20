"use strict";

const _ = require('underscore');

const SIZE = 11;
const N = (SIZE * SIZE) + 2;
const S = SIZE * SIZE;
const T = N - 1;
const INF = 10000;

function empty() {
    let r = [];
    for (let i = 0; i < N; i++) {
        r.push(new Int8Array(N));
    }
    return r;
}

function check(board, player, r, pos, dir) {
    const q = pos + dir;
    if (board[q] * player < 0) return;
    r[pos][q] = 1;
    r[q][pos] = 1;
}

function bridge(board, player, r, pos, a, b) {
    if (board[pos] * player <= 0) return;
    if (board[pos + a] != 0) return;
    if (board[pos + b] != 0) return;
    const q = pos + a + b;
    if (board[q] * player <= 0) return;
    r[pos][q] = 1;
    r[q][pos] = 1;
}

function create(board, player, f) {
    let r = empty();
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const pos = y * SIZE + x;
            if (board[pos] * player < 0) continue;
            const ix = (player > 0) ? y : x;
            if (ix == 0) r[S][pos] = 10;
            if (ix == SIZE - 1) r[pos][T] = 10;
            if (y > 0) check(board, player, r, pos, -SIZE);
            if ((y > 0) && (x < SIZE - 1)) check(board, player, r, pos, -SIZE + 1);
            if (x < SIZE - 1) check(board, player, r, pos, 1);
            if (y < SIZE - 1) check(board, player, r, pos, SIZE);
            if ((y < SIZE - 1) && (x > 0)) check(board, player, r, pos, SIZE - 1);
            if (x > 0) check(board, player, r, pos, -1);
            if (f) {
                if ((y > 0) && (x > 0)) bridge(board, player, r, pos, -SIZE, -1);
                if ((y > 1) && (x < SIZE - 1)) bridge(board, player, r, pos, -SIZE, - SIZE + 1);
                if ((y > 0) && (x < SIZE - 2)) bridge(board, player, r, pos, -SIZE + 1, 1);
                if ((y < SIZE - 1) && (x < SIZE - 1)) bridge(board, player, r, pos, 1, SIZE);
                if ((y < SIZE - 2) && (x > 0)) bridge(board, player, r, pos, SIZE, SIZE - 1);
                if ((y < SIZE - 1) && (x > 1)) bridge(board, player, r, pos, SIZE - 1, -1);
                // TODO: Half Briges
            }
        }
    }
    return r;
}

function see(g) {
    for (let i = 0; i < g.length; i++) {
        for (let j = 0; j < g.length; j++) {
            if (g[i][j] <= 0) continue;
            console.log('"' + i + '" -> "' + j + '"');
        }
    }
}

// See: https://neerc.ifmo.ru/wiki/index.php?title=Схема_алгоритма_Диница
function bfs(c) {
    let f = empty();
    let d = new Int32Array(N);
    let q = [S];
    for (let i = 0; i < N; i++) d[i] = -1;
    d[S] = 0;
    while (q.length > 0) {
        const u = q.pop();
        for (let v = 0; v < N; v++) {
            if (c[u][v] == 0) continue;
            if ((f[v][v] < c[u][v]) && (d[v] < 0)) {
                d[v] = d[u] + 1;
                q.push(v);
            }
        }
    }
    return d[T] * 100;
}

// See: https://sites.google.com/site/indy256/algo/ford_fulkerson
function maxFlow(g) {
    let flow = 0;
    for (;;) {
        let df = findPath(g, new Int8Array(g.length), S, T, INF);
        if (df == 0) break;
        flow += df;
    }
    return flow * 1000;
}

function findPath(cap, vis, u, t, f) {
    if (u == t) return f;
    vis[u] = 1;
    for (let v = 0; v < vis.length; v++) {
      if ((vis[v] == 0) && (cap[u][v] > 0)) {
        const df = findPath(cap, vis, v, t, Math.min(f, cap[u][v]));
        if (df > 0) {
          cap[u][v] -= df;
          cap[v][u] += df;
          return df;
        }
      }
    }
    return 0;
}

function estimate(board, player) {
    const f = maxFlow(create(board, player, true)) - bfs(create(board, player, false));
    const e = maxFlow(create(board, -player, true)) - bfs(create(board, -player, false));
    if (f == 0) return -INF;
    if (e == 0) return INF;
    return f - e;
}

module.exports.estimate = estimate;
