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

test('itens repartidos por quadrante: cada canto recebe exatamente a sua parte, e a cruz do meio não come a cota de ninguém', () => {
  for (const id of ORDEM_ARENAS) {
    for (const s of SEMENTES.slice(0, 30)) {
      const m = criarMundo({ semente: s, arena: id });
      const por = [0, 0, 0, 0, 0];
      const gotas = [0, 0, 0, 0, 0];
      m.ocultos.forEach((t, i) => { if (!t) return; por[quadrante(i)]++; if (t === 'gota' || t === 'alcance') gotas[quadrante(i)]++; });
      const cantos = por.slice(0, 4);
      // Os quatro cantos recebem a mesma cota (±1); a cruz do meio, de ninguém, também ganha a sua.
      assert.ok(Math.max(...cantos) - Math.min(...cantos) <= 1, `${id} ${s}: ${por}`);
      assert.ok(por[4] >= 1, `${id} ${s}: meio sem itens ${por}`);
      for (const q of gotas.slice(0, 4)) assert.ok(q >= 2, `${id} ${s}: Frasquinho/Lupa por quadrante ${gotas}`);
      const fg = gotas.slice(0, 4);
      assert.ok(Math.max(...fg) - Math.min(...fg) <= 1, `${id} ${s}: Frasquinho/Lupa iguais por canto ${gotas}`);
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

test('túnel da Caverna: sai de um lado e entra pelo outro, sem nunca parar na moldura', () => {
  const m = criarMundo({ semente: 5, arena: 'caverna' });
  const j = m.jogadores[0];
  for (let c = 1; c <= 13; c++) if (m.grade[5 * 15 + c] === K.BLOCO) m.grade[5 * 15 + c] = K.VAZIO;
  // Bocas nas linhas 5 e 7: longe do "L" de largada (linhas 1–2 e 10–11).
  for (const l of [5, 7]) {
    assert.equal(m.grade[l * 15], K.TUNEL);
    assert.equal(m.grade[l * 15 + 14], K.TUNEL);
  }
  for (let l = 0; l < 13; l++) if (l !== 5 && l !== 7) assert.notEqual(m.grade[l * 15], K.TUNEL);
  posicionar(m, 0, centro(1), centro(5));
  let tick = 0;
  let atravessou = null;
  for (; tick < 60; tick++) {
    passo(m, [e('esq')]);
    const col = Math.floor(j.x / 1000);
    assert.ok(col >= 1 && col <= 13, `centro do corpo sempre dentro da arena (x=${j.x})`);
    if (atravessou === null && col === 13) atravessou = tick;
  }
  assert.ok(atravessou !== null && atravessou <= 12, `reapareceu do lado direito em ${atravessou} ticks (meia casa)`);
  assert.ok(j.x < centro(13), 'e seguiu andando para a esquerda');
  // E de volta pela direita.
  posicionar(m, 0, centro(13), centro(5));
  avancar(m, 40, [e('dir')]);
  assert.ok(j.x >= 1000 && j.x < centro(3), `voltou pelo outro lado (x=${j.x})`);
});

test('túnel: parado empurrando a boca, ninguém fica na moldura; com o outro lado murado, não passa', () => {
  const m = criarMundo({ semente: 5, arena: 'caverna' });
  const j = m.jogadores[0];
  // Do outro lado a casa (13,5) foi murada pelo aperto: a boca fica fechada.
  m.grade[5 * 15 + 13] = K.MURO;
  posicionar(m, 0, centro(1), centro(5));
  avancar(m, 60, [e('esq')]);
  assert.equal(j.x, centro(1), 'para no centro da casa (1,5), sem entrar na boca');
  // Gota do outro lado também fecha a passagem (como qualquer obstáculo).
  m.grade[5 * 15 + 13] = K.VAZIO;
  const r = m.jogadores[1];
  posicionar(m, 1, centro(13), centro(5));
  soltarGota(m, r);
  posicionar(m, 1, centro(13), centro(9));
  avancar(m, 3, []);
  avancar(m, 60, [e('esq')]);
  assert.equal(j.x, centro(1), 'gota no lado oposto segura quem vem pelo túnel');
});

test('túnel não deixa passar respingo nem gota chutada, e não aceita gota dentro', () => {
  const m = criarMundo({ semente: 5, arena: 'caverna' });
  const j = m.jogadores[0];
  j.alcance = 8;
  posicionar(m, 0, centro(1), centro(5));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(1), centro(1));
  g.pavio = 1;
  passo(m);
  assert.equal(m.respingos[0].bracos.esq, 0, 'braço para no túnel');
  posicionar(m, 0, centro(0), centro(5));
  assert.equal(soltarGota(m, j), null);
});

test('túnel não é esconderijo: quem fica junto da boca é molhado e esmagado como todo mundo', () => {
  // Reproduz o roteiro do parecer (antes: ficava em x=675, imune a tudo).
  const m = criarMundo({ semente: 5, arena: 'caverna', duracao: 7200 });
  const j = m.jogadores[0];
  for (let c = 1; c <= 5; c++) if (m.grade[5 * 15 + c] === K.BLOCO) m.grade[5 * 15 + c] = K.VAZIO;
  posicionar(m, 0, centro(1), centro(5));
  // Empurra a boca até parar de vez: nunca fica na moldura.
  for (let k = 0; k < 6; k++) passo(m, [e('esq')]);
  assert.ok(Math.floor(j.x / 1000) >= 1, `ainda dentro da arena (x=${j.x})`);
  const r = m.jogadores[1];
  posicionar(m, 1, centro(3), centro(5));
  r.alcance = 8;
  soltarGota(m, r);
  posicionar(m, 1, centro(3), centro(9));
  for (let k = 0; k < 200 && j.vivo; k++) passo(m, []);
  assert.equal(j.vivo, false, 'o respingo na mesma linha alcança quem está junto da boca');
});

test('aperto final completo: ninguém sobrevive fora do miolo, em nenhuma casa de nenhuma arena', () => {
  for (const id of ORDEM_ARENAS) {
    const m = criarMundo({ semente: 7, arena: id, duracao: 7200 });
    // Um jogador "fantasma" em cada casa livre que o miolo não salva:
    // roda o aperto inteiro e confere que toda casa fora do miolo virou sólida.
    m.tempoRestante = m.ajuste.inicioAperto + 1;
    // Os quatro esperam no miolo (o mundo só segue com mais de um de pé).
    [[7, 5], [7, 6], [7, 7], [6, 5]].forEach(([c, l], k) => posicionar(m, k, centro(c), centro(l)));
    for (let k = 0; k < m.ajuste.inicioAperto - 60 && m.fase === 'jogando'; k++) passo(m);
    assert.equal(m.aperto.indice, m.aperto.seq.length, `${id}: aperto terminou`);
    const livres = [];
    for (let i = 0; i < m.grade.length; i++) if (m.grade[i] === K.VAZIO || m.grade[i] === K.BLOCO) livres.push(i);
    for (const i of livres) {
      const c = i % 15;
      const l = Math.floor(i / 15);
      assert.ok(c >= 6 && c <= 8 && l >= 5 && l <= 7, `${id}: casa (${c},${l}) escapou do aperto`);
    }
    // E as bocas do túnel não levam a lugar nenhum fora do miolo.
    for (let i = 0; i < m.grade.length; i++) {
      if (m.grade[i] !== K.TUNEL) continue;
      const l = Math.floor(i / 15);
      assert.notEqual(m.grade[l * 15 + 1], K.VAZIO);
      assert.notEqual(m.grade[l * 15 + 13], K.VAZIO);
    }
  }
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
