// Testes de navegador da parte 4: controles de toque com dedos "de verdade"
// (eventos de toque do Chromium por CDP, pointerType "touch"), retrato e
// paisagem, canhoto lembrado, toque múltiplo, nada de rolagem/zoom/seleção, e
// robustez (aba escondida, perda de foco, girar, redimensionar, recarregar).
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from './apoio.mjs';

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

const CELULAR = { hasTouch: true, isMobile: true };

/** Partida congelada (passos só por step), robôs parados: o humano anda sozinho na arena. */
async function partida(tela = TELAS.retrato, busca = '?semente=7&arena=jardim') {
  const p = await novaPagina(navegador, tela, { dpr: 2, contexto: CELULAR });
  p.cdp = await p.contexto.newCDPSession(p.pagina);
  await p.pagina.goto(servidor.url + busca);
  await esperarJogo(p.pagina);
  await p.pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    for (const id of [1, 2, 3]) b.input(id, {});
    b.step(185); // passa a contagem "3, 2, 1"
  });
  return p;
}

const estado = (pagina) => pagina.evaluate(() => window.__bomberolho.state);
const passos = (pagina, n) => pagina.evaluate((k) => window.__bomberolho.step(k).jogadores[0], n);
const OFFSET = { dir: [30, 0], esq: [-30, 0], baixo: [0, 30], cima: [0, -30] };

test('toque: o trajeto feito com a alavanca é idêntico ao dos mesmos comandos dados direto', async () => {
  // Semente 7, Jardim: da largada (1,1) há o "L" livre — (2,1) à direita e
  // (1,2), (1,3) para baixo. O roteiro passa por ele, bate em bloco e volta.
  const roteiro = [['baixo', 25], ['baixo', 20], ['dir', 15], ['cima', 40], ['dir', 25], ['dir', 15], ['esq', 30], ['baixo', 12]];
  const A = await partida();
  const B = await partida();
  const [x0, y0] = [80, TELAS.retrato.height - 80]; // canto de baixo, metade esquerda
  await dedo(A.cdp, 'touchStart', [[x0, y0]]);
  const ini = (await estado(A.pagina)).jogadores[0];
  const trajeto = [[ini.x, ini.y]];
  for (const [dir, n] of roteiro) {
    const [dx, dy] = OFFSET[dir];
    await dedo(A.cdp, 'touchMove', [[x0 + dx, y0 + dy]]);
    const a = await passos(A.pagina, n);
    await B.pagina.evaluate((d) => window.__bomberolho.input(0, { [d]: true }), dir);
    const b = await passos(B.pagina, n);
    assert.deepEqual([a.x, a.y], [b.x, b.y], `depois de "${dir}" por ${n} ticks`);
    trajeto.push([a.x, a.y]);
  }
  await dedo(A.cdp, 'touchEnd', []);
  const parado = await passos(A.pagina, 20);
  assert.deepEqual([parado.x, parado.y], trajeto.at(-1), 'soltou o dedo: parou');
  // O trajeto andou de verdade (não é "ficou parado nos dois").
  let andou = 0;
  for (let k = 1; k < trajeto.length; k++) andou += Math.abs(trajeto[k][0] - trajeto[k - 1][0]) + Math.abs(trajeto[k][1] - trajeto[k - 1][1]);
  assert.ok(andou >= 3, `andou ${andou.toFixed(2)} casas (≥ 3)`);
  assert.deepEqual([...A.problemas, ...B.problemas], []);
  await A.contexto.close();
  await B.contexto.close();
});

