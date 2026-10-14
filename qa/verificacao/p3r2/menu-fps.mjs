// fps do menu no celular lento (390×844, DPR 3, CPU 4×), depois de 3 s de aquecimento,
// com e sem "reduzir movimento". Uso: cd qa && node verificacao/p3r2/menu-fps.mjs
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const s = await subirServidor(); const n = await abrirNavegador();
try {
  for (const rm of ['no-preference', 'reduce']) {
    const { pagina, contexto } = await novaPagina(n, { width: 390, height: 844 }, { dpr: 3, contexto: { reducedMotion: rm } });
    const cdp = await contexto.newCDPSession(pagina); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pagina.goto(s.url); await esperarJogo(pagina); await pagina.waitForTimeout(3000);
    const r = await pagina.evaluate(() => new Promise((ok) => { const t = []; let a = performance.now(); const fim = a + 6000; function q(x) { t.push(x - a); a = x; if (x < fim) requestAnimationFrame(q); else { t.sort((p, q) => p - q); ok({ fps: Math.round(t.length * 1000 / t.reduce((p, q) => p + q, 0)), p50: t[t.length >> 1].toFixed(0), p95: t[Math.floor(t.length * .95)].toFixed(0) }); } } requestAnimationFrame(q); }));
    console.log(rm, r); await contexto.close();
  }
} finally { await n.close(); await s.fechar(); }
