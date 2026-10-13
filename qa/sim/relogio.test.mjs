// Independência de quadros por segundo: o relógio de passo fixo entrega o mesmo
// número de ticks para o mesmo tempo real, seja a 30, 60, 144 fps ou irregular.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRelogio, avancarRelogio, fracaoDoTick, DT_MAXIMO_MS } from '../../bomberolho/js/nucleo/relogio.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

function ticksEm(dts, escala = 1) {
  const r = criarRelogio();
  return dts.reduce((soma, dt) => soma + avancarRelogio(r, dt, escala), 0);
}

const quadros = (fps, seg) => new Array(Math.round(fps * seg)).fill(1000 / fps);

test('10 s de jogo = 600 ticks a 30, 60, 75, 120 e 144 fps', () => {
  for (const fps of [30, 60, 75, 120, 144]) {
    const t = ticksEm(quadros(fps, 10));
    assert.ok(Math.abs(t - 600) <= 1, `${fps} fps → ${t} ticks`);
  }
});

test('quadros irregulares (engasgos) somam o mesmo tempo de jogo', () => {
  const irregular = [];
  let total = 0;
  for (let k = 0; total < 10000; k++) {
    const dt = [8, 16.7, 33.3, 5, 50, 16.7, 100][k % 7];
    irregular.push(dt);
    total += dt;
  }
  const t = ticksEm(irregular);
  assert.ok(Math.abs(t - total * 0.06) <= 1, `${t} ticks para ${total} ms`);
});

test('a mesma partida com fps diferentes chega exatamente ao mesmo estado', () => {
  const rodar = (fps) => {
    const jogo = new Jogo();
    jogo.demo = true;
    jogo.iniciar({ semente: 99 });
    for (const dt of quadros(fps, 20)) jogo.quadro(dt);
    return { tick: jogo.mundo.tick, hash: jogo.impressao() };
  };
  const a = rodar(30);
  const b = rodar(60);
  const c = rodar(120);
  assert.equal(a.tick, 1200);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test('escala de tempo: 2× roda o dobro de ticks; 0 congela', () => {
  assert.equal(ticksEm(quadros(60, 1), 2), 120);
  assert.equal(ticksEm(quadros(60, 1), 0), 0);
});

test('aba que volta do segundo plano não despeja uma avalanche de ticks', () => {
  const r = criarRelogio();
  assert.equal(avancarRelogio(r, 60000), Math.floor((DT_MAXIMO_MS * 60) / 1000));
  assert.equal(avancarRelogio(r, -5), 0, 'dt negativo é ignorado');
});

test('fração para interpolação fica entre 0 e 1', () => {
  const r = criarRelogio();
  avancarRelogio(r, 25);
  const f = fracaoDoTick(r);
  assert.ok(f >= 0 && f < 1);
  assert.ok(Math.abs(f - 0.5) < 0.01);
});
