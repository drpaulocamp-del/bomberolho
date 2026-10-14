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
      // Tamanho de layout (sem o zoom da animação de entrada do cartão).
      menor: Math.min(...visiveis.map((b) => Math.min(b.offsetHeight, b.offsetWidth))),
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
  // Espera o quadro seguinte (sem prazo fixo de relógio): a vitrine anda sozinha.
  await pagina.waitForFunction((t) => window.__bomberolho.state.tick > t, t0, { timeout: 15000 });
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
  assert.equal(await pagina.locator('.passos-ajuda li').count(), 6); // parte 4: + o passo do bichinho
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
  // Relógio congelado: o tick só anda por step(), então "Recomeçar" deixa o
  // tick em 0 mesmo com a máquina carregada (antes dependia do relógio real).
  await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); b.step(90); });
  assert.ok((await estado(pagina)).tick >= 90);
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
      assert.ok(m.menor >= 44, `${rotulo}: botão de ${m.menor}px`);
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

test('som pela cadeia real: sem estalos de uma amostra, sem estouro, efeitos audíveis e trilha abaixo dos efeitos', async () => {
  const { pagina, contexto, problemas } = await abrir(TELAS.desktop, '?semente=1');
  const r = await pagina.evaluate(async () => {
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const { TEMAS, Sequenciador } = await import('./js/audio/musica.js');
    const { criarCadeia } = await import('./js/audio/cadeia.js');
    const SR = 48000;
    const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
    function analisar(d) {
      let pico = 0; let estalo = 0; let soma = 0;
      for (let i = 24; i < d.length - 24; i++) {
        const v = Math.abs(d[i]);
        pico = Math.max(pico, v);
        soma += d[i] * d[i];
        if (v < 0.05) continue;
        // Estalo = amostra isolada várias vezes maior que tudo à sua volta (±0,5 ms).
        let viz = 0;
        for (let j = i - 24; j <= i + 24; j++) if (j !== i) viz = Math.max(viz, Math.abs(d[j]));
        estalo = Math.max(estalo, v / Math.max(viz, 1e-6));
      }
      return { pico: db(pico), estalo, rms: db(Math.sqrt(soma / d.length)) };
    }
    async function render(seg, montar) {
      const ctx = new OfflineAudioContext(1, SR * seg, SR);
      const cadeia = criarCadeia(ctx);
      montar(ctx, cadeia, criarRuido(ctx));
      return analisar((await ctx.startRendering()).getChannelData(0));
    }
    const efeitos = {};
    for (const nome of Object.keys(EFEITOS)) efeitos[nome] = await render(1.5, (c, cad, rr) => EFEITOS[nome](c, rr, 0.01, cad.efeitos, 1));
    const tema = TEMAS.consultorio;
    const col = 60 / tema.bpm / 2;
    const trilha = await render(24, (c, cad, rr) => {
      const seq = new Sequenciador(c, cad.trilha, rr);
      for (let p = 0; p * col < 23; p++) seq.tocarPasso(tema, p, 0.05 + p * col, col);
    });
    const partida = await render(12, (c, cad, rr) => {
      const seq = new Sequenciador(c, cad.trilha, rr);
      seq.intenso = true;
      for (let p = 0; p * col < 11; p++) seq.tocarPasso(tema, p, 0.05 + p * col, col);
      for (let t = 0.3; t < 11; t += 0.5) { EFEITOS.respingo(c, rr, t, cad.efeitos, 1.3); EFEITOS.bloco(c, rr, t, cad.efeitos); EFEITOS.gota(c, rr, t + 0.2, cad.efeitos); }
    });
    return { efeitos, trilha, partida };
  });
  for (const [nome, m] of Object.entries(r.efeitos)) {
    assert.ok(m.pico <= -1 && m.pico >= -14, `${nome}: pico de ${m.pico.toFixed(1)} dBFS (quer entre −14 e −1)`);
    assert.ok(m.estalo < 2, `${nome}: amostra ${m.estalo.toFixed(1)}× maior que as vizinhas`);
  }
  assert.ok(r.trilha.estalo < 2, `trilha: amostra ${r.trilha.estalo.toFixed(1)}× maior que as vizinhas`);
  assert.ok(r.partida.estalo < 2, `partida: amostra ${r.partida.estalo.toFixed(1)}× maior que as vizinhas`);
  assert.ok(r.partida.pico <= -1, `partida intensa sem estouro: ${r.partida.pico.toFixed(1)} dBFS`);
  assert.ok(r.trilha.rms < r.partida.rms - 6, `trilha (${r.trilha.rms.toFixed(1)}) ao menos 6 dB abaixo da partida (${r.partida.rms.toFixed(1)})`);
  assert.ok(r.trilha.rms > -40, `trilha audível: ${r.trilha.rms.toFixed(1)} dB RMS`);
  assert.deepEqual(problemas, []);
  await contexto.close();
});
