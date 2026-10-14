// Verificador P2R1: joga no Chromium pelo teclado em 4 telas e captura os momentos da batalha.
import { chromium } from 'playwright';
const BASE = 'http://localhost:7232/bomberolho/';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const TELAS = { desktop: [1280, 720], retrato: [390, 844], paisagem: [844, 390], pequeno: [360, 640] };
const saida = {};
async function abrir(w, h, q) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const prob = []; const ext = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => prob.push('pageerror: ' + e.message));
  p.on('response', (r) => { if (r.status() >= 400) prob.push(r.status() + ' ' + r.url()); });
  p.on('request', (r) => { if (!r.url().startsWith('http://localhost:7232/')) ext.push(r.url()); });
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando');
  return { p, ctx, prob, ext };
}
const st = (p) => p.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, fase: s.fase, contagem: s.contagem, relogio: s.relogio, rodada: s.rodada, aperto: s.aperto, partida: s.partida, j0: s.jogadores[0], vivos: s.jogadores.filter((j) => j.vivo).length }; });
for (const [nome, [w, h]] of Object.entries(TELAS)) {
  for (const dif of ['facil', 'medio', 'dificil']) {
    const { p, ctx, prob, ext } = await abrir(w, h, `?semente=${nome.length * 31 + dif.length}&dificuldade=${dif}`);
    const r = { };
    await p.waitForTimeout(800);
    r.contagem = await st(p);
    if (dif === 'facil') await p.screenshot({ path: `${CAP}v2-${nome}-1-contagem.png` });
    await p.waitForFunction(() => window.__bomberolho.state.fase === 'jogando', null, { timeout: 6000 });
    // joga: anda para a direita, solta gota, volta e desce para o canto seguro
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight');
    await p.keyboard.press('Space');
    await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(320); await p.keyboard.up('ArrowLeft');
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(450); await p.keyboard.up('ArrowDown');
    await p.waitForTimeout(2400);
    r.depoisDaGota = await st(p);
    if (dif === 'facil') await p.screenshot({ path: `${CAP}v2-${nome}-2-jogo.png` });
    // jogar alguns segundos com teclas aleatórias determinísticas
    const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    for (let k = 0; k < 10; k++) {
      const t = teclas[(k * 7 + nome.length) % 4];
      await p.keyboard.down(t); await p.waitForTimeout(220); await p.keyboard.up(t);
      if (k % 3 === 0) { await p.keyboard.press('Space'); await p.keyboard.down(teclas[(k + 2) % 4]); await p.waitForTimeout(400); await p.keyboard.up(teclas[(k + 2) % 4]); }
    }
    r.jogando = await st(p);
    // acelera com o gancho até o aperto
    await p.evaluate(() => { const B = window.__bomberolho; B.setTimeScale(0); B.demo(true); });
    await p.evaluate(() => { const B = window.__bomberolho; let s = B.state; let n = 0; while (s.tela === 'jogando' && !(s.aperto && s.aperto.ativo && s.aperto.caidas > 25) && n < 9000) { s = B.step(30); n += 30; } });
    r.aperto = await st(p);
    if (dif === 'facil' || dif === 'dificil') await p.screenshot({ path: `${CAP}v2-${nome}-3-aperto-${dif}.png` });
    await p.evaluate(() => { const B = window.__bomberolho; let s = B.state; let n = 0; while (s.tela === 'jogando' && n < 9000) { s = B.step(30); n += 30; } });
    r.intervalo = await st(p);
    if (dif === 'facil') await p.screenshot({ path: `${CAP}v2-${nome}-4-intervalo.png` });
    // termina a partida
    await p.evaluate(() => { const B = window.__bomberolho; let s = B.state; let n = 0; while (s.tela !== 'resultado' && n < 60000) { s = B.step(60); n += 60; } });
    r.fim = await st(p);
    if (dif === 'facil') await p.screenshot({ path: `${CAP}v2-${nome}-5-resultado.png` });
    r.geo = await p.evaluate(() => { const c = document.getElementById('arena').getBoundingClientRect(); return { canvas: [c.left, c.top, c.right, c.bottom].map(Math.round), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }; });
    r.problemas = prob; r.externos = ext;
    saida[`${nome}-${dif}`] = { contagem: [r.contagem.fase, r.contagem.contagem, r.contagem.relogio], depoisDaGota: { vivo: r.depoisDaGota.j0.vivo, x: r.depoisDaGota.j0.x, y: r.depoisDaGota.j0.y, rel: r.depoisDaGota.relogio }, jogando: { vivo: r.jogando.j0.vivo, rel: r.jogando.relogio, vivos: r.jogando.vivos }, aperto: r.aperto.aperto, intervaloTela: r.intervalo.tela, partidaFim: r.fim.partida, telaFim: r.fim.tela, geo: r.geo, problemas: prob, externos: ext };
    await ctx.close();
  }
}
console.log(JSON.stringify(saida, null, 1));
await nav.close();
