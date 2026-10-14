// Captura uma página do repositório: node ferramentas/foto.mjs <caminho> <saida.png> [largura] [altura] [dpr]
import { subirServidor, abrirNavegador, novaPagina } from '../navegador/apoio.mjs';
const [caminho, saida, w = '1280', h = '720', dpr = '1'] = process.argv.slice(2);
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, problemas } = await novaPagina(navegador, { width: +w, height: +h }, { dpr: +dpr });
  await pagina.goto(servidor.url.replace('/bomberolho/', '/') + caminho);
  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: saida, fullPage: true });
  if (problemas.length) console.error(problemas.join('\n'));
} finally {
  await navegador.close();
  await servidor.fechar();
}
