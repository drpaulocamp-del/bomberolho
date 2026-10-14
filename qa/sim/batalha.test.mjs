// Parte 2 — regras da batalha: contagem, relógio, aperto final em espiral,
// empate, troféus e fim de partida.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { sequenciaDoAperto, proximaQueda, cantoInicialDoAperto } from '../../bomberolho/js/sim/aperto.js';
import { criarPartida, registrarRodada, sementeDaRodada, limiteDeRodadas, molhadosNaRodada } from '../../bomberolho/js/sim/partida.js';
import { criarAjuste } from '../../bomberolho/js/sim/ajustes.js';
import { Jogo, INTERVALO } from '../../bomberolho/js/jogo.js';

test('contagem "3, 2, 1, já!": ninguém anda nem solta gota até o "já"', () => {
  const m = criarMundo({ semente: 4, contagem: 180, duracao: 7200 });
  assert.equal(m.fase, 'contagem');
  const contados = [];
  for (let t = 0; t < 179; t++) {
    passo(m, [e('dir', 'bomba')]);
    contados.push(...m.eventos.filter((ev) => ev.tipo === 'contagem').map((ev) => ev.n));
  }
  assert.deepEqual(contados, [2, 1], 'avisa o 2 e o 1 (o 3 aparece na largada)');
  assert.equal(m.jogadores[0].x, centro(1), 'parado na contagem');
  assert.equal(m.gotas.length, 0);
  assert.equal(m.tempoRestante, 7200, 'o relógio só corre depois do "já"');
  passo(m, [e('dir', 'bomba')]);
  assert.equal(m.fase, 'jogando');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'ja'));
  passo(m, [e('dir', 'bomba')]);
  assert.equal(m.gotas.length, 0, 'botão segurado desde a contagem não vira gota');
  assert.equal(m.jogadores[0].x, centro(1) + K.VELOCIDADE_BASE);
  assert.equal(m.tempoRestante, 7199);
});

test('relógio de 2:00: quando acaba com mais de um de pé, é empate', () => {
  const m = criarMundo({ semente: 4, duracao: 600 });
  m.ajuste = criarAjuste({ inicioAperto: 0 }); // sem aperto neste teste
  avancar(m, 599);
  assert.equal(m.fase, 'jogando');
  passo(m);
  assert.equal(m.fase, 'encerrando');
  assert.ok(m.eventos.some((ev) => ev.tipo === 'tempo'));
  avancar(m, K.ATRASO_FIM);
  assert.equal(m.fase, 'fim');
  assert.equal(m.vencedor, null);
  assert.equal(m.tempoEsgotado, true);
});

test('aperto final: espiral de fora para dentro, sentido horário, pulando pilares, até sobrar o "H" do centro', () => {
  const m = criarMundo({ semente: 4 });
  const seq = sequenciaDoAperto(m, 0);
  const cel = (i) => [i % 15, Math.floor(i / 15)];
  assert.deepEqual(seq.slice(0, 3).map(cel), [[1, 1], [2, 1], [3, 1]], 'começa no canto de cima à esquerda, para a direita');
  assert.deepEqual(cel(seq[12]), [13, 1]);
  assert.deepEqual(cel(seq[13]), [13, 2], 'desce pela direita');
  assert.ok(seq.every((i) => m.grade[i] !== K.PILAR), 'nunca cai em pilar');
  assert.equal(new Set(seq).size, seq.length, 'nenhuma casa repetida');
  const sobra = [];
  for (let l = 1; l < 12; l++) for (let c = 1; c < 14; c++) {
    const i = l * 15 + c;
    if (m.grade[i] !== K.PILAR && !seq.includes(i)) sobra.push(`${c},${l}`);
  }
  assert.deepEqual(sobra.sort(), ['6,5', '6,7', '7,5', '7,6', '7,7', '8,5', '8,7']);
  // Anel de fora inteiro antes do segundo anel.
  const anel = (i) => { const [c, l] = cel(i); return Math.min(c - 1, l - 1, 13 - c, 11 - l); };
  for (let k = 1; k < seq.length; k++) assert.ok(anel(seq[k]) >= anel(seq[k - 1]) || anel(seq[k]) === 4, `ordem do anel em ${k}`);
});

