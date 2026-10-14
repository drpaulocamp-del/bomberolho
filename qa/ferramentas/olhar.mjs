// Abre o jogo numa tela, roda um roteiro opcional (JS no navegador) e tira foto.
// node ferramentas/olhar.mjs "<busca>" <saida.png> <largura> <altura> ["roteiro js"] [espera ms]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../navegador/apoio.mjs';
const [busca, saida, w = '1280', h = '720', roteiro = '', espera = '600'] = process.argv.slice(2);
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, problemas } = await novaPagina(navegador, { width: +w, height: +h }, { dpr: 2 });
  await pagina.goto(servidor.url + busca);
  await esperarJogo(pagina);
  if (roteiro) await pagina.evaluate(roteiro);
  await pagina.waitForTimeout(+espera);
  await pagina.screenshot({ path: saida });
  console.log(JSON.stringify(await pagina.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, menu: s.menu, audio: s.audio }; })));
  if (problemas.length) console.error(problemas.join('\n'));
} finally {
  await navegador.close();
  await servidor.fechar();
}
