// Parte 4 — nenhum controle cortado ou inalcançável, em celulares (em pé e
// deitados), tablets e computadores, com e sem toque: menu, "Como jogar",
// partida montada (botão do bichinho), pausa (rótulo "Continuar", o mais
// largo) e resultado. Para cada botão visível confere: inteiro na tela, não
// cortado por nenhum ancestral com overflow, o centro recebe o toque (nada por
// cima), ≥ 44 px; os controles de toque ≥ 56 px e fora da arena; sem rolagem.
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

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

// [largura, altura, toque]
export const TELAS_ALCANCE = [
  [360, 640, true], [390, 844, true], [412, 915, true], // celulares em pé
  [640, 360, true], [740, 360, true], [844, 390, true], [915, 412, true], [932, 430, true], // deitados
  [768, 1024, true], [1024, 768, true], [1280, 800, true], // tablets
  [1024, 768, false], [1280, 720, false], [1366, 768, false], // computadores
];

/** Problemas de alcance dos botões visíveis da página, do jeito descrito no topo. */
async function auditar() {
  // Espera as animações de entrada (o cartão cresce de 0,9 a 1) e não as que repetem.
  await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  const out = [];
  // Com um cartão aberto (ajuda, pausa, resultado), o que fica atrás dele está coberto de propósito.
  const modal = document.querySelector('.ajuda:not([hidden]), #aviso:not([hidden])');
  const nome = (el) => el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 18) || el.className;
  const arena = document.getElementById('arena').getBoundingClientRect();
  const doc = document.documentElement;
  if (doc.scrollWidth > innerWidth || doc.scrollHeight > innerHeight) out.push(`rolagem ${doc.scrollWidth}×${doc.scrollHeight}`);
  // Cartões do placar: inteiros dentro do painel, e nada dentro deles cortado (nome, selo, troféus, poderes).
  const painel = document.querySelector('.painel').getBoundingClientRect();
  for (const c of document.querySelectorAll('.placar .cartao')) {
    if (document.querySelector('.app[data-modo="menu"]')) break;
    const cb = c.getBoundingClientRect();
    const quem = c.querySelector('.nome').firstChild.textContent.trim();
    if (cb.bottom > painel.bottom + 0.5 || cb.right > painel.right + 0.5) out.push(`cartão ${quem} cortado pelo painel`);
    for (const el of c.querySelectorAll('.nome em, .trofeus i, .poderes > span')) {
      const b = el.getBoundingClientRect();
      if (b.width && (b.right > cb.right + 0.5 || b.bottom > cb.bottom + 0.5)) out.push(`cartão ${quem}: ${el.className || el.tagName} cortado`);
    }
  }
  for (const el of document.querySelectorAll('button')) {
    const st = getComputedStyle(el);
    if (el.closest('[hidden]') || st.display === 'none' || st.visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    if (b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) out.push(`${nome(el)} fora da tela`);
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = a.getBoundingClientRect();
      if (b.left < c.left - 0.5 || b.right > c.right + 0.5 || b.top < c.top - 0.5 || b.bottom > c.bottom + 0.5) {
        out.push(`${nome(el)} cortado por .${a.className.split(' ')[0]}`);
      }
    }
    const alvo = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const atrasDoCartao = modal && !modal.contains(el) && alvo && modal.contains(alvo);
    if (!atrasDoCartao && (!alvo || !(alvo === el || el.contains(alvo)))) out.push(`${nome(el)} coberto por ${alvo ? alvo.id || alvo.getAttribute('class') : 'nada'}`);
    const minimo = el.classList.contains('bt-toque') ? 56 : 44;
    if (b.width < minimo - 0.5 || b.height < minimo - 0.5) out.push(`${nome(el)} pequeno ${Math.round(b.width)}×${Math.round(b.height)}`);
    if (el.classList.contains('bt-toque') && !document.querySelector('.app[data-modo="menu"]')) {
      const sobre = b.left < arena.right && b.right > arena.left && b.top < arena.bottom && b.bottom > arena.top;
      if (sobre) out.push(`${nome(el)} sobre a arena`);
    }
  }
  return out;
}

test('alcance: nenhum botão ou cartão do placar cortado, coberto ou pequeno em 14 telas (menu, ajuda, jogo montado, pausa, resultado)', async () => {
  const falhas = [];
  for (const [w, h, toque] of TELAS_ALCANCE) {
    const tela = `${w}×${h}${toque ? ' toque' : ''}`;
    const { pagina, contexto, problemas } = await novaPagina(navegador, { width: w, height: h }, { dpr: 1, contexto: toque ? { hasTouch: true, isMobile: true } : {} });
    const conferir = async (momento) => {
      for (const f of await pagina.evaluate(auditar)) falhas.push(`${tela} · ${momento}: ${f}`);
    };
    await pagina.goto(servidor.url);
    await esperarJogo(pagina);
    await conferir('menu');
    await pagina.click('.bt-ajuda');
    await conferir('como jogar');
    await pagina.click('[data-acao="fechar-ajuda"]');

    await pagina.goto(`${servidor.url}?semente=7&arena=jardim&personagem=cristalino&rodadas=3`);
    await esperarJogo(pagina);
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      b.setTimeScale(0);
      for (const id of [1, 2, 3]) b.input(id, {});
      b.step(200);
      b.darItem(0, 'estojo');
      b.step(2);
    });
    await conferir('jogando montado');
    await pagina.click('#bt-pausa');
    await conferir('pausa');
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      b.pause(false);
      for (const id of [1, 2, 3]) b.input(id, null);
      b.demo(true);
      for (let k = 0; k < 600 && b.state.tela !== 'resultado'; k++) b.step(120);
    });
    await conferir('resultado');
    falhas.push(...problemas.map((p) => `${tela}: ${p}`));
    await contexto.close();
  }
  assert.deepEqual(falhas, []);
});
