import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';

test('último de pé vence, depois de uma pausa curta para a animação', () => {
  const m = mapa('#########', '#1.2...3#', '#########');
  const j = m.jogadores[0];
  j.alcance = 3;
  posicionar(m, 0, centro(3), centro(1)); // em cima do jogador 1
  const g = soltarGota(m, j);
  posicionar(m, 0, centro(7), centro(1)); // dono foge para longe... junto do 2
  posicionar(m, 2, centro(5), centro(1)); // jogador 2 no alcance
  g.pavio = 1;
  passo(m);
  assert.equal(m.jogadores[1].vivo, false);
  assert.equal(m.jogadores[2].vivo, false);
  assert.equal(m.fase, 'encerrando');
  avancar(m, K.ATRASO_FIM - 1);
  assert.equal(m.fase, 'encerrando', 'a pausa dura ATRASO_FIM ticks');
  passo(m);
  assert.equal(m.fase, 'fim');
  assert.equal(m.vencedor, 0);
  const tick = m.tick;
  passo(m, [e('dir')]);
  assert.equal(m.jogadores[0].x, centro(7), 'depois do fim nada mais se mexe');
  assert.equal(m.tick, tick + 1);
});

test('empate quando todos caem juntos', () => {
  const m = mapa('#######', '#1.2..#', '#######');
  const g = soltarGota(m, m.jogadores[0]);
  g.pavio = 1;
  passo(m);
  avancar(m, K.ATRASO_FIM);
  assert.equal(m.fase, 'fim');
  assert.equal(m.vencedor, null);
});

test('se o sobrevivente cai durante a pausa final, vira empate', () => {
  const m = mapa('#########', '#1.2....#', '#########');
  const g = soltarGota(m, m.jogadores[1]);
  posicionar(m, 1, centro(7), centro(1));
  g.pavio = 1;
  passo(m); // jogador 0 encharcado
  assert.equal(m.fase, 'encerrando');
  const h = soltarGota(m, m.jogadores[1]);
  h.pavio = 1;
  passo(m);
  avancar(m, K.ATRASO_FIM);
  assert.equal(m.vencedor, null);
});

test('mundo com um competidor só (treino/teste) nunca termina sozinho', () => {
  const m = mapa('#####', '#1..#', '#####');
  avancar(m, 500);
  assert.equal(m.fase, 'jogando');
});
