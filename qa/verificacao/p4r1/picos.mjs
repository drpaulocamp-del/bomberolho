// Mede picos: tarefas longas (> 50 ms) e distribuição de quadros, no cenário
// do verificador (semente 11, Difícil, Jardim, tick 5600), desktop.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const tick = Number(process.argv[2] || 5600);
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, contexto } = await novaPagina(navegador, { width: 1280, height: 720 }, { dpr: 1 });
  await pagina.goto(`${servidor.url}?demo=1&semente=11&dificuldade=dificil&arena=jardim`);
  await esperarJogo(pagina);
  const r = await pagina.evaluate((alvo) => new Promise((ok) => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    for (let i = 0; i < alvo; i += 10) b.step(10);
    b.setTimeScale(1);
    const longas = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) longas.push(Math.round(e.duration)); }).observe({ type: 'longtask' });
    const t = []; let a = performance.now(); const f = a + 4000;
    function q(x) { t.push(x - a); a = x; if (x < f) requestAnimationFrame(q); else ok({ longas, quadros: t.map((v) => Math.round(v)).join(' '), st: b.state.gotas.length }); }
    requestAnimationFrame(q);
  }), tick);
  console.log(JSON.stringify(r));
  await contexto.close();
} finally { await navegador.close(); await servidor.fechar(); }
