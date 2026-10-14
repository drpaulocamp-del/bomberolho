import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const s = await subirServidor(); const n = await abrirNavegador();
try {
  for (const [arena, dpr, lent, tela] of [['jardim', 3, 4, { width: 390, height: 844 }], ['caverna', 3, 4, { width: 390, height: 844 }], ['vale', 2, 4, { width: 360, height: 640 }], ['lago', 1, 1, { width: 1280, height: 720 }]]) {
    const { pagina, contexto } = await novaPagina(n, tela, { dpr });
    await pagina.goto(`${s.url}?demo=1&semente=11&dificuldade=dificil&arena=${arena}&escala=2`); await esperarJogo(pagina);
    await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); b.step(5400); b.setTimeScale(1); });
    if (lent > 1) { const c = await contexto.newCDPSession(pagina); await c.send('Emulation.setCPUThrottlingRate', { rate: lent }); }
    const r = await pagina.evaluate(() => new Promise((ok) => { const t = []; let a = performance.now(); const f = a + 5000; let maxEf = 0;
      function q(x) { t.push(x - a); a = x; const st = window.__bomberolho.state; maxEf = Math.max(maxEf, st.respingos.length); if (x < f) requestAnimationFrame(q); else { t.sort((p, q2) => p - q2); ok({ fps: Math.round(t.length * 1000 / t.reduce((p, q2) => p + q2, 0)), p95: t[Math.floor(t.length * .95)].toFixed(1), aperto: st.aperto.ativo, maxEf, tela: st.tela }); } }
      requestAnimationFrame(q); }));
    console.log(arena, dpr, lent, JSON.stringify(r)); await contexto.close();
  }
} finally { await n.close(); await s.fechar(); }
