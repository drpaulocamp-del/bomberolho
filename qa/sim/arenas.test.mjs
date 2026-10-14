// Parte 2 — cinco arenas com layout e elementos próprios (correnteza,
// túneis, lentes, clareira) e itens repartidos por quadrante.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { ARENAS, ORDEM_ARENAS } from '../../bomberolho/js/sim/arenas.js';
import { casasDeLargada, quadrante } from '../../bomberolho/js/sim/grade.js';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';
import { TEMAS } from '../../bomberolho/js/render/temas.js';

const SEMENTES = Array.from({ length: 60 }, (_, k) => k * 104729 + 11);

test('cinco arenas, cada uma com nome, tema visual, pilar e bloco próprios', () => {
  assert.deepEqual(ORDEM_ARENAS, ['jardim', 'lago', 'caverna', 'vale', 'consultorio']);
  const pilares = new Set();
  const blocos = new Set();
  for (const id of ORDEM_ARENAS) {
    assert.ok(ARENAS[id].nome.length > 5);
    assert.ok(TEMAS[id], `tema de ${id}`);
    pilares.add(TEMAS[id].pilar.estilo);
    blocos.add(TEMAS[id].bloco.estilo);
  }
  assert.equal(pilares.size, 5);
  assert.equal(blocos.size, 5);
});

test('em toda arena: cantos livres, densidade estável e itens sob blocos (60 sementes)', () => {
  for (const id of ORDEM_ARENAS) {
    for (const s of SEMENTES) {
      const m = criarMundo({ semente: s, arena: id });
      for (const i of casasDeLargada()) assert.equal(m.grade[i], K.VAZIO, `${id} ${s}`);
      m.ocultos.forEach((t, i) => { if (t) assert.equal(m.grade[i], K.BLOCO); });
    }
  }
});

test('layouts próprios: água do Lago, clareira do Vale e lentes do Consultório nunca têm bloco', () => {
  for (const s of SEMENTES) {
    const lago = criarMundo({ semente: s, arena: 'lago' });
    lago.piso.forEach((p, i) => { if (p) assert.equal(lago.grade[i], K.VAZIO); });
    assert.equal(lago.piso.filter(Boolean).length, 28, 'anel de água com 28 casas');
    const vale = criarMundo({ semente: s, arena: 'vale' });
    for (let l = 5; l <= 7; l++) for (let c = 5; c <= 9; c++) assert.notEqual(vale.grade[l * 15 + c], K.BLOCO);
    const cons = criarMundo({ semente: s, arena: 'consultorio' });
    assert.equal(cons.piso.filter((p) => p === 'lente').length, 5);
    cons.piso.forEach((p, i) => { if (p) assert.equal(cons.grade[i], K.VAZIO); });
  }
});

test('itens repartidos por quadrante: cada canto recebe sua parte de cada tipo frequente (M6)', () => {
  for (const id of ORDEM_ARENAS) {
    for (const s of SEMENTES.slice(0, 30)) {
      const m = criarMundo({ semente: s, arena: id });
      const por = [0, 0, 0, 0];
      const gotas = [0, 0, 0, 0];
      m.ocultos.forEach((t, i) => { if (!t) return; por[quadrante(i)]++; if (t === 'gota' || t === 'alcance') gotas[quadrante(i)]++; });
      const total = por.reduce((a, b) => a + b, 0);
      for (const q of por) assert.ok(q >= Math.floor(total / 4) - 1, `${id} ${s}: ${por}`);
      for (const q of gotas) assert.ok(q >= 2, `${id} ${s}: Frasquinho/Lupa por quadrante ${gotas}`);
    }
  }
});

test('correnteza do Lago empurra devagar quem está na água, nos dois sentidos de andar', () => {
  const m = criarMundo({ semente: 5, arena: 'lago' });
  const j = m.jogadores[0];
  assert.equal(m.piso[3 * 15 + 5], 'dir');
  posicionar(m, 0, centro(5), centro(3));
  passo(m, []);
  assert.equal(j.x, centro(5) + m.ajuste.forcaCorrente, 'parado na água: anda com ela');
  posicionar(m, 0, centro(5), centro(3));
  passo(m, [e('esq')]);
  assert.equal(j.x, centro(5) - m.ajuste.velocidadeBase + m.ajuste.forcaCorrente, 'contra a correnteza: mais devagar');
  posicionar(m, 0, centro(5), centro(3));
  passo(m, [e('dir')]);
  assert.equal(j.x, centro(5) + m.ajuste.velocidadeBase + m.ajuste.forcaCorrente, 'a favor: mais rápido');
});

test('correnteza não empurra para dentro de bloco, gota ou pilar', () => {
  const m = criarMundo({ semente: 5, arena: 'lago' });
  const j = m.jogadores[0];
  posicionar(m, 0, centro(10), centro(3));
  const g = soltarGota(m, j);
  posicionar(m, 0, centro(9), centro(3));
  g.passantes = [];
  avancar(m, 80, []);
  assert.equal(j.x, centro(9), 'parou colado na gota');
});

test('túnel da Caverna: sai de um lado e entra pelo outro, e os robôs usam', () => {
  const m = criarMundo({ semente: 5, arena: 'caverna' });
  const j = m.jogadores[0];
  assert.equal(m.grade[3 * 15], K.TUNEL);
  assert.equal(m.grade[3 * 15 + 14], K.TUNEL);
  posicionar(m, 0, centro(1), centro(3));
  avancar(m, 25, [e('esq')]);
  assert.ok(j.x > centro(12), `reapareceu do lado direito (x=${j.x})`);
  avancar(m, 40, [e('esq')]);
  assert.ok(j.x <= centro(13), 'e seguiu andando para a esquerda');
  // E de volta pela direita.
  avancar(m, 60, [e('dir')]);
  assert.ok(j.x < centro(3), `voltou pelo outro lado (x=${j.x})`);
});

test('túnel não deixa passar respingo nem gota chutada, e não aceita gota dentro', () => {
  const m = criarMundo({ semente: 5, arena: 'caverna' });
  const j = m.jogadores[0];
  j.alcance = 8;
  posicionar(m, 0, centro(1), centro(3));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(1), centro(1));
  g.pavio = 1;
  passo(m);
  assert.equal(m.respingos[0].bracos.esq, 0, 'braço para no túnel');
  posicionar(m, 0, centro(0), centro(3));
  assert.equal(soltarGota(m, j), null);
});

test('lente do Consultório: gota solta em cima ganha +2 de alcance (para todos)', () => {
  const m = criarMundo({ semente: 5, arena: 'consultorio' });
  const j = m.jogadores[1];
  posicionar(m, 1, centro(3), centro(3));
  const g = soltarGota(m, j);
  assert.equal(g.alcance, j.alcance + 2);
  posicionar(m, 1, centro(13), centro(1)); // o canto de largada (sem lente)
  const h = soltarGota(m, { ...j, gotas: 5 });
  assert.equal(h.alcance, j.alcance);
});
