// Parte 2 — bichinhos do Estojo Surpresa: vida extra com ~1 s piscando,
// Saltinho (pulo), Cascudo (carapaça só na frente) e Disparada (arrancada).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';

function montado(tipo, ...linhas) {
  const m = mapa(...linhas);
  m.jogadores[0].montaria = { tipo };
  return m;
}

function gotaDe(m, id, col, lin, pavio = 1) {
  const j = m.jogadores[id];
  const x = j.x;
  const y = j.y;
  j.gotas = 9;
  posicionar(m, id, centro(col), centro(lin));
  const g = soltarGota(m, j);
  g.passantes = [];
  g.pavio = pavio;
  j.x = x;
  j.y = y;
  return g;
}

test('vida extra: molhado montado perde o bichinho, pisca invulnerável ~1 s e continua na rodada', () => {
  const m = montado('cascudo', '#########', '#1.....2#', '#########');
  const j = m.jogadores[0];
  gotaDe(m, 1, 2, 1);
  passo(m);
  assert.equal(j.vivo, true);
  assert.equal(j.montaria, null);
  assert.equal(j.invulneravel, m.ajuste.invulneravel);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'perdeuBichinho'));
  // O respingo dura 30 ticks: invulnerável, nada acontece.
  avancar(m, 25);
  assert.equal(j.vivo, true);
  // Depois de ~1 s, volta a ser vulnerável.
  avancar(m, m.ajuste.invulneravel);
  gotaDe(m, 1, 2, 1);
  passo(m);
  assert.equal(j.vivo, false);
});

test('a peça do aperto final ignora a vida extra', () => {
  const m = montado('saltinho', '#####', '#1.2#', '#####');
  m.tempoRestante = 100;
  m.semente = 3; // espiral que começa no canto de cima à esquerda
  m.ajuste.inicioAperto = 100; // o aperto começa já, e a primeira peça cai em (1,1)
  avancar(m, 10);
  assert.equal(m.grade[1 * 5 + 1], K.MURO);
  assert.equal(m.jogadores[0].vivo, false);
});

test('Saltinho: pula 2 casas por cima de bloco ou pilar e não colide no ar', () => {
  const m = montado('saltinho', '#######', '#1B...#', '#######');
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('acao')]);
  assert.ok(j.salto, 'no ar');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'salto'));
  avancar(m, K.DURACAO_SALTO, []);
  assert.equal(j.salto, null);
  assert.deepEqual([j.x, j.y], [centro(3), centro(1)]);
  passo(m, [e('acao')]);
  assert.equal(j.salto, null, 'recarga: não pula de novo logo em seguida');
});

test('Saltinho: a seta apertada junto escolhe a direção; não pula para fora nem para casa ocupada', () => {
  const m = montado('saltinho', '#####', '#1..#', '#.#.#', '#B..#', '#####');
  const j = m.jogadores[0];
  passo(m, [e('baixo', 'acao')]);
  assert.equal(j.salto, null, '(1,3) tem bloco: não pousa em cima');
  passo(m, []);
  passo(m, [e('cima', 'acao')]);
  assert.equal(j.salto, null, 'moldura no meio: não pula');
  passo(m, []);
  passo(m, [e('dir', 'acao')]);
  assert.ok(j.salto, 'para a direita está livre');
});

test('Saltinho: no ar não é molhado', () => {
  const m = montado('saltinho', '#########', '#1......#', '#########');
  const j = m.jogadores[0];
  j.dir = 'dir';
  j.montaria = { tipo: 'saltinho' };
  passo(m, [e('acao')]);
  // Respingo passando por baixo enquanto ele está no ar.
  m.jogadores.push({ ...m.jogadores[0], id: 1, vivo: false });
  const r = { id: 99, col: 2, lin: 1, dono: 1, t: 5, duracao: 5, penetrante: false, bracos: { cima: 0, baixo: 0, esq: 1, dir: 3 }, batida: {}, cadeia: false, disparadoPor: null };
  m.respingos.push(r);
  passo(m, []);
  assert.equal(j.vivo, true);
  assert.equal(j.montaria.tipo, 'saltinho', 'nem perdeu o bichinho');
});

test('Cascudo: carapaça fechada (botão segurado) barra o respingo que vem da frente', () => {
  const m = montado('cascudo', '#########', '#1.....2#', '#########');
  const j = m.jogadores[0];
  gotaDe(m, 1, 3, 1);
  passo(m, [e('dir', 'acao')]); // fecha virado para a direita (a gota está à direita)
  assert.equal(j.escudo, true);
  assert.equal(j.dir, 'dir');
  assert.equal(j.x, centro(1), 'de carapaça fechada não anda');
  avancar(m, 30, [e('acao')]);
  assert.equal(j.vivo, true);
  assert.equal(j.montaria?.tipo, 'cascudo', 'nem gastou a vida extra');
  assert.ok(m.respingos.length === 0);
});

test('Cascudo: costas e lados continuam vulneráveis', () => {
  const m = montado('cascudo', '#########', '#1.....2#', '#########');
  const j = m.jogadores[0];
  gotaDe(m, 1, 3, 1);
  passo(m, [e('esq', 'acao')]); // virado para o lado errado
  avancar(m, 3, [e('acao')]);
  assert.equal(j.montaria, null, 'molhado pelas costas: perdeu o bichinho');
});

test('Cascudo: sem segurar o botão não protege', () => {
  const m = montado('cascudo', '#########', '#1.....2#', '#########');
  const j = m.jogadores[0];
  j.dir = 'dir';
  gotaDe(m, 1, 3, 1);
  avancar(m, 3, []);
  assert.equal(j.montaria, null);
});

test('Disparada: arrancada reta enquanto o botão está apertado, para no obstáculo sem atravessar', () => {
  const m = montado('disparada', '###########', '#1.....B..#', '###########');
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('acao')]);
  assert.ok(j.disparada);
  assert.equal(j.x, centro(1) + m.ajuste.velocidadeDisparada);
  avancar(m, 40, [e('acao')]);
  assert.equal(j.x, centro(6), 'parou colado no bloco da casa 7');
  assert.equal(j.disparada, null);
});

test('Disparada: soltar o botão interrompe a arrancada', () => {
  const m = montado('disparada', '###########', '#1........#', '###########');
  const j = m.jogadores[0];
  j.dir = 'dir';
  passo(m, [e('acao')]);
  passo(m, [e('acao')]);
  const x = j.x;
  passo(m, []);
  assert.equal(j.disparada, null);
  passo(m, []);
  assert.equal(j.x, x, 'parou');
});
