// Verificador P4R2: toque múltiplo soltando UM dedo de cada vez (no CDP,
// touchEnd leva a lista dos dedos que SAEM — ver cdp-dedos.mjs).
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = await subirServidor();
const nav = await abrirNavegador();
for (const [W, H] of [[390, 844], [844, 390], [360, 640], [1024, 768]]) {
  const p = await novaPagina(nav, { width: W, height: H }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  const { pagina } = p;
  const cdp = await p.contexto.newCDPSession(pagina);
  await pagina.goto(servidor.url + '?semente=112&arena=jardim');
  await esperarJogo(pagina);
  const nova = () => pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 112, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) b.input(i, {}); b.ajustar({ pavio: 900 }); b.darItem(0, 'gota'); });
  const y = () => pagina.evaluate(() => window.__bomberolho.state.jogadores[0].y);
  const dir = () => pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir);
  const g = await pagina.evaluate(() => { const b = document.getElementById('bt-gota').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  const ax = H > W ? Math.round(W * 0.25) : Math.round(W * 0.12);
  const ay = H > W ? H - 110 : Math.round(H * 0.6);
  const r = {};
  await nova(); await espera(150);
  await dedo(cdp, 'touchStart', [[ax, ay, 0]]);
  await dedo(cdp, 'touchMove', [[ax, ay + 30, 0]]);
  await espera(60);
  await dedo(cdp, 'touchStart', [[ax, ay + 30, 0], [g[0], g[1], 1]]);           // gota
  await dedo(cdp, 'touchStart', [[ax, ay + 30, 0], [g[0], g[1], 1], [ax + 40, ay - 40, 2]]); // 3º dedo no lado da alavanca
  await dedo(cdp, 'touchMove', [[ax, ay + 30, 0], [g[0], g[1], 1], [ax + 90, ay - 40, 2]]); // 3º dedo arrasta para a direita
  r.com3 = await dir();
  await dedo(cdp, 'touchEnd', [[g[0], g[1], 1]]);                                 // só a gota sai
  const y0 = await y(); await espera(120); const y1 = await y();
  r.soltouGota = { dir: await dir(), andou: +(y1 - y0).toFixed(2) };
  await dedo(cdp, 'touchEnd', [[ax + 90, ay - 40, 2]]);                           // 3º dedo sai
  r.soltou3 = { dir: await dir() };
  await dedo(cdp, 'touchEnd', [[ax, ay + 30, 0]]);
  const y2 = await y(); await espera(150); const y3 = await y();
  r.soltouAlavanca = { dir: await dir(), andouDepois: +(y3 - y2).toFixed(2) };
  r.gotas = await pagina.evaluate(() => window.__bomberolho.state.gotas.length);
  // alavanca sai primeiro, gota segura (Pinça) e depois sai
  await nova(); await espera(150);
  await dedo(cdp, 'touchStart', [[ax, ay, 0]]);
  await dedo(cdp, 'touchMove', [[ax, ay + 30, 0]]);
  await dedo(cdp, 'touchStart', [[ax, ay + 30, 0], [g[0], g[1], 1]]);
  await dedo(cdp, 'touchEnd', [[ax, ay + 30, 0]]);
  const z0 = await y(); await espera(150); const z1 = await y();
  r.alavancaSaiGotaFica = { dir: await dir(), andou: +(z1 - z0).toFixed(2), btnApertado: await pagina.evaluate(() => document.getElementById('bt-gota').className) };
  await dedo(cdp, 'touchEnd', []);
  r.btnDepois = await pagina.evaluate(() => document.getElementById('bt-gota').className);
  r.problemas = p.problemas;
  console.log(`${W}x${H}`, JSON.stringify(r));
  await p.contexto.close();
}
await nav.close(); await servidor.fechar();
