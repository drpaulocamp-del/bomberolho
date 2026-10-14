// Verificador P4R2: uma sequência de toques reproduz o trajeto esperado?
// Procura uma semente cujo canto de largada tenha um caminho com várias
// curvas, planeja o trajeto pela grade e o executa em TEMPO REAL com dedos
// emulados (CDP touch), de dois jeitos: "rolando" o polegar sem tirar da tela
// (virada) e "levantando" o dedo a cada trecho. Compara casa a casa.
// Uso: cd qa && node verificacao/v-p4r2/trajeto.mjs [filtro-de-tela]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';

const filtro = process.argv[2];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const TELAS = [[390, 844], [844, 390], [740, 360], [915, 412], [360, 640], [1024, 768], [1280, 800], [768, 1024]];
const V = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
const servidor = await subirServidor();
const nav = await abrirNavegador();

// Semente com o caminho mais "curvo" a partir de (1,1) — calculado no navegador.
async function escolherSemente(pagina) {
  return pagina.evaluate(() => {
    const b = window.__bomberolho;
    let melhor = null;
    for (let s = 1; s <= 400; s++) {
      const st = b.start({ semente: s, arena: 'jardim', contagem: false });
      const g = st.grade;
      const livre = (c, l) => g[l] && (g[l][c] === '.' || /[gavcszpne]/.test(g[l][c]));
      // busca em profundidade por caminhos simples de até 9 casas
      const melhorAqui = { curvas: -1, cam: null };
      const dfs = (cam, vis) => {
        const [c, l] = cam.at(-1);
        let curvas = 0;
        for (let k = 2; k < cam.length; k++) {
          const d1 = [cam[k - 1][0] - cam[k - 2][0], cam[k - 1][1] - cam[k - 2][1]];
          const d2 = [cam[k][0] - cam[k - 1][0], cam[k][1] - cam[k - 1][1]];
          if (d1[0] !== d2[0] || d1[1] !== d2[1]) curvas++;
        }
        const nota = curvas * 10 + cam.length;
        if (nota > melhorAqui.curvas) { melhorAqui.curvas = nota; melhorAqui.cam = cam.slice(); melhorAqui.n = curvas; }
        if (cam.length >= 12) return;
        for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c + dc},${l + dl}`;
          if (!vis.has(k) && livre(c + dc, l + dl)) { vis.add(k); cam.push([c + dc, l + dl]); dfs(cam, vis); cam.pop(); vis.delete(k); }
        }
      };
      dfs([[1, 1]], new Set(['1,1']));
      if (!melhor || melhorAqui.curvas > melhor.nota) melhor = { semente: s, nota: melhorAqui.curvas, curvas: melhorAqui.n, cam: melhorAqui.cam };
      if (melhorAqui.n >= 4 && melhorAqui.cam.length >= 8) break;
    }
    return melhor;
  });
}

function trechos(cam) {
  const out = [];
  for (let k = 1; k < cam.length; k++) {
    const d = Object.entries(V).find(([, v]) => v[0] === cam[k][0] - cam[k - 1][0] && v[1] === cam[k][1] - cam[k - 1][1])[0];
    if (out.length && out.at(-1).dir === d) out.at(-1).ate = cam[k];
    else out.push({ dir: d, ate: cam[k] });
  }
  return out;
}

async function executar(p, cam, modo, ancora) {
  const { pagina, cdp } = p;
  const eu = () => pagina.evaluate(() => { const j = window.__bomberolho.state.jogadores[0]; return [j.x, j.y, j.vivo]; });
  const plano = trechos(cam);
  const ini = await eu();
  const visitadas = [`${Math.floor(ini[0])},${Math.floor(ini[1])}`];
  let desvio = 0; // maior distância do centro da casa no eixo perpendicular
  let dedoXY = [...ancora];
  const t0 = Date.now();
  let falhou = null;
  let tremor = 1;
  for (let i = 0; i < plano.length; i++) {
    const { dir, ate } = plano[i];
    const v = V[dir];
    if (modo === 'levanta' || i === 0) {
      if (i > 0) { await dedo(cdp, 'touchEnd', []); await espera(40); }
      dedoXY = [...ancora];
      await dedo(cdp, 'touchStart', [dedoXY]);
      for (let k = 1; k <= 4; k++) await dedo(cdp, 'touchMove', [[ancora[0] + v[0] * 12 * k, ancora[1] + v[1] * 12 * k]]);
      dedoXY = [ancora[0] + v[0] * 48, ancora[1] + v[1] * 48];
    } else {
      // rola o polegar: escorrega para o lado novo e recua um pouco no eixo velho (arco)
      const vel = V[plano[i - 1].dir];
      for (let k = 1; k <= 5; k++) {
        dedoXY = [dedoXY[0] + v[0] * 8 - vel[0] * 5, dedoXY[1] + v[1] * 8 - vel[1] * 5];
        await dedo(cdp, 'touchMove', [dedoXY]);
        await espera(8);
      }
    }
    const lim = Date.now() + 4000;
    // anda até o centro da casa de virada (ou do fim)
    for (;;) {
      const [x, y, vivo] = await eu();
      const c = `${Math.floor(x)},${Math.floor(y)}`;
      if (visitadas.at(-1) !== c) visitadas.push(c);
      const perp = v[0] ? Math.abs(y - (Math.floor(y) + 0.5)) : Math.abs(x - (Math.floor(x) + 0.5));
      desvio = Math.max(desvio, perp);
      const falta = v[0] ? (ate[0] + 0.5 - x) * v[0] : (ate[1] + 0.5 - y) * v[1];
      if (!vivo) { falhou = 'morreu'; break; }
      if (falta < 0.12) break;
      if (Date.now() > lim) { falhou = `parou em ${x},${y} rumo ${dir}`; break; }
      // tremor de 1 px como polegar de verdade
      { const A = Number(process.env.TREMOR || 1); tremor = -tremor || A; await dedo(cdp, 'touchMove', [[dedoXY[0] + (v[1] ? tremor : 0), dedoXY[1] + (v[0] ? tremor : 0)]]); if (A > 1) await espera(30); }
    }
    if (falhou) break;
  }
  await dedo(cdp, 'touchEnd', []);
  await espera(250);
  const fim = await eu();
  const esperado = cam.map((c) => c.join(','));
  return { modo, ok: !falhou && JSON.stringify(visitadas) === JSON.stringify(esperado), falhou, visitadas: visitadas.join(' > '), esperado: esperado.join(' > '), ms: Date.now() - t0, desvioMax: +desvio.toFixed(2), fim: [fim[0], fim[1]] };
}

for (const [w, h] of TELAS) {
  const id = `${w}x${h}`;
  if (filtro && !id.includes(filtro)) continue;
  const p = await novaPagina(nav, { width: w, height: h }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  p.cdp = await p.contexto.newCDPSession(p.pagina);
  await p.pagina.goto(servidor.url + '?semente=1&arena=jardim');
  await esperarJogo(p.pagina);
  const esc = await escolherSemente(p.pagina);
  const geo = await p.pagina.evaluate(() => ({ a: document.getElementById('arena').getBoundingClientRect().toJSON() }));
  // âncora do polegar: metade esquerda, fora dos botões (em pé: faixa de baixo; deitado: meio da altura)
  const ancora = h > w ? [Math.round(w * 0.25), Math.round(h - 110)] : [Math.round(w * 0.12), Math.round(h * 0.7)];
  const r = { semente: esc.semente, curvas: esc.curvas, ancora };
  for (const modo of ['rola', 'levanta']) {
    await p.pagina.evaluate((s) => { const b = window.__bomberolho; b.start({ semente: s, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) b.input(i, {}); }, esc.semente);
    await espera(300);
    r[modo] = await executar(p, esc.cam, modo, ancora);
  }
  r.problemas = p.problemas;
  console.log(id, JSON.stringify(r));
  await p.contexto.close();
}
await nav.close();
await servidor.fechar();
