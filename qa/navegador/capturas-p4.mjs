// Capturas da Parte 4 (celular e acabamento) em 11 telas — as 4 do plano,
// celulares deitados comuns, tablets e desktop com toque —, com toque em todas
// menos a de desktop: menu, "Como jogar", partida com a alavanca em repouso e em uso,
// montado (botão do bichinho), pausa, canhoto, retrato girado e resultado.
// Uso: node qa/navegador/capturas-p4.mjs → qa/capturas/p4/
// Termina com a lista de problemas de console/rede (deve ser vazia).

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo, TELAS } from './apoio.mjs';

const PASTA = fileURLToPath(new URL('../capturas/p4/', import.meta.url));
mkdirSync(PASTA, { recursive: true });

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const problemas = [];
try {
  const telas = {
    ...TELAS,
    'paisagem-pequena': { width: 640, height: 360 },
    'paisagem-740': { width: 740, height: 360 },
    'paisagem-915': { width: 915, height: 412 },
    'tablet-retrato': { width: 768, height: 1024 },
    'tablet-paisagem': { width: 1024, height: 768 },
    'tablet-1280': { width: 1280, height: 800 },
    'pequeno-412': { width: 412, height: 915 },
  };
  const so = process.argv[2]; // opcional: só as telas cujo nome contém este texto
  for (const [nome, tela] of Object.entries(telas)) {
    if (so && !nome.includes(so)) continue;
    const toque = nome !== 'desktop';
    const { pagina, contexto, problemas: p } = await novaPagina(navegador, tela, { dpr: 2, contexto: { hasTouch: toque, isMobile: toque } });
    const cdp = await contexto.newCDPSession(pagina);
    const foto = (o) => pagina.screenshot({ path: `${PASTA}${nome}-${o}.png` });

    await pagina.goto(servidor.url);
    await esperarJogo(pagina);
    await pagina.waitForTimeout(500);
    await foto('01-menu');
    await pagina.click('.bt-ajuda');
    await pagina.waitForTimeout(300);
    await foto('02-como-jogar');
    await pagina.click('[data-acao="fechar-ajuda"]');

    // Partida direta (semente fixa, robôs parados) para fotos reprodutíveis.
    await pagina.goto(`${servidor.url}?semente=7&arena=jardim&personagem=cilio`);
    await esperarJogo(pagina);
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      b.setTimeScale(0);
      for (const id of [1, 2, 3]) b.input(id, {});
      b.step(200);
    });
    await foto('03-jogando');
    if (toque) {
      // Polegar na metade esquerda, arrastado para a direita: a alavanca nasce ali.
      const y = tela.height - 90;
      await dedo(cdp, 'touchStart', [[70, y]]);
      await dedo(cdp, 'touchMove', [[120, y - 6]]);
      await pagina.evaluate(() => window.__bomberolho.step(20));
      await foto('04-alavanca');
      await dedo(cdp, 'touchEnd', []);
    }
    await pagina.evaluate(() => { const b = window.__bomberolho; b.darItem(0, 'estojo'); b.step(2); });
    await foto('05-montado');
    await pagina.evaluate(() => window.__bomberolho.pause(true));
    await pagina.waitForTimeout(300);
    await foto('06-pausa');
    if (toque) {
      await pagina.click('.acoes [data-acao="lados"]');
      await pagina.click('.acoes [data-acao="continuar"]');
      await pagina.evaluate(() => window.__bomberolho.step(2));
      await foto('07-canhoto');
    }
    await pagina.evaluate(() => {
      const b = window.__bomberolho;
      for (const id of [1, 2, 3]) b.input(id, null);
      b.demo(true);
      for (let k = 0; k < 400 && b.state.tela !== 'resultado'; k++) b.step(120);
    });
    await pagina.waitForTimeout(300);
    await foto('08-resultado');
    problemas.push(...p.map((x) => `${nome}: ${x}`));
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(problemas.length ? problemas.join('\n') : 'sem erros, avisos ou 404');
