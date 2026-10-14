// Verificador P4R1: jogar com dedos "de verdade" (CDP touch) em tempo real,
// medir trajeto por casas, zona morta, diagonal, troca de direção rolando o
// polegar, gota, toque múltiplo, bichinho, canhoto, rolagem/zoom/seleção.
// Uso: cd qa && node verificacao/v-p4r1/toque.mjs
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';

const OUT = new URL('../../capturas/v-p4r1/', import.meta.url).pathname;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = await subirServidor();
const nav = await abrirNavegador();
const res = {};
const telas = { retrato: TELAS.retrato, paisagem: TELAS.paisagem, pequeno: TELAS.pequeno };

async function abrir(tela, busca, dpr = 2) {
  const p = await novaPagina(nav, tela, { dpr, contexto: { hasTouch: true, isMobile: true } });
  p.cdp = await p.contexto.newCDPSession(p.pagina);
  await p.pagina.goto(servidor.url + busca);
  await esperarJogo(p.pagina);
  return p;
}
const st = (pg) => pg.evaluate(() => window.__bomberolho.state);
const eu = async (pg) => (await st(pg)).jogadores[0];
const casa = (j) => [Math.floor(j.x), Math.floor(j.y)];

/** Segura a alavanca numa direção até o jogador chegar à casa alvo (tempo real). */
async function irAte(p, x0, y0, off, alvo, limite = 3000) {
  await dedo(p.cdp, 'touchStart', [[x0, y0]]);
  await dedo(p.cdp, 'touchMove', [[x0 + off[0], y0 + off[1]]]);
  const t0 = Date.now();
  const visitadas = [];
  let j;
  while (Date.now() - t0 < limite) {
    j = await eu(p.pagina);
    const c = casa(j).join(',');
    if (visitadas.at(-1) !== c) visitadas.push(c);
    // chegou ao centro (aprox.) da casa alvo
    if (Math.abs(j.x - (alvo[0] + 0.5)) < 0.2 && Math.abs(j.y - (alvo[1] + 0.5)) < 0.2) break;
  }
  await dedo(p.cdp, 'touchEnd', []);
  await espera(250);
  const fim = await eu(p.pagina);
  return { visitadas, ms: Date.now() - t0, fim: [+fim.x.toFixed(2), +fim.y.toFixed(2)] };
}

