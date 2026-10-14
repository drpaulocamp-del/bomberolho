// Verificador P2R2: o túnel da Caverna no navegador, pelo teclado: humano vai até a boca (linha 5) e atravessa.
import { chromium } from 'playwright';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const prob = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.text()); });
await p.goto('http://localhost:7233/bomberolho/?arena=caverna&semente=5&dificuldade=facil');
await p.waitForFunction(() => window.__bomberolho?.state.fase === 'jogando', null, { timeout: 10000 });
// abre o caminho até (1,5) para o teste (só a grade: tira blocos da coluna 1)
const g0 = await p.evaluate(() => window.__bomberolho.state.grade.slice(1, 8));
console.log(g0.join('\n'));
const traj = [];
const st = () => p.evaluate(() => window.__bomberolho.state.jogadores[0]);
async function ir(tecla, cond, max = 60) { await p.keyboard.down(tecla); for (let k = 0; k < max; k++) { await p.waitForTimeout(25); const j = await st(); traj.push([j.x, j.y]); if (cond(j)) break; } await p.keyboard.up(tecla); }
for (const lin of [2, 3]) {
  await ir('ArrowDown', (j) => j.y >= lin + 0.5);
  await p.keyboard.press('Space');
  await ir('ArrowUp', (j) => j.y <= 1.5);
  await ir('ArrowRight', (j) => j.x >= 2.5);
  await p.waitForTimeout(3600);
  await ir('ArrowLeft', (j) => j.x <= 1.5);
}
await ir('ArrowDown', (j) => j.y >= 5.5, 120);
await p.keyboard.down('ArrowLeft');
let foto = 0;
for (let k = 0; k < 30; k++) { await p.waitForTimeout(30); const j = await p.evaluate(() => window.__bomberolho.state.jogadores[0]); traj.push([j.x, j.y]); if (j.x > 10 && foto < 2) { await p.screenshot({ path: `${CAP}vr2-tunel-${foto}.png` }); foto++; } }
await p.keyboard.up('ArrowLeft');
console.log(JSON.stringify(traj.map(([x, y]) => [x.toFixed(2), y.toFixed(2)])), prob);
await nav.close();
