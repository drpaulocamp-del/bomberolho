// Verificador P4R1: fluxo inteiro só com teclado (1280×720): menu → personagem →
// arena → jogar → pausa → continuar → sair; foco visível em cada passo.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const OUT = new URL('../../capturas/v-p4r1/', import.meta.url).pathname;
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina, problemas } = await novaPagina(nav, { width: 1280, height: 720 }, { contexto: { reducedMotion: 'reduce' } });
await pagina.goto(servidor.url);
await esperarJogo(pagina);
await pagina.waitForTimeout(600);
const foco = () => pagina.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return `${a.tagName}.${a.className}|"${(a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30)}"|outline ${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; });
const log = [];
log.push('inicial: ' + await foco());
for (let i = 0; i < 6; i++) { await pagina.keyboard.press('Tab'); log.push('tab: ' + await foco()); }
await pagina.screenshot({ path: `${OUT}teclado-01-menu-foco.png` });
// volta ao início e segue com Enter
await pagina.reload(); await esperarJogo(pagina); await pagina.waitForTimeout(600);
log.push('após recarregar: ' + await foco());
let passos = 0;
while (passos++ < 12) {
  const st = await pagina.evaluate(() => ({ tela: window.__bomberolho.state.tela, menu: window.__bomberolho.state.menu }));
  log.push(`passo ${passos}: ${JSON.stringify(st)} foco ${await foco()}`);
  if (st.tela === 'jogando' || st.tela === 'contagem') break;
  await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(500);
}
await pagina.screenshot({ path: `${OUT}teclado-02-jogo.png` });
await pagina.waitForTimeout(3500);
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(400);
log.push('pausa: ' + JSON.stringify(await pagina.evaluate(() => window.__bomberolho.state.tela)) + ' foco ' + await foco());
await pagina.keyboard.press('Tab');
log.push('pausa tab: ' + await foco());
await pagina.keyboard.press('Tab');
log.push('pausa tab: ' + await foco());
await pagina.screenshot({ path: `${OUT}teclado-03-pausa.png` });
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);
log.push('esc de novo: ' + JSON.stringify(await pagina.evaluate(() => window.__bomberolho.state.tela)));
// animações com reduzir movimento
log.push('animações CSS rodando: ' + await pagina.evaluate(() => document.getAnimations().map((a) => a.animationName || a.constructor.name).join(',')));
console.log(log.join('\n'));
console.log('problemas', problemas);
await nav.close(); await servidor.fechar();
