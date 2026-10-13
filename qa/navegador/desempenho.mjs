// Mede quadros por segundo e tempo de quadro numa partida em modo demo:
// desktop 1280×720 e "celular de entrada" (390×844, DPR 3, CPU 4× mais lenta).
// Uso: node qa/navegador/desempenho.mjs

import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const cenarios = [
  { nome: 'desktop 1280×720 (DPR 1)', tela: { width: 1280, height: 720 }, dpr: 1, lentidao: 1 },
  { nome: 'celular 390×844 (DPR 3, CPU 4× mais lenta)', tela: { width: 390, height: 844 }, dpr: 3, lentidao: 4 },
];

const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  for (const c of cenarios) {
    const { pagina, contexto } = await novaPagina(navegador, c.tela, { dpr: c.dpr });
    if (c.lentidao > 1) {
      const cdp = await contexto.newCDPSession(pagina);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.lentidao });
    }
    await pagina.goto(`${servidor.url}?demo=1&semente=4`);
    await esperarJogo(pagina);
    const r = await pagina.evaluate(() => new Promise((ok) => {
      const tempos = [];
      let antes = performance.now();
      const fim = antes + 5000;
      function q(agora) {
        tempos.push(agora - antes);
        antes = agora;
        if (agora < fim) requestAnimationFrame(q);
        else {
          tempos.sort((a, b) => a - b);
          ok({
            fps: Math.round((tempos.length * 1000) / tempos.reduce((a, b) => a + b, 0)),
            p95: tempos[Math.floor(tempos.length * 0.95)].toFixed(1),
            pior: tempos.at(-1).toFixed(1),
            tick: window.__bomberolho.state.tick,
          });
        }
      }
      requestAnimationFrame(q);
    }));
    console.log(`${c.nome}: ${r.fps} fps médios, quadro p95 ${r.p95} ms, pior ${r.pior} ms (tick ${r.tick})`);
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
