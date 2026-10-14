// Mede o som sem alto-falante, PELA CADEIA REAL do jogo (js/audio/cadeia.js:
// ganhos, compressor, compensação e limitador): renderiza num
// OfflineAudioContext cada efeito, 90 s de cada trilha e 30 s de uma partida
// intensa, e informa pico (dBFS) e sonoridade (LUFS, ponderação K da
// ITU-R BS.1770: integrada com portas, e máxima momentânea em 400 ms).
// Uso: cd qa && node ferramentas/medir-som.mjs [--json] [--so-efeitos]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../navegador/apoio.mjs';

const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, problemas } = await novaPagina(navegador, { width: 400, height: 300 });
  await pagina.goto(servidor.url + '?semente=1');
  await esperarJogo(pagina);
  const soEfeitos = process.argv.includes('--so-efeitos');
  const r = await pagina.evaluate(async (soEfeitos) => {
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const { TEMAS, Sequenciador } = await import('./js/audio/musica.js');
    const { criarCadeia } = await import('./js/audio/cadeia.js');
    const SR = 48000;
    const db = (v) => Math.round(20 * Math.log10(Math.max(v, 1e-9)) * 10) / 10;

    // Ponderação K (BS.1770, coeficientes para 48 kHz): prateleira + passa-altas.
    function ponderarK(x) {
      const etapa = (entrada, b, a) => {
        const y = new Float32Array(entrada.length);
        let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
        for (let i = 0; i < entrada.length; i++) {
          const v = b[0] * entrada[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
          x2 = x1; x1 = entrada[i]; y2 = y1; y1 = v; y[i] = v;
        }
        return y;
      };
      const s1 = etapa(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
      return etapa(s1, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
    }
    function sonoridade(d) {
      const k = ponderarK(d);
      const bloco = Math.floor(SR * 0.4);
      const passo = Math.floor(bloco / 4);
      const blocos = [];
      for (let i = 0; i + bloco <= k.length; i += passo) {
        let s = 0;
        for (let j = i; j < i + bloco; j++) s += k[j] * k[j];
        blocos.push(s / bloco);
      }
      const lufs = (m) => -0.691 + 10 * Math.log10(Math.max(m, 1e-12));
      const absolutos = blocos.filter((m) => lufs(m) > -70);
      const media = (l) => l.reduce((a, b) => a + b, 0) / Math.max(1, l.length);
      const relativa = lufs(media(absolutos)) - 10;
      const integrada = lufs(media(absolutos.filter((m) => lufs(m) > relativa)));
      let pico = 0;
      for (const v of d) pico = Math.max(pico, Math.abs(v));
      return {
        pico: db(pico),
        lufs: absolutos.length ? Math.round(integrada * 10) / 10 : null,
        momentaneaMax: blocos.length ? Math.round(lufs(Math.max(...blocos)) * 10) / 10 : null,
      };
    }
    async function render(seg, montar) {
      const ctx = new OfflineAudioContext(1, Math.round(SR * seg), SR);
      const cadeia = criarCadeia(ctx);
      montar(ctx, cadeia, criarRuido(ctx));
      return (await ctx.startRendering()).getChannelData(0);
    }
    function tocarTrilha(ctx, cadeia, ruido, nome, seg, intenso = false) {
      const seq = new Sequenciador(ctx, cadeia.trilha, ruido);
      seq.intenso = intenso;
      const tema = TEMAS[nome];
      const colcheia = 60 / (tema.bpm * (intenso ? 1.12 : 1)) / 2;
      for (let p = 0; p * colcheia < seg - 1; p++) seq.tocarPasso(tema, p, 0.05 + p * colcheia, colcheia);
      return colcheia;
    }

    const efeitos = {};
    for (const nome of Object.keys(EFEITOS)) {
      efeitos[nome] = sonoridade(await render(2, (c, cad, rr) => EFEITOS[nome](c, rr, 0.01, cad.efeitos, 1)));
    }
    if (soEfeitos) return { efeitos };
    const trilhas = {};
    for (const nome of Object.keys(TEMAS)) {
      let colcheia = 0;
      const d = await render(90, (c, cad, rr) => { colcheia = tocarTrilha(c, cad, rr, nome, 90); });
      // Ciclo completo: 8 voltas de 32 colcheias.
      trilhas[nome] = { ...sonoridade(d), cicloSeg: Math.round(colcheia * 32 * 8 * 10) / 10, frases: TEMAS[nome].frases.length };
    }
    // Partida intensa: trilha do aperto + respingo a cada 0,7 s, cadeia a cada 5 s, gotas, blocos e itens.
    const partida = sonoridade(await render(30, (c, cad, rr) => {
      tocarTrilha(c, cad, rr, 'vale', 30, true);
      for (let t = 0.5; t < 29; t += 0.7) { EFEITOS.respingo(c, rr, t, cad.efeitos, 1); EFEITOS.bloco(c, rr, t + 0.02, cad.efeitos); }
      for (let t = 1; t < 29; t += 5) EFEITOS.respingo(c, rr, t, cad.efeitos, 1.3);
      for (let t = 0.3; t < 29; t += 1.1) EFEITOS.gota(c, rr, t, cad.efeitos);
      for (let t = 2; t < 29; t += 3) EFEITOS.item(c, rr, t, cad.efeitos);
    }));
    // Partida calma: trilha normal + uma gota e um respingo a cada 4 s.
    const calma = sonoridade(await render(30, (c, cad, rr) => {
      tocarTrilha(c, cad, rr, 'jardim', 30);
      for (let t = 1; t < 29; t += 4) { EFEITOS.gota(c, rr, t, cad.efeitos); EFEITOS.respingo(c, rr, t + 2.5, cad.efeitos, 1); }
    }));
    return { efeitos, trilhas, partida, calma };
  }, soEfeitos);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log('Efeitos (pela cadeia real):');
    console.table(r.efeitos);
    if (!soEfeitos) {
      console.log('Trilhas (90 s, pela cadeia real):');
      console.table(r.trilhas);
      console.log('Partida intensa (30 s):', r.partida);
      console.log('Partida calma (30 s):', r.calma);
    }
  }
  if (problemas.length) console.error(problemas);
} finally {
  await navegador.close();
  await servidor.fechar();
}
