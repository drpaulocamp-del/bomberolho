// Testes de navegador da parte 3: fluxo de menus (início → personagem →
// arena → partida), Voltar, Sair e Menu sem becos sem saída, preferências e
// mudo lembrados no aparelho, áudio só depois de gesto, curiosidades, e
// nenhuma tela quebrada em 360–390 px (nem em paisagem).
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';
import { CURIOSIDADES } from '../../bomberolho/js/dados/curiosidades.js';

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

async function abrir(tela = TELAS.desktop, busca = '', extras = {}) {
  const p = await novaPagina(navegador, tela, extras);
  await p.pagina.goto(servidor.url + busca);
  await esperarJogo(p.pagina);
  return p;
}

const estado = (pagina) => pagina.evaluate(() => window.__bomberolho.state);

/** Nada sai da tela: sem rolagem da página e todo botão visível cabe na largura. */
async function medirTela(pagina) {
  return pagina.evaluate(() => {
    const visiveis = [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().width > 0);
    const fora = visiveis.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.left < -1 || r.right > innerWidth + 1;
    }).map((b) => b.textContent.trim() || b.getAttribute('aria-label'));
    const menu = document.getElementById('menu');
    return {
      rolaPagina: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      menuRola: !menu.hidden && menu.scrollHeight > menu.clientHeight + 1,
      fora,
      menor: Math.min(...visiveis.map((b) => Math.min(b.getBoundingClientRect().height, b.getBoundingClientRect().width))),
    };
  });
}

