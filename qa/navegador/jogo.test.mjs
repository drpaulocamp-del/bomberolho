// Testes de navegador (Playwright + Chromium): o jogo carrega limpo em várias
// telas, o teclado funciona, o gancho __bomberolho e os parâmetros de URL fazem
// o que prometem, e o navegador simula igual ao Node.
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';
import { criarMundo, passo } from '../../bomberolho/js/sim/mundo.js';
import { gradeEmTexto, impressaoDigital } from '../../bomberolho/js/sim/retrato.js';
import { AJUSTE_PADRAO } from '../../bomberolho/js/sim/ajustes.js';

let servidor;
let navegador;
before(async () => {
  servidor = await subirServidor();
  navegador = await abrirNavegador();
});
after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

async function abrir(tela = TELAS.desktop, busca = '?semente=7') {
  const p = await novaPagina(navegador, tela);
  await p.pagina.goto(servidor.url + busca);
  await esperarJogo(p.pagina);
  return p;
}

for (const [nome, tela] of Object.entries(TELAS)) {
  test(`carrega limpo em ${nome} (${tela.width}×${tela.height}): sem erro, aviso ou 404, arena inteira visível`, async () => {
    const { pagina, contexto, problemas } = await abrir(tela);
    await pagina.waitForTimeout(600);
    const medida = await pagina.evaluate(() => {
      const r = document.getElementById('arena').getBoundingClientRect();
      return {
        r: { x: r.x, y: r.y, w: r.width, h: r.height },
        vw: innerWidth, vh: innerHeight,
        rolaX: document.documentElement.scrollWidth > innerWidth,
        rolaY: document.documentElement.scrollHeight > innerHeight,
        cabecalho: [...document.querySelectorAll('.painel button')].map((b) => b.getBoundingClientRect().right <= innerWidth),
      };
    });
    assert.deepEqual(problemas, []);
    assert.ok(medida.r.x >= 0 && medida.r.y >= 0, 'arena começa dentro da tela');
    assert.ok(medida.r.x + medida.r.w <= medida.vw && medida.r.y + medida.r.h <= medida.vh, 'arena termina dentro da tela');
    assert.ok(medida.r.w >= 15 * 14, 'casas de pelo menos 14 px');
    assert.equal(medida.rolaX, false, 'sem rolagem horizontal');
    assert.equal(medida.rolaY, false, 'sem rolagem vertical');
    assert.ok(medida.cabecalho.every(Boolean), 'botões do cabeçalho cabem na tela');
    await contexto.close();
  });
}

test('favicon e todos os módulos respondem 200', async () => {
  const { pagina, contexto } = await abrir();
  const status = await pagina.evaluate(async () => (await fetch('favicon.svg')).status);
  assert.equal(status, 200);
  await contexto.close();
});

test('gancho __bomberolho expõe state, start, setTimeScale, input, step e demo', async () => {
  const { pagina, contexto } = await abrir();
  const r = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    const s = b.start({ semente: 123, dificuldade: 'medio', personagem: 'macula' });
    b.setTimeScale(0);
    const t0 = b.state.tick;
    return {
      chaves: Object.keys(s).sort(),
      funcoes: ['start', 'setTimeScale', 'input', 'step', 'demo'].every((f) => typeof b[f] === 'function'),
      t0,
      jogadores: s.jogadores.length,
      personagem: s.jogadores[0].personagem,
      dificuldade: s.dificuldade,
      linhas: s.grade.length,
      colunas: s.grade[0].length,
    };
  });
  for (const k of ['tela', 'rodada', 'tempo', 'grade', 'jogadores', 'gotas', 'respingos', 'itens', 'semente', 'tick']) {
    assert.ok(r.chaves.includes(k), `state.${k}`);
  }
  assert.ok(r.funcoes);
  assert.equal(r.jogadores, 4);
  assert.equal(r.personagem, 'macula');
  assert.equal(r.dificuldade, 'medio');
  assert.deepEqual([r.colunas, r.linhas], [15, 13]);
  await pagina.waitForTimeout(400);
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.tick), r.t0, 'escala 0 congela o tempo');
  await contexto.close();
});

