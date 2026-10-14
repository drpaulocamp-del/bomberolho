// Parte 2 — IA em três níveis: leitura de perigo com tempo, fuga planejada,
// sem trapaça, nunca parada sem motivo, calma inicial no Fácil e uso dos
// itens avançados e bichinhos.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { mapa, passo, centro, posicionar } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';
import { analisar, secaDurante, secaDesde, SEGURO, SEMPRE } from '../../bomberolho/js/ia/perigo.js';
import { planejarFuga, casasComGota, vizinhos } from '../../bomberolho/js/ia/caminhos.js';
import { criarRobo, decidir, NIVEIS } from '../../bomberolho/js/ia/robo.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

test('sem trapaça: a IA nunca lê os itens escondidos nem o gerador do mundo', () => {
  const pasta = new URL('../../bomberolho/js/ia/', import.meta.url);
  for (const nome of readdirSync(pasta)) {
    const codigo = readFileSync(new URL(nome, pasta), 'utf8');
    assert.doesNotMatch(codigo, /\.ocultos|m\.rng|sortearNoMundo/, nome);
  }
});

test('leitura de perigo com janelas de tempo: cruz, fim da janela e cadeia', () => {
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
  const j = m.jogadores[0];
  j.gotas = 3;
  posicionar(m, 0, centro(3), centro(1));
  const a = soltarGota(m, j);
  a.pavio = 50;
  posicionar(m, 0, centro(5), centro(1));
  const b = soltarGota(m, j);
  b.pavio = 150;
  const an = analisar(m);
  const i = (c, l) => l * 9 + c;
  assert.equal(an.primeiro[i(4, 1)], 50);
  assert.equal(an.primeiro[i(7, 1)], 50, 'b vai junto, na cadeia');
  assert.equal(secaDurante(an, i(4, 1), 0, 49), true);
  assert.equal(secaDurante(an, i(4, 1), 60, 70), false);
  assert.equal(secaDesde(an, i(4, 1), 50 + m.ajuste.duracaoRespingo), true, 'depois do respingo, seca de novo');
  assert.equal(an.primeiro[i(1, 3)], SEGURO);
});

test('a peça do aperto entra na leitura como perigo para sempre', () => {
  const j = new Jogo().iniciar({ semente: 3, contagem: false });
  j.mundo.tempoRestante = j.ajuste.inicioAperto + 1;
  j.passos(2);
  const an = analisar(j.mundo);
  const i = j.mundo.aperto.seq[0];
  const k = an.janelas[i];
  assert.ok(k && k[1] === SEMPRE);
});

test('fuga planejada respeita o tempo: não passa por casa que vai estar molhada na hora', () => {
  // Corredor em L: a saída curta passa pela cruz de uma gota que estoura logo.
  const m = mapa('#######', '#1....#', '#.#.#.#', '#.....#', '#######');
  const j = m.jogadores[0];
  j.gotas = 2;
  j.alcance = 4;
  posicionar(m, 0, centro(3), centro(3));
  const ameaca = soltarGota(m, j);
  ameaca.passantes = [];
  ameaca.pavio = 30; // cobre a linha 3 e a coluna 3 daqui a 0,5 s
  posicionar(m, 0, centro(1), centro(1));
  const minha = soltarGota(m, j); // e a própria gota embaixo, com pavio cheio
  const an = analisar(m);
  const plano = planejarFuga(m, j, an, casasComGota(m, j), { margem: 4, origemBloqueada: true });
  assert.ok(minha);
  assert.equal(plano.ok, true);
  // O caminho curto pela linha 1 cruza a coluna 3 bem quando ela está molhada;
  // o plano espera em cima da própria gota e desce pela coluna 1 depois do respingo.
  assert.equal(plano.caminho[1], 8, 'primeiro passo: esperar');
  assert.ok(!plano.caminho.includes(10), 'não passa por (3,1)');
  assert.ok(secaDesde(an, plano.destino, plano.chegada), 'chega num lugar que fica seco');
});

