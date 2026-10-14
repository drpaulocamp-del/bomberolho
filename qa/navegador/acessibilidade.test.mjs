// Testes de navegador da parte 4 — acessibilidade e peso: foco de teclado
// visível nos menus, contraste dos textos, "reduzir movimento" respeitado,
// alvos de toque, e a primeira carga dentro do orçamento (≤ 600 kB).
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

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

/** Contraste WCAG entre duas cores "rgb(a)" do getComputedStyle (alfa composto sobre o fundo). */
function contraste(frente, fundo) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const a = lum(frente);
  const b = lum(fundo);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('teclado: Tab percorre os menus com anel de foco visível e de bom contraste', async () => {
  const { pagina, contexto, problemas } = await novaPagina(navegador, TELAS.desktop);
  await pagina.goto(servidor.url);
  await esperarJogo(pagina);
  const vistos = new Set();
  for (let k = 0; k < 8; k++) {
    await pagina.keyboard.press('Tab');
    const f = await pagina.evaluate(() => {
      const el = document.activeElement;
      const e = getComputedStyle(el);
      return { nome: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20), tag: el.tagName, estilo: e.outlineStyle, largura: parseFloat(e.outlineWidth), cor: e.outlineColor };
    });
    if (f.tag !== 'BUTTON') continue;
    vistos.add(f.nome);
    assert.notEqual(f.estilo, 'none', `foco sem anel em "${f.nome}"`);
    assert.ok(f.largura >= 2, `anel fino em "${f.nome}"`);
    const cor = f.cor.match(/\d+(\.\d+)?/g).map(Number);
    assert.ok(contraste(cor, [245, 245, 247]) >= 3, `anel com pouco contraste em "${f.nome}" (${f.cor})`);
  }
  assert.ok(vistos.size >= 3, `foco passou por ${[...vistos].join(', ')}`);
  // Enter no "Jogar" focado avança, Esc volta.
  await pagina.focus('.bt-jogar');
  await pagina.keyboard.press('Enter');
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.menu), 'personagem');
  await pagina.keyboard.press('Escape');
  assert.equal(await pagina.evaluate(() => window.__bomberolho.state.menu), 'inicio');
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('contraste: textos principais e secundários ≥ 4,5:1 sobre o fundo deles', async () => {
  const { pagina, contexto, problemas } = await novaPagina(navegador, TELAS.retrato, { contexto: { hasTouch: true, isMobile: true } });
  await pagina.goto(`${servidor.url}?semente=4`);
  await esperarJogo(pagina);
  await pagina.evaluate(() => window.__bomberolho.pause(true));
  const pares = await pagina.evaluate(() => {
    const cor = (el, p) => getComputedStyle(el)[p];
    const sel = ['.cartao-aviso h2', '.cartao-aviso .aviso-texto', '.curiosidade p', '.curiosidade strong', '.acoes button', '.acoes button.secundario', '.barra .rodada', '.nome'];
    return sel.map((s) => {
      const el = document.querySelector(s);
      // Fundo efetivo: o primeiro ancestral com fundo opaco o bastante (vidro claro conta como branco).
      let a = el;
      let fundo = 'rgb(255, 255, 255)';
      while (a) {
        const f = cor(a, 'backgroundColor');
        const alfa = f.startsWith('rgba') ? Number(f.split(',')[3]) : 1;
        if (f !== 'rgba(0, 0, 0, 0)' && alfa >= 0.5) { fundo = f; break; }
        a = a.parentElement;
      }
      return { s, frente: cor(el, 'color'), fundo };
    });
  });
  for (const { s, frente, fundo } of pares) {
    const f = frente.match(/\d+(\.\d+)?/g).map(Number);
    const b = fundo.match(/\d+(\.\d+)?/g).map(Number);
    // Fundo translúcido sobre branco: compõe o alfa.
    const alfa = b.length > 3 ? b[3] : 1;
    const fb = b.slice(0, 3).map((c) => c * alfa + 255 * (1 - alfa));
    const r = contraste(f.slice(0, 3), fb);
    assert.ok(r >= 4.5, `${s}: ${r.toFixed(2)}:1 (${frente} sobre ${fundo})`);
  }
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('reduzir movimento: sem animações de entrada nem pulsos no CSS, e o jogo sabe disso', async () => {
  const { pagina, contexto, problemas } = await novaPagina(navegador, TELAS.retrato, { contexto: { reducedMotion: 'reduce', hasTouch: true, isMobile: true } });
  await pagina.goto(servidor.url);
  await esperarJogo(pagina);
  const r = await pagina.evaluate(() => ({
    tela: getComputedStyle(document.querySelector('.tela-inicio')).animationName,
    jogar: getComputedStyle(document.querySelector('.bt-jogar')).animationName,
    media: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }));
  assert.deepEqual(r, { tela: 'none', jogar: 'none', media: true });
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('alvos de toque: menus ≥ 44 px e controles do jogo ≥ 56 px, em 360×640', async () => {
  const { pagina, contexto, problemas } = await novaPagina(navegador, TELAS.pequeno, { contexto: { hasTouch: true, isMobile: true } });
  await pagina.goto(servidor.url);
  await esperarJogo(pagina);
  const menores = async () => pagina.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent && b.offsetWidth > 0)
    .map((b) => ({ nome: b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20), lado: Math.min(b.offsetWidth, b.offsetHeight) })));
  for (const b of await menores()) assert.ok(b.lado >= 44, `${b.nome}: ${b.lado} px`);
  await pagina.goto(`${servidor.url}?semente=4`);
  await esperarJogo(pagina);
  await pagina.evaluate(() => { const g = window.__bomberolho; g.setTimeScale(0); g.step(190); g.darItem(0, 'estojo'); g.step(1); });
  const controles = await pagina.evaluate(() => ['#bt-gota', '#bt-acao', '.alavanca'].map((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { s, lado: Math.min(r.width, r.height) };
  }));
  for (const c of controles) assert.ok(c.lado >= 56, `${c.s}: ${c.lado} px`);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('peso: a primeira carga (tudo o que o jogo baixa até a partida começar) cabe em 600 kB', async () => {
  const { pagina, contexto, problemas } = await novaPagina(navegador, TELAS.retrato, { contexto: { hasTouch: true, isMobile: true } });
  const bytes = new Map();
  pagina.on('response', async (r) => {
    try { bytes.set(r.url(), (await r.body()).length); } catch { /* resposta sem corpo */ }
  });
  await pagina.goto(servidor.url);
  await esperarJogo(pagina);
  await pagina.waitForLoadState('networkidle');
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const externos = [...bytes.keys()].filter((u) => !u.startsWith(servidor.url));
  assert.deepEqual(externos, [], 'nada de fora do jogo');
  assert.ok(!([...bytes.keys()].some((u) => u.includes('bancada'))), 'a bancada só vem com ?ajuste=1');
  assert.ok(total <= 600 * 1024, `primeira carga: ${(total / 1024).toFixed(1)} kB`);
  assert.deepEqual(problemas, []);
  await contexto.close();
});
