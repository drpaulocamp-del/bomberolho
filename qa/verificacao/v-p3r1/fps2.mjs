// Mede fps no desktop ao longo da rodada (início, meio, aperto). Opcional: URL base alternativa em argv[2].
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const s = process.argv[2] ? { url: process.argv[2], fechar: async () => {} } : await subirServidor();
const n = await abrirNavegador();
try {
  for (const [tela, dpr, lent] of [[{ width: 1280, height: 720 }, 1, 1], [{ width: 390, height: 844 }, 3, 4]]) {
    for (const ticks of [0, 3000, 5600]) {
      const { pagina, contexto } = await novaPagina(n, tela, { dpr });
      await pagina.goto(`${s.url}?demo=1&semente=11&dificuldade=dificil&arena=jardim`); await esperarJogo(pagina);
      await pagina.evaluate((k) => { const b = window.__bomberolho; b.setTimeScale(0); for (let i = 0; i < k; i += 10) b.step(10); b.setTimeScale(1); }, ticks);
      if (lent > 1) { const c = await contexto.newCDPSession(pagina); await c.send('Emulation.setCPUThrottlingRate', { rate: lent }); }
      await pagina.waitForTimeout(500);
      const r = await pagina.evaluate(() => new Promise((ok) => { const t = []; let a = performance.now(); const f = a + 4000;
        function q(x) { t.push(x - a); a = x; if (x < f) requestAnimationFrame(q); else { t.sort((p, q2) => p - q2); const st = window.__bomberolho.state; ok({ fps: Math.round(t.length * 1000 / t.reduce((p, q2) => p + q2, 0)), p95: t[Math.floor(t.length * .95)].toFixed(1), tick: st.tick, aperto: st.aperto.ativo, tela: st.tela }); } }
        requestAnimationFrame(q); }));
      console.log(tela.width, ticks, JSON.stringify(r)); await contexto.close();
    }
  }
} finally { await n.close(); await s.fechar(); }
