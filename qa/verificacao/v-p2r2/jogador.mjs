// Verificador P2R2: joga DE VERDADE no Chromium, só pelo teclado (keyboard.down/up),
// com um jogador heurístico próprio em malha fechada (lê o estado, decide, aperta
// teclas em tempo real, escala 1). Perfis: "crianca" (reage devagar, às vezes
// esquece de conferir a fuga) e "bom" (confere fuga, ataca rivais).
// Uso: node jogador.mjs <porta> <perfil> <tela> <nivel> <arena> <semente> [rodadas]
import { chromium } from 'playwright';
const [porta, perfil, tela, nivel, arena, semente, rodadas = '1'] = process.argv.slice(2);
const TELAS = { desktop: [1280, 720], retrato: [390, 844], paisagem: [844, 390], pequeno: [360, 640] };
const [W, H] = TELAS[tela];
const CAP = new URL('../../capturas/', import.meta.url).pathname;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 2) });
const p = await ctx.newPage();
const prob = [], ext = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) prob.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => prob.push('pageerror: ' + e.message));
p.on('response', (r) => { if (r.status() >= 400) prob.push(r.status() + ' ' + r.url()); });
p.on('request', (r) => { if (!r.url().startsWith(`http://localhost:${porta}/`)) ext.push(r.url()); });
await p.goto(`http://localhost:${porta}/bomberolho/?arena=${arena}&dificuldade=${nivel}&semente=${semente}&rodadas=${rodadas}`);
await p.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando');
const ANDA = new Set('.gavcspnez'.split(''));
const KEY = { cima: 'ArrowUp', baixo: 'ArrowDown', esq: 'ArrowLeft', dir: 'ArrowRight' };
const DIRS = [['cima', 0, -1], ['baixo', 0, 1], ['esq', -1, 0], ['dir', 1, 0]];
const seguradas = new Set();
async function segurar(lista) {
  for (const k of [...seguradas]) if (!lista.includes(k)) { await p.keyboard.up(k); seguradas.delete(k); }
  for (const k of lista) if (!seguradas.has(k)) { await p.keyboard.down(k); seguradas.add(k); }
}
let rngS = Number(semente) * 9301 + 49297;
const rnd = () => ((rngS = (rngS * 9301 + 49297) % 233280) / 233280);
function perigo(s, extra) {
  const C = s.colunas, L = s.linhas, g = s.grade;
  const T = new Array(C * L).fill(Infinity);
  for (const r of s.respingos) for (const c of r.casas) T[c.lin * C + c.col] = 0;
  if (s.aperto && s.aperto.proxima) T[s.aperto.proxima.lin * C + s.aperto.proxima.col] = Math.max(1, s.aperto.proxima.emTicks);
  const gotas = s.gotas.filter((x) => x.estado === 'chao').map((x) => ({ ...x, t: x.pavio }));
  if (extra) gotas.push(extra);
  const solido = (ch, pen) => ch === '#' || ch === 'M' || ch === 'T' || (!pen && (ch === 'B' || ch === 'q'));
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const b of gotas) {
      const cruz = [[b.col, b.lin]];
      for (const [, dc, dl] of DIRS) for (let k = 1; k <= b.alcance; k++) {
        const c = b.col + dc * k, l = b.lin + dl * k;
        if (c < 0 || l < 0 || c >= C || l >= L) break;
        const ch = g[l][c];
        if (ch === '#' || ch === 'M' || ch === 'T') break;
        cruz.push([c, l]);
        if ((ch === 'B' || ch === 'q') && !b.penetrante) break;
      }
      for (const [c, l] of cruz) {
        const i = l * C + c;
        if (b.t < T[i]) T[i] = b.t;
        for (const o of gotas) if (o !== b && o.col === c && o.lin === l && o.t > b.t) { o.t = b.t; mudou = true; }
      }
    }
  }
  return T;
}
function bfs(s, de, T, tpc, extraBloq) {
  const C = s.colunas, g = s.grade;
  const dist = new Map([[de, 0]]), pai = new Map();
  const fila = [de];
  while (fila.length) {
    const i = fila.shift();
    const d = dist.get(i);
    for (const [nome, dc, dl] of DIRS) {
      const c = (i % C) + dc, l = Math.floor(i / C) + dl;
      const k = l * C + c;
      if (dist.has(k) || !ANDA.has(g[l]?.[c]) || k === extraBloq) continue;
      if (T[k] !== Infinity && T[k] - (d + 1) * tpc < 40 && T[k] + 35 > (d + 1) * tpc) continue; // estaria molhado ao passar
      dist.set(k, d + 1); pai.set(k, [i, nome]); fila.push(k);
    }
  }
  return { dist, pai };
}
function passoPara(b, de, alvo) {
  let k = alvo, nome = null;
  while (k !== de) { const [pp, n] = b.pai.get(k); nome = n; k = pp; }
  return nome;
}
const lento = perfil === 'crianca';
const log = { decisoes: 0, gotas: 0, fugas: 0, fotos: [] };
let foto = 0;
let ultimaGota = 0;
const t0 = Date.now();
while (Date.now() - t0 < 12 * 60 * 1000) {
  const s = await p.evaluate(() => window.__bomberolho.state);
  if (s.tela === 'resultado') break;
  if (s.tela === 'intervalo' || s.fase !== 'jogando') {
    await segurar([]);
    if (s.tela === 'intervalo' && foto < 3) { await p.screenshot({ path: `${CAP}vr2-jogo-${tela}-${nivel}-intervalo.png` }); foto = 3; }
    await p.waitForTimeout(150); continue;
  }
  const me = s.jogadores[0];
  if (!me.vivo) { if (!log.mortes) log.mortes = []; if (log.mortes.length < s.rodada) log.mortes.push([s.rodada, me.eliminadoPor, s.relogio]); await segurar([]); await p.waitForTimeout(200); continue; }
  if (foto === 0 && s.relogio < 105) { await p.screenshot({ path: `${CAP}vr2-jogo-${tela}-${nivel}-meio.png` }); foto = 1; }
  if (foto === 1 && s.aperto.ativo && s.aperto.caidas > 30) { await p.screenshot({ path: `${CAP}vr2-jogo-${tela}-${nivel}-aperto.png` }); foto = 2; }
  log.decisoes++;
  const C = s.colunas;
  const aqui = me.lin * C + me.col;
  const tpc = Math.ceil(1000 / (55 + 9 * me.poderes.velocidade)) + (lento ? 8 : 2);
  const T = perigo(s);
  const b = bfs(s, aqui, T, tpc);
  let teclas = [];
  const seguro = (i) => T[i] === Infinity;
  if (!seguro(aqui)) {
    log.fugas++;
    let melhor = null;
    for (const [i, d] of b.dist) if (seguro(i) && (melhor === null || d < b.dist.get(melhor))) melhor = i;
    if (melhor !== null && melhor !== aqui) teclas = [KEY[passoPara(b, aqui, melhor)]];
  } else {
    // soltar gota?
    const rivais = s.jogadores.filter((j) => j.vivo && j.id !== 0);
    let vale = false;
    for (const [, dc, dl] of DIRS) for (let k = 1; k <= me.poderes.alcance; k++) {
      const ch = s.grade[me.lin + dl * k]?.[me.col + dc * k];
      if (rivais.some((r) => r.col === me.col + dc * k && r.lin === me.lin + dl * k)) vale = true;
      if (ch === 'B') { if (k === 1 || !lento) vale = true; break; }
      if (!ANDA.has(ch)) break;
    }
    const temGota = me.gotasAtivas < me.poderes.gotas && s.grade[me.lin][me.col] !== 'o';
    const centro = Math.abs(me.x - me.col - 0.5) < 0.25 && Math.abs(me.y - me.lin - 0.5) < 0.25;
    if (vale && temGota && centro && Date.now() - ultimaGota > (lento ? 900 : 300)) {
      const T2 = perigo(s, { col: me.col, lin: me.lin, alcance: me.poderes.alcance, penetrante: me.poderes.penetrante, t: 165 });
      const b2 = bfs(s, aqui, T2, tpc);
      const fuga = [...b2.dist.keys()].some((i) => T2[i] === Infinity);
      if (fuga || (lento && rnd() < 0.12)) { await p.keyboard.press('Space'); log.gotas++; ultimaGota = Date.now(); await p.waitForTimeout(lento ? 120 : 30); continue; }
    }
    // alvo
    let alvo = null, nota = -1e9;
    for (const [i, d] of b.dist) {
      if (!seguro(i)) continue;
      const c = i % C, l = Math.floor(i / C);
      const ch = s.grade[l][c];
      let v = -d * 3 + rnd() * (lento ? 6 : 2);
      if ('gavspnce'.includes(ch) && ch !== '.') v += 30;
      if (ch === 'z') v -= 50;
      if (DIRS.some(([, dc, dl]) => s.grade[l + dl]?.[c + dc] === 'B')) v += 12;
      if (!lento) for (const r of rivais) if ((r.col === c || r.lin === l) && Math.abs(r.col - c) + Math.abs(r.lin - l) <= me.poderes.alcance) v += 14;
      if (i === aqui) v -= 4;
      if (v > nota) { nota = v; alvo = i; }
    }
    if (alvo !== null && alvo !== aqui) teclas = [KEY[passoPara(b, aqui, alvo)]];
  }
  if (!teclas.length) {
    const ox = me.x - me.col - 0.5, oy = me.y - me.lin - 0.5;
    if (Math.abs(ox) > 0.08) teclas = [ox > 0 ? 'ArrowLeft' : 'ArrowRight'];
    else if (Math.abs(oy) > 0.08) teclas = [oy > 0 ? 'ArrowUp' : 'ArrowDown'];
  }
  await segurar(teclas);
  await p.waitForTimeout(lento ? 140 : 25);
}
await segurar([]);
const s = await p.evaluate(() => window.__bomberolho.state);
await p.screenshot({ path: `${CAP}vr2-jogo-${tela}-${nivel}-${arena}-resultado.png` });
const geo = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
console.log(JSON.stringify({ perfil, tela, nivel, arena, semente, tela_final: s.tela, partida: s.partida, segundos: Math.round((Date.now() - t0) / 1000), log, geo, problemas: prob, externos: ext }));
await nav.close();
