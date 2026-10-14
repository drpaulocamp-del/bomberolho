// Controle do detector de estalos: reproduz o defeito antigo (ganho criado em 1)
// anulando a atribuição gain.value = 0 e conta estalos na trilha e no respingo.
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const p = await novaPagina(navegador, { width: 400, height: 300 });
  await p.pagina.goto(servidor.url);
  await esperarJogo(p.pagina);
  console.log(JSON.stringify(await p.pagina.evaluate(async () => {
    const desc = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    Object.defineProperty(AudioParam.prototype, 'value', { get: desc.get, set(v) { if (v !== 0) desc.set.call(this, v); }, configurable: true });
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const { TEMAS, Sequenciador } = await import('./js/audio/musica.js');
    const { criarCadeia } = await import('./js/audio/cadeia.js');
    const sr = 44100;
    function estalos(d) { const w = 44; let n = 0; for (let i = w; i < d.length - w; i++) { const v = Math.abs(d[i]); if (v < 0.02) continue; let m = 0; for (let k = i - w; k <= i + w; k++) if (Math.abs(k - i) > 2) m = Math.max(m, Math.abs(d[k])); if (v > 3 * m) n++; } return n; }
    const ctx = new OfflineAudioContext(1, sr * 20, sr);
    const c = criarCadeia(ctx); const r = criarRuido(ctx);
    const seq = new Sequenciador(ctx, c.trilha, r); const tema = TEMAS.menu; const col = 60 / tema.bpm / 2;
    for (let q = 0; q * col < 19; q++) seq.tocarPasso(tema, q, 0.05 + q * col, col);
    for (let t = 0.5; t < 19; t += 2.3) EFEITOS.respingo(ctx, r, t, c.efeitos, 1);
    return { estalosComDefeito: estalos((await ctx.startRendering()).getChannelData(0)) };
  })));
  await p.contexto.close();
} finally { await navegador.close(); await servidor.fechar(); }
