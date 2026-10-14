// Verificador P4R2: o relógio da rodada anda em demo com ?escala=2 e depois de girar/pausar?
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const { pagina } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
await pagina.goto(servidor.url + '?demo=1&escala=2&dificuldade=medio');
await esperarJogo(pagina);
const s = () => pagina.evaluate(() => { const b = window.__bomberolho.state; return `tela ${b.tela} fase ${b.fase} relogio ${b.relogio} contagem ${b.contagem} tick ${b.tick} vivos ${b.jogadores.filter((j) => j.vivo).length}`; });
for (let i = 0; i < 4; i++) { console.log(await s()); await pagina.waitForTimeout(3000); }
await pagina.setViewportSize({ width: 844, height: 390 }); await pagina.waitForTimeout(3000); console.log('girou', await s());
await pagina.evaluate(() => { window.__bomberolho.pause(true); }); await pagina.evaluate(() => window.__bomberolho.pause(false)); await pagina.waitForTimeout(3000); console.log('pausou/voltou', await s());
await nav.close(); await servidor.fechar();
