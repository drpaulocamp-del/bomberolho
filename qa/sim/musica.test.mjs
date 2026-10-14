// Música por arena: forma longa sem repetição seguida (8 voltas, nenhuma igual
// à anterior), ciclo de mais de um minuto e notas dentro de uma faixa que o
// alto-falante de celular toca. Roda em Node com um contexto de áudio de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMAS, Sequenciador } from '../../bomberolho/js/audio/musica.js';

/** Contexto falso: cada oscilador anota a frequência inicial e o instante. */
function contextoFalso(notas) {
  const param = (aoDefinir) => ({ value: 0, setValueAtTime: aoDefinir || (() => {}), exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const no = (extra = {}) => ({ connect: (d) => d, start() {}, stop() {}, ...extra });
  return {
    currentTime: 0,
    sampleRate: 48000,
    createOscillator() {
      const o = no({ type: 'sine' });
      o.frequency = param((f, t) => notas.push({ f, t }));
      return o;
    },
    createGain: () => no({ gain: param() }),
    createBufferSource: () => no({ buffer: null }),
    createBiquadFilter: () => no({ type: '', frequency: param(), Q: { value: 1 } }),
  };
}

for (const [nome, tema] of Object.entries(TEMAS)) {
  test(`trilha ${nome}: 4 frases, 8 voltas diferentes da anterior, ciclo ≥ 65 s`, () => {
    assert.equal(tema.frases.length, 4);
    for (const f of tema.frases) assert.equal(f.length, 32);
    const notas = [];
    const ctx = contextoFalso(notas);
    const seq = new Sequenciador(ctx, {}, null);
    const colcheia = 60 / tema.bpm / 2;
    const voltas = [];
    for (let v = 0; v < 8; v++) {
      notas.length = 0;
      for (let p = v * 32; p < (v + 1) * 32; p++) seq.tocarPasso(tema, p, p * colcheia, colcheia);
      voltas.push(notas.map((n) => `${Math.round(n.t / colcheia - v * 32)}:${Math.round(n.f)}`).join(' '));
      assert.ok(notas.every((n) => n.f >= 40 && n.f <= 5000), `${nome}: notas entre 40 Hz e 5 kHz`);
    }
    for (let v = 1; v < 8; v++) assert.notEqual(voltas[v], voltas[v - 1], `${nome}: volta ${v} igual à anterior`);
    assert.ok(new Set(voltas).size >= 7, `${nome}: ${new Set(voltas).size} voltas distintas em 8`);
    const ciclo = colcheia * 32 * 8;
    assert.ok(ciclo >= 65, `${nome}: ciclo de ${ciclo.toFixed(1)} s`);
  });
}

test('todo som começa com ganho zero (sem estalo na primeira amostra)', async () => {
  const { EFEITOS } = await import('../../bomberolho/js/audio/sintese.js');
  const ganhos = [];
  const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const no = (extra = {}) => ({ connect: (d) => d, start() {}, stop() {}, ...extra });
  const ctx = {
    currentTime: 0,
    createOscillator: () => no({ frequency: param() }),
    createGain: () => { const g = no({ gain: param() }); ganhos.push(g); return g; },
    createBufferSource: () => no(),
    createBiquadFilter: () => no({ frequency: param(), Q: { value: 1 } }),
  };
  for (const [nome, efeito] of Object.entries(EFEITOS)) {
    ganhos.length = 0;
    efeito(ctx, null, 0.01, no(), 1);
    // O ganho do vibrato (profundidade) não é envelope; os demais começam em 0.
    const envelopes = ganhos.filter((g) => g.gain.value !== 25 && g.gain.value !== 30);
    assert.ok(envelopes.length > 0 && envelopes.every((g) => g.gain.value === 0), `${nome}: ganho inicial ${envelopes.map((g) => g.gain.value)}`);
  }
});
