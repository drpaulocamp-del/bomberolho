// Mede a extensão real do desenho de cada personagem (acessório incluído),
// em frações da casa s, relativa ao centro y passado a desenharPersonagem.
// Uso: cd qa && node verificacao/p3r2/extensao.mjs
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  const { pagina } = await novaPagina(navegador, { width: 400, height: 300 });
  await pagina.goto(servidor.url + '?semente=1');
  await esperarJogo(pagina);
  const r = await pagina.evaluate(async () => {
    const { PERSONAGENS, ORDEM_PERSONAGENS } = await import('./js/dados/personagens.js');
    const { desenharPersonagem } = await import('./js/render/personagens.js');
    const out = {};
    for (const id of ORDEM_PERSONAGENS) {
      let topo = 9; let base = -9; let esq = 9; let dir = -9;
      for (const o of [{}, { bracos: 'cima', expressao: 'alegre' }, { bracos: 'aceno' }, { expressao: 'sono' }]) {
        for (let f = 0; f < 6.3; f += 0.35) {
          const c = new OffscreenCanvas(400, 400); const ctx = c.getContext('2d');
          desenharPersonagem(ctx, PERSONAGENS[id], { x: 200, y: 200, s: 100, dir: 'baixo', fase: f, ...o });
          const d = ctx.getImageData(0, 0, 400, 400).data;
          for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) if (d[(y * 400 + x) * 4 + 3] > 20) {
            topo = Math.min(topo, (y - 200) / 100); base = Math.max(base, (y - 200) / 100);
            esq = Math.min(esq, (x - 200) / 100); dir = Math.max(dir, (x - 200) / 100);
          }
        }
      }
      out[id] = { topo, base, esq, dir };
    }
    return out;
  });
  console.table(r);
} finally { await navegador.close(); await servidor.fechar(); }
