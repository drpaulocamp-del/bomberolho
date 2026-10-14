// Verificador P4R1: 5 min de partidas seguidas com toque (390×844), demo a 8×,
// arenas alternadas, menu e recomeçar pelo cartão; heap após GC, nós, ouvintes.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina, contexto, problemas } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
const cdp = await contexto.newCDPSession(pagina);
await pagina.goto(servidor.url + '?demo=1&escala=8&dificuldade=dificil');
await esperarJogo(pagina);
await cdp.send('HeapProfiler.enable');
const amostra = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  const m = await cdp.send('Memory.getDOMCounters');
  return { mb: +(h.usedSize / 1048576).toFixed(2), nos: m.nodes, ouvintes: m.jsEventListeners, docs: m.documents };
};
const arenas = ['jardim', 'lago', 'caverna', 'vale', 'consultorio'];
let partidas = 0;
const t0 = Date.now();
const linhas = [{ s: 0, ...(await amostra()), partidas }];
let prox = 30;
while (Date.now() - t0 < 300000) {
  const tela = await pagina.evaluate(() => window.__bomberolho.state.tela);
  if (tela === 'resultado') {
    partidas++;
    await pagina.evaluate((a) => { const b = window.__bomberolho; if (Math.random() < 0.3) b.menu('arena'); b.start({ arena: a, dificuldade: 'dificil' }); b.demo(true); b.setTimeScale(8); }, arenas[partidas % 5]);
  } else if (tela === 'intervalo') {
    await pagina.evaluate(() => window.__bomberolho.step(1));
  }
  await pagina.waitForTimeout(250);
  const s = (Date.now() - t0) / 1000;
  if (s >= prox) { linhas.push({ s: Math.round(s), ...(await amostra()), partidas }); prox += 30; }
}
console.table(linhas);
console.log('problemas', problemas);
await nav.close(); await servidor.fechar();