for (const [nome, tela] of Object.entries(telas)) {
  const r = (res[nome] = {});
  const p = await abrir(tela, '?semente=7&arena=jardim');
  const { pagina, cdp } = p;
  await pagina.evaluate(() => { for (const id of [1, 2, 3]) window.__bomberolho.input(id, {}); });
  await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'jogando' && window.__bomberolho.state.contagem === 0, null, { timeout: 8000 });
  r.toqueVisivel = await pagina.evaluate(() => !document.getElementById('toque').hidden && document.body.dataset.toque);
  // geometria
  r.geo = await pagina.evaluate(() => {
    const q = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return { arena: q('#arena'), gota: q('#bt-gota'), alav: q('.alavanca'), pausa: q('#bt-pausa'), sair: q('#bt-sair'), som: q('.bt-som'),
      rolagem: [document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth, innerHeight] };
  });
  await pagina.screenshot({ path: `${OUT}${nome}-01-jogando.png` });
  const W = tela.width; const H = tela.height;
  // ponto da alavanca: em cima da arena, metade esquerda
  const ax = Math.round(W * 0.22); const ay = Math.round(H * (nome === 'paisagem' ? 0.6 : 0.55));
  // zona morta
  const a0 = await eu(pagina);
  await dedo(cdp, 'touchStart', [[ax, ay]]);
  await dedo(cdp, 'touchMove', [[ax + 7, ay + 6]]);
  await espera(500);
  const a1 = await eu(pagina);
  await dedo(cdp, 'touchEnd', []);
  r.zonaMorta = { moveu: +(Math.abs(a1.x - a0.x) + Math.abs(a1.y - a0.y)).toFixed(3) };
  // polegar encostado na borda de baixo e parado (só um tremor de 1 px)
  {
    const b0 = await eu(pagina);
    await dedo(cdp, 'touchStart', [[Math.round(W * 0.25), H - 6]]);
    await dedo(cdp, 'touchMove', [[Math.round(W * 0.25) + 1, H - 6]]);
    await espera(400);
    const b1 = await eu(pagina);
    r.bordaFantasma = { dir: await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir), dy: +(b1.y - b0.y).toFixed(2) };
    await dedo(cdp, 'touchEnd', []);
    await espera(100);
    // ponto da alavanca em repouso (contorno visível): encostar na parte esquerda dele e empurrar 30 px para a direita
    const av = r.geo.alav;
    await irAte(p, ax, ay, [0, -30], [1, 1]);
    const c0 = await eu(pagina);
    await dedo(cdp, 'touchStart', [[av.x + 22, av.y + av.h / 2]]);
    await dedo(cdp, 'touchMove', [[av.x + 52, av.y + av.h / 2]]);
    await espera(400);
    const c1 = await eu(pagina);
    r.contornoRepouso = { dir: await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir), dx: +(c1.x - c0.x).toFixed(2), dy: +(c1.y - c0.y).toFixed(2) };
    await dedo(cdp, 'touchEnd', []);
    await irAte(p, ax, ay, [-30, 0], [1, 1]);
    await irAte(p, ax, ay, [0, -30], [1, 1]);
  }
  // trajeto: (1,1) → baixo até (1,3) → cima até (1,1) → dir até (2,1) → esq até (1,1)
  r.trajeto = [];
  r.trajeto.push(await irAte(p, ax, ay, [0, 30], [1, 3]));
  r.trajeto.push(await irAte(p, ax + 10, ay - 40, [0, -30], [1, 1]));
  r.trajeto.push(await irAte(p, 40, H - 60, [30, 0], [2, 1]));
  r.trajeto.push(await irAte(p, ax, ay, [-30, 0], [1, 1]));
  // diagonal com leve predominância vertical, e tremida em volta da diagonal
  const d0 = await eu(pagina);
  await dedo(cdp, 'touchStart', [[ax, ay]]);
  await dedo(cdp, 'touchMove', [[ax + 22, ay + 26]]);
  const dirs = [];
  for (let k = 0; k < 10; k++) {
    await dedo(cdp, 'touchMove', [[ax + 22 + (k % 2 ? 3 : -3), ay + 26 + (k % 2 ? -3 : 3)]]);
    dirs.push(await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir));
    await espera(40);
  }
  await dedo(cdp, 'touchEnd', []);
  const d1 = await eu(pagina);
  r.diagonal = { dirs: [...new Set(dirs)], dx: +(d1.x - d0.x).toFixed(2), dy: +(d1.y - d0.y).toFixed(2) };
  await espera(200);
  // volta a (1,1)
  await irAte(p, ax, ay, [0, -30], [1, 1]);
  // rolar o polegar: baixo e depois direita sem voltar ao centro (base segue o dedo)
  await dedo(cdp, 'touchStart', [[ax, ay]]);
  await dedo(cdp, 'touchMove', [[ax, ay + 60]]); // passa do raio
  await espera(350);
  const rb = await eu(pagina);
  await dedo(cdp, 'touchMove', [[ax + 30, ay + 60]]); // só 30 px para a direita, a partir do dedo
  await espera(80);
  const dirRolada = await pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir);
  await dedo(cdp, 'touchEnd', []);
  r.rolagemPolegar = { aposBaixo: casa(rb), dirDepois30pxDir: dirRolada };
  await irAte(p, ax, ay, [0, -30], [1, 1]);
  // gota pelo botão + contagem
  const g = r.geo.gota;
  const conta0 = await pagina.evaluate(() => document.querySelector('#bt-gota .conta').textContent);
  await dedo(cdp, 'touchStart', [[g.x + g.w / 2, g.y + g.h / 2]]);
  await espera(60);
  await dedo(cdp, 'touchEnd', []);
  await espera(120);
  let s = await st(pagina);
  const conta1 = await pagina.evaluate(() => document.querySelector('#bt-gota .conta').textContent);
  r.gota = { gotas: s.gotas.map((b) => [b.col, b.lin]), conta: [conta0, conta1] };
  // toque múltiplo: partida nova sem contagem, 2 gotas, pavio longo
  await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 7, arena: 'jardim', contagem: false }); for (const id of [1, 2, 3]) b.input(id, {}); b.ajustar({ pavio: 900 }); b.darItem(0, 'gota'); });
  await espera(200);
  await dedo(cdp, 'touchStart', [[ax, ay]]);
  await dedo(cdp, 'touchMove', [[ax, ay + 30]]);
  await espera(300);
  // segundo dedo na gota enquanto o primeiro anda; terceiro dedo ignorado
  await dedo(cdp, 'touchMove', [[ax, ay + 30, 0], [g.x + g.w / 2, g.y + g.h / 2, 1]]);
  await espera(60);
  await dedo(cdp, 'touchMove', [[ax, ay + 30, 0], [g.x + g.w / 2, g.y + g.h / 2, 1], [W * 0.3, H * 0.3, 2]]);
  await espera(60);
  await dedo(cdp, 'touchEnd', [[ax, ay + 30, 0]]);
  await espera(250);
  const m2 = await eu(pagina);
  await dedo(cdp, 'touchEnd', []);
  s = await st(pagina);
  r.multiplo = { gotas: s.gotas.length, euDepois: [+m2.x.toFixed(2), +m2.y.toFixed(2)], dirAlav: await pagina.evaluate(() => document.querySelector('.alavanca').className) };
  await pagina.screenshot({ path: `${OUT}${nome}-02-gotas.png` });
  // bichinho: partida nova sem contagem
  await pagina.evaluate(() => { const b = window.__bomberolho; b.restaurarAjuste(); b.start({ semente: 7, arena: 'jardim', contagem: false }); for (const id of [1, 2, 3]) b.input(id, {}); });
  await espera(200);
  s = await st(pagina);
  r.vivoAposGotas = s.jogadores[0].vivo;
  if (s.jogadores[0].vivo) {
    await pagina.evaluate(() => window.__bomberolho.darItem(0, 'estojo'));
    await espera(150);
    const ac = await pagina.evaluate(() => { const b = document.getElementById('bt-acao'); const q = b.getBoundingClientRect(); return { hidden: b.hidden, w: q.width, h: q.height, x: q.x, y: q.y, label: b.getAttribute('aria-label') }; });
    s = await st(pagina);
    r.bichinho = { botao: ac, montaria: s.jogadores[0].montaria };
    await pagina.screenshot({ path: `${OUT}${nome}-03-montado.png` });
    // aperta o poder
    const antes = await eu(pagina);
    await dedo(cdp, 'touchStart', [[ac.x + ac.w / 2, ac.y + ac.h / 2]]);
    await espera(100);
    const durante = await eu(pagina);
    await espera(300);
    await dedo(cdp, 'touchEnd', []);
    await espera(200);
    const depois = await eu(pagina);
    r.bichinho.poder = { antes: [antes.x, antes.y], depois: [depois.x, depois.y], escudoDurante: durante.escudo, recarga: depois.recarga };
  }
  // pinça e zoom: dois dedos fazendo pinça em cima da arena e arrasto para baixo no topo
  await dedo(cdp, 'touchStart', [[W * 0.3, H * 0.4, 0], [W * 0.7, H * 0.6, 1]]);
  for (let k = 1; k <= 5; k++) await dedo(cdp, 'touchMove', [[W * 0.3 - 10 * k, H * 0.4 - 10 * k, 0], [W * 0.7 + 10 * k, H * 0.6 + 10 * k, 1]]);
  await dedo(cdp, 'touchEnd', []);
  await dedo(cdp, 'touchStart', [[W * 0.8, 20]]);
  for (let k = 1; k <= 8; k++) await dedo(cdp, 'touchMove', [[W * 0.8, 20 + 40 * k]]);
  await dedo(cdp, 'touchEnd', []);
  // toque longo em texto do placar (seleção / menu de contexto)
  let ctx = 0;
  await pagina.exposeFunction('__ctx', () => { ctx++; });
  await pagina.evaluate(() => window.addEventListener('contextmenu', () => window.__ctx(), true));
  const plac = await pagina.evaluate(() => { const b = document.querySelector('.placar, .barra')?.getBoundingClientRect(); return b && [b.x + 20, b.y + 10]; });
  if (plac) {
    await dedo(cdp, 'touchStart', [plac]);
    await espera(1200);
    await dedo(cdp, 'touchEnd', []);
  }
  r.semZoomNemRolagem = await pagina.evaluate(() => ({ escala: visualViewport.scale, sx: scrollX, sy: scrollY, sel: String(getSelection()) }));
  r.menuContexto = ctx;
  // canhoto pela pausa
  const pz = r.geo.pausa;
  await dedo(cdp, 'touchStart', [[pz.x + pz.w / 2, pz.y + pz.h / 2]]);
  await dedo(cdp, 'touchEnd', []);
  await espera(300);
  r.pausado = (await st(pagina)).tela;
  await pagina.screenshot({ path: `${OUT}${nome}-04-pausa.png` });
  const btLados = await pagina.evaluate(() => { const b = [...document.querySelectorAll('#aviso button')].find((x) => /lado/i.test(x.textContent)); if (!b) return null; const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2, q.width, q.height]; });
  r.botaoLados = btLados;
  if (btLados) {
    await pagina.touchscreen.tap(btLados[0], btLados[1]);
    await espera(200);
    const cont = await pagina.evaluate(() => { const b = [...document.querySelectorAll('#aviso button')].find((x) => /continuar/i.test(x.textContent)); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
    await pagina.touchscreen.tap(cont[0], cont[1]);
    await espera(300);
    r.ladoDepois = await pagina.evaluate(() => document.body.dataset.lado);
    await pagina.screenshot({ path: `${OUT}${nome}-05-canhoto.png` });
    // esquerda agora não mexe; direita mexe
    const e0 = await eu(pagina);
    await dedo(cdp, 'touchStart', [[W * 0.2, H * 0.5]]);
    await dedo(cdp, 'touchMove', [[W * 0.2, H * 0.5 - 30]]);
    await espera(300);
    await dedo(cdp, 'touchEnd', []);
    const e1 = await eu(pagina);
    await dedo(cdp, 'touchStart', [[W * 0.8, H * 0.5]]);
    await dedo(cdp, 'touchMove', [[W * 0.8, H * 0.5 - 30]]);
    await espera(300);
    await dedo(cdp, 'touchEnd', []);
    const e2 = await eu(pagina);
    // borda direita, polegar parado (tremor 1 px) no modo canhoto: anda sozinho?
    await irAte(p, W * 0.8, H * 0.5, [-30, 0], [1, 1]);
    const f0 = await eu(pagina);
    await dedo(cdp, 'touchStart', [[W - 5, H * 0.5]]);
    await dedo(cdp, 'touchMove', [[W - 6, H * 0.5]]);
    await espera(400);
    const f1 = await eu(pagina);
    await dedo(cdp, 'touchEnd', []);
    r.bordaDireitaCanhoto = +(f1.x - f0.x).toFixed(2);
    r.canhoto = { esquerdaMoveu: +(Math.abs(e1.y - e0.y) + Math.abs(e1.x - e0.x)).toFixed(2), direitaMoveu: +(Math.abs(e2.y - e1.y) + Math.abs(e2.x - e1.x)).toFixed(2), gota: await pagina.evaluate(() => { const q = document.getElementById('bt-gota').getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y)]; }) };
  }
  r.problemas = p.problemas;
  await p.contexto.close();
}
console.log(JSON.stringify(res, null, 1));
await nav.close();
await servidor.fechar();
