import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await nav.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })).newPage();
await p.goto('http://localhost:7231/bomberolho/?semente=35');
await p.waitForFunction(() => window.__bomberolho);
const r = await p.evaluate(() => {
  const B = window.__bomberolho;
  B.start({ semente: 35, dificuldade: 'dificil', personagem: 'iris' }); B.setTimeScale(0); B.demo(true);
  const s0 = B.step(1934);
  const g = s0.gotas.map((x) => ({ col: x.col, lin: x.lin, pavio: x.pavio, dono: x.dono }));
  const s1 = B.step(1);
  return { tick: s1.tick, gotasAntes: g, novos: s1.respingos.filter((x) => x.restante === 30).map((x) => ({ col: x.col, lin: x.lin, cadeia: x.cadeia, dono: x.dono })) };
});
await p.screenshot({ path: '/home/user/bomberolho/qa/capturas/v-cadeia.png' });
const r2 = await p.evaluate(() => { const s = window.__bomberolho.step(8); return s.respingos.length; });
await p.screenshot({ path: '/home/user/bomberolho/qa/capturas/v-cadeia-8ticks.png' });
console.log(JSON.stringify(r), r2);
await nav.close();
