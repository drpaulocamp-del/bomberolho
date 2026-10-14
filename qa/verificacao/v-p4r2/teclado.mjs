// Verificador P4R2: só teclado em 1280×720 — fluxo do menu com Tab/setas/Enter,
// foco visível, trajeto com setas (casa a casa), gota com Espaço, pausa (P/Esc),
// som e sair alcançáveis com Tab, sem rolagem; reduzir movimento.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const OUT = new URL('../../capturas/v-p4r2/', import.meta.url).pathname;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina, problemas } = await novaPagina(nav, { width: 1280, height: 720 }, { contexto: { reducedMotion: 'reduce' } });
const log = [];
const foco = () => pagina.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return `${(a.getAttribute('aria-label') || a.textContent || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 24)} [${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}]`; });
const st = () => pagina.evaluate(() => window.__bomberolho.state);
await pagina.goto(servidor.url);
await esperarJogo(pagina);
await espera(500);
// Tab por todo o menu inicial
const ordem = [];
for (let i = 0; i < 6; i++) { await pagina.keyboard.press('Tab'); ordem.push(await foco()); }
log.push('menu, Tab: ' + ordem.join(' → '));
await pagina.screenshot({ path: `${OUT}teclado-menu-foco.png` });
// Jogar
await pagina.reload(); await esperarJogo(pagina); await espera(400);
log.push('foco inicial: ' + await foco());
await pagina.keyboard.press('Enter'); await espera(400);
log.push('após Enter: etapa ' + await pagina.evaluate(() => document.querySelector('.tela:not([hidden])')?.dataset.etapa) + ' foco ' + await foco());
await pagina.keyboard.press('ArrowRight'); await pagina.keyboard.press('ArrowRight'); await espera(200);
log.push('setas no personagem: foco ' + await foco());
await pagina.screenshot({ path: `${OUT}teclado-personagem.png` });
// Tab até "Próximo"
for (let i = 0; i < 6 && !(await foco()).startsWith('Próximo'); i++) await pagina.keyboard.press('Tab');
log.push('foco: ' + await foco());
await pagina.keyboard.press('Enter'); await espera(400);
log.push('etapa ' + await pagina.evaluate(() => document.querySelector('.tela:not([hidden])')?.dataset.etapa) + ' foco ' + await foco());
for (let i = 0; i < 12 && !(await foco()).startsWith('Começar'); i++) await pagina.keyboard.press('Tab');
log.push('foco: ' + await foco());
await pagina.screenshot({ path: `${OUT}teclado-arena.png` });
await pagina.keyboard.press('Enter');
await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'jogando' && window.__bomberolho.state.contagem === 0, null, { timeout: 9000 });
// trajeto com setas: robôs parados, semente 112
await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 112, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) b.input(i, {}); });
await espera(200);
const vis = ['1,1'];
const segurar = async (tecla, alvo) => {
  await pagina.keyboard.down(tecla);
  const lim = Date.now() + 3000;
  for (;;) { const j = (await st()).jogadores[0]; const c = `${Math.floor(j.x)},${Math.floor(j.y)}`; if (vis.at(-1) !== c) vis.push(c);
    if (Math.abs(j.x - alvo[0] - 0.5) < 0.12 && Math.abs(j.y - alvo[1] - 0.5) < 0.12) break; if (Date.now() > lim) { vis.push('PAROU'); break; } }
  await pagina.keyboard.up(tecla);
};
await segurar('ArrowDown', [1, 3]); await segurar('ArrowRight', [3, 3]); await segurar('KeyW', [3, 2]);
log.push('trajeto setas/WASD: ' + vis.join(' > ') + ' (esperado 1,1 > 1,2 > 1,3 > 2,3 > 3,3 > 3,2)');
await pagina.keyboard.press('Space'); await espera(100);
log.push('gota com Espaço: ' + JSON.stringify((await st()).gotas.map((g) => [g.col, g.lin])));
log.push('rolagem: ' + JSON.stringify(await pagina.evaluate(() => [scrollX, scrollY])));
// pausa com P, Tab pelos botões, som com Enter
await pagina.keyboard.press('KeyP'); await espera(300);
log.push('P → ' + (await st()).tela + ', foco ' + await foco());
const tabs = [];
for (let i = 0; i < 6; i++) { await pagina.keyboard.press('Tab'); tabs.push(await foco()); }
log.push('Tab na pausa: ' + tabs.join(' → '));
await pagina.screenshot({ path: `${OUT}teclado-pausa.png` });
await pagina.keyboard.press('Escape'); await espera(300);
log.push('Esc → ' + (await st()).tela);
// som e sair pelo teclado durante o jogo
await pagina.evaluate(() => document.querySelector('.painel .bt-som').focus());
const mudo0 = (await st()).mudo;
await pagina.keyboard.press('Enter'); await espera(200);
log.push(`som com Enter: mudo ${mudo0} → ${(await st()).mudo}, tela ${(await st()).tela}`);
await pagina.keyboard.press('Enter'); await espera(200);
await pagina.evaluate(() => document.getElementById('bt-sair').focus());
await pagina.keyboard.press('Enter'); await espera(500);
log.push('Sair com Enter → ' + (await st()).tela + ' / ' + await pagina.evaluate(() => document.querySelector('#aviso:not([hidden]) h2, .tela:not([hidden])')?.textContent?.trim().slice(0, 40)) + ' foco ' + await foco());
await pagina.screenshot({ path: `${OUT}teclado-sair.png` });
log.push('animações CSS rodando (reduzir movimento): ' + await pagina.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length));
console.log(log.join('\n'));
console.log('problemas', problemas);
await nav.close(); await servidor.fechar();
