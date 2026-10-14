import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '/home/user/bomberolho/qa/navegador/apoio.mjs';
const servidor = await subirServidor(); const nav = await abrirNavegador();
for (const [w,h] of [[740,360],[1024,768]]) {
const p = await novaPagina(nav, { width: w, height: h }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
await p.pagina.goto(servidor.url + '?semente=7'); await esperarJogo(p.pagina);
await p.pagina.waitForTimeout(3500);
await p.pagina.screenshot({ path: `/home/user/bomberolho/qa/capturas/v-p4r1/som-${w}x${h}.png` });
await p.contexto.close(); }
await nav.close(); await servidor.fechar();
