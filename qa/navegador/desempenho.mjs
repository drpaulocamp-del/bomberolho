// Mede quadros por segundo e tempo de quadro numa partida em modo demo, em três
// momentos da rodada (começo, meio, aperto final), no desktop 1280×720 e no
// "celular de entrada" emulado (390×844, DPR 3, CPU 4× mais lenta), além do
// menu inicial no mesmo celular lento.
// Uso: node qa/navegador/desempenho.mjs [--vezes N] [--json caminho]

import { writeFileSync } from 'node:fs';
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
};
const VEZES = Number(arg('vezes', '2'));
const JANELA = 6000; // ms medidos em cada momento
const AQUECER = 1500; // ms antes de medir (a densidade adaptativa se acomoda)

const telas = [
  { nome: 'desktop 1280×720', tela: { width: 1280, height: 720 }, dpr: 1, lentidao: 1, toque: false },
  { nome: 'celular lento 390×844 (DPR 3, CPU 4×)', tela: { width: 390, height: 844 }, dpr: 3, lentidao: 4, toque: true },
];
// Relógio da rodada (ticks restantes) onde cada momento começa a ser medido.
const momentos = [
  { nome: 'começo', relogio: 6900 },
  { nome: 'meio', relogio: 4200 },
  { nome: 'aperto', relogio: 1800 },
];

async function medir(pagina) {
  return pagina.evaluate((janela) => new Promise((ok) => {
    const tempos = [];
    let antes = performance.now();
    const fim = antes + janela;
    function q(agora) {
      tempos.push(agora - antes);
      antes = agora;
      if (agora < fim) requestAnimationFrame(q);
      else {
        const soma = tempos.reduce((a, b) => a + b, 0);
        tempos.sort((a, b) => a - b);
        ok({
          fps: Math.round((tempos.length * 1000) / soma),
          p50: tempos[Math.floor(tempos.length * 0.5)],
          p95: tempos[Math.floor(tempos.length * 0.95)],
          lentos: tempos.filter((t) => t > 34).length / tempos.length,
          densidade: window.__bomberolho.state.densidade,
        });
      }
    }
    requestAnimationFrame(q);
  }), JANELA);
}

const resultados = [];
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  for (let vez = 1; vez <= VEZES; vez++) {
    for (const c of telas) {
      for (const mo of momentos) {
        const { pagina, contexto } = await novaPagina(navegador, c.tela, { dpr: c.dpr, contexto: { hasTouch: c.toque, isMobile: c.toque } });
        await pagina.goto(`${servidor.url}?demo=1&semente=11&dificuldade=dificil&rodadas=3&arena=jardim`);
        await esperarJogo(pagina);
        // Avança sem desenhar a cada passo até o momento pedido; depois o relógio volta ao normal.
        await pagina.evaluate((alvo) => {
          const b = window.__bomberolho;
          b.setTimeScale(0);
          while (b.state.tela === 'jogando' && (b.state.tempoRestante === null || b.state.tempoRestante > alvo)) b.step(30);
          b.setTimeScale(1);
        }, mo.relogio);
        if (c.lentidao > 1) {
          const cdp = await contexto.newCDPSession(pagina);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.lentidao });
        }
        await pagina.waitForTimeout(AQUECER);
        const r = await medir(pagina);
        const vivos = await pagina.evaluate(() => window.__bomberolho.state.jogadores.filter((j) => j.vivo).length);
        resultados.push({ vez, tela: c.nome, momento: mo.nome, ...r, vivos });
        console.log(`[${vez}] ${c.nome} · ${mo.nome}: ${r.fps} fps, p50 ${r.p50.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms, quadros > 34 ms ${(100 * r.lentos).toFixed(1)}%, densidade ${r.densidade} (vivos ${vivos})`);
        await contexto.close();
      }
    }
    // Menu inicial (vitrine de robôs atrás + desfile) no celular lento.
    const { pagina, contexto } = await novaPagina(navegador, { width: 390, height: 844 }, { dpr: 3, contexto: { hasTouch: true, isMobile: true } });
    await pagina.goto(servidor.url);
    await esperarJogo(pagina);
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pagina.waitForTimeout(AQUECER);
    const r = await medir(pagina);
    resultados.push({ vez, tela: 'celular lento', momento: 'menu', ...r });
    console.log(`[${vez}] menu no celular lento: ${r.fps} fps, p50 ${r.p50.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms`);
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
const json = arg('json', null);
if (json) writeFileSync(json, JSON.stringify(resultados, null, 1));
