import { chromium } from 'playwright';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const a of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const prob = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.text()); });
  await p.goto(`http://localhost:7232/bomberolho/?arena=${a}&semente=8&demo=1`);
  await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando');
  await p.evaluate(() => { const B = window.__bomberolho; B.setTimeScale(0); B.step(60 * 22); B.setTimeScale(1); });
  await p.waitForTimeout(300);
  await p.locator('#arena').screenshot({ path: `${CAP}v2-arena-${a}.png` });
  console.log(a, prob);
  await ctx.close();
}
await nav.close();
