// Parte 4 — mudanças de regra/IA desta parte: aperto suave no Fácil, robôs do
// Fácil que poupam a criança.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, criarMundo, K } from './ajuda.mjs';
import { criarRobo, decidir, NIVEIS } from '../../bomberolho/js/ia/robo.js';
import { sequenciaDoAperto } from '../../bomberolho/js/sim/aperto.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

const VAZIA = { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false };

test('aperto suave (Fácil): mesmas peças e mesmo começo, caindo mais devagar até 10 s do fim', () => {
  const normal = criarMundo({ semente: 9, arena: 'jardim', duracao: 7200 });
  const suave = criarMundo({ semente: 9, arena: 'jardim', duracao: 7200, apertoSuave: true });
  for (const m of [normal, suave]) {
    m.fase = 'jogando';
    m.tempoRestante = m.ajuste.inicioAperto + 1;
    avancar(m, 3);
  }
  assert.deepEqual(suave.aperto.seq, normal.aperto.seq);
  const total = sequenciaDoAperto(normal).length;
  assert.equal(normal.aperto.ritmo, Math.floor((normal.ajuste.inicioAperto - K.SOBRA_APERTO) / total));
  assert.equal(suave.aperto.ritmo, Math.floor((suave.ajuste.inicioAperto - K.SOBRA_APERTO_SUAVE) / total));
  assert.ok(suave.aperto.ritmo > normal.aperto.ritmo * 1.2);
});

test('a partida no Fácil usa o aperto suave; Médio e Difícil, o normal', () => {
  for (const [dificuldade, suave] of [['facil', true], ['medio', false], ['dificil', false]]) {
    const j = new Jogo().iniciar({ semente: 3, dificuldade });
    assert.equal(j.mundo.aperto.suave, suave, dificuldade);
  }
});

test('Fácil poupa a criança: não solta gota cuja cruz pegue a casa dela (mas solta longe dela)', () => {
  // Robô (2) encostado num bloco; a criança (1) parada na mesma linha, no alcance.
  const m = mapa('#########', '#1.2B...#', '#.#.#.#.#', '#.......#', '#########');
  m.fase = 'jogando';
  m.tempoRestante = 7000;
  const nivel = { ...NIVEIS.facil, calma: 0, erro: 0 };
  const r = criarRobo(1, nivel, 5, 0);
  let soltou = 0;
  for (let k = 0; k < 400; k++) {
    const e = decidir(r, m);
    if (e.bomba) soltou++;
    passo(m, [VAZIA, e]);
  }
  assert.equal(soltou, 0, 'com a criança na cruz, não soltou');
  // O mesmo robô, sem poupar, solta (o bloco vale a pena).
  const m2 = mapa('#########', '#1.2B...#', '#.#.#.#.#', '#.......#', '#########');
  m2.fase = 'jogando';
  m2.tempoRestante = 7000;
  const r2 = criarRobo(1, { ...nivel, poupaHumano: false }, 5, 0);
  let soltou2 = 0;
  for (let k = 0; k < 400 && !soltou2; k++) {
    const e = decidir(r2, m2);
    if (e.bomba) soltou2++;
    passo(m2, [VAZIA, e]);
  }
  assert.ok(soltou2 > 0, 'sem a regra, soltaria');
});

test('só o Fácil poupa a criança', () => {
  assert.equal(NIVEIS.facil.poupaHumano, true);
  assert.ok(!NIVEIS.medio.poupaHumano && !NIVEIS.dificil.poupaHumano);
});