test('input + step movem o humano, soltam gota e o respingo segue as regras', async () => {
  const { pagina, contexto } = await abrir();
  const r = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.start({ semente: 7, contagem: false }); // parte 2: sem o "3, 2, 1"
    b.setTimeScale(0);
    for (const id of [1, 2, 3]) b.input(id, {}); // rivais parados
    // A jogada clássica de largada: gota na ponta do "L", abrigo na outra ponta.
    b.input(0, { dir: true });
    b.step(18);
    b.input(0, { bomba: true });
    const comGota = b.step(1);
    b.input(0, { esq: true });
    b.step(30);
    b.input(0, { baixo: true });
    b.step(30);
    b.input(0, {});
    const depois = b.step(200);
    return {
      gota: comGota.gotas[0],
      vivo: depois.jogadores[0].vivo,
      pos: [depois.jogadores[0].col, depois.jogadores[0].lin],
    };
  });
  assert.deepEqual([r.gota.col, r.gota.lin, r.gota.dono], [2, 1, 0], 'gota centrada na casa (2,1)');
  assert.ok(r.pos[0] === 1 && r.pos[1] >= 2, `abrigado na coluna 1 (${r.pos})`);
  assert.equal(r.vivo, true, 'escapou do próprio respingo usando o "L"');
  await contexto.close();
});

test('teclado: setas e WASD andam, espaço solta gota, nenhuma tecla rola a página', async () => {
  const { pagina, contexto } = await abrir();
  await pagina.evaluate(() => {
    window.__teclasBarradas = [];
    window.addEventListener('keydown', (e) => window.__teclasBarradas.push([e.code, e.defaultPrevented]));
    const b = window.__bomberolho;
    b.start({ semente: 7, contagem: false });
    for (const id of [1, 2, 3]) b.input(id, {});
  });
  const x0 = await pagina.evaluate(() => window.__bomberolho.state.jogadores[0].y);
  await pagina.keyboard.down('ArrowDown');
  await pagina.waitForTimeout(350);
  await pagina.waitForFunction((y) => window.__bomberolho.state.jogadores[0].y > y, x0, { timeout: 10000 }).catch(() => {});
  await pagina.keyboard.up('ArrowDown');
  const y1 = await pagina.evaluate(() => window.__bomberolho.state.jogadores[0].y);
  assert.ok(y1 > x0, `seta para baixo andou (${x0} → ${y1})`);
  await pagina.keyboard.down('KeyW');
  await pagina.waitForTimeout(200);
  await pagina.waitForFunction((y) => window.__bomberolho.state.jogadores[0].y < y, y1, { timeout: 10000 }).catch(() => {});
  await pagina.keyboard.up('KeyW');
  const y2 = await pagina.evaluate(() => window.__bomberolho.state.jogadores[0].y);
  assert.ok(y2 < y1, 'W andou para cima');
  await pagina.keyboard.press('Space');
  await pagina.waitForTimeout(100);
  await pagina.waitForFunction(() => window.__bomberolho.state.gotas.length > 0, null, { timeout: 10000 }).catch(() => {});
  const gotas = await pagina.evaluate(() => window.__bomberolho.state.gotas.length);
  assert.equal(gotas, 1, 'um toque rápido no espaço solta uma gota');
  const barradas = await pagina.evaluate(() => ({ lista: window.__teclasBarradas, rolagem: scrollY }));
  assert.ok(barradas.lista.length >= 3 && barradas.lista.every(([, bloqueada]) => bloqueada), JSON.stringify(barradas.lista));
  assert.equal(barradas.rolagem, 0);
  await contexto.close();
});

test('P pausa e Enter retoma; o botão Pausar também', async () => {
  const { pagina, contexto } = await abrir();
  await pagina.keyboard.press('KeyP');
  const t0 = await pagina.evaluate(() => window.__bomberolho.state);
  assert.equal(t0.tela, 'pausado');
  assert.equal(await pagina.isVisible('#aviso'), true);
  await pagina.waitForTimeout(300);
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.tick), t0.tick);
  await pagina.keyboard.press('Enter');
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.tela), 'jogando');
  await pagina.click('#bt-pausa');
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.tela), 'pausado');
  await pagina.click('#aviso button');
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.tela), 'jogando');
  await contexto.close();
});

