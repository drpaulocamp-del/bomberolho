// Verificador TODO R1: telas de vitória do humano (piloto automático, tempo acelerado).
import { subirServidor, abrirNavegador, novaPagina } from '../../navegador/apoio.mjs';
const cap = new URL('../../capturas/todo/', import.meta.url).pathname;
const servidor = await subirServidor(); const nav = await abrirNavegador();
for (const [rot, tela] of [['retrato', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 720 }]]) {
  const { pagina, contexto, problemas } = await novaPagina(nav, tela, { dpr: 2, contexto: rot === 'retrato' ? { hasTouch: true, isMobile: true } : {} });
  await pagina.goto(servidor.url);
  await pagina.waitForFunction(() => window.__bomberolho?.state.tela === 'menu');
  let ok = false;
  for (let s = 1; s < 30 && !ok; s++) {
    await pagina.evaluate((s) => { const b = window.__bomberolho; b.start({ semente: 300 + s, rodadas: 2, dificuldade: 'facil', arena: ['jardim','lago','caverna','vale','consultorio'][s % 5] }); b.demo(true); b.setTimeScale(8); }, s);
    let rodadaCap = false;
    for (let k = 0; k < 400; k++) {
      await pagina.waitForTimeout(250);
      const st = await pagina.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, v: s.vencedor, c: s.partida.campeao, enc: s.partida.encerrada }; });
      if (st.tela === 'intervalo' && st.v === 0 && !rodadaCap) { await pagina.evaluate(() => window.__bomberolho.setTimeScale(0)); await pagina.waitForTimeout(700); await pagina.screenshot({ path: `${cap}vitoria-rodada-${rot}.png` }); rodadaCap = true; await pagina.evaluate(() => window.__bomberolho.setTimeScale(8)); }
      if (st.tela === 'resultado') { if (st.c === 0) { await pagina.waitForTimeout(900); await pagina.screenshot({ path: `${cap}vitoria-taca-${rot}.png` }); ok = true; } break; }
    }
  }
  console.log(rot, ok, problemas);
  await contexto.close();
}
await nav.close(); await servidor.fechar();
