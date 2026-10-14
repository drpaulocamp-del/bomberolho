// Atribuição de custo no aperto (desktop): variantes de CSS injetadas.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const css = {
  normal: '',
  semPulso: '.barra .tempo{animation:none!important}',
  semVidro: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  semSombra: '#arena{box-shadow:none!important}',
  soCanvas: '.painel{display:none!important} body{background:#fff!important} #arena{box-shadow:none!important}',
  normal2: '',
};
const [tela, dpr, lent, tick] = process.argv[2] === 'celular' ? [{ width: 390, height: 844 }, 3, 4, Number(process.argv[3] || 3000)] : [{ width: 1280, height: 720 }, 1, 1, Number(process.argv[3] || 5600)];
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  for (const [nome, estilo] of Object.entries(css)) {
    const { pagina, contexto } = await novaPagina(navegador, tela, { dpr });
    if (estilo) await pagina.addInitScript((s) => document.addEventListener('DOMContentLoaded', () => { const e = document.createElement('style'); e.textContent = s; document.head.append(e); }), estilo);
    await pagina.goto(`${servidor.url}?demo=1&semente=11&dificuldade=dificil&arena=jardim`);
    await esperarJogo(pagina);
    await pagina.evaluate((alvo) => { const b = window.__bomberolho; b.setTimeScale(0); for (let i = 0; i < alvo; i += 10) b.step(10); b.setTimeScale(1); }, tick);
    if (lent > 1) { const c = await contexto.newCDPSession(pagina); await c.send('Emulation.setCPUThrottlingRate', { rate: lent }); }
    await pagina.waitForTimeout(500);
    const fps = await pagina.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); function q(t) { n++; if (t - t0 < 4000) requestAnimationFrame(q); else ok(Math.round(n * 1000 / (t - t0))); } requestAnimationFrame(q); }));
    console.log(nome, fps);
    await contexto.close();
  }
} finally { await navegador.close(); await servidor.fechar(); }
