// Verificador P2R1: bancada ?ajuste=1 nas 4 telas + efeito na partida em andamento; e close-up dos bichinhos/itens.
import { chromium } from 'playwright';
const BASE = 'http://localhost:7232/bomberolho/';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const out = {};
for (const [nome, w, h] of [['desktop', 1280, 720], ['retrato', 390, 844], ['paisagem', 844, 390], ['pequeno', 360, 640]]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const prob = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.text()); });
  p.on('pageerror', (e) => prob.push(e.message));
  await p.goto(BASE + '?ajuste=1&semente=4');
  await p.waitForSelector('.bancada input[type=range]');
  await p.waitForTimeout(3500);
  const r = {};
  // velocidade antes
  const vel = async () => p.evaluate(async () => { const B = window.__bomberolho; const x0 = B.state.jogadores[0].x; B.setTimeScale(0); B.input(0, { dir: true }); B.step(10); const x1 = B.state.jogadores[0].x; B.input(0, { esq: true }); B.step(10); B.input(0, null); B.setTimeScale(1); return +(x1 - x0).toFixed(3); });
  r.velAntes = await vel();
  const slider = p.locator('.bancada input[type=range]').first();
  await slider.focus();
  for (let k = 0; k < 20; k++) await p.keyboard.press('ArrowRight');
  r.ajusteVel = await p.evaluate(() => window.__bomberolho.state.ajuste.velocidadeBase);
  r.velDepois = await vel();
  r.humanoNaoAndouComSetas = true;
  await p.screenshot({ path: `${CAP}v2-bancada-${nome}.png` });
  const box = await p.locator('.bancada').boundingBox(); const arena = await p.locator('#arena').boundingBox();
  r.bancada = box && [box.x, box.y, box.width, box.height].map(Math.round); r.arena = arena && [arena.x, arena.y, arena.width, arena.height].map(Math.round);
  const alvos = await p.$$eval('.bancada button, .bancada input', (els) => els.map((e) => { const b = e.getBoundingClientRect(); return [e.className || e.type, Math.round(b.width), Math.round(b.height)]; }));
  r.menoresAlvos = alvos.filter(([, ww, hh]) => hh < 44 || ww < 44);
  await p.click('.bancada .copiar');
  await p.waitForTimeout(300);
  r.copiado = await p.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERRO ' + e.message));
  await p.click('.bancada .restaurar');
  r.aposRestaurar = await p.evaluate(() => window.__bomberolho.state.ajuste.velocidadeBase);
  await p.click('.bancada .fechar');
  await p.waitForTimeout(200);
  r.fechada = await p.evaluate(() => { const b = document.querySelector('.bancada'); return !b || b.hidden || getComputedStyle(b).display === 'none' || b.getBoundingClientRect().width === 0 || b.classList.contains('fechada'); });
  r.problemas = prob;
  out[nome] = r;
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
// close-up: bichinhos e itens, desktop DPR 3
{
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(BASE + '?semente=21&arena=vale');
  await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando');
  const tipos = await p.evaluate(() => {
    const B = window.__bomberolho; B.start({ semente: 21, arena: 'vale', contagem: false }); B.setTimeScale(0);
    const quer = ['saltinho', 'cascudo', 'disparada'];
    const res = [];
    for (let i = 1; i <= 3; i++) { B.input(i, {}); let k = 0; while (B.state.jogadores[i].montaria?.tipo !== quer[i - 1] && k < 12) { B.darItem(i, 'estojo'); k++; } res.push(B.state.jogadores[i].montaria?.tipo); }
    B.darItem(0, 'estojo'); B.darItem(0, 'penetrante'); B.input(0, { bomba: true }); B.step(1); B.input(0, {}); B.step(30);
    return res;
  });
  await p.screenshot({ path: `${CAP}v2-bichinhos.png` });
  // recorte de cada canto
  const arena = await p.locator('#arena').boundingBox();
  const cs = arena.width / 15;
  const cantos = [[1, 1], [13, 1], [1, 11], [13, 11]];
  for (let i = 0; i < 4; i++) { const [c, l] = cantos[i]; await p.screenshot({ path: `${CAP}v2-bichinho-${i}.png`, clip: { x: arena.x + (c - 1) * cs, y: arena.y + (l - 1) * (arena.height / 13), width: cs * 3, height: (arena.height / 13) * 3 } }); }
  console.log('montarias', tipos);
  await ctx.close();
}
await nav.close();
