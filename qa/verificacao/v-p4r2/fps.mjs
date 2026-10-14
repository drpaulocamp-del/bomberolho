// Verificador P4R2: fps por momento (começo / meio / aperto / aperto fim) em
// cenários diferentes dos do executor (Caverna Médio e Vale Difícil), com a
// densidade já acomodada (aquecimento de 3 s) e também sem aquecer.
// Uso: cd qa && node verificacao/v-p4r2/fps.mjs
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const casos = [
  ['desktop 1280x720', { width: 1280, height: 720 }, 1, 1, false],
  ['390x844 DPR3 CPU4', { width: 390, height: 844 }, 3, 4, true],
  ['740x360 DPR3 CPU4', { width: 740, height: 360 }, 3, 4, true],
  ['360x640 DPR2 CPU6', { width: 360, height: 640 }, 2, 6, true],
];
const cenarios = [['caverna', 'medio', 5], ['vale', 'dificil', 9]];
const momentos = [['começo', 115], ['meio', 80], ['aperto', 40], ['aperto fim', 15]];
function medir(pg, ms) {
  return pg.evaluate((janela) => new Promise((ok) => {
    const t = []; let a = performance.now(); const fim = a + janela;
    const q = (n) => { t.push(n - a); a = n; if (n < fim) requestAnimationFrame(q); else {
      const s = t.reduce((x, y) => x + y, 0); const ord = [...t].sort((x, y) => x - y);
      // pior janela de 500 ms
      let pior = Infinity; for (let i = 0; i < t.length; i++) { let acc = 0, n2 = 0; for (let j = i; j < t.length && acc < 500; j++) { acc += t[j]; n2++; } if (acc >= 500) pior = Math.min(pior, n2 * 1000 / acc); }
      ok({ fps: Math.round(t.length * 1000 / s), p95: +ord[Math.floor(ord.length * 0.95)].toFixed(1), min500: Math.round(pior), lentos: +(t.filter((x) => x > 34).length / t.length * 100).toFixed(1), dens: window.__bomberolho.state.densidade }); } };
    requestAnimationFrame(q);
  }), ms);
}
for (const [arena, dif, sem] of cenarios) for (const [nome, tela, dpr, cpu, toque] of casos) for (const [mo, rel] of momentos) {
  const { pagina, contexto, problemas } = await novaPagina(nav, tela, { dpr, contexto: { hasTouch: toque, isMobile: toque } });
  await pagina.goto(`${servidor.url}?demo=1&semente=${sem}&dificuldade=${dif}&rodadas=3&arena=${arena}`);
  await esperarJogo(pagina);
  const ok = await pagina.evaluate((alvo) => { const b = window.__bomberolho; b.setTimeScale(0);
    for (let s = 0; s < 30; s++) { while (b.state.tela === 'jogando' && b.state.fase === 'jogando' || b.state.contagem > 0) { if (b.state.relogio <= alvo) break; b.step(30); }
      if (b.state.relogio <= alvo + 1 && b.state.jogadores.filter((j) => j.vivo).length >= 2 && b.state.tela === 'jogando') { b.setTimeScale(1); return true; }
      b.start({ semente: 100 + s, contagem: false }); b.demo(true); b.setTimeScale(0); }
    return false; }, rel);
  const cdp = await contexto.newCDPSession(pagina);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const frio = await medir(pagina, 1500);
  await pagina.waitForTimeout(1500);
  const est = await medir(pagina, 5000);
  const st = await pagina.evaluate(() => { const s = window.__bomberolho.state; return { rel: Math.round(s.relogio), vivos: s.jogadores.filter((j) => j.vivo).length, aperto: s.aperto.ativo, tela: s.tela }; });
  console.log(`${arena}/${dif}`, nome, mo, ok ? '' : '(MOMENTO NÃO ALCANÇADO)', 'frio1,5s', JSON.stringify(frio), '| estável5s', JSON.stringify(est), JSON.stringify(st), problemas.length ? problemas : '');
  await contexto.close();
}
await nav.close(); await servidor.fechar();
