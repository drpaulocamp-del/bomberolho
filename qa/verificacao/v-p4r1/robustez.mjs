// Verificador P4R1: segundo plano com dedo na alavanca, girar com dedo na tela,
// redimensionar, recarregar, perda de foco na contagem, teclado sem rolar.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';
const OUT = new URL('../../capturas/v-p4r1/', import.meta.url).pathname;
const servidor = await subirServidor();
const nav = await abrirNavegador();
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
const r = {};
const p = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
const { pagina, contexto } = p;
const cdp = await contexto.newCDPSession(pagina);
await pagina.goto(servidor.url + '?semente=7&arena=jardim');
await esperarJogo(pagina);
await pagina.evaluate(() => { for (const id of [1, 2, 3]) window.__bomberolho.input(id, {}); });
await pagina.waitForFunction(() => window.__bomberolho.state.contagem === 0 && window.__bomberolho.state.tela === 'jogando');
const eu = async () => (await pagina.evaluate(() => window.__bomberolho.state)).jogadores[0];
// 1) dedo na alavanca andando para baixo; outra aba vem para a frente
await dedo(cdp, 'touchStart', [[90, 600]]);
await dedo(cdp, 'touchMove', [[90, 630]]);
await esp(150);
const outra = await contexto.newPage();
await outra.goto('about:blank');
await outra.bringToFront();
await esp(800);
r.vis = await pagina.evaluate(() => ({ hidden: document.hidden, vs: document.visibilityState, tela: window.__bomberolho.state.tela }));
await pagina.bringToFront();
await esp(300);
// o dedo "sumiu" (a aba trocou): o navegador manda touchcancel? mandamos o fim
await dedo(cdp, 'touchEnd', []);
const a0 = await eu();
r.voltou = await pagina.evaluate(() => window.__bomberolho.state.tela);
await pagina.evaluate(() => window.__bomberolho.pause(false));
await esp(600);
const a1 = await eu();
r.segundoPlano = { ...r.vis, aoVoltar: r.voltou, andouDepoisDeContinuar: +(a1.y - a0.y).toFixed(2) };
await outra.close();
// 1b) aba escondida SEM soltar o dedo (o dedo continua na tela ao voltar, parado)
await dedo(cdp, 'touchStart', [[90, 600]]);
await dedo(cdp, 'touchMove', [[90, 560]]);
await esp(100);
await pagina.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
await esp(200);
await pagina.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.__bomberolho.pause(false); });
const b0 = await eu();
await esp(500);
const b1 = await eu();
await dedo(cdp, 'touchEnd', []);
r.dedoPresoAposVoltar = { tela: await pagina.evaluate(() => window.__bomberolho.state.tela), andou: +(Math.abs(b1.y - b0.y) + Math.abs(b1.x - b0.x)).toFixed(2) };
// 2) girar com o dedo na alavanca
await dedo(cdp, 'touchStart', [[90, 600]]);
await dedo(cdp, 'touchMove', [[90, 640]]);
await esp(100);
await pagina.setViewportSize({ width: 844, height: 390 });
await esp(400);
const g0 = await eu();
await esp(500);
const g1 = await eu();
r.girar = await pagina.evaluate(() => {
  const a = document.getElementById('arena').getBoundingClientRect();
  return { arena: [Math.round(a.x), Math.round(a.y), Math.round(a.width), Math.round(a.height)], cabe: a.right <= innerWidth && a.bottom <= innerHeight && a.x >= 0 && a.y >= 0, rola: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], alav: document.querySelector('.alavanca').className };
});
r.girar.andouSozinho = +(Math.abs(g1.y - g0.y) + Math.abs(g1.x - g0.x)).toFixed(2);
await dedo(cdp, 'touchEnd', []);
await pagina.screenshot({ path: `${OUT}rob-girado.png` });
// 3) redimensionar várias vezes no meio
const tamanhos = [[360, 640], [768, 1024], [640, 360], [1280, 720], [390, 844]];
r.redim = [];
for (const [w, h] of tamanhos) {
  await pagina.setViewportSize({ width: w, height: h });
  await esp(300);
  r.redim.push(await pagina.evaluate(() => { const a = document.getElementById('arena').getBoundingClientRect(); return `${innerWidth}x${innerHeight}: arena ${Math.round(a.width)}x${Math.round(a.height)} cabe=${a.right <= innerWidth + 0.5 && a.bottom <= innerHeight + 0.5} rola=${document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth}`; }));
}
// 4) recarregar no meio: preferências (canhoto) mantidas
await pagina.evaluate(() => localStorage.setItem('x', '1'));
await pagina.reload();
await esperarJogo(pagina);
await esp(500);
r.recarregar = await pagina.evaluate(() => ({ tela: window.__bomberolho.state.tela, mudo: window.__bomberolho.state.mudo, chaves: Object.keys(localStorage) }));
r.problemas = p.problemas;
await contexto.close();
// 5) perda de foco durante a contagem (desktop, teclado)
const q = await novaPagina(nav, { width: 1280, height: 720 });
await q.pagina.goto(servidor.url + '?semente=7&arena=jardim');
await esperarJogo(q.pagina);
await q.pagina.evaluate(() => window.dispatchEvent(new Event('blur')));
await esp(4000);
r.blurNaContagem = await q.pagina.evaluate(() => ({ tela: window.__bomberolho.state.tela, contagem: window.__bomberolho.state.contagem, relogio: window.__bomberolho.state.relogio }));
// teclado: setas/espaço/PageDown não rolam; tecla presa + blur solta
await q.pagina.evaluate(() => window.__bomberolho.pause(false));
await q.pagina.keyboard.down('ArrowDown');
await esp(300);
await q.pagina.evaluate(() => window.dispatchEvent(new Event('blur')));
await q.pagina.evaluate(() => window.__bomberolho.pause(false));
const k0 = (await q.pagina.evaluate(() => window.__bomberolho.state)).jogadores[0];
await esp(500);
const k1 = (await q.pagina.evaluate(() => window.__bomberolho.state)).jogadores[0];
await q.pagina.keyboard.up('ArrowDown');
for (const k of ['Space', 'PageDown', 'End', 'ArrowDown', 'Tab']) await q.pagina.keyboard.press(k);
r.teclado = { teclaPresaAposBlur: +(k1.y - k0.y).toFixed(2), rolagem: await q.pagina.evaluate(() => [scrollX, scrollY]) };
r.problemasDesktop = q.problemas;
console.log(JSON.stringify(r, null, 1));
await nav.close(); await servidor.fechar();