test('aperto final: o canto onde a espiral começa é sorteado por rodada (M2), sempre a mesma espiral girada', () => {
  const m = criarMundo({ semente: 4 });
  const cel = (i) => `${i % 15},${Math.floor(i / 15)}`;
  const base = new Set(sequenciaDoAperto(m, 0));
  const quinas = ['1,1', '13,1', '1,11', '13,11'];
  for (let canto = 0; canto < 4; canto++) {
    const seq = sequenciaDoAperto(m, canto);
    assert.equal(cel(seq[0]), quinas[canto], `começa no canto ${canto}`);
    assert.deepEqual(new Set(seq), base, 'mesmas casas, mesmo "H" no fim');
    assert.equal(seq.length, base.size);
  }
  // A semente decide o canto, em partes iguais.
  const n = [0, 0, 0, 0];
  for (let s = 0; s < 4000; s++) n[cantoInicialDoAperto(s)]++;
  for (const v of n) assert.ok(v > 900 && v < 1100, `cantos equilibrados: ${n}`);
  assert.equal(sequenciaDoAperto(m)[0], sequenciaDoAperto(m, cantoInicialDoAperto(4))[0]);
});

test('aperto final cai no ritmo certo, avisa a próxima casa, esmaga quem está embaixo e some com gota e item', () => {
  const m = criarMundo({ semente: 3, duracao: 3700 }); // semente cuja espiral começa em (1,1)
  const r = m.ajuste;
  avancar(m, 3700 - r.inicioAperto - 1);
  assert.equal(m.aperto.ativo, false);
  passo(m);
  assert.equal(m.aperto.ativo, true);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'aperto'));
  const total = m.aperto.seq.length;
  assert.equal(m.aperto.ritmo, Math.floor((r.inicioAperto - K.SOBRA_APERTO) / total));
  assert.equal(proximaQueda(m), 16, 'a primeira casa a cair, (1,1), já fica marcada');
  // O jogador 0 continua no canto (1,1): será esmagado; um item em (2,1) some.
  m.itens[17] = 'gota';
  avancar(m, m.aperto.ritmo);
  assert.equal(m.grade[16], K.MURO);
  assert.equal(m.jogadores[0].vivo, false);
  assert.equal(m.jogadores[0].eliminadoPor, null);
  avancar(m, m.aperto.ritmo);
  assert.equal(m.grade[17], K.MURO);
  assert.equal(m.itens[17], null);
  // Até o fim do relógio, todas as peças caíram e sobra tempo no miolo.
  avancar(m, m.aperto.ritmo * total);
  assert.ok(m.aperto.indice === total || m.fase !== 'jogando');
});

test('peça do aperto não deixa ninguém dentro da parede: quem estava com meio corpo embaixo é empurrado', () => {
  const m = criarMundo({ semente: 3, duracao: 3700 });
  posicionar(m, 1, centro(1), centro(2) - 300); // centro em (1,2), meio corpo em (1,1), a primeira a cair
  avancar(m, 3700 - m.ajuste.inicioAperto);
  avancar(m, m.aperto.ritmo);
  assert.equal(m.grade[16], K.MURO);
  assert.equal(m.jogadores[1].vivo, true);
  assert.equal(m.jogadores[1].y, centro(2), 'empurrado para o centro da própria casa');
});

