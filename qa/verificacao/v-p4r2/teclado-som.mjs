// Verificador P4R2: botões do painel com teclado DURANTE a partida (Enter/Espaço no botão em foco).
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina } = await novaPagina(nav, { width: 1280, height: 720 });
await pagina.goto(servidor.url + '?semente=112');
await esperarJogo(pagina);
await pagina.waitForFunction(() => window.__bomberolho.state.contagem === 0, null, { timeout: 9000 });
const s = () => pagina.evaluate(() => ({ mudo: window.__bomberolho.state.mudo, tela: window.__bomberolho.state.tela, gotas: window.__bomberolho.state.gotas.length }));
for (const tecla of ['Enter', 'Space']) {
  for (const sel of ['.painel .bt-som', '#bt-pausa', '#bt-sair']) {
    await pagina.evaluate(() => { const b = window.__bomberolho; if (b.state.tela !== 'jogando') b.start({ semente: 112, contagem: false }); b.pause(false); });
    await pagina.waitForTimeout(150);
    // Tab real até o botão
    await pagina.evaluate(() => document.body.focus());
    let achou = false;
    for (let i = 0; i < 8 && !achou; i++) { await pagina.keyboard.press('Tab'); achou = await pagina.evaluate((q) => document.activeElement === document.querySelector(q), sel); }
    const a = await s();
    await pagina.keyboard.press(tecla);
    await pagina.waitForTimeout(250);
    console.log(tecla, sel, 'focado por Tab:', achou, JSON.stringify(a), '→', JSON.stringify(await s()));
  }
}
await nav.close(); await servidor.fechar();
