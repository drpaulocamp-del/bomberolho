// Perfil de CPU (CDP) de uma partida em demo (semente 11, Difícil, Jardim — o
// cenário do parecer da parte 3): lista as funções que mais gastam, e por pasta.
// Uso: node qa/verificacao/p4r1/perfil.mjs <rótulo> [desktop|celular] [tick]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const momento = process.argv[2] || 'aperto';
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, contexto } = await novaPagina(navegador, process.argv[3]==='desktop'?{ width: 1280, height: 720 }:{ width: 390, height: 844 }, { dpr: process.argv[3]==='desktop'?1:3 });
  const cdp = await contexto.newCDPSession(pagina);
  await pagina.goto(`${servidor.url}?demo=1&semente=11&dificuldade=dificil&arena=jardim`);
  await esperarJogo(pagina);
  await pagina.evaluate((m) => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    const alvo = m;
    for (let i = 0; i < alvo; i += 10) b.step(10);
    b.setTimeScale(1);
  }, Number(process.argv[4] || (momento === 'aperto' ? 5600 : 3000)));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: process.argv[3]==='desktop'?1:4 });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const fps = await pagina.evaluate(() => new Promise((ok) => {
    let n = 0; const t0 = performance.now();
    function q(t) { n++; if (t - t0 < 5000) requestAnimationFrame(q); else ok(Math.round(n * 1000 / (t - t0))); }
    requestAnimationFrame(q);
  }));
  const { profile } = await cdp.send('Profiler.stop');
  const total = profile.samples.length;
  const self = new Map();
  const porId = new Map(profile.nodes.map((n) => [n.id, n]));
  const contagem = new Map();
  for (const s of profile.samples) contagem.set(s, (contagem.get(s) || 0) + 1);
  for (const [id, c] of contagem) {
    const n = porId.get(id);
    const f = n.callFrame;
    const nome = `${f.functionName || '(anônima)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
    self.set(nome, (self.get(nome) || 0) + c);
  }
  console.log(`${momento}: ${fps} fps; ${total} amostras`);
  [...self].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([n, c]) => console.log(`${(100 * c / total).toFixed(1).padStart(5)}%  ${n}`));
  // Por pasta (só o que é JavaScript do jogo ou chamada nativa de canvas).
  const pasta = new Map();
  for (const [n, c] of self) {
    const m = n.match(/ (\w+)\/[\w.]+:\d+$/);
    const k = n.startsWith('(') ? n.split(' ')[0] : m ? m[1] : 'nativo';
    pasta.set(k, (pasta.get(k) || 0) + c);
  }
  console.log([...pasta].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${(100 * c / total).toFixed(1)}%`).join(' · '));
  await contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}