test('partida: troféu para o vencedor, empate não conta, campeão com N vitórias, limite contra partida infinita', () => {
  const p = criarPartida(2, 4);
  registrarRodada(p, 1);
  registrarRodada(p, null);
  assert.deepEqual(p.vitorias, [0, 1, 0, 0]);
  assert.equal(p.rodada, 3);
  assert.equal(p.encerrada, false);
  registrarRodada(p, 1);
  assert.equal(p.campeao, 1);
  assert.equal(p.encerrada, true);
  assert.deepEqual(criarPartida(9).alvo, 3, 'no máximo 3');
  assert.deepEqual(criarPartida(-5).alvo, 1, 'no mínimo 1');
  const q = criarPartida(1, 4);
  for (let k = 0; k < 20 && !q.encerrada; k++) registrarRodada(q, null);
  assert.equal(q.historico.length, limiteDeRodadas(1));
  assert.equal(q.campeao, null, 'empate em todas: partida empatada, mas acaba');
  const r = criarPartida(3, 4);
  for (const v of [0, 1, null, 0, null, 1, null, null, 2]) registrarRodada(r, v);
  assert.equal(r.encerrada, true);
  assert.equal(r.campeao, null, 'empate no topo depois do limite');
});

test('no limite de rodadas, empate nos troféus desempata por rivais molhados; empate nisso também, partida empatada', () => {
  const p = criarPartida(2, 4);
  registrarRodada(p, 0, [0, 0, 0, 1]);
  registrarRodada(p, 3, [0, 0, 0, 1]);
  registrarRodada(p, null, [2, 0, 0, 0]);
  registrarRodada(p, null, [0, 0, 0, 0]);
  registrarRodada(p, null, [0, 0, 0, 0]);
  assert.equal(p.encerrada, true);
  assert.deepEqual(p.vitorias, [1, 0, 0, 1]);
  assert.deepEqual(p.molhados, [2, 0, 0, 2]);
  assert.equal(p.campeao, null, '1×1 em troféus e 2×2 em molhados');
  const q = criarPartida(1, 4);
  registrarRodada(q, null, [1, 0, 0, 0]);
  registrarRodada(q, null, [0, 2, 0, 0]);
  registrarRodada(q, null, [0, 1, 0, 0]);
  assert.equal(q.campeao, 1, 'ninguém com troféu: leva quem molhou mais');
  assert.equal(q.desempate, true);
  const m = { jogadores: [{ id: 0, vivo: true, eliminadoPor: null }, { id: 1, vivo: false, eliminadoPor: 0 }, { id: 2, vivo: false, eliminadoPor: 2 }, { id: 3, vivo: false, eliminadoPor: null }] };
  assert.deepEqual(molhadosNaRodada(m), [1, 0, 0, 0], 'molhar a si mesmo e cair no aperto não contam');
});

test('cada rodada tem arena própria (semente derivada), mas reprodutível', () => {
  assert.equal(sementeDaRodada(99, 1), 99);
  assert.notEqual(sementeDaRodada(99, 2), 99);
  assert.equal(sementeDaRodada(99, 2), sementeDaRodada(99, 2));
});

test('controlador: placar entre rodadas, rodada seguinte, taça no fim (partida de robôs inteira)', () => {
  const jogo = new Jogo();
  jogo.demo = true;
  jogo.iniciar({ semente: 77, dificuldade: 'facil', rodadas: 1 });
  assert.equal(jogo.tela, 'jogando');
  assert.equal(jogo.mundo.fase, 'contagem');
  let viuIntervalo = false;
  let rodadas = 0;
  for (let t = 0; t < 60 * 60 * 20 && !jogo.partida.encerrada; t++) {
    jogo.tick();
    if (jogo.tela === 'intervalo') viuIntervalo = true;
    rodadas = jogo.partida.historico.length;
  }
  assert.equal(jogo.partida.encerrada, true);
  assert.equal(jogo.tela, 'resultado');
  if (rodadas > 1) assert.ok(viuIntervalo, 'empate antes do campeão mostra o placar entre rodadas');
  const j2 = new Jogo();
  j2.demo = true;
  j2.iniciar({ semente: 77, rodadas: 3 });
  while (!j2.partida.historico.length) j2.tick();
  assert.equal(j2.tela, 'intervalo');
  assert.equal(j2.intervalo, INTERVALO);
  const mundoAntes = j2.mundo;
  j2.pularIntervalo();
  assert.notEqual(j2.mundo, mundoAntes, 'pular o placar começa a rodada seguinte');
  assert.equal(j2.partida.rodada, 2);
  assert.equal(j2.mundo.fase, 'contagem');
});
