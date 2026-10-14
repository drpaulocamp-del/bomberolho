// Verificador P4R2: segue o README (etapa 2) — pasta copiada para um "site"
// servido por python3 -m http.server, em /bomberolho/ e em /jogos/bomberolho/;
// entra pelo link da página do site e joga o fluxo Jogar → Próximo → Começar!.
// Uso: node verificacao/v-p4r2/integracao.mjs http://127.0.0.1:7238
import { abrirNavegador, novaPagina } from '../../navegador/apoio.mjs';
const base = process.argv[2];
const nav = await abrirNavegador();
for (const [rot, inicio, toque] of [['raiz via link', '/', true], ['subpasta', '/jogos/bomberolho/', false], ['sem barra final', '/jogos/bomberolho', false]]) {
  const { pagina, contexto, problemas } = await novaPagina(nav, toque ? { width: 390, height: 844 } : { width: 1280, height: 720 }, { dpr: 2, contexto: toque ? { hasTouch: true, isMobile: true } : {} });
  const urls = [];
  pagina.on('request', (r) => urls.push(r.url()));
  await pagina.goto(base + inicio);
  if (inicio === '/') await pagina.locator('a.botao').click();
  await pagina.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando', null, { timeout: 8000 }).catch((e) => problemas.push('não carregou: ' + e.message.slice(0, 60)));
  const ok = !!(await pagina.evaluate(() => !!window.__bomberolho));
  if (ok) {
    await pagina.locator('[data-acao="escolher"]').click();
    await pagina.locator('[data-acao="proximo"]').click();
    await pagina.locator('[data-acao="comecar"]').click();
    await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'jogando' && window.__bomberolho.state.contagem === 0, null, { timeout: 9000 });
  }
  await pagina.screenshot({ path: new URL(`../../capturas/v-p4r2/integracao-${rot.replace(/ /g, '-')}.png`, import.meta.url).pathname });
  const fora = urls.filter((u) => !u.startsWith(base));
  console.log(rot, pagina.url(), { carregou: ok, tela: ok && (await pagina.evaluate(() => window.__bomberolho.state.tela)), pedidos: urls.length, externos: fora, problemas });
  await contexto.close();
}
await nav.close();