test('vizinhança dos robôs atravessa os túneis da Caverna', () => {
  const j = new Jogo().iniciar({ semente: 3, arena: 'caverna', contagem: false });
  const m = j.mundo;
  const tunelEsq = 3 * 15;
  assert.ok(vizinhos(m, tunelEsq).some(([v, d]) => v === 3 * 15 + 14 && d === 'esq'));
});

test('robô foge da própria gota em todos os níveis', () => {
  for (const nivel of Object.keys(NIVEIS)) {
    const m = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
    const r = criarRobo(0, nivel, 1);
    m.jogadores[0].x = centro(3);
    soltarGota(m, m.jogadores[0]);
    for (let t = 0; t < 220; t++) passo(m, [decidir(r, m)]);
    assert.equal(m.jogadores[0].vivo, true, nivel);
  }
});

function rodadaDeRobos(dificuldade, semente, arena = 'jardim') {
  const jogo = new Jogo();
  jogo.demo = true;
  jogo.iniciar({ semente, dificuldade, arena, rodadas: 1 });
  const m = jogo.mundo;
  const parado = [0, 0, 0, 0];
  const pior = [0, 0, 0, 0];
  const antes = m.jogadores.map((p) => [p.x, p.y]);
  let ataquesCedo = 0;
  while (jogo.mundo === m && m.fase !== 'fim') {
    jogo.tick();
    const jogado = m.ajuste.duracaoRodada - m.tempoRestante;
    if (jogado < NIVEIS.facil.calma) ataquesCedo = jogo.robos.reduce((s, r) => s + r.contas.ataques, 0);
    m.jogadores.forEach((p, k) => {
      if (m.fase !== 'jogando' || !p.vivo) { parado[k] = 0; return; }
      parado[k] = antes[k][0] === p.x && antes[k][1] === p.y ? parado[k] + 1 : 0;
      pior[k] = Math.max(pior[k], parado[k]);
      antes[k] = [p.x, p.y];
    });
  }
  return { m, pior, ataquesCedo, robos: jogo.robos };
}

test('Fácil não ataca ninguém nos primeiros 20 s (só abre blocos e pega itens)', () => {
  for (const s of [1, 2, 3]) assert.equal(rodadaDeRobos('facil', s).ataquesCedo, 0, `semente ${s}`);
});

test('robôs nunca ficam parados sem motivo: no máximo alguns segundos esperando uma gota estourar', () => {
  for (const [nivel, s, arena] of [['facil', 4, 'lago'], ['medio', 5, 'caverna'], ['dificil', 6, 'vale']]) {
    const { pior } = rodadaDeRobos(nivel, s, arena);
    for (const p of pior) assert.ok(p < 60 * 8, `${nivel}/${arena}: parado ${p} ticks`);
  }
});

test('Médio e Difícil usam as táticas (Pinça, chute, emboscada) e os bichinhos ao longo de algumas rodadas', () => {
  let taticas = 0;
  let poderes = 0;
  for (const s of [7, 8, 9, 10]) {
    const jogo = new Jogo();
    jogo.demo = true;
    jogo.iniciar({ semente: s, dificuldade: 'dificil', arena: 'vale', rodadas: 1 });
    const m = jogo.mundo;
    while (jogo.mundo === m && m.fase !== 'fim') {
      jogo.tick();
      for (const ev of m.eventos) if (['arremesso', 'chute', 'salto', 'disparada', 'defendeu'].includes(ev.tipo)) poderes++;
    }
    taticas += jogo.robos.reduce((t, r) => t + r.contas.taticas + r.contas.ataques, 0);
  }
  assert.ok(taticas > 20, `ataques e táticas: ${taticas}`);
  assert.ok(poderes > 0, `poderes e itens avançados usados: ${poderes}`);
});
