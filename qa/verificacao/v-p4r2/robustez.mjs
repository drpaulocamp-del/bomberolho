// Verificador P4R2: robustez — segundo plano (tentativa real com outra aba e
// simulada), perda de foco, girar com o dedo na tela, redimensionar, recarregar,
// tecla presa ao perder o foco, intervalo/resultado em segundo plano.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = await subirServidor();
const nav = await abrirNavegador();
const r = {};
const { pagina, contexto, problemas } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
const cdp = await contexto.newCDPSession(pagina);
const st = () => pagina.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, contagem: s.contagem, relogio: s.relogio, x: s.jogadores[0].x, y: s.jogadores[0].y, audio: s.audio }; });
await pagina.goto(servidor.url + '?semente=112&arena=jardim');
await esperarJogo(pagina);
await pagina.evaluate(() => { for (const i of [1, 2, 3]) window.__bomberolho.input(i, {}); });
// 1. outra aba real na frente
const outra = await contexto.newPage();
await outra.goto('about:blank');
await outra.bringToFront();
await espera(400);
r.abaReal = { visibilidade: await pagina.evaluate(() => document.visibilityState), ...(await st()) };
await pagina.bringToFront();
await espera(300);
await outra.close();
// 2. simulado: escondida durante a contagem e no meio do jogo
await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 112, arena: 'jardim' }); for (const i of [1, 2, 3]) b.input(i, {}); });
await espera(500);
const esconder = (h) => pagina.evaluate((h) => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
await esconder(true);
r.escondidaNaContagem = await st();
await espera(1500);
r.escondidaDepois1_5s = await st();
await esconder(false);
await espera(300);
r.voltou = await st();
// continuar com o botão do cartão (toque)
await pagina.locator('#aviso button', { hasText: /Continuar/i }).tap();
await pagina.waitForFunction(() => window.__bomberolho.state.contagem === 0, null, { timeout: 8000 });
// 3. dedo segurando "baixo" e a aba some: ao voltar e continuar, não anda sozinho
await dedo(cdp, 'touchStart', [[100, 734]]);
await dedo(cdp, 'touchMove', [[100, 764]]);
await espera(150);
await esconder(true);
await esconder(false);
await dedo(cdp, 'touchEnd', []);
const a = await st();
await pagina.locator('#aviso button', { hasText: /Continuar/i }).tap();
await espera(600);
const b = await st();
r.dedoPresoAbaSumiu = { pausou: a.tela, andouDepois: +(Math.abs(b.y - a.y) + Math.abs(b.x - a.x)).toFixed(2), tela: b.tela };
// 4. blur com tecla presa (contexto sem toque não é preciso: teclado funciona igual)
await pagina.keyboard.down('ArrowDown');
await espera(100);
await pagina.evaluate(() => window.dispatchEvent(new Event('blur')));
await pagina.keyboard.up('ArrowDown').catch(() => {});
const c = await st();
r.blurTeclaPresa = { tela: c.tela };
// 5. girar com o dedo na tela (alavanca segurada)
await pagina.locator('#aviso button', { hasText: /Continuar/i }).tap();
await espera(300);
await dedo(cdp, 'touchStart', [[100, 734]]);
await dedo(cdp, 'touchMove', [[100, 764]]);
await espera(100);
await pagina.setViewportSize({ width: 844, height: 390 });
await espera(400);
const g0 = await st();
await espera(500);
const g1 = await st();
await dedo(cdp, 'touchEnd', []);
r.girar = { andouSozinho: +(Math.abs(g1.y - g0.y) + Math.abs(g1.x - g0.x)).toFixed(2), alavanca: await pagina.evaluate(() => document.querySelector('.alavanca').className), arenaCabe: await pagina.evaluate(() => { const q = document.getElementById('arena').getBoundingClientRect(); return q.right <= innerWidth && q.bottom <= innerHeight && q.width > 200; }) };
await pagina.screenshot({ path: new URL('../../capturas/v-p4r2/robustez-girado.png', import.meta.url).pathname });
// 6. redimensionar por várias telas
r.redimensionar = [];
for (const [w, h] of [[360, 640], [768, 1024], [640, 360], [1280, 720], [1024, 768], [390, 844]]) {
  await pagina.setViewportSize({ width: w, height: h });
  await espera(300);
  r.redimensionar.push(await pagina.evaluate(() => { const q = document.getElementById('arena').getBoundingClientRect(); const d = document.documentElement; return `${innerWidth}x${innerHeight}: arena ${Math.round(q.width)}x${Math.round(q.height)} dentro=${q.right <= innerWidth + 0.5 && q.bottom <= innerHeight + 0.5} rola=${d.scrollWidth > innerWidth || d.scrollHeight > innerHeight}`; }));
}
// 7. resultado/intervalo em segundo plano: nada quebra
await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ rodadas: 1, contagem: false }); b.demo(true); b.setTimeScale(16); });
await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'resultado', null, { timeout: 60000 }).catch(() => {});
await esconder(true); await espera(300); await esconder(false); await espera(300);
r.resultadoEscondido = (await st()).tela;
// 8. recarregar no meio, com som ligado e lado salvo
await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 5 }); b.setTimeScale(1); });
await espera(1500);
await pagina.reload();
await esperarJogo(pagina);
await espera(800);
r.recarregou = await st();
r.problemas = problemas;
console.log(JSON.stringify(r, null, 1));
await nav.close(); await servidor.fechar();
