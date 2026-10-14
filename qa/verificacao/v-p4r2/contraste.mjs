// Verificador P4R2: contraste do texto visível (cor do texto × fundo opaco
// efetivo, compondo fundos translúcidos dos ancestrais sobre o fundo da página),
// no menu, personagem, arena, jogo, pausa e resultado.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
function medir() {
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fundo = (el) => { const pilha = []; for (let a = el; a; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if ((c[3] ?? 1) > 0) pilha.push(c); if ((c[3] ?? 1) >= 1) break; }
    let cor = [245, 245, 247]; for (const c of pilha.reverse()) { const al = c[3] ?? 1; cor = cor.map((v, i) => v * (1 - al) + c[i] * al); } return cor; };
  const out = [];
  const vistos = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[hidden]') || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!txt) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || +s.opacity === 0) continue;
    const c = rgb(s.color); const f = fundo(el);
    const cor = c.slice(0, 3).map((v, i) => v * (c[3] ?? 1) + f[i] * (1 - (c[3] ?? 1)));
    const L1 = lum(cor), L2 = lum(f);
    const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    const chave = txt.slice(0, 20) + s.color;
    if (vistos.has(chave)) continue; vistos.add(chave);
    if (r < (grande ? 3 : 4.5)) out.push(`${txt.slice(0, 26)} ${r.toFixed(2)}:1 (${s.fontSize}${grande ? ' grande' : ''})`);
  }
  return out;
}
await pagina.goto(servidor.url); await esperarJogo(pagina); await pagina.waitForTimeout(500);
console.log('menu', await pagina.evaluate(medir));
await pagina.locator('[data-acao="ajuda"]').tap(); await pagina.waitForTimeout(400);
console.log('ajuda', await pagina.evaluate(medir));
await pagina.locator('[data-acao="fechar-ajuda"]').tap();
await pagina.locator('[data-acao="escolher"]').tap(); await pagina.waitForTimeout(400);
console.log('personagem', await pagina.evaluate(medir));
await pagina.locator('[data-acao="proximo"]').tap(); await pagina.waitForTimeout(400);
console.log('arena', await pagina.evaluate(medir));
await pagina.locator('[data-acao="comecar"]').tap();
await pagina.waitForFunction(() => window.__bomberolho.state.contagem === 0, null, { timeout: 9000 });
console.log('jogo', await pagina.evaluate(medir));
await pagina.locator('#bt-pausa').tap(); await pagina.waitForTimeout(400);
console.log('pausa', await pagina.evaluate(medir));
await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ rodadas: 1, contagem: false }); b.demo(true); b.setTimeScale(16); });
await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'resultado', null, { timeout: 60000 });
await pagina.waitForTimeout(600);
console.log('resultado', await pagina.evaluate(medir));
await nav.close(); await servidor.fechar();
