import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const s = await subirServidor(); const n = await abrirNavegador();
try {
  const { pagina } = await novaPagina(n, { width: 400, height: 300 });
  await pagina.goto(s.url + '?semente=1'); await esperarJogo(pagina);
  console.log(JSON.stringify(await pagina.evaluate(async () => {
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const out = {};
    for (const comp of [false, true]) for (const sr of [22050, 44100]) {
      const ctx = new OfflineAudioContext(1, sr * 2, sr);
      const m = ctx.createGain(); m.gain.value = 0.72;
      if (comp) { const c = ctx.createDynamicsCompressor(); c.threshold.value = -18; c.ratio.value = 4; m.connect(c).connect(ctx.destination); } else m.connect(ctx.destination);
      for (const e of ['gota', 'respingo']) {}
      EFEITOS.respingo(ctx, criarRuido(ctx), 0.01, m, 1);
      const d = (await ctx.startRendering()).getChannelData(0); let p = 0; for (const v of d) p = Math.max(p, Math.abs(v));
      out[`comp${comp}_${sr}`] = Math.round(20 * Math.log10(p) * 10) / 10;
    }
    return out;
  })));
} finally { await n.close(); await s.fechar(); }
