// Parte 2 — Chute-Pisca: a gota desliza de casa em casa e para no centro da
// última casa livre; respingo a estoura no caminho (na casa mais próxima).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';

const CORREDOR = ['###########', '#1........#', '###########'];

function prepararChute(m) {
  const j = m.jogadores[0];
  j.chute = true;
  posicionar(m, 0, centro(3), centro(1));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(2), centro(1));
  return { j, g };
}

test('sem o item, andar contra a gota só encosta', () => {
  const m = mapa(...CORREDOR);
  const { j, g } = prepararChute(m);
  j.chute = false;
  avancar(m, 20, [e('dir')]);
  assert.equal(g.x, centro(3));
  assert.equal(j.x, centro(2));
});

test('chute: a gota desliza e para no centro da última casa antes da parede', () => {
  const m = mapa(...CORREDOR);
  const { g } = prepararChute(m);
  passo(m, [e('dir')]);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'chute'));
  assert.deepEqual(g.mov, { dir: 'dir' });
  avancar(m, 60, []);
  assert.equal(g.mov, null);
  assert.deepEqual([g.col, g.lin, g.x, g.y], [9, 1, centro(9), centro(1)], 'centrada na casa 9');
});

test('chute para antes de bloco, de outra gota e de jogador', () => {
  for (const [alvo, fim] of [['B', 5], ['o', 6], ['2', 5]]) {
    const linha = '#1....' + (alvo === 'B' ? 'B' : alvo === '2' ? '2' : '.') + '...#';
    const m = mapa('###########', linha, '###########');
    if (alvo === 'o') { const o = m.jogadores[0]; posicionar(m, 0, centro(7), centro(1)); const g2 = soltarGota(m, o); g2.passantes = []; g2.pavio = 999; m.jogadores[0].gotas = 3; }
    const { g } = prepararChute(m);
    passo(m, [e('dir')]);
    avancar(m, 60, []);
    assert.equal(g.col, fim, `parou antes de ${alvo}`);
    assert.equal(g.x, centro(fim));
  }
});

test('gota chutada é obstáculo pelas duas casas que toca enquanto desliza e ninguém atravessa', () => {
  const m = mapa(...CORREDOR);
  const { g } = prepararChute(m);
  passo(m, [e('dir')]);
  passo(m, []);
  assert.ok(g.x > centro(3) && g.x < centro(4) + 1);
  assert.equal(soltarGota(m, { ...m.jogadores[0], x: centro(4), y: centro(1), gotas: 9 }), null, 'casa ocupada pela gota deslizando');
});

test('gota deslizando atingida por respingo estoura na hora, na casa mais próxima (cadeia)', () => {
  const m = mapa('###########', '#1........#', '#.#.#.#.#.#', '#.........#', '###########');
  const { g, j } = prepararChute(m);
  j.gotas = 3;
  // Outra gota em (5,3), alcance 2: o braço de cima chega em (5,1) pela coluna livre.
  posicionar(m, 0, centro(5), centro(3));
  const b = soltarGota(m, j);
  b.passantes = [];
  b.pavio = 12;
  posicionar(m, 0, centro(2), centro(1));
  passo(m, [e('dir')]); // chute
  avancar(m, 11, []);
  const r = m.respingos.find((x) => x.cadeia);
  assert.ok(r, 'a chutada entrou na cadeia');
  assert.equal(r.col, 5, 'estourou na casa (5,1), onde estava ao ser atingida');
  assert.equal(m.gotas.length, 0);
});

test('a velocidade do chute vem do ajuste (bancada)', () => {
  const m = mapa(...CORREDOR);
  m.ajuste.velocidadeChute = 250;
  const { g } = prepararChute(m);
  passo(m, [e('dir')]); // o chute e o primeiro trecho acontecem no mesmo tick
  assert.equal(g.x, centro(3) + 250);
  assert.ok(K.CASA > 250);
});
