// Parte 2 — IA em três níveis: leitura de perigo com tempo, fuga planejada,
// sem trapaça, nunca parada sem motivo, calma inicial no Fácil e uso dos
// itens avançados e bichinhos.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { mapa, passo, centro, posicionar } from './ajuda.mjs';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';
import { analisar, alcanceDaGota, secaDurante, secaDesde, SEGURO, SEMPRE } from '../../bomberolho/js/ia/perigo.js';
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
  // A boca é um portal sem largura: da casa (1,5), à esquerda vem (13,5).
  assert.ok(vizinhos(m, 5 * 15 + 1).some(([v, d]) => v === 5 * 15 + 13 && d === 'esq'));
  assert.ok(vizinhos(m, 5 * 15 + 13).some(([v, d]) => v === 5 * 15 + 1 && d === 'dir'));
  assert.ok(!vizinhos(m, 3 * 15 + 1).some(([v]) => v % 15 === 13), 'linha 3 não tem túnel');
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

test('"solta e chuta": com Chute-Pisca, o Difícil chuta a gota colada contra o rival (M3), e só se continuar a salvo', () => {
  // Robô em (2,1), gota dele em (3,1) com pavio andando; rival lá no fim do corredor.
  const m = mapa('###########', '#1.......2#', '#.#.#.#.#.#', '#.........#', '###########');
  const [j, rival] = m.jogadores;
  j.chute = true;
  j.alcance = 2;
  posicionar(m, 0, centro(3), centro(1));
  const g = soltarGota(m, j);
  g.pavio = 120;
  posicionar(m, 0, centro(2), centro(1));
  g.passantes = [];
  m.tick = 600; // já passou a "calma" do Difícil
  const r = criarRobo(0, 'dificil', 1);
  let chutou = false;
  for (let t = 0; t < 4 && !chutou; t++) {
    passo(m, [decidir(r, m), {}]);
    chutou = m.eventos.some((ev) => ev.tipo === 'chute' && ev.jogador === 0);
  }
  assert.ok(chutou, 'chutou a gota para a direita');
  assert.equal(r.contas.chutes, 1);
  for (let t = 0; t < 200; t++) passo(m, [decidir(r, m), {}]);
  assert.equal(j.vivo, true, 'quem chutou ficou a salvo');
  assert.equal(rival.vivo, false, 'o rival parado no fim do corredor foi molhado');
});

test('chute não atravessa respingo: gota chutada para dentro de um respingo estouraria colada em quem chutou', () => {
  const m = mapa('###########', '#1.......2#', '#.#.#.#.#.#', '#.........#', '###########');
  const [j] = m.jogadores;
  j.chute = true;
  posicionar(m, 0, centro(3), centro(1));
  const g = soltarGota(m, j);
  g.pavio = 120;
  posicionar(m, 0, centro(2), centro(1));
  g.passantes = [];
  // Um respingo de outra gota cruzando o corredor em (5,1).
  m.tick = 600;
  m.respingos.push({ id: 99, col: 5, lin: 3, dono: 1, disparadoPor: null, t: 30, bracos: { cima: 2, baixo: 0, esq: 0, dir: 0 } });
  const r = criarRobo(0, 'dificil', 1);
  passo(m, [decidir(r, m), {}]);
  assert.ok(!m.eventos.some((ev) => ev.tipo === 'chute'), 'não chutou para dentro do respingo');
});

test('antes da "calma" do nível, nenhum robô solta gota cuja cruz pegue um rival — nem para abrir bloco', () => {
  // O bloco mais perto do robô (2,3) abre com uma gota em (1,3), cuja cruz
  // pegaria o humano parado no canto (1,1). Ele tem de abrir outro.
  for (const nivel of Object.keys(NIVEIS)) {
    const m = mapa('#######', '#1....#', '#.#.#.#', '#2BBBB#', '#######');
    const r = criarRobo(1, nivel, 3);
    m.tempoRestante = m.ajuste.duracaoRodada; // relógio no começo: dentro da calma de todos
    let gotas = 0;
    for (let t = 0; t < 150; t++) {
      passo(m, [{}, decidir(r, m)]);
      for (const ev of m.eventos) {
        if (ev.tipo !== 'gota') continue;
        gotas++;
        const g = m.gotas.find((o) => o.col === ev.col && o.lin === ev.lin);
        const cruz = alcanceDaGota(m, g, new Set());
        assert.ok(!cruz.includes(1 * 7 + 1), `${nivel}: gota em (${ev.col},${ev.lin}) pegaria o humano`);
      }
    }
    assert.ok(gotas > 0, `${nivel}: abriu bloco por outro lado`);
    assert.equal(m.jogadores[0].vivo, true, nivel);
  }
});

test('nota de ataque: rival que não corre perigo nenhum não conta como "encurralado" (bug da armadilha)', async () => {
  const { apertoDaFuga } = await import('../../bomberolho/js/ia/caminhos.js');
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#......2#', '#########');
  const rival = m.jogadores[1];
  const an = analisar(m, [{ col: 1, lin: 1, pavio: 160, alcance: 2 }]);
  assert.equal(an.primeiro[3 * 9 + 7], SEGURO);
  assert.equal(apertoDaFuga(m, rival, an, casasComGota(m, rival), false), 0);
  // Na cruz, num corredor aberto: foge com folga (1), não "apertado" (2).
  posicionar(m, 1, centro(3), centro(1));
  const an2 = analisar(m, [{ col: 1, lin: 1, pavio: 160, alcance: 3 }]);
  assert.equal(apertoDaFuga(m, rival, an2, casasComGota(m, rival), true), 1);
});

test('Saltinho da IA nunca pula para um buraco sem saída (ficaria preso sem o bichinho)', async () => {
  const { fugaComBichinho } = await import('../../bomberolho/js/ia/taticas.js');
  const montar = (linha2) => {
    const m = mapa('#######', '#1B.B.#', linha2, '#B....#', '#######');
    const j = m.jogadores[0];
    j.montaria = { tipo: 'saltinho' };
    return { m, j, an: analisar(m, [{ col: 1, lin: 1, pavio: 60, alcance: 1 }]) };
  };
  const preso = montar('#.#B#.#'); // (3,1) cercado: bloco à esquerda, à direita e embaixo
  assert.equal(fugaComBichinho(preso.m, preso.j, preso.an, 0), null);
  const livre = montar('#.#.#.#'); // agora (3,1) tem saída por baixo
  assert.deepEqual(fugaComBichinho(livre.m, livre.j, livre.an, 0)?.[0]?.dir, true);
});
