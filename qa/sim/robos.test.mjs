// Robôs da parte 1 e controlador: estabilidade em muitas partidas sem cabeça.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, passo, mapa, centro, posicionar } from './ajuda.mjs';
import { criarRobo, decidir } from '../../bomberolho/js/ia/robo.js';
import { mapaDePerigo, SEGURO } from '../../bomberolho/js/ia/perigo.js';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

test('mapa de perigo prevê a cruz e a cadeia com o tempo certo', () => {
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
  const j = m.jogadores[0];
  j.gotas = 3;
  posicionar(m, 0, centro(3), centro(1));
  const a = soltarGota(m, j);
  a.pavio = 50;
  posicionar(m, 0, centro(5), centro(1));
  const b = soltarGota(m, j);
  b.pavio = 150;
  const p = mapaDePerigo(m);
  assert.equal(p[1 * 9 + 3], 50);
  assert.equal(p[1 * 9 + 7], 50, 'b estoura junto com a (cadeia)');
  assert.equal(p[3 * 9 + 5], 50, 'braço de baixo de b, também em 50');
  assert.equal(p[3 * 9 + 1], SEGURO);
});

test('robô foge da própria gota em vez de ficar parado nela', () => {
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
  const r = criarRobo(0, 'medio', 1);
  m.jogadores[0].x = centro(3);
  soltarGota(m, m.jogadores[0]);
  for (let t = 0; t < 200; t++) passo(m, [decidir(r, m)]);
  assert.equal(m.jogadores[0].vivo, true);
});

test('centenas de partidas de robôs: sem erro, sem NaN, com blocos abertos e itens pegos', () => {
  let itens = 0;
  let quedas = 0;
  for (let s = 1; s <= 24; s++) {
    const dif = ['facil', 'medio', 'dificil'][s % 3];
    const m = criarMundo({ semente: s });
    const robos = m.jogadores.map((j) => criarRobo(j.id, dif, s));
    const blocos0 = m.grade.filter((t) => t === 3).length;
    for (let t = 0; t < 60 * 60 && m.fase !== 'fim'; t++) {
      passo(m, robos.map((r) => decidir(r, m)));
      itens += m.eventos.filter((ev) => ev.tipo === 'item').length;
      for (const j of m.jogadores) assert.ok(Number.isFinite(j.x) && Number.isFinite(j.y), `semente ${s}`);
    }
    quedas += m.jogadores.filter((j) => !j.vivo).length;
    assert.ok(m.grade.filter((t) => t === 3).length < blocos0 * 0.7, `semente ${s}: robôs abriram blocos`);
  }
  assert.ok(itens > 24 * 4, `itens pegos: ${itens}`);
  assert.ok(quedas > 0, 'houve batalha de verdade');
});

test('controlador: entrada fixada pelo gancho tem prioridade e pode ser liberada', () => {
  const jogo = new Jogo().iniciar({ semente: 3, contagem: false }); // parte 2: sem o "3, 2, 1" para medir o passo
  jogo.substitutas[1] = { cima: false, baixo: true, esq: false, dir: false, bomba: false };
  jogo.passos(10);
  assert.equal(jogo.mundo.jogadores[1].y, 1500 + 10 * 55);
  jogo.entradaHumana = () => ({ cima: false, baixo: false, esq: false, dir: true, bomba: false });
  jogo.passos(1);
  assert.equal(jogo.mundo.jogadores[0].x, 1555, 'humano lê a entrada do teclado');
  jogo.demo = true;
  jogo.passos(1);
  assert.ok(jogo.eventos.length >= 1);
  assert.equal(jogo.tela, 'jogando');
  jogo.pausado = true;
  assert.equal(jogo.quadro(1000), 0, 'pausado não anda');
  assert.equal(jogo.tela, 'pausado');
});
