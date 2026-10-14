// Verificador P4R1: bytes baixados na primeira carga (menu e jogo direto), pedidos externos.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
for (const busca of ['', '?semente=3', '?ajuste=1&semente=3']) {
  const { pagina, contexto } = await novaPagina(nav, { width: 390, height: 844 }, { dpr: 3, contexto: { hasTouch: true, isMobile: true } });
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send('Network.enable');
  let bytes = 0; const urls = new Set(); const externos = [];
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  cdp.on('Network.requestWillBeSent', (e) => { urls.add(e.request.url); if (!e.request.url.startsWith(servidor.url.replace('/bomberolho/', ''))) externos.push(e.request.url); });
  await pagina.goto(servidor.url + busca);
  await esperarJogo(pagina);
  await pagina.waitForTimeout(3000);
  console.log(busca || '(menu)', `${(bytes / 1024).toFixed(1)} kB`, `${urls.size} pedidos`, 'externos:', externos);
  await contexto.close();
}
await nav.close(); await servidor.fechar();
