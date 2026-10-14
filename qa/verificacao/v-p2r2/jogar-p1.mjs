// Verificador parte 1 rodada 1: joga com teclado e testa regras pelo gancho no Chromium.
import { chromium } from 'playwright';
import { Jogo } from '../../../bomberolho/js/jogo.js';
const BASE = process.argv[2] || 'http://localhost:7231/bomberolho/';
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const res = {};
const TELAS = { desktop: [1280, 720], retrato: [390, 844], paisagem: [844, 390], pequeno: [360, 640] };

async function pagina(w, h, q = '') {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900 });
  const p = await ctx.newPage();
  const prob = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => prob.push('pageerror: ' + e.message));
  p.on('response', (r) => { if (r.status() >= 400) prob.push(r.status() + ' ' + r.url()); });
  p.on('requestfailed', (r) => prob.push('falhou ' + r.url()));
  const reqs = [];
  p.on('request', (r) => reqs.push(r.url()));
  await p.goto(BASE + q);
  await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela === 'jogando');
  return { p, ctx, prob, reqs };
}

for (const [nome, [w, h]] of Object.entries(TELAS)) {
  const { p, ctx, prob, reqs } = await pagina(w, h, '?semente=99');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${CAP}v-${nome}-1.png` });
  const geo = await p.evaluate(() => {
    const c = document.getElementById('arena').getBoundingClientRect();
    return { canvas: [c.left, c.top, c.right, c.bottom].map(Math.round), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight };
  });
  // jogar pelo teclado: anda, solta gota, foge
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(250); await p.keyboard.up('ArrowRight');
  await p.keyboard.press('Space');
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(400); await p.keyboard.up('ArrowLeft');
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(500); await p.keyboard.up('ArrowDown');
  await p.waitForTimeout(1900);
  await p.screenshot({ path: `${CAP}v-${nome}-2-respingo.png` });
  const st = await p.evaluate(() => window.__bomberolho.state);
  const ext = reqs.filter((u) => !u.startsWith('http://localhost:7231/'));
  res['tela_' + nome] = { geo, problemas: prob, externos: ext, humano: st.jogadores[0], respingos: st.respingos.length };
  await ctx.close();
}

// ---- regras pelo gancho (desktop)
{
  const { p, ctx, prob } = await pagina(1280, 720, '?semente=7');
  const r = await p.evaluate(() => {
    const B = window.__bomberolho;
    const out = {};
    B.start({ semente: 7, contagem: false }); B.setTimeScale(0);
    for (const k of [1, 2, 3]) B.input(k, {});
    // deslize de quina: anda 15 ticks para a direita (x≈2,33) e aperta baixo (pilar em (2,2))
    B.input(0, { dir: true }); let s = B.step(15);
    const x0 = s.jogadores[0].x;
    B.input(0, { baixo: true });
    const traj = [];
    for (let k = 0; k < 40; k++) { s = B.step(1); traj.push([s.jogadores[0].x, s.jogadores[0].y]); }
    out.deslize = { x0, grade2: s.grade.slice(0, 4), traj: traj.filter((_, i) => i % 4 === 0), final: traj.at(-1) };
    // volta para a largada (1,1)
    B.input(0, { cima: true }); B.step(40);
    s = B.state; out.posAntesGota = [s.jogadores[0].x, s.jogadores[0].y];
    // gota e sair de cima: solta em (1,1), anda para baixo (L) até sair
    B.input(0, { bomba: true }); s = B.step(1);
    out.gota = s.gotas[0];
    B.input(0, { baixo: true });
    let t = 0; while (B.state.gotas[0].passantes.length && t < 60) { B.step(1); t++; }
    out.ticksSair = t; out.posAoSair = [B.state.jogadores[0].x, B.state.jogadores[0].y];
    B.input(0, { cima: true }); B.step(20);
    out.posEmpurrandoDeVolta = [B.state.jogadores[0].x, B.state.jogadores[0].y]; // deve parar em y=2,5 (centro da casa (1,2))
    // foge: vai a (1,3)... ainda no braço (alcance 2). Vai para (1,3) e depois tenta (2,3)
    B.input(0, { baixo: true }); B.step(30); B.input(0, { dir: true }); s = B.step(25);
    out.posAbrigo = [s.jogadores[0].x, s.jogadores[0].y, s.jogadores[0].col, s.jogadores[0].lin];
    B.input(0, {});
    const gradeAntes = B.state.grade.slice();
    // espera a gota estourar e conta ticks letais
    let estourou = null; let letais = 0; let restantes = [];
    for (let k = 0; k < 220; k++) {
      s = B.step(1);
      if (s.respingos.length) { estourou ??= s.tick; letais++; restantes.push(s.respingos[0].restante); out.resp ??= s.respingos[0]; }
    }
    out.estouro = { tickSoltura: out.gota ? 'ver gota' : null, estourou, letais, restantesIni: restantes.slice(0, 3), restantesFim: restantes.slice(-3) };
    out.gradeAntes = gradeAntes.slice(0, 5); out.gradeDepois = B.state.grade.slice(0, 5);
    out.humanoVivo = B.state.jogadores[0].vivo;
    return out;
  });
  res.regras = r; res.regras.problemas = prob;
  await p.screenshot({ path: `${CAP}v-regras.png` });
  await ctx.close();
}

// ---- cadeia ao vivo (robôs) e determinismo navegador × Node
{
  const { p, ctx, prob } = await pagina(1280, 720, '?semente=7');
  const r = await p.evaluate(() => {
    const B = window.__bomberolho;
    const achados = [];
    for (const sem of [11, 12, 13, 14, 15, 16, 17, 18]) {
      B.start({ semente: sem, dificuldade: 'dificil' }); B.setTimeScale(0); B.demo(true);
      let prev = B.state;
      for (let k = 0; k < 6000 && achados.length < 4; k++) {
        const s = B.step(1);
        const novos = s.respingos.filter((x) => x.restante === 30);
        if (novos.some((x) => x.cadeia)) {
          const ch = novos.filter((x) => x.cadeia).map((x) => {
            const g = prev.gotas.find((gg) => gg.col === x.col && gg.lin === x.lin);
            return { col: x.col, lin: x.lin, pavioNoTickAnterior: g && g.pavio };
          });
          achados.push({ sem, tick: s.tick, novosNoMesmoTick: novos.length, cadeias: ch, gotasRestantesNaCasa: s.gotas.filter((g) => ch.some((c) => c.col === g.col && c.lin === g.lin)).length });
          break;
        }
        if (s.tela === 'resultado') break;
        prev = s;
      }
    }
    B.start({ semente: 4242, dificuldade: 'dificil' }); B.setTimeScale(0); B.demo(true); B.step(3000);
    const h1 = B.hash();
    B.start({ semente: 4242, dificuldade: 'dificil' }); B.setTimeScale(0); B.demo(true); B.step(1000); B.step(2000);
    return { achados, h1, h2: B.hash() };
  });
  const jg = new Jogo().iniciar({ semente: 4242, dificuldade: 'dificil', personagem: 'iris' }); jg.demo = true; jg.passos(3000);
  r.hNode = jg.impressao();
  res.cadeiaDeterminismo = r; res.cadeiaDeterminismo.problemas = prob;
  // captura de uma partida no meio, com respingos
  await p.evaluate(() => { const B = window.__bomberolho; B.start({ semente: 21 }); B.demo(true); B.setTimeScale(0); });
  for (let i = 0; i < 400; i++) {
    const n = await p.evaluate(() => { const s = window.__bomberolho.step(3); return s.respingos.length; });
    if (n >= 2 && i > 60) break;
  }
  await p.screenshot({ path: `${CAP}v-meio-partida.png` });
  await ctx.close();
}

// ---- jogar de verdade com teclado em tempo real, sem gancho: 20 s, até o resultado
{
  const { p, ctx, prob } = await pagina(1280, 720, '?semente=5');
  const seq = ['ArrowRight', 'Space', 'ArrowLeft', 'ArrowDown', null, null, 'ArrowDown', 'ArrowRight', 'Space', 'ArrowLeft', 'ArrowUp'];
  for (let i = 0; i < 40; i++) {
    const k = seq[i % seq.length];
    if (k === 'Space') await p.keyboard.press('Space');
    else if (k) { await p.keyboard.down(k); await p.waitForTimeout(300); await p.keyboard.up(k); }
    else await p.waitForTimeout(600);
    if (i === 14) await p.screenshot({ path: `${CAP}v-teclado-meio.png` });
  }
  const s = await p.evaluate(() => window.__bomberolho.state);
  res.teclado = { tela: s.tela, humano: s.jogadores[0], vivos: s.jogadores.filter((j) => j.vivo).length, tick: s.tick, problemas: prob };
  await p.evaluate(() => { window.__bomberolho.setTimeScale(16); window.__bomberolho.demo(true); });
  await p.waitForFunction(() => window.__bomberolho.state.tela === 'resultado', null, { timeout: 120000 }).catch(() => {});
  await p.screenshot({ path: `${CAP}v-resultado.png` });
  res.resultado = await p.evaluate(() => ({ tela: window.__bomberolho.state.tela, venc: window.__bomberolho.state.vencedor, aviso: document.querySelector('#aviso').innerText }));
  await ctx.close();
}
console.log(JSON.stringify(res, null, 1));
await nav.close();
