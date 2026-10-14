// Mede o som sem alto-falante: renderiza cada efeito e 16 s de cada trilha num
// OfflineAudioContext e informa pico e volume médio (RMS) em dBFS.
// Uso: cd qa && node ferramentas/medir-som.mjs
import { subirServidor, abrirNavegador, novaPagina } from '../navegador/apoio.mjs';
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina, problemas } = await novaPagina(navegador, { width: 400, height: 300 });
  await pagina.goto(servidor.url + '?semente=1');
  const r = await pagina.evaluate(async () => {
    const { EFEITOS, criarRuido } = await import('./js/audio/sintese.js');
    const { TEMAS, Sequenciador } = await import('./js/audio/musica.js');
    const db = (v) => Math.round(20 * Math.log10(Math.max(v, 1e-9)) * 10) / 10;
    async function medir(seg, montar) {
      const ctx = new OfflineAudioContext(1, 44100 * seg, 44100);
      const saida = ctx.createGain();
      saida.connect(ctx.destination);
      montar(ctx, saida, criarRuido(ctx));
      const buf = await ctx.startRendering();
      const d = buf.getChannelData(0);
      let pico = 0; let soma = 0; let n = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); pico = Math.max(pico, v); soma += v * v; if (v > 1e-4) n++; }
      return { pico: db(pico), rms: db(Math.sqrt(soma / Math.max(1, n))), duracao: Math.round((n / 44100) * 100) / 100 };
    }
    const efeitos = {};
    for (const nome of Object.keys(EFEITOS)) efeitos[nome] = await medir(2, (c, s, rr) => EFEITOS[nome](c, rr, 0.01, s, 1));
    const trilhas = {};
    for (const nome of Object.keys(TEMAS)) {
      trilhas[nome] = await medir(16, (c, s, rr) => {
        const seq = new Sequenciador(c, s, rr);
        const tema = TEMAS[nome];
        const colcheia = 60 / tema.bpm / 2;
        for (let p = 0; p * colcheia < 15.5; p++) seq.tocarPasso(tema, p, 0.05 + p * colcheia, colcheia);
      });
    }
    return { efeitos, trilhas };
  });
  console.log(JSON.stringify(r, null, 1));
  if (problemas.length) console.error(problemas);
} finally {
  await navegador.close();
  await servidor.fechar();
}
