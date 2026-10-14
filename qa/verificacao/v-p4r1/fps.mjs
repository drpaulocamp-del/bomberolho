// Verificador P4R1: fps em outro cenário (Caverna, Médio, semente 5), incluindo
// (O executor usava state.tempoRestante, que não existe: o laço não avançava. Aqui: state.relogio, em segundos.)
// o tempo de adaptação da densidade (sem aquecer), 360×640 e CPU 6×.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const nav = await abrirNavegador();
const casos = [
  ['desktop', { width: 1280, height: 720 }, 1, 1, false],
  ['retrato DPR3 CPU4', { width: 390, height: 844 }, 3, 4, true],
  ['paisagem DPR3 CPU4', { width: 844, height: 390 }, 3, 4, true],
  ['pequeno DPR2 CPU6', { width: 360, height: 640 }, 2, 6, true],
];
const momentos = [['começo', 118], ['meio', 70], ['aperto', 35], ['aperto fim', 14]];
function medir(pg, ms) {
  return pg.evaluate((janela) => new Promise((ok) => {
    const t = []; let a = performance.now(); const fim = a + janela;
    const q = (n) => { t.push(n - a); a = n; if (n < fim) requestAnimationFrame(q); else { const s = t.reduce((x, y) => x + y, 0); t.sort((x, y) => x - y); ok({ fps: Math.round(t.length * 1000 / s), p95: +t[Math.floor(t.length * 0.95)].toFixed(1), max: +t.at(-1).toFixed(0), lentos: +(t.filter((x) => x > 34).length / t.length * 100).toFixed(1), dens: window.__bomberolho.state.densidade }); } };
    requestAnimationFrame(q);
  }), ms);
}
for (const [nome, tela, dpr, cpu, toque] of casos) for (const [mo, rel] of momentos) {
  const { pagina, contexto } = await novaPagina(nav, tela, { dpr, contexto: { hasTouch: toque, isMobile: toque } });
  await pagina.goto(`${servidor.url}?demo=1&semente=5&dificuldade=medio&rodadas=3&arena=caverna`);
  await esperarJogo(pagina);
  await pagina.evaluate((alvo) => { const b = window.__bomberolho; b.setTimeScale(0); while (b.state.tela === 'jogando' && (b.state.relogio > alvo)) b.step(30); b.setTimeScale(1); }, rel);
  if (cpu > 1) await (await contexto.newCDPSession(pagina)).send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const a = await medir(pagina, 1500); // sem aquecer: inclui a adaptação
  const b = await medir(pagina, 5000);
  const st = await pagina.evaluate(() => ({ tela: window.__bomberolho.state.tela, vivos: window.__bomberolho.state.jogadores.filter((j) => j.vivo).length, aperto: window.__bomberolho.state.aperto?.ativo }));
  console.log(nome, mo, 'primeiros 1,5 s', JSON.stringify(a), '| 5 s', JSON.stringify(b), JSON.stringify(st));
  await contexto.close();
}
await nav.close(); await servidor.fechar();
