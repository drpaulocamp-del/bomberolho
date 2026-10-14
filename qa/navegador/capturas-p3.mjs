// Capturas da parte 3 (estética, identidade e som) em qa/capturas/p3/:
// todas as telas do fluxo (menu, escolhas, ajuda, contagem, jogo, perigo,
// pausa, sair, descanso, placar entre rodadas, taça) nas quatro telas de
// referência; as cinco arenas; os oito personagens em jogo; e a folha de
// personagens (expressões e poses). Também mede erros de console e 404.
// Uso: cd qa && node navegador/capturas-p3.mjs [filtro]

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const PASTA = fileURLToPath(new URL('../capturas/p3/', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const filtro = new RegExp(process.argv[2] || '.');

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const problemas = [];

async function abrir(tela, busca) {
  const p = await novaPagina(navegador, tela, { dpr: 2 });
  await p.pagina.goto(`${servidor.url}${busca}`);
  await esperarJogo(p.pagina);
  return p;
}

async function foto(p, nome) {
  await p.pagina.screenshot({ path: `${PASTA}${nome}.png` });
}

const ate = (pg, cond, max = 3000, passo = 10) => pg.evaluate(([c, m, k]) => {
  const b = window.__bomberolho;
  const f = new Function('s', `return ${c};`);
  for (let i = 0; i < m && !f(b.state); i++) b.step(k);
  return b.state;
}, [cond, max, passo]);

// Roteiro do "descanso": o humano solta uma gota e fica parado ao lado dela.
const DESCANSO = `(() => { const b = window.__bomberolho; b.start({ semente: 7, contagem: false }); b.setTimeScale(0);
  for (const id of [1, 2, 3]) b.input(id, {}); b.input(0, { bomba: true }); b.step(1); b.input(0, {}); b.step(170); })()`;

try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    if (!filtro.test(nome)) continue;
    // Menus.
    let p = await abrir(tela, '');
    await p.pagina.waitForTimeout(700);
    await foto(p, `${nome}-01-inicio`);
    await p.pagina.click('.bt-jogar');
    await p.pagina.waitForTimeout(700);
    await foto(p, `${nome}-02-personagem`);
    await p.pagina.click('.cartao-personagem[data-personagem="lente"]');
    await p.pagina.waitForTimeout(400);
    await foto(p, `${nome}-03-personagem-lente`);
    await p.pagina.click('[data-acao="proximo"]');
    await p.pagina.waitForTimeout(700);
    await foto(p, `${nome}-04-arena`);
    await p.pagina.click('.tela-arena [data-acao="voltar"]');
    await p.pagina.click('.tela-personagem [data-acao="voltar"]');
    await p.pagina.click('.bt-ajuda');
    await p.pagina.waitForTimeout(400);
    await foto(p, `${nome}-05-ajuda`);
    await p.pagina.click('[data-acao="fechar-ajuda"]');
    await p.pagina.click('.bt-jogar');
    await p.pagina.click('[data-acao="proximo"]');
    await p.pagina.click('.bt-comecar');
    await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
    await p.pagina.evaluate(() => window.__bomberolho.step(30));
    await foto(p, `${nome}-06-contagem`);
    problemas.push(...p.problemas.map((x) => `[${nome} menu] ${x}`));
    await p.contexto.close();

    // Partida (demo, mesma semente): meio, perigo, pausa, sair.
    p = await abrir(tela, '?semente=21&demo=1&dificuldade=medio&arena=jardim');
    await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
    await ate(p.pagina, 's.tick > 700 && s.respingos.length > 0');
    await foto(p, `${nome}-07-respingo`);
    await ate(p.pagina, 's.tick > 1200 && s.gotas.some((g) => g.pavio < 30)');
    await foto(p, `${nome}-08-perigo`);
    await p.pagina.evaluate(() => window.__bomberolho.pause(true));
    await p.pagina.waitForTimeout(300);
    await foto(p, `${nome}-09-pausa`);
    await p.pagina.click('.acoes button');
    await p.pagina.click('#bt-sair');
    await p.pagina.waitForTimeout(300);
    await foto(p, `${nome}-10-sair`);
    await p.pagina.click('.acoes button');
    await ate(p.pagina, "s.aperto.ativo && s.aperto.caidas > 20 || s.tela !== 'jogando'", 3000, 30);
    await foto(p, `${nome}-11-aperto`);
    await ate(p.pagina, "s.tela === 'intervalo' || s.tela === 'resultado'", 4000, 10);
    await p.pagina.evaluate(() => window.__bomberolho.step(40));
    await p.pagina.waitForTimeout(300);
    await foto(p, `${nome}-12-intervalo`);
    await ate(p.pagina, "s.tela === 'resultado'", 6000, 30);
    await p.pagina.waitForTimeout(400);
    await foto(p, `${nome}-13-resultado`);
    problemas.push(...p.problemas.map((x) => `[${nome} jogo] ${x}`));
    await p.contexto.close();

    // Descanso do humano (encharcado → nuvem) e a faixa "você foi descansar".
    p = await abrir(tela, '?semente=7');
    await p.pagina.evaluate(DESCANSO);
    await p.pagina.evaluate(() => window.__bomberolho.step(12));
    await foto(p, `${nome}-14-encharcado`);
    await p.pagina.evaluate(() => window.__bomberolho.step(50));
    await foto(p, `${nome}-15-descanso`);
    problemas.push(...p.problemas.map((x) => `[${nome} descanso] ${x}`));
    await p.contexto.close();
  }

  if (filtro.test('arenas')) {
    for (const arena of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
      for (const [nome, tela] of [['desktop', TELAS.desktop], ['pequeno', TELAS.pequeno]]) {
        const p = await abrir(tela, `?semente=8&demo=1&dificuldade=dificil&arena=${arena}`);
        await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
        await ate(p.pagina, 's.tick > 1500 && s.gotas.length > 1');
        await foto(p, `arena-${arena}-${nome}`);
        problemas.push(...p.problemas.map((x) => `[${arena}] ${x}`));
        await p.contexto.close();
      }
    }
  }

  if (filtro.test('personagens')) {
    for (const id of ['iris', 'pupilo', 'cornea', 'retina', 'cristalino', 'macula', 'cilio', 'lente']) {
      const p = await abrir(TELAS.retrato, `?semente=33&demo=1&personagem=${id}&arena=vale`);
      await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
      await ate(p.pagina, 's.tick > 400');
      await foto(p, `personagem-${id}`);
      problemas.push(...p.problemas.map((x) => `[${id}] ${x}`));
      await p.contexto.close();
    }
    const f = await novaPagina(navegador, { width: 1080, height: 1060 }, { dpr: 1 });
    await f.pagina.goto(servidor.url.replace('/bomberolho/', '/qa/ferramentas/folha.html'));
    await f.pagina.waitForFunction(() => document.title === 'pronto');
    await f.pagina.screenshot({ path: `${PASTA}folha-personagens.png`, fullPage: true });
    await f.contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(problemas.length ? problemas.join('\n') : 'sem erros, avisos ou 404');
