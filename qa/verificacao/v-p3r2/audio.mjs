// Verificador P3R2 (base P3R1, render pela cadeia.js real, 44,1 kHz, detector de estalos): (1) nada de AudioContext antes de gesto; (2) mudo
// persistente; (3) render offline pela cadeia real (efeitos 0,9 / trilha 0,55 /
// mestre 0,8 / compressor) de 90 s de cada trilha + uma rajada de efeitos.
// Uso: cd qa && node verificacao/v-p3r1/audio.mjs
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const servidor = await subirServidor();
const navegador = await abrirNavegador();
const saida = {};
try {
  const contar = () => {
    window.__ctxCriados = 0;
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig { constructor(...a) { super(...a); window.__ctxCriados++; } };
  };
  // 1. Antes do gesto.
  let p = await novaPagina(navegador, TELAS.retrato);
  await p.contexto.addInitScript(contar);
  await p.pagina.goto(servidor.url);
  await esperarJogo(p.pagina);
  await p.pagina.waitForTimeout(1500);
  saida.antesDoGesto = await p.pagina.evaluate(() => ({ criados: window.__ctxCriados, audio: window.__bomberolho.state.audio }));
  await p.pagina.mouse.click(10, 10);
  await p.pagina.waitForTimeout(500);
  saida.depoisDoGesto = await p.pagina.evaluate(() => ({ criados: window.__ctxCriados, audio: window.__bomberolho.state.audio }));
  // mudo
  await p.pagina.click('.tela-inicio .bt-som');
  await p.pagina.waitForTimeout(300);
  saida.aposMudo = await p.pagina.evaluate(() => ({ audio: window.__bomberolho.state.audio, mudo: window.__bomberolho.state.mudo, rotulo: document.querySelector('.tela-inicio .bt-som').getAttribute('aria-label') }));
  await p.pagina.reload();
  await esperarJogo(p.pagina);
  await p.pagina.mouse.click(10, 10);
  await p.pagina.keyboard.press('KeyA');
  await p.pagina.waitForTimeout(400);
  saida.recarregadoMudo = await p.pagina.evaluate(() => ({ criados: window.__ctxCriados, audio: window.__bomberolho.state.audio, mudo: window.__bomberolho.state.mudo }));
  // Começa uma partida mudo: HUD mostra mudo?
  await p.pagina.click('.bt-jogar'); await p.pagina.click('[data-acao="proximo"]'); await p.pagina.click('.bt-comecar');
  await p.pagina.waitForTimeout(300);
  saida.hudMudo = await p.pagina.evaluate(() => document.querySelector('#bt-sair ~ .bt-som').getAttribute('aria-label'));
  // liga de novo no HUD
  await p.pagina.click('#bt-sair ~ .bt-som');
  await p.pagina.waitForTimeout(400);
  saida.religado = await p.pagina.evaluate(() => ({ criados: window.__ctxCriados, audio: window.__bomberolho.state.audio, mudo: window.__bomberolho.state.mudo }));
  saida.problemas1 = p.problemas;
  await p.contexto.close();

  // 3. Render offline pela cadeia real.
  p = await novaPagina(navegador, { width: 400, height: 300 });
  await p.pagina.goto(servidor.url + '?semente=1');
  await esperarJogo(p.pagina);
  saida.render = await p.pagina.evaluate(async () => {
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const { TEMAS, Sequenciador } = await import('./js/audio/musica.js');
    const db = (v) => Math.round(20 * Math.log10(Math.max(v, 1e-9)) * 10) / 10;
    const { criarCadeia } = await import('./js/audio/cadeia.js');
    function cadeia(ctx) { const c = criarCadeia(ctx); return { ef: c.efeitos, tr: c.trilha, ruido: criarRuido(ctx) }; }
    // estalos: amostra isolada > 3x o máximo da vizinhança de ±1 ms (excluindo ±2 amostras)
    function estalos(d, sr) {
      const w = Math.round(sr * 0.001); let n = 0; const ex = [];
      for (let i = w; i < d.length - w; i++) {
        const v = Math.abs(d[i]); if (v < 0.02) continue;
        let m = 0; for (let k = i - w; k <= i + w; k++) if (Math.abs(k - i) > 2) m = Math.max(m, Math.abs(d[k]));
        if (v > 3 * m) { n++; if (ex.length < 3) ex.push([i, +v.toFixed(3), +m.toFixed(3)]); }
      }
      return { n, ex };
    }
    // repetição: correlação do envelope RMS (100 ms) entre o 1º e o 2º minuto
    function medir(d, sr, janela = 0.4) {
      let pico = 0; let soma = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); pico = Math.max(pico, v); soma += v * v; }
      // RMS em janelas de 400 ms: máximo e mediana (≈ volume percebido)
      const n = Math.floor(sr * janela); const js = [];
      for (let i = 0; i + n <= d.length; i += n) { let s = 0; for (let k = i; k < i + n; k++) s += d[k] * d[k]; js.push(Math.sqrt(s / n)); }
      js.sort((a, b) => a - b);
      return { pico: db(pico), rms: db(Math.sqrt(soma / d.length)), janelaMax: db(js[js.length - 1]), janelaMed: db(js[Math.floor(js.length / 2)]) };
    }
    const sr = 44100;
    const trilhas = {};
    for (const nome of Object.keys(TEMAS)) {
      const seg = 90;
      const ctx = new OfflineAudioContext(1, sr * seg, sr);
      const c = cadeia(ctx);
      const seq = new Sequenciador(ctx, c.tr, c.ruido);
      const tema = TEMAS[nome];
      const colcheia = 60 / tema.bpm / 2;
      let p = 0;
      for (; p * colcheia < seg - 1; p++) seq.tocarPasso(tema, p, 0.05 + p * colcheia, colcheia);
      const buf = await ctx.startRendering();
      trilhas[nome] = { ...medir(buf.getChannelData(0), sr), estalos: estalos(buf.getChannelData(0), sr), voltaSeg: Math.round(colcheia * 128 * 10) / 10, frasesDistintas: tema.frases.length };
    }
    // Rajada: partida intensa — música do vale + 1 respingo a cada 0,7 s, cadeia de 4 a cada 5 s, blocos, itens.
    const seg = 30;
    const ctx = new OfflineAudioContext(1, sr * seg, sr);
    const c = cadeia(ctx);
    const seq = new Sequenciador(ctx, c.tr, c.ruido);
    seq.intenso = true;
    const tema = TEMAS.vale; const col = 60 / (tema.bpm * 1.12) / 2;
    for (let p = 0; p * col < seg - 1; p++) seq.tocarPasso(tema, p, 0.05 + p * col, col);
    for (let t = 0.5; t < seg - 1; t += 0.7) { EFEITOS.respingo(ctx, c.ruido, t, c.ef, 1); EFEITOS.bloco(ctx, c.ruido, t + 0.02, c.ef); }
    for (let t = 1; t < seg - 1; t += 5) EFEITOS.respingo(ctx, c.ruido, t, c.ef, 1.3);
    for (let t = 0.3; t < seg - 1; t += 1.1) EFEITOS.gota(ctx, c.ruido, t, c.ef);
    for (let t = 2; t < seg - 1; t += 3) EFEITOS.item(ctx, c.ruido, t, c.ef);
    const dR = (await ctx.startRendering()).getChannelData(0); const rajada = { ...medir(dR, sr), estalos: estalos(dR, sr) };
    // Efeito isolado pela cadeia
    const efeitos = {};
    for (const nome of Object.keys(EFEITOS)) {
      const ctx2 = new OfflineAudioContext(1, sr * 2, sr);
      const c2 = cadeia(ctx2);
      EFEITOS[nome](ctx2, c2.ruido, 0.01, c2.ef, 1);
      const d2 = (await ctx2.startRendering()).getChannelData(0); const m = medir(d2, sr, 0.1);
      efeitos[nome] = { pico: m.pico, janelaMax: m.janelaMax, estalos: estalos(d2, sr).n };
    }
    return { trilhas, rajada, efeitos };
  });
  saida.problemas2 = p.problemas;
  await p.contexto.close();
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(JSON.stringify(saida, null, 1));
