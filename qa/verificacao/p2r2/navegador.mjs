// P2R2 no navegador (sobe o próprio servidor numa porta livre):
//  1. Caverna no Difícil, partida inteira em modo demo, nas 4 telas: ninguém
//     com o centro do corpo na moldura em nenhum momento; captura do aperto.
//  2. Bancada recolhida (M7) em 360×640 e 390×844: quanto cobre da arena.
//  3. Resultado no modo demo não diz "Na próxima é você" (M9).
// Zero erro/aviso de console, zero 404, sem rolagem.
// Uso: node qa/verificacao/p2r2/navegador.mjs
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, TELAS } from '../../navegador/apoio.mjs';

const CAP = new URL('../../capturas/', import.meta.url).pathname;
const servidor = await subirServidor();
const nav = await abrirNavegador();
const saida = { caverna: {}, bancada: {}, problemas: [] };
try {
  for (const [nome, tela] of Object.entries(TELAS)) {
    const { pagina, contexto, problemas } = await novaPagina(nav, tela);
    await pagina.goto(`${servidor.url}?arena=caverna&dificuldade=dificil&demo=1&semente=21&rodadas=1`);
    await esperarJogo(pagina);
    const r = await pagina.evaluate(async () => {
      const b = window.__bomberolho;
      b.setTimeScale(0);
      let naMoldura = 0;
      let amostras = 0;
      let foto = false;
      for (let k = 0; k < 9000 && b.state.tela !== 'resultado'; k++) {
        b.step(1);
        const s = b.state;
        for (const j of s.jogadores) if (j.vivo) { amostras++; if (j.x < 1 || j.x >= 14) naMoldura++; }
        if (!foto && s.aperto && s.aperto.ativo && s.aperto.caidas > 90) { foto = true; break; }
      }
      return { naMoldura, amostras, relogio: b.state.relogio };
    });
    await pagina.waitForTimeout(150);
    await pagina.screenshot({ path: `${CAP}r2-caverna-aperto-${nome}.png` });
    const fim = await pagina.evaluate(() => {
      const b = window.__bomberolho;
      for (let k = 0; k < 400 && b.state.tela !== 'resultado'; k++) b.step(60);
      return { tela: b.state.tela, texto: document.body.innerText };
    });
    await pagina.waitForTimeout(150);
    await pagina.screenshot({ path: `${CAP}r2-resultado-demo-${nome}.png` });
    const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    saida.caverna[nome] = { ...r, fim: fim.tela, naProxima: /Na próxima é você/.test(fim.texto), rola };
    saida.problemas.push(...problemas.map((p) => `${nome}: ${p}`));
    await contexto.close();
  }
  for (const nome of ['pequeno', 'retrato', 'paisagem']) {
    const { pagina, contexto, problemas } = await novaPagina(nav, TELAS[nome], { dpr: 2 });
    await pagina.goto(`${servidor.url}?semente=4&ajuste=1`);
    await pagina.waitForSelector('.bancada input[type=range]');
    await pagina.waitForTimeout(3500);
    const cobre = () => pagina.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const a = r('#arena');
      const p = r('.bancada');
      const sx = Math.max(0, Math.min(a.right, p.right) - Math.max(a.left, p.left));
      const sy = Math.max(0, Math.min(a.bottom, p.bottom) - Math.max(a.top, p.top));
      return { cobre: +((sx * sy) / (a.width * a.height)).toFixed(3), alturaPainel: Math.round(p.height) };
    });
    await pagina.locator('#ajuste-pavio').focus();
    await pagina.keyboard.press('ArrowRight');
    const aberta = await cobre();
    await pagina.click('.bancada .recolher');
    await pagina.waitForTimeout(150);
    const recolhida = await cobre();
    await pagina.screenshot({ path: `${CAP}r2-bancada-recolhida-${nome}.png` });
    await pagina.click('.bancada .recolher');
    await pagina.click('.bancada .copiar');
    const texto = await pagina.inputValue('.bancada .texto');
    saida.bancada[nome] = { aberta, recolhida, texto };
    saida.problemas.push(...problemas.map((p) => `${nome}: ${p}`));
    await contexto.close();
  }
} finally {
  await nav.close();
  await servidor.fechar();
}
console.log(JSON.stringify(saida, null, 1));
