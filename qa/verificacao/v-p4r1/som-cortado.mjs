// Verificador P4R1: botão de som cortado no painel deitado com toque (tablets/celulares grandes).
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
for (const [w, h] of [[640, 360], [740, 360], [844, 390], [915, 412], [932, 430], [1024, 768], [1180, 820], [1280, 800], [1366, 1024]]) {
  const p = await novaPagina(nav, { width: w, height: h }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  await p.pagina.goto(servidor.url + '?semente=7');
  await esperarJogo(p.pagina);
  const r = await p.pagina.evaluate(() => {
    const b = document.querySelector('.painel .bt-som').getBoundingClientRect();
    const c = document.querySelector('.painel').getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const alvo = document.elementFromPoint(cx, cy);
    return { visivelPx: Math.round(Math.max(0, Math.min(b.right, c.right) - b.left)), largura: Math.round(b.width), centroClicavel: !!alvo?.closest('.bt-som') };
  });
  console.log(`${w}x${h}`, JSON.stringify(r));
  await p.contexto.close();
}
await nav.close(); await servidor.fechar();