test('toque: zona morta, diagonal com histerese e a alavanca nasce onde o polegar encosta', async () => {
  const { pagina, cdp, contexto, problemas } = await partida();
  const ini = (await estado(pagina)).jogadores[0];
  const [x0, y0] = [150, 520]; // meio da metade esquerda, em cima da arena
  await dedo(cdp, 'touchStart', [[x0, y0]]);
  await dedo(cdp, 'touchMove', [[x0 + 7, y0 + 5]]);
  const morto = await passos(pagina, 20);
  assert.deepEqual([morto.x, morto.y], [ini.x, ini.y], 'dentro da zona morta não anda');
  const caixa = await pagina.evaluate(() => {
    const r = document.querySelector('.alavanca').getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, ativa: document.querySelector('.alavanca').classList.contains('ativa') };
  });
  assert.ok(caixa.ativa && Math.abs(caixa.cx - x0) < 2 && Math.abs(caixa.cy - y0) < 2, `nasceu no dedo: ${JSON.stringify(caixa)}`);
  await dedo(cdp, 'touchMove', [[x0 + 30, y0]]);
  assert.equal(await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir), 'dir');
  await dedo(cdp, 'touchMove', [[x0 + 28, y0 + 26]]); // quase diagonal: continua "dir"
  assert.equal(await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir), 'dir');
  await dedo(cdp, 'touchMove', [[x0 + 12, y0 + 34]]); // claramente para baixo
  assert.equal(await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir), 'baixo');
  // Arrastar além da borda: a base vem atrás do dedo (voltar não exige ir ao centro antigo).
  await dedo(cdp, 'touchMove', [[x0 + 12, y0 + 140]]);
  const seguiu = await pagina.evaluate(() => { const r = document.querySelector('.alavanca').getBoundingClientRect(); return r.top + r.height / 2; });
  assert.ok(seguiu > y0 + 80, `base seguiu o dedo (${seguiu})`);
  await dedo(cdp, 'touchEnd', []);
  assert.equal(await pagina.evaluate(() => document.querySelector('.alavanca').classList.contains('repouso')), true);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('toque: polegar parado perto das bordas não anda sozinho; empurrão curto a partir do contorno anda', async () => {
  for (const tela of [TELAS.retrato, TELAS.paisagem, TELAS.pequeno]) {
    const { pagina, cdp, contexto, problemas } = await partida(tela);
    const dirAlavanca = () => pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir);
    const ini = (await estado(pagina)).jogadores[0];
    // Polegar a 6 px da borda de baixo (e da esquerda), parado, só com o tremor de 1 px.
    for (const [x, y] of [[Math.round(tela.width * 0.25), tela.height - 6], [6, Math.round(tela.height * 0.6)], [6, tela.height - 6]]) {
      await dedo(cdp, 'touchStart', [[x, y]]);
      await dedo(cdp, 'touchMove', [[x + 1, y - 1]]);
      assert.equal(await dirAlavanca(), '', `${tela.width}×${tela.height}: dedo parado em (${x}, ${y}) não manda andar`);
      const j = await passos(pagina, 24);
      assert.deepEqual([j.x, j.y], [ini.x, ini.y], `${tela.width}×${tela.height}: não andou sozinho`);
      // O desenho continua inteiro dentro da tela.
      const r = await pagina.evaluate(() => { const b = document.querySelector('.alavanca').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
      assert.ok(r[0] >= 0 && r[1] >= 0 && r[2] <= tela.width && r[3] <= tela.height, `alavanca dentro da tela: ${r}`);
      await dedo(cdp, 'touchEnd', []);
    }
    // Encostar na parte esquerda do contorno em repouso e empurrar 30 px para a direita: anda.
    const c = await pagina.evaluate(() => { const b = document.querySelector('.alavanca').getBoundingClientRect(); return [b.left + 22, b.top + b.height / 2]; });
    await dedo(cdp, 'touchStart', [c]);
    await dedo(cdp, 'touchMove', [[c[0] + 30, c[1]]]);
    assert.equal(await dirAlavanca(), 'dir', `${tela.width}×${tela.height}: empurrão de 30 px a partir do contorno`);
    const j = await passos(pagina, 20);
    assert.ok(j.x > ini.x + 0.5, `${tela.width}×${tela.height}: andou para a direita (${j.x})`);
    await dedo(cdp, 'touchEnd', []);
    assert.deepEqual(problemas, []);
    await contexto.close();
  }
});

test('toque: com o polegar já inclinado (base vindo atrás), escorregar 20 px para o lado vira na hora', async () => {
  const { pagina, cdp, contexto, problemas } = await partida();
  const dirAlavanca = () => pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir);
  const [x0, y0] = [120, 600];
  await dedo(cdp, 'touchStart', [[x0, y0]]);
  await dedo(cdp, 'touchMove', [[x0, y0 + 70]]); // além do raio
  assert.equal(await dirAlavanca(), 'baixo');
  await pagina.waitForTimeout(260); // polegar parado um instante
  await dedo(cdp, 'touchMove', [[x0 + 20, y0 + 70]]);
  assert.equal(await dirAlavanca(), 'dir', 'escorregão lateral vira');
  await dedo(cdp, 'touchMove', [[x0 + 22, y0 + 72]]); // tremor depois da virada: continua
  assert.equal(await dirAlavanca(), 'dir');
  await pagina.waitForTimeout(260);
  await dedo(cdp, 'touchMove', [[x0 + 22, y0 + 50]]); // escorrega para cima: vira de novo
  assert.equal(await dirAlavanca(), 'cima');
  await pagina.waitForTimeout(260);
  await dedo(cdp, 'touchMove', [[x0 + 24, y0 + 40]]); // continua para cima (no próprio eixo): sem virada
  assert.equal(await dirAlavanca(), 'cima');
  await dedo(cdp, 'touchEnd', []);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('toque: botão de gota solta a gota; o do bichinho só aparece montado; alvos ≥ 56 px', async () => {
  const { pagina, cdp, contexto, problemas } = await partida();
  const caixa = (sel) => pagina.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, visivel: !el.hidden && r.width > 0 };
  }, sel);
  const gota = await caixa('#bt-gota');
  assert.ok(gota.w >= 56 && gota.h >= 56, `gota ${gota.w}×${gota.h}`);
  assert.equal((await caixa('#bt-acao')).visivel, false, 'sem bichinho, sem botão de ação');
  assert.equal(await pagina.textContent('#bt-gota .conta'), '1');
  await dedo(cdp, 'touchStart', [[gota.x, gota.y]]);
  await passos(pagina, 1);
  await dedo(cdp, 'touchEnd', []);
  await passos(pagina, 1);
  const s = await estado(pagina);
  assert.equal(s.gotas.length, 1, 'uma gota no chão');
  assert.deepEqual([s.gotas[0].col, s.gotas[0].lin], [1, 1], 'na casa do jogador');
  assert.equal(await pagina.textContent('#bt-gota .conta'), '0', 'contador de gotas livres');
  await pagina.evaluate(() => { window.__bomberolho.darItem(0, 'estojo'); window.__bomberolho.step(1); });
  const acao = await caixa('#bt-acao');
  assert.ok(acao.visivel && acao.w >= 56 && acao.h >= 56, `ação ${JSON.stringify(acao)}`);
  // Os botões não ficam em cima da arena.
  const sobrepoe = await pagina.evaluate(() => {
    const a = document.getElementById('arena').getBoundingClientRect();
    return ['#bt-gota', '#bt-acao'].some((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top;
    });
  });
  assert.equal(sobrepoe, false);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('toque múltiplo: um dedo anda, outro solta a gota; um terceiro dedo na alavanca é ignorado', async () => {
  const { pagina, cdp, contexto, problemas } = await partida();
  const g = await pagina.evaluate(() => { const r = document.getElementById('bt-gota').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const [x0, y0] = [80, TELAS.retrato.height - 80];
  await dedo(cdp, 'touchStart', [[x0, y0, 0]]);
  await dedo(cdp, 'touchMove', [[x0, y0 + 30, 0]]); // para baixo (o "L" da largada está livre)
  await passos(pagina, 10);
  await dedo(cdp, 'touchStart', [[x0, y0 + 30, 0], [g[0], g[1], 1]]);
  await passos(pagina, 1);
  // Terceiro dedo encosta na metade esquerda e puxa para cima: não manda.
  await dedo(cdp, 'touchStart', [[x0, y0 + 30, 0], [g[0], g[1], 1], [150, 400, 2]]);
  await dedo(cdp, 'touchMove', [[x0, y0 + 30, 0], [g[0], g[1], 1], [150, 360, 2]]);
  const antes = (await estado(pagina)).jogadores[0];
  const depois = await passos(pagina, 10);
  assert.ok(depois.y > antes.y, 'continuou descendo pelo primeiro dedo');
  assert.equal((await estado(pagina)).gotas.length, 1, 'o segundo dedo soltou a gota');
  await dedo(cdp, 'touchEnd', []);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('canhoto: "Como jogar" troca os lados, a escolha fica no aparelho e a alavanca passa para a direita', async () => {
  const { pagina, contexto, problemas, cdp } = await partida(TELAS.retrato, '');
  await pagina.click('.bt-ajuda');
  const textos = await pagina.textContent('.passos-ajuda');
  assert.match(textos, /Arraste o dedo na metade esquerda/);
  assert.equal(await pagina.isVisible('.bt-lados'), true);
  await pagina.click('.bt-lados');
  assert.match(await pagina.textContent('.passos-ajuda'), /metade direita/);
  assert.equal(await pagina.getAttribute('.bt-lados', 'aria-pressed'), 'true');
  await pagina.goto(`${servidor.url}?semente=7&arena=jardim`); // recarrega
  await esperarJogo(pagina);
  await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); for (const id of [1, 2, 3]) b.input(id, {}); b.step(185); });
  assert.equal(await pagina.evaluate(() => document.body.dataset.lado), 'canhoto');
  const g = await pagina.evaluate(() => document.getElementById('bt-gota').getBoundingClientRect().left);
  assert.ok(g < TELAS.retrato.width / 2, 'gota na esquerda');
  // Dedo na metade direita (canhoto) anda; na esquerda não nasce alavanca.
  const ini = (await estado(pagina)).jogadores[0];
  await dedo(cdp, 'touchStart', [[300, 700]]);
  await dedo(cdp, 'touchMove', [[300, 730]]);
  const p = await passos(pagina, 20);
  await dedo(cdp, 'touchEnd', []);
  assert.ok(p.y > ini.y, 'andou com a alavanca à direita');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('sem rolagem, zoom, seleção nem menu de contexto; retrato e paisagem com a arena inteira', async () => {
  for (const tela of [TELAS.retrato, TELAS.paisagem, TELAS.pequeno, { width: 640, height: 360 }, { width: 768, height: 1024 }]) {
    const { pagina, contexto, problemas, cdp } = await partida(tela);
    // Um dedo arrastando no vazio e uma pinça de dois dedos: a página não mexe.
    await dedo(cdp, 'touchStart', [[tela.width * 0.25, tela.height * 0.5, 0], [tela.width * 0.3, tela.height * 0.55, 1]]);
    await dedo(cdp, 'touchMove', [[tela.width * 0.1, tela.height * 0.2, 0], [tela.width * 0.45, tela.height * 0.9, 1]]);
    await dedo(cdp, 'touchEnd', []);
    const m = await pagina.evaluate(() => {
      const a = document.getElementById('arena').getBoundingClientRect();
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.getElementById('arena').dispatchEvent(ev);
      const botoes = ['#bt-gota'].map((s) => document.querySelector(s).getBoundingClientRect());
      return {
        rola: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight || scrollY !== 0 || scrollX !== 0,
        zoom: visualViewport.scale,
        arena: a.left >= 0 && a.top >= 0 && a.right <= innerWidth && a.bottom <= innerHeight,
        casa: a.width / 15,
        sobrepoe: botoes.some((r) => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top),
        menuContexto: !ev.defaultPrevented,
        toque: getComputedStyle(document.body).touchAction,
        selecao: getComputedStyle(document.body).userSelect,
      };
    });
    const nome = `${tela.width}×${tela.height}`;
    assert.equal(m.rola, false, `${nome}: rolou`);
    assert.equal(m.zoom, 1, `${nome}: zoom`);
    assert.equal(m.arena, true, `${nome}: arena inteira na tela`);
    assert.ok(m.casa >= 18, `${nome}: casa de ${m.casa} px`);
    assert.equal(m.sobrepoe, false, `${nome}: botão sobre a arena`);
    assert.equal(m.menuContexto, false, `${nome}: menu de contexto`);
    assert.equal(m.toque, 'none');
    assert.equal(m.selecao, 'none');
    assert.deepEqual(problemas, []);
    await contexto.close();
  }
});

test('robustez: aba escondida e perda de foco pausam e soltam os dedos; girar e redimensionar refazem tudo', async () => {
  const { pagina, contexto, problemas, cdp } = await partida();
  // Dedo segurando a alavanca quando a aba some: ao voltar, nada fica "apertado".
  await dedo(cdp, 'touchStart', [[80, 760]]);
  await dedo(cdp, 'touchMove', [[80, 790]]);
  await pagina.evaluate(() => {
    window.__bomberolho.setTimeScale(1);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  let s = await estado(pagina);
  assert.equal(s.tela, 'pausado', 'aba escondida pausa');
  await pagina.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__bomberolho.setTimeScale(0);
    window.__bomberolho.pause(false);
  });
  const parado = (await estado(pagina)).jogadores[0];
  const depois = await passos(pagina, 20);
  assert.deepEqual([depois.x, depois.y], [parado.x, parado.y], 'a alavanca foi solta');
  await dedo(cdp, 'touchEnd', []);
  // Perda de foco (notificação, outra janela).
  await pagina.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal((await estado(pagina)).tela, 'pausado', 'perda de foco pausa');
  await pagina.evaluate(() => window.__bomberolho.pause(false));
  // Girar o celular no meio da partida e redimensionar várias vezes.
  for (const tela of [TELAS.paisagem, TELAS.retrato, { width: 412, height: 915 }, { width: 915, height: 412 }, TELAS.pequeno]) {
    await pagina.setViewportSize(tela);
    await pagina.waitForTimeout(120);
    const m = await pagina.evaluate(() => {
      const a = document.getElementById('arena').getBoundingClientRect();
      return { dentro: a.left >= 0 && a.top >= 0 && a.right <= innerWidth && a.bottom <= innerHeight, rola: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth, repouso: document.querySelector('.alavanca').classList.contains('repouso') };
    });
    assert.deepEqual(m, { dentro: true, rola: false, repouso: true }, `${tela.width}×${tela.height}`);
  }
  s = await estado(pagina);
  assert.equal(s.tela, 'jogando');
  // Recarregar no meio da partida: volta limpo, sem erro.
  await pagina.reload();
  await esperarJogo(pagina);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('Pausar fica desligado quando a rodada ou a partida acabou', async () => {
  const { pagina, contexto, problemas } = await partida(TELAS.desktop, '?semente=3&rodadas=1');
  assert.equal(await pagina.isDisabled('#bt-pausa'), false);
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    for (const id of [1, 2, 3]) b.input(id, null);
    b.demo(true);
    for (let k = 0; k < 200 && b.state.tela !== 'resultado'; k++) b.step(120);
  });
  assert.equal((await estado(pagina)).tela, 'resultado');
  assert.equal(await pagina.isDisabled('#bt-pausa'), true);
  assert.deepEqual(problemas, []);
  await contexto.close();
});
