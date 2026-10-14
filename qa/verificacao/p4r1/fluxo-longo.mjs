// Cópia do fluxo do verificador da parte 3 (v-p3r2/fluxo.mjs) com orçamento
// maior de ticks até o resultado: no Fácil da parte 4 a rodada 1 empata mais
// (os robôs poupam a criança) e às vezes é preciso uma 2ª rodada.
// Verificador P3R2: fluxo inteiro com cliques reais nas 4 telas; mede rolagem,
// botões fora da tela / < 44 px, texto cortado, pixels do retrato da curiosidade
// em cada cartão, e problemas de console. Uso: cd qa && node verificacao/v-p3r2/fluxo.mjs [filtroTela]
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const PASTA = fileURLToPath(new URL('../../capturas/p4-fluxo/', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const filtro = new RegExp(process.argv[2] || '.');
const servidor = await subirServidor();
const navegador = await abrirNavegador();
const relatorio = [];
const PERS = { desktop: ['iris', 'jardim'], retrato: ['lente', 'lago'], paisagem: ['cilio', 'vale'], pequeno: ['cornea', 'consultorio'] };

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
      if (Math.min(b.offsetWidth, b.offsetHeight) < 44) pequenos.push(`${(b.getAttribute('aria-label') || b.textContent.trim() || b.className).slice(0, 20)} ${b.offsetWidth}x${b.offsetHeight}`);
    }
    const cortados = [];
    for (const el of document.querySelectorAll('h1,h2,p,span,strong,b,small,button,li')) {
      if (!el.offsetParent) continue;
      const cs = getComputedStyle(el);
      if ((el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && cs.overflow !== 'visible' && el.clientWidth > 0) cortados.push(`${el.tagName}.${el.className}:${el.textContent.trim().slice(0, 25)}`);
    }
    // retrato da curiosidade visível: conta pixels opacos
    let retrato = null;
    for (const c of document.querySelectorAll('.curiosidade canvas')) {
      if (!c.offsetParent || c.closest('[hidden]')) continue;
      const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 40) n++;
      retrato = { w: c.clientWidth, h: c.clientHeight, opacos: Math.round(100 * n / (c.width * c.height)) + '%' };
    }
    const cur = [...document.querySelectorAll('.curiosidade')].filter((e) => e.offsetParent).map((e) => e.querySelector('p').textContent);
    return { rolaX: d.scrollWidth > vw, rolaY: d.scrollHeight > vh, fora, pequenos, cortados, retrato, cur, tela: window.__bomberolho?.state.tela };
  });
  relatorio.push({ rotulo, ...m });
}
async function foto(pg, nome) { await pg.screenshot({ path: `${PASTA}${nome}.png` }); await medir(pg, nome); }

try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    if (!filtro.test(nome)) continue;
    const [per, arena] = PERS[nome];
    const { pagina: pg, contexto, problemas } = await novaPagina(navegador, tela, { dpr: 2, contexto: { hasTouch: nome !== 'desktop', isMobile: nome !== 'desktop' } });
    await pg.goto(servidor.url);
    await esperarJogo(pg);
    await pg.waitForTimeout(1200);
    await foto(pg, `${nome}-01-inicio`);
    await pg.click('.bt-outra');
    await pg.waitForTimeout(300);
    await foto(pg, `${nome}-01b-outra`);
    await pg.click('.bt-ajuda');
    await pg.waitForTimeout(600);
    await foto(pg, `${nome}-02-ajuda`);
    await pg.click('[data-acao="fechar-ajuda"]');
    await pg.click('.bt-jogar');
    await pg.waitForTimeout(800);
    await foto(pg, `${nome}-03-personagem`);
    await pg.click(`.cartao-personagem[data-personagem="${per}"]`);
    await pg.waitForTimeout(500);
    await foto(pg, `${nome}-04-${per}`);
    await pg.click('.tela-personagem [data-acao="proximo"]');
    await pg.waitForTimeout(900);
    await foto(pg, `${nome}-05-arena`);
    await pg.click(`.cartao-arena[data-arena="${arena}"]`);
    await pg.click('.pilula.dif-facil');
    await pg.click('.pilula-trofeus[data-valor="1"]');
    await pg.waitForTimeout(300);
    await foto(pg, `${nome}-06-arena-escolhida`);
    await pg.click('.bt-comecar');
    await pg.waitForTimeout(700);
    await foto(pg, `${nome}-07-contagem`);
    await pg.waitForTimeout(3500);
    await foto(pg, `${nome}-08-jogando`);
    await pg.click('#bt-pausa');
    await pg.waitForTimeout(700);
    await foto(pg, `${nome}-09-pausa`);
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(300);
    await pg.click('#bt-sair');
    await pg.waitForTimeout(700);
    await foto(pg, `${nome}-10-sair`);
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(300);
    relatorio.push({ rotulo: `${nome} após continuar`, tela: await pg.evaluate(() => window.__bomberolho.state.tela) });
    await pg.evaluate(() => { window.__bomberolho.demo(true); window.__bomberolho.setTimeScale(0); });
    await pg.evaluate(() => { const b = window.__bomberolho; for (let i = 0; i < 1500 && b.state.tela === 'jogando'; i++) b.step(10); });
    await pg.waitForTimeout(700);
    await foto(pg, `${nome}-11-fim-rodada`);
    await pg.evaluate(() => { const b = window.__bomberolho; for (let i = 0; i < 3000 && b.state.tela !== "resultado"; i++) b.step(10); });
    await pg.waitForTimeout(900);
    await foto(pg, `${nome}-12-resultado`);
    await pg.click('.acoes button >> nth=0');
    await pg.waitForTimeout(600);
    relatorio.push({ rotulo: `${nome} jogar de novo`, tela: await pg.evaluate(() => window.__bomberolho.state.tela) });
    await pg.click('#bt-sair');
    await pg.waitForTimeout(300);
    await pg.click('.acoes button >> nth=1');
    await pg.waitForTimeout(900);
    await foto(pg, `${nome}-13-volta-menu`);
    relatorio.push({ rotulo: `${nome} problemas`, problemas });
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
for (const r of relatorio) {
  const bad = r.rolaX || r.rolaY || r.fora?.length || r.pequenos?.length || r.cortados?.length || r.problemas?.length;
  console.log((bad ? '!! ' : '   ') + JSON.stringify(r));
}
