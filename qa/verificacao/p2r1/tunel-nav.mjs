// Verificador P2R1: no navegador, o humano anda pelo teclado até a boca do túnel da Caverna e sobrevive à rodada inteira.
import { chromium } from 'playwright';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto('http://localhost:7232/bomberolho/?arena=caverna&semente=5&dificuldade=dificil&rodadas=1');
await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.fase === 'jogando', null, { timeout: 8000 });
await p.keyboard.down('ArrowDown'); await p.waitForTimeout(650); await p.keyboard.up('ArrowDown');
await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(250); await p.keyboard.up('ArrowLeft');
const s0 = await p.evaluate(() => window.__bomberolho.state.jogadores[0]);
console.log('humano', s0.x, s0.y, s0.vivo);
// acelera 16x até o fim da rodada, sem tocar em nada
await p.evaluate(() => window.__bomberolho.setTimeScale(16));
await p.waitForFunction(() => { const s = window.__bomberolho.state; return s.tela !== 'jogando' || (s.aperto && s.aperto.total && s.aperto.caidas >= s.aperto.total); }, null, { timeout: 120000, polling: 200 });
await p.evaluate(() => window.__bomberolho.setTimeScale(0));
const s = await p.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, relogio: s.relogio, aperto: s.aperto, j: s.jogadores.map((j) => [j.vivo, j.x, j.y]) }; });
console.log(JSON.stringify(s));
await p.screenshot({ path: `${CAP}v2-tunel-imune.png` });
await nav.close();
