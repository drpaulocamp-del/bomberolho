// Verificador TODO R1: segue o README da etapa 2 — pasta copiada para um "site"
// servido por outro servidor (python http.server), em subcaminho e na raiz.
import { abrirNavegador, novaPagina } from '../../navegador/apoio.mjs';
const nav = await abrirNavegador();
const cap = new URL('../../capturas/todo/', import.meta.url).pathname;
for (const [rot, url] of [['raiz', 'http://127.0.0.1:7251/bomberolho/'], ['subpasta', 'http://127.0.0.1:7251/jogos/bomberolho/'], ['link', 'http://127.0.0.1:7251/']]) {
  const { pagina, contexto, problemas } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  const reqs = []; pagina.on('request', (r) => reqs.push(r.url()));
  await pagina.goto(url);
  if (rot === 'link') { await pagina.tap('a'); }
  await pagina.waitForFunction(() => window.__bomberolho?.state.tela === 'menu', null, { timeout: 15000 });
  await pagina.tap('.bt-jogar'); await pagina.waitForTimeout(400);
  await pagina.tap('.tela-personagem [data-acao="proximo"]'); await pagina.waitForTimeout(400);
  await pagina.tap('.bt-comecar');
  await pagina.waitForFunction(() => window.__bomberolho.state.tela === 'jogando' && window.__bomberolho.state.contagem === 0, null, { timeout: 15000 });
  await pagina.waitForTimeout(2000);
  await pagina.screenshot({ path: `${cap}integracao-${rot}.png` });
  // Sair → Menu → voltar do navegador
  await pagina.tap('#bt-sair'); await pagina.waitForTimeout(400);
  const txt = await pagina.$eval('#aviso h2', (e) => e.textContent);
  const externos = reqs.filter((u) => !u.startsWith('http://127.0.0.1:7251/'));
  const bytes = await pagina.evaluate(() => performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0));
  console.log(rot, JSON.stringify({ url: pagina.url(), dialogoSair: txt, n: reqs.length, externos, bytes, problemas }));
  await contexto.close();
}
await nav.close();
