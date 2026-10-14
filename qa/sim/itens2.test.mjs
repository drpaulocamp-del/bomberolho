// Parte 2 — Super Lupa, Cisco (azar passageiro e contagioso), Colírio
// Penetrante e Estojo Surpresa.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';
import { pegarItem, ESPECIAIS, ITENS, nomeDoItem } from '../../bomberolho/js/sim/itens.js';
import { casasDoRespingo } from '../../bomberolho/js/sim/respingo.js';
import { velocidadeDe } from '../../bomberolho/js/sim/jogadores.js';

test('todos os itens têm nome em português e o Chute-Pisca liga o chute', () => {
  for (const t of [...Object.keys(ITENS), ...Object.keys(ESPECIAIS)]) assert.ok(nomeDoItem(t).length > 3, t);
  const m = mapa('#######', '#1c...#', '#######');
  avancar(m, 20, [e('dir')]);
  assert.equal(m.jogadores[0].chute, true);
});

test('Super Lupa leva o alcance ao máximo; no máximo, não muda nada', () => {
  const m = mapa('#######', '#1s.s.#', '#######');
  const j = m.jogadores[0];
  avancar(m, 20, [e('dir')]);
  assert.equal(j.alcance, K.LIMITES.alcance);
  let segunda = null;
  for (let t = 0; t < 40; t++) { passo(m, [e('dir')]); segunda ??= m.eventos.find((ev) => ev.tipo === 'item'); }
  assert.equal(segunda.mudou, false, 'a segunda não muda nada');
  assert.equal(j.alcance, K.LIMITES.alcance);
});

test('Cisco: azar sorteado pela semente, passageiro (some sozinho) e inofensivo', () => {
  const m = mapa('#######', '#1z...#', '#######');
  const j = m.jogadores[0];
  avancar(m, 20, [e('dir')]);
  assert.ok(['lento', 'ligeiro', 'espirro'].includes(j.cisco.tipo));
  assert.ok(j.cisco.restante <= m.ajuste.duracaoCisco);
  avancar(m, m.ajuste.duracaoCisco, []);
  assert.equal(j.cisco, null, 'passou');
  assert.equal(j.vivo, true, 'inofensivo');
  // A mesma semente sorteia o mesmo azar.
  const tipos = [1, 1, 2, 3].map((s) => { const k = mapa('#####', '#1z.#', '#####'); k.rng = s; avancar(k, 20, [e('dir')]); return k.jogadores[0].cisco.tipo; });
  assert.equal(tipos[0], tipos[1]);
});

test('Cisco: lento anda devagar, ligeiro anda depressa demais (sempre menos de 1/10 de casa por tick)', () => {
  const aj = mapa('###', '#1#', '###').ajuste;
  const j = { velocidade: 0, cisco: { tipo: 'lento' } };
  assert.ok(velocidadeDe(j, aj) < aj.velocidadeBase);
  j.cisco.tipo = 'ligeiro';
  assert.ok(velocidadeDe(j, aj) > aj.velocidadeBase + 4 * aj.velocidadePasso);
  assert.ok(velocidadeDe(j, aj) < K.CASA / 10);
});

test('Cisco "espirro" solta gotas sem querer, e passa adiante para quem encosta', () => {
  const m = mapa('#########', '#1.2....#', '#########');
  const [a, b] = m.jogadores;
  a.gotas = 3;
  a.cisco = { tipo: 'espirro', restante: 46 };
  passo(m);
  assert.equal(m.gotas.length, 1, 'espirrou uma gota');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'espirro'));
  posicionar(m, 1, a.x + 600, a.y);
  passo(m);
  assert.equal(b.cisco?.tipo, 'espirro', 'pegou o Cisco ao encostar');
  assert.equal(a.cisco, null, 'e quem tinha ficou livre: o azar PASSA, não se copia (M6)');
  b.cisco = { tipo: 'lento', restante: 300 };
  const restante = b.cisco.restante;
  // Continuam encostados: não volta na hora (sem pingue-pongue a cada tick).
  avancar(m, 30, []);
  assert.equal(a.cisco, null);
  assert.ok(b.cisco && b.cisco.restante === restante - 30, 'o tempo que faltava segue com o novo dono');
  // Passado o instante de imunidade, encostar de novo devolve o azar.
  avancar(m, 40, []);
  assert.ok(a.cisco && !b.cisco, 'depois de 1 s, quem encosta pega de volta');
});

test('Cisco nunca se espalha pelos quatro: no máximo um competidor com o azar que veio de um item', () => {
  const m = mapa('#########', '#1234...#', '#########');
  m.jogadores[0].cisco = { tipo: 'lento', restante: 600 };
  m.jogadores.forEach((j, k) => posicionar(m, k, centro(1) + k * 300, centro(1)));
  for (let t = 0; t < 300; t++) {
    passo(m, []);
    assert.ok(m.jogadores.filter((j) => j.cisco).length <= 1, `tick ${t}`);
  }
});

test('Colírio Penetrante: o respingo atravessa todos os blocos do alcance, mas para no pilar', () => {
  const m = mapa('###########', '#1.BB.B#..#', '###########');
  const j = m.jogadores[0];
  j.penetrante = true;
  j.alcance = 8;
  posicionar(m, 0, centro(2), centro(1));
  const g = soltarGota(m, j);
  assert.equal(g.penetrante, true);
  g.passantes = [];
  posicionar(m, 0, centro(1), centro(1));
  g.pavio = 1;
  passo(m);
  const r = m.respingos[0];
  assert.equal(r.penetrante, true);
  assert.equal(r.bracos.dir, 4, 'chega até antes do pilar em (7,1)');
  assert.deepEqual([3, 4, 6].map((c) => m.grade[1 * 11 + c]), [K.QUEBRANDO, K.QUEBRANDO, K.QUEBRANDO]);
  assert.equal(m.grade[1 * 11 + 8], K.VAZIO);
  assert.ok(!casasDoRespingo(m, r).includes(1 * 11 + 8));
});

test('respingo comum continua parando no primeiro bloco', () => {
  const m = mapa('###########', '#1.BB.B#..#', '###########');
  const j = m.jogadores[0];
  j.alcance = 8;
  posicionar(m, 0, centro(2), centro(1));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(1), centro(1));
  g.pavio = 1;
  passo(m);
  assert.equal(m.grade[1 * 11 + 4], K.BLOCO);
});

test('respingo queima itens expostos, inclusive o Estojo', () => {
  const m = mapa('#########', '#1..e...#', '#########');
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2), centro(1));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(7), centro(1));
  g.pavio = 1;
  passo(m);
  assert.equal(m.itens[1 * 9 + 4], null);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'itemQueimado' && ev.item === 'estojo'));
});

test('Estojo Surpresa: monta um bichinho sorteado; pegar outro troca por um diferente', () => {
  const m = mapa('#########', '#1e.e...#', '#########');
  const j = m.jogadores[0];
  avancar(m, 20, [e('dir')]);
  const primeiro = j.montaria.tipo;
  assert.ok(['saltinho', 'cascudo', 'disparada'].includes(primeiro));
  avancar(m, 40, [e('dir')]);
  assert.notEqual(j.montaria.tipo, primeiro, 'trocou');
  assert.equal(pegarItem(m, { ...j, montaria: null }, 'inexistente'), false);
});