test('sem parâmetros abre o menu, com a vitrine de robôs rodando atrás e sem som', async () => {
  const { pagina, contexto, problemas } = await abrir();
  const s = await estado(pagina);
  assert.equal(s.tela, 'menu');
  assert.equal(s.menu, 'inicio');
  assert.equal(s.audio, 'inativo', 'nenhum áudio antes de um gesto');
  assert.equal(await pagina.isVisible('.bt-jogar'), true);
  const t0 = s.tick;
  await pagina.waitForTimeout(600);
  assert.ok((await estado(pagina)).tick > t0, 'a vitrine anda sozinha');
  assert.equal(await pagina.isVisible('.painel'), false, 'placar escondido no menu');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('fluxo completo: Jogar → personagem → arena, robôs e troféus → partida com as escolhas', async () => {
  const { pagina, contexto, problemas } = await abrir();
  await pagina.click('.bt-jogar');
  assert.equal((await estado(pagina)).menu, 'personagem');
  assert.equal(await pagina.locator('.cartao-personagem').count(), 8);
  await pagina.click('.cartao-personagem[data-personagem="cristalino"]');
  assert.equal(await pagina.textContent('.destaque-texto strong'), 'Cristalino');
  await pagina.click('[data-acao="proximo"]');
  assert.equal((await estado(pagina)).menu, 'arena');
  assert.equal(await pagina.locator('.cartao-arena').count(), 6, '5 arenas + Surpresa');
  await pagina.click('.cartao-arena[data-arena="caverna"]');
  await pagina.click('.pilula[data-valor="dificil"]');
  await pagina.click('.pilula[data-valor="3"]');
  await pagina.click('.bt-comecar');
  const s = await estado(pagina);
  assert.equal(s.tela, 'jogando');
  assert.equal(s.menu, null);
  assert.equal(s.jogadores[0].personagem, 'cristalino');
  assert.equal(s.arena, 'caverna');
  assert.equal(s.dificuldade, 'dificil');
  assert.equal(s.partida.alvo, 3);
  assert.equal(s.fase, 'contagem');
  assert.equal(s.demo, false);
  assert.equal(await pagina.isVisible('#menu'), false);
  assert.notEqual(s.audio, 'inativo', 'os cliques destravaram o áudio');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('Voltar e Esc sempre levam para trás; nada de beco sem saída', async () => {
  const { pagina, contexto } = await abrir(TELAS.retrato);
  await pagina.click('.bt-jogar');
  await pagina.click('[data-acao="proximo"]');
  await pagina.click('.tela-arena [data-acao="voltar"]');
  assert.equal((await estado(pagina)).menu, 'personagem');
  await pagina.keyboard.press('Escape');
  assert.equal((await estado(pagina)).menu, 'inicio');
  await pagina.click('.bt-ajuda');
  assert.equal(await pagina.isVisible('.ajuda'), true);
  assert.equal(await pagina.locator('.passos-ajuda li').count(), 5);
  await pagina.keyboard.press('Escape');
  assert.equal(await pagina.isVisible('.ajuda'), false);
  await contexto.close();
});

test('Sair pergunta antes; "Continuar jogando" volta e "Sair" leva ao menu', async () => {
  const { pagina, contexto, problemas } = await abrir(TELAS.desktop, '?semente=7');
  await pagina.click('#bt-sair');
  let s = await estado(pagina);
  assert.equal(s.tela, 'pausado');
  assert.match(await pagina.textContent('#aviso h2'), /Sair/);
  await pagina.click('#aviso .acoes button >> nth=0');
  assert.equal((await estado(pagina)).tela, 'jogando');
  await pagina.click('#bt-sair');
  await pagina.click('#aviso .acoes button[data-acao="menu"]');
  s = await estado(pagina);
  assert.equal(s.tela, 'menu');
  assert.equal(await pagina.isVisible('#aviso'), false);
  // E do menu dá para começar de novo.
  await pagina.click('.bt-jogar');
  await pagina.click('[data-acao="proximo"]');
  await pagina.click('.bt-comecar');
  assert.equal((await estado(pagina)).tela, 'jogando');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('pausa tem Continuar, Recomeçar e Menu, e uma curiosidade verdadeira da lista', async () => {
  const { pagina, contexto } = await abrir(TELAS.desktop, '?semente=7');
  await pagina.keyboard.press('KeyP');
  const botoes = await pagina.locator('#aviso .acoes button').allTextContents();
  assert.deepEqual(botoes, ['Continuar', 'Recomeçar', 'Menu']);
  const texto = await pagina.textContent('#aviso .curiosidade p');
  assert.ok(CURIOSIDADES.some((c) => c.texto === texto), `curiosidade da lista: ${texto}`);
  await pagina.click('#aviso .acoes button[data-acao="recomecar"]');
  const s = await estado(pagina);
  assert.equal(s.tela, 'jogando');
  assert.equal(s.tick, 0);
  await contexto.close();
});

test('fim de partida: Jogar de novo e Menu; o placar local conta a partida', async () => {
  const { pagina, contexto, problemas } = await abrir(TELAS.desktop, '?semente=12&rodadas=1');
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    b.demo(true);
    for (let k = 0; k < 3000 && b.state.tela !== 'resultado'; k++) b.step(60);
  });
  const s = await estado(pagina);
  assert.equal(s.tela, 'resultado');
  assert.deepEqual(await pagina.locator('#aviso .acoes button').allTextContents(), ['Jogar de novo', 'Menu']);
  assert.equal(s.placarLocal.partidas, 0, 'partida no piloto automático não conta');
  await pagina.click('#aviso .acoes button[data-acao="menu"]');
  assert.equal((await estado(pagina)).tela, 'menu');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('preferências: personagem, arena, dificuldade e troféus lembrados ao voltar', async () => {
  const { pagina, contexto } = await abrir();
  await pagina.click('.bt-jogar');
  await pagina.click('.cartao-personagem[data-personagem="cilio"]');
  await pagina.click('[data-acao="proximo"]');
  await pagina.click('.cartao-arena[data-arena="vale"]');
  await pagina.click('.pilula[data-valor="medio"]');
  await pagina.click('.pilula[data-valor="1"]');
  await pagina.click('.bt-comecar');
  await pagina.reload();
  await esperarJogo(pagina);
  await pagina.click('.bt-jogar');
  assert.equal(await pagina.getAttribute('.cartao-personagem[data-personagem="cilio"]', 'aria-checked'), 'true');
  await pagina.click('[data-acao="proximo"]');
  assert.equal(await pagina.getAttribute('.cartao-arena[data-arena="vale"]', 'aria-checked'), 'true');
  assert.equal(await pagina.getAttribute('.pilula[data-valor="medio"]', 'aria-checked'), 'true');
  assert.equal(await pagina.getAttribute('.pilula[data-valor="1"]', 'aria-checked'), 'true');
  await contexto.close();
});

test('mudo: o botão desliga o som, e a escolha fica guardada depois de recarregar', async () => {
  const { pagina, contexto, problemas } = await abrir();
  await pagina.click('.tela-inicio .bt-som');
  let s = await estado(pagina);
  assert.equal(s.mudo, true);
  assert.equal(await pagina.getAttribute('.tela-inicio .bt-som', 'aria-pressed'), 'true');
  await pagina.reload();
  await esperarJogo(pagina);
  s = await estado(pagina);
  assert.equal(s.mudo, true, 'continua mudo');
  await pagina.click('.bt-jogar'); // gesto: mudo não cria o áudio
  assert.equal((await estado(pagina)).audio, 'inativo');
  await pagina.click('.tela-personagem [data-acao="voltar"]');
  await pagina.click('.tela-inicio .bt-som');
  s = await estado(pagina);
  assert.equal(s.mudo, false);
  assert.equal(s.audio, 'running');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('armazenamento bloqueado: o jogo abre e joga normalmente (sem lembrar)', async () => {
  const p = await novaPagina(navegador, TELAS.desktop);
  await p.pagina.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  });
  await p.pagina.goto(servidor.url);
  await esperarJogo(p.pagina);
  await p.pagina.click('.bt-jogar');
  await p.pagina.click('[data-acao="proximo"]');
  await p.pagina.click('.bt-comecar');
  assert.equal((await estado(p.pagina)).tela, 'jogando');
  assert.deepEqual(p.problemas, []);
  await p.contexto.close();
});

test('arena Surpresa: cada rodada numa arena diferente', async () => {
  const { pagina, contexto } = await abrir();
  const arenas = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.start({ semente: 5, arena: 'surpresa', rodadas: 3 });
    b.setTimeScale(0);
    b.demo(true);
    const vistas = [b.state.arena];
    for (let k = 0; k < 6000 && b.state.tela !== 'resultado'; k++) {
      b.step(60);
      if (b.state.arena !== vistas[vistas.length - 1]) vistas.push(b.state.arena);
    }
    return vistas;
  });
  assert.ok(arenas.length >= 2, `arenas: ${arenas}`);
  for (let k = 1; k < arenas.length; k++) assert.notEqual(arenas[k], arenas[k - 1]);
  await contexto.close();
});

for (const [nome, tela] of Object.entries(TELAS)) {
  test(`${nome} (${tela.width}×${tela.height}): menus, cartões e jogo cabem na tela, alvos ≥ 44 px`, async () => {
    const { pagina, contexto, problemas } = await abrir(tela);
    const etapas = [];
    const medir = async (rotulo) => etapas.push([rotulo, await medirTela(pagina)]);
    await medir('início');
    await pagina.click('.bt-jogar');
    await medir('personagem');
    await pagina.click('[data-acao="proximo"]');
    await medir('arena');
    await pagina.click('.bt-comecar');
    await medir('jogo');
    await pagina.keyboard.press('KeyP');
    await medir('pausa');
    await pagina.click('#aviso .acoes button >> nth=0');
    await pagina.click('#bt-sair');
    await medir('sair');
    for (const [rotulo, m] of etapas) {
      assert.equal(m.rolaPagina, false, `${rotulo}: página rola`);
      assert.equal(m.menuRola, false, `${rotulo}: menu precisa rolar`);
      assert.deepEqual(m.fora, [], `${rotulo}: botão fora da tela`);
      assert.ok(m.menor >= 36, `${rotulo}: botão de ${m.menor}px`);
    }
    // Cartão de aviso inteiro dentro da tela.
    const cartao = await pagina.evaluate(() => {
      const r = document.querySelector('.cartao-aviso').getBoundingClientRect();
      const c = document.querySelector('.cartao-aviso');
      return { dentro: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, rola: c.scrollHeight > c.clientHeight + 1 };
    });
    assert.ok(cartao.dentro, 'cartão dentro da tela');
    assert.equal(cartao.rola, false, 'cartão sem rolagem');
    assert.deepEqual(problemas, []);
    await contexto.close();
  });
}

test('reduzir movimento: o jogo respeita a preferência do sistema', async () => {
  const { pagina, contexto, problemas } = await abrir(TELAS.desktop, '?semente=7', { contexto: { reducedMotion: 'reduce' } });
  const animacao = await pagina.evaluate(() => getComputedStyle(document.querySelector('.bt-jogar')).animationName);
  assert.equal(animacao, 'none');
  await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); b.step(400); });
  assert.deepEqual(problemas, []);
  await contexto.close();
});
