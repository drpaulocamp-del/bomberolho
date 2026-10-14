// Gera capturas de tela em qa/capturas/ (desktop 1280×720, retrato 390×844,
// paisagem 844×390 e 360×640): largada com contagem, meio de partida, aperto
// final, placar entre rodadas e taça; e, no desktop, as cinco arenas, a cena
// dos poderes (bichinhos, Pinça, Penetrante) e a bancada de ajuste.
// Uso: cd qa && npm run capturas

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const PASTA = fileURLToPath(new URL('../capturas/', import.meta.url));
mkdirSync(PASTA, { recursive: true });

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const todos = [];

async function pagina(tela, busca) {
  const p = await novaPagina(navegador, tela, { dpr: 2 });
  await p.pagina.goto(`${servidor.url}${busca}`);
  await esperarJogo(p.pagina);
  await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
  return p;
}

const passos = (pg, n) => pg.evaluate((k) => window.__bomberolho.step(k), n);
const ate = (pg, cond, max = 2000) => pg.evaluate(([c, m]) => {
  const b = window.__bomberolho;
  const f = new Function('s', `return ${c};`);
  for (let k = 0; k < m && !f(b.state); k++) b.step(30);
  return b.state;
}, [cond, max]);

try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    const { pagina: pg, contexto, problemas } = await pagina(tela, '?semente=21&demo=1&dificuldade=medio&arena=lago');
    await passos(pg, 40);
    await pg.screenshot({ path: `${PASTA}${nome}-1-largada.png` });
    await ate(pg, 's.tick > 1500 && s.respingos.length > 0');
    await pg.screenshot({ path: `${PASTA}${nome}-2-partida.png` });
    await ate(pg, "(s.aperto.ativo && s.aperto.caidas > 30) || s.tela !== 'jogando'");
    await pg.screenshot({ path: `${PASTA}${nome}-3-aperto.png` });
    await ate(pg, "s.tela === 'intervalo' || s.tela === 'resultado'");
    await pg.screenshot({ path: `${PASTA}${nome}-4-intervalo.png` });
    await ate(pg, "s.tela === 'resultado'", 4000);
    await pg.screenshot({ path: `${PASTA}${nome}-5-resultado.png` });
    todos.push(...problemas.map((p) => `[${nome}] ${p}`));
    await contexto.close();
  }

  for (const arena of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
    const { pagina: pg, contexto, problemas } = await pagina(TELAS.desktop, `?semente=8&demo=1&dificuldade=dificil&arena=${arena}`);
    await ate(pg, 's.tick > 1800 && s.gotas.length > 1');
    await pg.screenshot({ path: `${PASTA}arena-${arena}.png` });
    todos.push(...problemas.map((p) => `[${arena}] ${p}`));
    await contexto.close();
  }

  // Cena dos poderes: cada competidor com um bichinho/item, robôs jogando.
  {
    const { pagina: pg, contexto, problemas } = await pagina(TELAS.desktop, '?semente=5&demo=1&dificuldade=dificil&arena=vale');
    await pg.evaluate(() => {
      const b = window.__bomberolho;
      b.step(200);
      for (const [id, tipo] of [[1, 'saltinho'], [2, 'cascudo'], [3, 'disparada']]) {
        for (let k = 0; k < 10 && b.state.jogadores[id].montaria !== tipo; k++) b.darItem(id, 'estojo');
      }
      for (const t of ['pinca', 'penetrante', 'superLupa', 'gota', 'gota']) b.darItem(0, t);
      b.darItem(1, 'cisco');
    });
    await ate(pg, 's.gotas.some((g) => g.penetrante) && s.respingos.length > 0', 400);
    await pg.screenshot({ path: `${PASTA}poderes.png` });
    todos.push(...problemas.map((p) => `[poderes] ${p}`));
    await contexto.close();
  }

  for (const [nome, tela] of [['desktop', TELAS.desktop], ['retrato', TELAS.retrato], ['paisagem', TELAS.paisagem]]) {
    const { pagina: pg, contexto, problemas } = await pagina(tela, '?semente=7&ajuste=1');
    await pg.waitForSelector('.bancada input[type=range]');
    // Em tela baixa ou estreita a bancada começa recolhida (só o último controle à vista).
    if (await pg.locator('.bancada.recolhida').count()) await pg.click('.bancada .recolher');
    await pg.locator('#ajuste-pavio').fill('141');
    await passos(pg, 200);
    await pg.screenshot({ path: `${PASTA}bancada-${nome}.png` });
    todos.push(...problemas.map((p) => `[bancada ${nome}] ${p}`));
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
