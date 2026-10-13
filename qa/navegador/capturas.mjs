// Gera capturas de tela em qa/capturas/ (desktop, retrato, paisagem e 360 px)
// em três momentos: largada, meio da partida (com gotas e respingos) e resultado.
// Uso: node qa/navegador/capturas.mjs

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const PASTA = fileURLToPath(new URL('../capturas/', import.meta.url));
mkdirSync(PASTA, { recursive: true });

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const todos = [];
try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    const { pagina, contexto, problemas } = await novaPagina(navegador, tela, { dpr: 2 });
    await pagina.goto(`${servidor.url}?semente=7`);
    await esperarJogo(pagina);
    await pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
    await pagina.evaluate(() => window.__bomberolho.step(20));
    await pagina.screenshot({ path: `${PASTA}${nome}-1-largada.png` });
    // Meio de partida: todos no piloto automático até haver respingo na tela.
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      b.demo(true);
      for (let k = 0; k < 4000; k++) {
        const s = b.step(1);
        if (s.tick > 700 && s.respingos.length > 0 && s.gotas.length > 0) break;
      }
    });
    await pagina.screenshot({ path: `${PASTA}${nome}-2-partida.png` });
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      for (let k = 0; k < 120 && b.state.tela !== 'resultado'; k++) b.step(300);
    });
    await pagina.screenshot({ path: `${PASTA}${nome}-3-resultado.png` });
    todos.push(...problemas.map((p) => `[${nome}] ${p}`));
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
if (todos.length) {
  console.error(todos.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`capturas em ${PASTA} — nenhum erro, aviso ou 404`);
}