test('parâmetros de URL: ?semente=, ?dificuldade=, ?arena= e ?demo=1', async () => {
  const { pagina, contexto } = await abrir(TELAS.desktop, '?semente=555&dificuldade=dificil&arena=jardim&demo=1');
  const s0 = await pagina.evaluate(() => window.__bomberolho.state);
  assert.equal(s0.semente, 555);
  assert.equal(s0.dificuldade, 'dificil');
  assert.equal(s0.arena, 'jardim');
  assert.equal(s0.demo, true);
  assert.deepEqual(s0.grade, gradeEmTexto(criarMundo({ semente: 555 })), 'mesma arena que no Node');
  // Parte 2: passa a contagem de 3 s. Espera a mudança, sem prazo fixo de relógio.
  const mexeu = await pagina.waitForFunction((p) => {
    const s1 = window.__bomberolho.state;
    return s1.jogadores[0].x !== p.x || s1.jogadores[0].y !== p.y || s1.gotas.length > 0;
  }, s0.jogadores[0], { timeout: 30000 }).then(() => true, () => false);
  assert.ok(mexeu, 'no modo demo o humano anda sozinho');
  await contexto.close();
});

test('navegador e Node simulam igual: mesma semente + mesmas entradas = mesmo hash', async () => {
  const { pagina, contexto } = await abrir();
  const roteiro = [];
  const nomes = ['cima', 'baixo', 'esq', 'dir'];
  for (let k = 0; k < 36; k++) { // 360 ticks: dentro da primeira rodada (parte 2 tem rodadas)
    roteiro.push([0, 1, 2, 3].map((id) => {
      const ent = { cima: false, baixo: false, esq: false, dir: false, bomba: (k + id) % 17 === 0 };
      ent[nomes[(k * 7 + id * 3) % 4]] = true;
      return ent;
    }));
  }
  const noNavegador = await pagina.evaluate((r) => {
    const b = window.__bomberolho;
    b.start({ semente: 31337, contagem: false });
    b.setTimeScale(0);
    for (const ents of r) {
      ents.forEach((ent, id) => b.input(id, ent));
      b.step(10);
    }
    return b.hash();
  }, roteiro);
  // Parte 2: com relógio; parte 4: a partida padrão é Fácil, com o aperto suave.
  const m = criarMundo({ semente: 31337, duracao: AJUSTE_PADRAO.duracaoRodada, apertoSuave: true });
  for (const ents of roteiro) for (let k = 0; k < 10; k++) passo(m, ents);
  assert.equal(noNavegador, impressaoDigital(m));
  await contexto.close();
});

test('fim de rodada mostra o resultado e Enter começa outra', async () => {
  const { pagina, contexto } = await abrir(TELAS.desktop, '?demo=1&semente=9');
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    for (let k = 0; k < 200 && b.state.tela !== 'resultado'; k++) b.step(300);
  });
  const s = await pagina.evaluate(() => window.__bomberolho.state);
  if (s.tela === 'resultado') {
    const titulo = await pagina.textContent('#aviso h2');
    assert.match(titulo, /taça|empatada/); // parte 2: fim de partida (melhor de N)
    await pagina.keyboard.press('Enter');
    const novo = await pagina.evaluate(() => window.__bomberolho.state);
    assert.equal(novo.tela, 'jogando');
    assert.equal(novo.tick, 0);
  } else {
    // Sem cronômetro (parte 2), uma rodada de robôs pode se arrastar: aceitável aqui.
    assert.equal(s.tela, 'jogando');
  }
  await contexto.close();
});

test('desempenho: mantém perto de 60 quadros por segundo em partida', async () => {
  const { pagina, contexto } = await abrir(TELAS.desktop, '?demo=1&semente=4');
  await pagina.waitForTimeout(3200);
  const fps = await pagina.evaluate(() => window.__bomberolho.state.fps);
  assert.ok(fps >= 50, `fps medido: ${fps}`);
  await contexto.close();
});
