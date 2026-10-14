// Verificador P4R2: 5 min de uso com toque (390×844): partidas em demo a 2×
// (tempo quase real), pausas, giros de tela, ida ao menu e troca de arena;
// heap após GC, nós e ouvintes a cada 30 s.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina, contexto, problemas } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
const cdp = await contexto.newCDPSession(pagina);
await pagina.goto(servidor.url + '?demo=1&escala=2&dificuldade=medio');
await esperarJogo(pagina);
await cdp.send('HeapProfiler.enable');
const amostra = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  const m = await cdp.send('Memory.getDOMCounters');
  const st = await pagina.evaluate(() => ({ tela: window.__bomberolho.state.tela }));
  return { mb: +(h.usedSize / 1048576).toFixed(2), nos: m.nodes, ouvintes: m.jsEventListeners, ...st };
};
const arenas = ['jardim', 'lago', 'caverna', 'vale', 'consultorio'];
let partidas = 0, giros = 0;
const t0 = Date.now();
const linhas = [{ s: 0, ...(await amostra()), partidas }];
let prox = 30, proxGiro = 20, proxPausa = 45;
while (Date.now() - t0 < 300000) {
  const tela = await pagina.evaluate(() => window.__bomberolho.state.tela);
  const s = (Date.now() - t0) / 1000;
  if (tela === 'resultado') {
    partidas++;
    await pagina.evaluate((a) => { const b = window.__bomberolho; b.menu('arena'); b.start({ arena: a, dificuldade: 'medio', rodadas: 1 }); b.demo(true); b.setTimeScale(3); }, arenas[partidas % 5]);
  } else if (tela === 'intervalo') {
    await pagina.evaluate(() => window.__bomberolho.step(1));
  }
  if (s >= proxGiro) { giros++; await pagina.setViewportSize(giros % 2 ? { width: 844, height: 390 } : { width: 390, height: 844 }); proxGiro += 20; }
  if (s >= proxPausa) { await pagina.evaluate(() => { window.__bomberolho.pause(true); }); await pagina.waitForTimeout(500); await pagina.evaluate(() => window.__bomberolho.pause(false)); proxPausa += 45; }
  await pagina.waitForTimeout(250);
  if (s >= prox) { linhas.push({ s: Math.round(s), ...(await amostra()), partidas }); prox += 30; }
}
console.table(linhas);
console.log('giros', giros, 'problemas', problemas);
await nav.close(); await servidor.fechar();
