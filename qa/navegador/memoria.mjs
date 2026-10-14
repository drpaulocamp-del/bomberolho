// Vazamento de memória: 5 min de partidas seguidas (demo, tempo 8× mais
// rápido, partida nova a cada resultado, passando pelo menu a cada 3), com
// coleta de lixo forçada e medição do heap de JavaScript, dos nós do DOM e
// dos ouvintes de evento a cada 30 s.
// Uso: node qa/navegador/memoria.mjs [--minutos 5] [--json caminho]

import { writeFileSync } from 'node:fs';
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
};
const MINUTOS = Number(arg('minutos', '5'));

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const amostras = [];
try {
  const { pagina, contexto, problemas } = await novaPagina(navegador, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send('HeapProfiler.enable');
  await pagina.goto(`${servidor.url}?demo=1&escala=8&rodadas=1`);
  await esperarJogo(pagina);
  // A cada resultado, outra partida (arena e personagem girando); a cada 3, uma volta pelo menu.
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    const arenas = ['jardim', 'lago', 'caverna', 'vale', 'consultorio'];
    const gente = ['iris', 'pupilo', 'cornea', 'retina', 'cristalino', 'macula', 'cilio', 'lente'];
    window.__partidas = 0;
    setInterval(() => {
      if (b.state.tela !== 'resultado') return;
      const k = ++window.__partidas;
      if (k % 3 === 0) b.menu('inicio');
      b.start({ arena: arenas[k % 5], personagem: gente[k % 8], rodadas: 1 });
      b.demo(true);
      b.setTimeScale(8);
    }, 250);
  });
  const medir = async (t) => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    const dom = await cdp.send('Memory.getDOMCounters');
    const partidas = await pagina.evaluate(() => window.__partidas);
    const a = { segundos: t, heapMB: +(usedSize / 1048576).toFixed(2), nos: dom.nodes, ouvintes: dom.jsEventListeners, documentos: dom.documents, partidas };
    amostras.push(a);
    console.log(`${String(t).padStart(4)} s · heap ${a.heapMB.toFixed(2)} MB · nós ${a.nos} · ouvintes ${a.ouvintes} · partidas ${partidas}`);
  };
  const inicio = Date.now();
  await medir(0);
  for (let t = 30; t <= MINUTOS * 60; t += 30) {
    await pagina.waitForTimeout(Math.max(0, inicio + t * 1000 - Date.now()));
    await medir(t);
  }
  const primeiro = amostras[1] ?? amostras[0];
  const ultimo = amostras.at(-1);
  console.log(`variação do heap (30 s → ${ultimo.segundos} s): ${(ultimo.heapMB - primeiro.heapMB).toFixed(2)} MB; nós ${primeiro.nos} → ${ultimo.nos}; ouvintes ${primeiro.ouvintes} → ${ultimo.ouvintes}`);
  console.log(problemas.length ? problemas.join('\n') : 'sem erros, avisos ou 404');
  await contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}
const json = arg('json', null);
if (json) writeFileSync(json, JSON.stringify(amostras, null, 1));
