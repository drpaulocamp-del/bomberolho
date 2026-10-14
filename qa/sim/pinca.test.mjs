// Parte 2 — Pinça: levantar (apertar) e arremessar (soltar) a 3 casas, por
// cima de tudo; quica em casa ocupada; dá a volta pela borda; pavio corre no
// ar mas a gota só estoura depois de pousar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';

const SALA = [
  '#########',
  '#1......#',
  '#.#.#.#.#',
  '#.......#',
  '#########',
];

function comPinca(...linhas) {
  const m = mapa(...linhas);
  m.jogadores[0].pinca = true;
  return m;
}

test('apertar em cima da própria gota levanta; soltar o botão arremessa 3 casas para onde olha', () => {
  const m = comPinca(...SALA);
  const j = m.jogadores[0];
  passo(m, [e('bomba')]);
  passo(m, []);
  assert.equal(m.gotas[0].estado, 'chao');
  passo(m, [e('bomba')]); // levanta
  const g = m.gotas[0];
  assert.equal(g.estado, 'mao');
  assert.equal(j.segurando, g.id);
  passo(m, [e('dir', 'bomba')]); // anda segurando: vira para a direita
  passo(m, [e('dir')]); // solta: arremessa
  assert.equal(g.estado, 'voo');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'arremesso'));
  avancar(m, 3 * m.ajuste.vooPorCasa, []);
  assert.equal(g.estado, 'chao');
  assert.deepEqual([g.col, g.lin, g.x, g.y], [4, 1, centro(4), centro(1)], 'pousa centrada 3 casas adiante');
});

test('toque rápido em cima da gota levanta e arremessa na hora; o pavio continua correndo', () => {
  const m = comPinca(...SALA);
  m.jogadores[0].dir = 'dir';
  passo(m, [e('bomba')]);
  passo(m, []);
  const g = m.gotas[0];
  const pavio = g.pavio;
  passo(m, [e('bomba')]);
  passo(m, []);
  assert.equal(g.estado, 'voo');
  assert.equal(g.pavio, pavio - 2);
});

test('voa por cima de pilar e bloco; casa de pouso ocupada faz quicar para a seguinte', () => {
  const m = comPinca('#########', '#1..B...#', '#.#.#.#.#', '#.......#', '#########');
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('bomba')]);
  passo(m, []);
  passo(m, [e('bomba')]);
  passo(m, []);
  const g = m.gotas[0];
  avancar(m, 3 * m.ajuste.vooPorCasa, []);
  assert.equal(g.estado, 'voo', 'casa (4,1) tem bloco: quicou');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'quique') || g.voo.quiques === 1);
  avancar(m, m.ajuste.vooPorCasa, []);
  assert.equal(g.estado, 'chao');
  assert.equal(g.col, 5);
});

test('ao passar da borda, reaparece do lado oposto (dá a volta)', () => {
  const m = comPinca(...SALA);
  posicionar(m, 0, centro(6), centro(1));
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('bomba')]);
  passo(m, []);
  passo(m, [e('bomba')]);
  passo(m, []);
  avancar(m, 3 * m.ajuste.vooPorCasa, []);
  const g = m.gotas[0];
  assert.equal(g.estado, 'chao');
  assert.deepEqual([g.col, g.lin], [2, 1], '6 → 7 → (borda) → 1 → 2');
});

test('no ar não é atingida nem estoura; se o pavio acaba no ar, estoura ao pousar', () => {
  const m = comPinca(...SALA);
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('bomba')]);
  passo(m, []);
  m.gotas[0].pavio = 4;
  passo(m, [e('bomba')]);
  passo(m, []);
  const g = m.gotas[0];
  avancar(m, 5, []);
  assert.equal(g.estado, 'voo');
  assert.equal(m.respingos.length, 0, 'não estoura no ar');
  avancar(m, 3 * m.ajuste.vooPorCasa, []);
  assert.equal(m.respingos.length, 1);
  assert.equal(m.respingos[0].col, 4, 'estourou onde pousou');
});

test('pavio acabando na mão estoura ali mesmo (molha quem segura)', () => {
  const m = comPinca('#########', '#1.....2#', '#########');
  passo(m, [e('bomba')]);
  passo(m, []);
  m.gotas[0].pavio = 3;
  avancar(m, 4, [e('bomba')]);
  assert.equal(m.jogadores[0].vivo, false);
});

test('levanta também a gota alheia que está colada à frente', () => {
  const m = comPinca('#########', '#1.2....#', '#########');
  const outro = m.jogadores[1];
  const g = soltarGota(m, outro);
  g.passantes = [];
  posicionar(m, 1, centro(7), centro(1));
  m.jogadores[0].dir = 'dir';
  posicionar(m, 0, centro(2), centro(1));
  passo(m, [e('bomba')]);
  assert.equal(g.estado, 'mao');
  assert.equal(g.dono, 1, 'o dono continua sendo quem soltou');
});

test('arremesso é determinístico (mesma situação, mesma casa de pouso)', () => {
  const rodar = () => {
    const m = comPinca(...SALA);
    m.jogadores[0].dir = 'baixo';
    passo(m, [e('bomba')]); passo(m, []); passo(m, [e('bomba')]); passo(m, []);
    avancar(m, 40, []);
    return m.gotas.map((g) => [g.col, g.lin]);
  };
  assert.deepEqual(rodar(), rodar());
  assert.deepEqual(rodar(), [[1, 2]], 'para baixo: 2, 3, (borda) 1 — ocupada pelo próprio jogador, quica para (1,2)');
});
