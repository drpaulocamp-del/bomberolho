// Parte 4 — lógica pura do controle de toque (sem navegador): direção da
// alavanca com zona morta e histerese, e botões com borda (toque rápido não
// se perde). O comportamento com dedos de verdade está em navegador/toque.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { direcaoDaAlavanca, ZONA_MORTA } from '../../bomberolho/js/input/toque.js';
import { criarBotoes } from '../../bomberolho/js/input/botoes.js';

test('alavanca: zona morta no centro; fora dela, 4 direções', () => {
  assert.equal(direcaoDaAlavanca(0, 0), null);
  assert.equal(direcaoDaAlavanca(ZONA_MORTA - 1, 0), null);
  assert.equal(direcaoDaAlavanca(20, 3), 'dir');
  assert.equal(direcaoDaAlavanca(-20, -3), 'esq');
  assert.equal(direcaoDaAlavanca(2, 20), 'baixo');
  assert.equal(direcaoDaAlavanca(-2, -20), 'cima');
});

test('alavanca: na diagonal mantém o eixo atual até passar claramente para o outro', () => {
  assert.equal(direcaoDaAlavanca(20, 24, 'dir'), 'dir');
  assert.equal(direcaoDaAlavanca(20, 24, 'baixo'), 'baixo');
  assert.equal(direcaoDaAlavanca(20, 30, 'dir'), 'baixo');
  assert.equal(direcaoDaAlavanca(30, 20, 'baixo'), 'dir');
  assert.equal(direcaoDaAlavanca(-24, -20, 'cima'), 'cima');
});

test('alavanca: voltar para o centro precisa de menos que a zona morta (sem piscar na borda)', () => {
  const quase = ZONA_MORTA * 0.85;
  assert.equal(direcaoDaAlavanca(quase, 0, null), null);
  assert.equal(direcaoDaAlavanca(quase, 0, 'dir'), 'dir');
  assert.equal(direcaoDaAlavanca(ZONA_MORTA * 0.5, 0, 'dir'), null);
});

test('botões com borda: toque rápido vale um tick; segurado entrega um tick solto antes de reapertar', () => {
  const b = criarBotoes();
  b.apertar('bomba');
  b.soltar('bomba');
  assert.equal(b.ler('bomba'), true, 'apertou e soltou entre dois ticks: não se perde');
  assert.equal(b.ler('bomba'), false);
  b.apertar('bomba');
  assert.equal(b.ler('bomba'), true);
  assert.equal(b.ler('bomba'), true, 'segurado');
  b.apertar('bomba', false); // novo toque (outro dedo) com o botão ainda apertado
  assert.equal(b.ler('bomba'), false, 'um tick solto para a simulação ver a nova borda');
  assert.equal(b.ler('bomba'), true);
  b.limpar();
  assert.equal(b.ler('bomba'), false);
});

test('densidade adaptativa: só desce com quadros lentos por 0,8 s seguidos, até o degrau que cabe, e nunca sobe', async () => {
  const { criarDensidade } = await import('../../bomberolho/js/render/densidade.js');
  const d = criarDensidade(3);
  let t = 0;
  const quadros = (ms, n) => { let mudou = 0; for (let k = 0; k < n; k++) { t += ms; if (d.registrar(ms, t)) mudou++; } return mudou; };
  assert.equal(d.valor, 2, 'teto 2 mesmo em tela 3×');
  assert.equal(quadros(16.7, 600), 0, 'fluido: fica');
  assert.equal(quadros(26, 22), 0, '0,6 s lento ainda não basta');
  assert.equal(quadros(26, 30), 1);
  assert.equal(d.valor, 1.5, 'um pouco lento: um degrau');
  quadros(16.7, 1000);
  assert.equal(d.valor, 1.5, 'não sobe de volta (a imagem não "pulsa")');
  quadros(45, 400);
  assert.equal(d.valor, 1, 'chega ao piso');
  const e = criarDensidade(2);
  t = 0;
  for (let k = 0; k < 60; k++) { t += 50; e.registrar(50, t); }
  assert.equal(e.valor, 1, 'muito lento (20 qps): pula direto para 1');
  assert.equal(criarDensidade(1).valor, 1);
  assert.equal(criarDensidade(3, 1.25).valor, 1.25, 'fixada pela URL');
});
