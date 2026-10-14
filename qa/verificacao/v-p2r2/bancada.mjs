// Verificador P2R2: bancada ?ajuste=1 nas 4 telas — efeito imediato, recolher, copiar, restaurar, fechar; alvos ≥ 44 px.
import { chromium } from 'playwright';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const TELAS = { desktop: [1280, 720], retrato: [390, 844], paisagem: [844, 390], pequeno: [360, 640] };
const out = {};
for (const [nome, [w, h]] of Object.entries(TELAS)) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const prob = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.text()); });
  p.on('pageerror', (e) => prob.push(e.message));
  p.on('response', (r) => { if (r.status() >= 400) prob.push(r.status() + r.url()); });
  await p.goto('http://localhost:7233/bomberolho/?ajuste=1&semente=4&contagem=0');
  await p.waitForFunction(() => window.__bomberolho?.state.fase === 'jogando', null, { timeout: 10000 });
  const r = {};
  const medir = () => p.evaluate(() => { const B = window.__bomberolho; B.setTimeScale(0); B.start({ semente: 4, contagem: false }); B.input(0, { dir: true }); const x0 = B.state.jogadores[0].x; B.step(10); const x1 = B.state.jogadores[0].x; B.input(0, null); return +(x1 - x0).toFixed(3); });
  r.antes = await medir();
  // usa o teclado no controle de velocidade
  await p.focus('#ajuste-velocidadeBase');
  for (let k = 0; k < 15; k++) await p.keyboard.press('ArrowRight');
  r.valor = await p.evaluate(() => window.__bomberolho.state.ajuste.velocidadeBase);
  r.depois = await medir();
  r.alvos = await p.evaluate(() => [...document.querySelectorAll('.bancada button, .bancada input, .bancada-abrir')].filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return [e.className || e.id, Math.round(b.width), Math.round(b.height)]; }).filter(([, , hh]) => hh < 44));
  const cobre = () => p.evaluate(() => { const a = document.getElementById('arena').getBoundingClientRect(); const b = document.querySelector('.bancada').getBoundingClientRect(); if (document.querySelector('.bancada').hidden) return 0; const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)); const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); return +((ix * iy) / (a.width * a.height)).toFixed(3); });
  r.cobreAberta = await cobre();
  await p.screenshot({ path: `${CAP}vr2-bancada-${nome}.png` });
  await p.click('.bancada .recolher');
  r.cobreRecolhida = await cobre();
  await p.screenshot({ path: `${CAP}vr2-bancada-${nome}-recolhida.png` });
  await p.click('.bancada .recolher');
  await p.click('.bancada .copiar');
  await p.waitForTimeout(200);
  r.copiado = await p.evaluate(() => navigator.clipboard.readText().catch(() => document.querySelector('.bancada .texto').value));
  await p.click('.bancada .restaurar');
  r.restaurado = await p.evaluate(() => window.__bomberolho.state.ajuste.velocidadeBase);
  await p.click('.bancada .fechar');
  r.fechada = await p.evaluate(() => document.querySelector('.bancada').hidden);
  r.scroll = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth, innerHeight]);
  r.problemas = prob;
  out[nome] = r;
  await ctx.close();
}
console.log(JSON.stringify(out));
await nav.close();
