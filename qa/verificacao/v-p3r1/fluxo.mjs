// Verificador P3R1: percorre o fluxo inteiro de telas com cliques reais nas 4
// telas de referência, mede rolagem, alvos fora da tela e problemas de console.
// Uso: cd qa && node verificacao/v-p3r1/fluxo.mjs [filtroTela]
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const PASTA = fileURLToPath(new URL('../../capturas/v-p3r1/', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const filtro = new RegExp(process.argv[2] || '.');
const servidor = await subirServidor();
const navegador = await abrirNavegador();
const relatorio = [];

async function medir(pg, rotulo) {
  const m = await pg.evaluate(() => {
    const d = document.documentElement;
    const vw = innerWidth; const vh = innerHeight;
    const fora = []; const pequenos = [];
    for (const b of document.querySelectorAll('button')) {
      if (!b.offsetParent) continue;
      const r = b.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) fora.push(`${b.className || b.id || b.textContent.trim().slice(0, 15)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      if (Math.min(r.width, r.height) < 44) pequenos.push(`${(b.getAttribute('aria-label') || b.textContent.trim() || b.className).slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // Texto cortado: elementos com overflow horizontal escondido
    const cortados = [];
    for (const el of document.querySelectorAll('h1,h2,p,span,strong,b,small,button')) {
      if (!el.offsetParent) continue;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && el.clientWidth > 0) cortados.push(`${el.tagName}.${el.className}:${el.textContent.trim().slice(0, 20)}`);
    }
    return { rolaX: d.scrollWidth > vw, rolaY: d.scrollHeight > vh, sw: d.scrollWidth, sh: d.scrollHeight, fora, pequenos, cortados, tela: window.__bomberolho?.state.tela, menu: window.__bomberolho?.state.menu };
  });
  relatorio.push({ rotulo, ...m });
}

async function foto(pg, nome) {
  await pg.screenshot({ path: `${PASTA}${nome}.png` });
  await medir(pg, nome);
}

try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    if (!filtro.test(nome)) continue;
    const { pagina: pg, contexto, problemas } = await novaPagina(navegador, tela, { dpr: 2 });
    await pg.goto(servidor.url);
    await esperarJogo(pg);
    await pg.waitForTimeout(1200);
    await foto(pg, `${nome}-a01-inicio`);
    await pg.click('.bt-outra');
    await pg.waitForTimeout(200);
    await pg.click('.bt-ajuda');
    await pg.waitForTimeout(600);
    await foto(pg, `${nome}-a02-ajuda`);
    await pg.click('[data-acao="fechar-ajuda"]');
    await pg.click('.bt-jogar');
    await pg.waitForTimeout(800);
    await foto(pg, `${nome}-a03-personagem`);
    await pg.click('.cartao-personagem[data-personagem="cristalino"]');
    await pg.waitForTimeout(500);
    await foto(pg, `${nome}-a04-cristalino`);
    await pg.click('.tela-personagem [data-acao="proximo"]');
    await pg.waitForTimeout(900);
    await foto(pg, `${nome}-a05-arena`);
    await pg.click('.cartao-arena[data-arena="caverna"]');
    await pg.click('.pilula.dif-facil');
    await pg.click('.pilula-trofeus[data-valor="1"]');
    await pg.waitForTimeout(300);
    await foto(pg, `${nome}-a06-arena-escolhida`);
    await pg.click('.bt-comecar');
    await pg.waitForTimeout(700);
    await foto(pg, `${nome}-a07-contagem`);
    await pg.waitForTimeout(3500);
    await foto(pg, `${nome}-a08-jogando`);
    await pg.click('#bt-pausa');
    await pg.waitForTimeout(500);
    await foto(pg, `${nome}-a09-pausa`);
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(300);
    await pg.click('#bt-sair');
    await pg.waitForTimeout(500);
    await foto(pg, `${nome}-a10-sair`);
    // "Continuar jogando"
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(300);
    const s1 = await pg.evaluate(() => window.__bomberolho.state.tela);
    relatorio.push({ rotulo: `${nome} após continuar`, tela: s1 });
    // Joga até o fim no piloto automático, acelerado.
    await pg.evaluate(() => { window.__bomberolho.demo(true); window.__bomberolho.setTimeScale(0); });
    await pg.evaluate(() => { const b = window.__bomberolho; for (let i = 0; i < 1500 && b.state.tela === 'jogando'; i++) b.step(10); });
    await pg.waitForTimeout(500);
    await foto(pg, `${nome}-a11-fim-rodada`);
    await pg.evaluate(() => { const b = window.__bomberolho; for (let i = 0; i < 500 && b.state.tela !== 'resultado'; i++) b.step(10); });
    await pg.waitForTimeout(800);
    await foto(pg, `${nome}-a12-resultado`);
    // Jogar de novo
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(600);
    relatorio.push({ rotulo: `${nome} jogar de novo`, tela: await pg.evaluate(() => window.__bomberolho.state.tela) });
    await pg.click('#bt-sair');
    await pg.waitForTimeout(300);
    await pg.click('.acoes button >> nth=1');
    await pg.waitForTimeout(900);
    await foto(pg, `${nome}-a13-volta-menu`);
    relatorio.push({ rotulo: `${nome} problemas`, problemas });
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(JSON.stringify(relatorio, null, 1));
