// Verificador P4R2: todo controle visível alcançável (inteiro na tela, não
// cortado por ancestral, centro recebe o toque, tamanho mínimo, sem sobreposição
// entre controles de toque e botões), em todas as telas pedidas e em todos os
// estados: menu, ajuda, personagem, arena, jogando montado, pausa, faixa
// (eliminado), intervalo e resultado. Também rolagem e capturas.
// Uso: cd qa && node verificacao/v-p4r2/alcance.mjs [filtro]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const OUT = new URL('../../capturas/v-p4r2/', import.meta.url).pathname;
const filtro = process.argv[2];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const TELAS = [
  [390, 844, true], [844, 390, true], [740, 360, true], [915, 412, true], [360, 640, true],
  [1024, 768, true], [1280, 800, true], [768, 1024, true], [1280, 720, false], [360, 640, false], [1024, 768, false],
];
const servidor = await subirServidor();
const nav = await abrirNavegador();

function auditar() {
  const out = [];
  const modal = document.querySelector('.ajuda:not([hidden]), #aviso:not([hidden])');
  const nome = (el) => el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 18) || el.className;
  const doc = document.documentElement;
  if (doc.scrollWidth > innerWidth || doc.scrollHeight > innerHeight) out.push(`rolagem doc ${doc.scrollWidth}x${doc.scrollHeight}`);
  const visiveis = [];
  for (const el of document.querySelectorAll('button')) {
    const st = getComputedStyle(el);
    if (el.closest('[hidden]') || st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    if (modal && !modal.contains(el)) continue; // atrás do cartão, coberto de propósito
    visiveis.push([el, b]);
    if (b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) out.push(`${nome(el)} fora da tela [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}]`);
    let a = el.parentElement;
    while (a && a !== document.body) {
      const s = getComputedStyle(a);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const c = a.getBoundingClientRect();
        // contêiner com rolagem própria: só conta se o contêiner não rola até ele
        const rola = a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1;
        if (b.left < c.left - 0.5 || b.right > c.right + 0.5 || b.top < c.top - 0.5 || b.bottom > c.bottom + 0.5) out.push(`${nome(el)} cortado por ${a.className || a.id}${rola ? ' (rola)' : ''}`);
      }
      a = a.parentElement;
    }
    const cx = Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2));
    const cy = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2));
    const alvo = document.elementFromPoint(cx, cy);
    if (!alvo || !(alvo === el || el.contains(alvo))) out.push(`${nome(el)} coberto por ${alvo ? (alvo.id || alvo.className || alvo.tagName) : 'nada'}`);
    const min = el.classList.contains('bt-toque') ? 56 : 44;
    if (Math.min(b.width, b.height) < min - 0.5) out.push(`${nome(el)} pequeno ${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  // controles de toque não sobrepõem botões nem arena
  const arena = document.getElementById('arena').getBoundingClientRect();
  const toq = [...document.querySelectorAll('.bt-toque')].filter((e) => !e.hidden && !e.closest('[hidden]')).map((e) => [e, e.getBoundingClientRect()]);
  const cruza = (p, q) => p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1;
  if (!modal && document.querySelector('.app[data-modo="jogo"]')) {
    for (const [e, b] of toq) {
      if (cruza(b, arena)) out.push(`${e.id} sobre a arena`);
      for (const [o, ob] of visiveis) if (o !== e && cruza(b, ob)) out.push(`${e.id} sobre ${nome(o)}`);
    }
  }
  return { problemas: out, n: visiveis.length, arena: [Math.round(arena.width), Math.round(arena.height)] };
}

const res = {};
for (const [w, h, toque] of TELAS) {
  const id = `${w}x${h}${toque ? 't' : 'm'}`;
  if (filtro && !id.includes(filtro)) continue;
  const p = await novaPagina(nav, { width: w, height: h }, { dpr: 2, contexto: toque ? { hasTouch: true, isMobile: true } : {} });
  const { pagina } = p;
  const r = (res[id] = {});
  const audit = async (estado) => {
    await espera(450);
    r[estado] = await pagina.evaluate(auditar);
    await pagina.screenshot({ path: `${OUT}alc-${id}-${estado}.png` });
  };
  const clicar = async (sel) => {
    const el = pagina.locator(sel).first();
    if (toque) await el.tap(); else await el.click();
  };
  await pagina.goto(servidor.url);
  await esperarJogo(pagina);
  await audit('menu');
  await clicar('[data-acao="ajuda"]');
  await audit('ajuda');
  await clicar('[data-acao="fechar-ajuda"]');
  await clicar('[data-acao="escolher"]');
  await audit('personagem');
  // nome longo
  await pagina.locator('.grade-personagens [role="radio"]').nth(4).click();
  await clicar('[data-acao="proximo"]');
  await audit('arena');
  await clicar('[data-acao="comecar"]');
  await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'jogando' && window.__bomberolho.state.contagem === 0, null, { timeout: 9000 });
  await pagina.evaluate(() => { const b = window.__bomberolho; for (const i of [1, 2, 3]) b.input(i, {}); b.darItem(0, 'estojo'); });
  await audit('jogando-montado');
  await clicar('#bt-pausa');
  await audit('pausado');
  // continuar pelo botão do cartão
  await pagina.locator('#aviso button', { hasText: /Continuar/i }).first().click();
  // eliminado (faixa): perde o bichinho e depois sai
  await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); for (let k = 0; k < 2; k++) { b.input(0, { bomba: true }); b.step(2); b.input(0, {}); b.step(260); } b.setTimeScale(1); });
  await audit('faixa');
  // intervalo e resultado por demo acelerado
  await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ rodadas: 1, contagem: false, dificuldade: 'dificil' }); b.demo(true); b.setTimeScale(16); });
  await pagina.waitForFunction(() => ['intervalo', 'resultado'].includes(window.__bomberolho.state.tela), null, { timeout: 60000 }).catch(() => {});
  r.telaFinal = await pagina.evaluate(() => window.__bomberolho.state.tela);
  await audit('resultado');
  r.problemasConsole = p.problemas;
  await p.contexto.close();
  const resumo = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.problemas ? (v.problemas.length ? v.problemas : 'ok') : v]));
  console.log(id, JSON.stringify(resumo));
}
await nav.close();
await servidor.fechar();
