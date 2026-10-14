// Verificador P4R1: botões do painel cortados? (cada tela, toque e sem toque)
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const telas = { ...TELAS, 'paisagem-pequena': { width: 640, height: 360 }, tablet: { width: 768, height: 1024 } };
for (const [nome, tela] of Object.entries(telas)) for (const toque of [false, true]) {
  const p = await novaPagina(nav, tela, { dpr: 2, contexto: toque ? { hasTouch: true, isMobile: true } : {} });
  await p.pagina.goto(servidor.url + '?semente=7');
  await esperarJogo(p.pagina);
  const r = await p.pagina.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, .placar li, #arena, .barra')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0) continue;
      // ancestral que corta
      let a = el.parentElement;
      while (a && a !== document.body) {
        const s = getComputedStyle(a);
        if (s.overflow !== 'visible' || s.overflowX !== 'visible') {
          const c = a.getBoundingClientRect();
          if (b.left < c.left - 0.5 || b.right > c.right + 0.5 || b.top < c.top - 0.5 || b.bottom > c.bottom + 0.5) out.push(`${el.id || el.className} [${Math.round(b.left)}-${Math.round(b.right)}] cortado por ${a.className} [${Math.round(c.left)}-${Math.round(c.right)}]`);
          break;
        }
        a = a.parentElement;
      }
      if (b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5 || b.left < -0.5 || b.top < -0.5) out.push(`${el.id || el.className} fora da tela`);
    }
    return out;
  });
  console.log(nome, toque ? 'toque' : 'mouse', r.length ? r : 'ok', p.problemas);
  await p.pagina.screenshot({ path: new URL(`../../capturas/v-p4r1/painel-${nome}-${toque ? 't' : 'm'}.png`, import.meta.url).pathname });
  await p.contexto.close();
}
await nav.close(); await servidor.fechar();
