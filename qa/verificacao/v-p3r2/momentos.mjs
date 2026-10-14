// Verificador P3R2 (base no script P3R1, prévia no começo da janela): momentos de jogo (respingo, perigo, encharcar, descanso,
// intervalo, empate, aperto) em várias arenas/personagens, filtros de
// daltonismo e reduzir-movimento. Uso: cd qa && node verificacao/v-p3r1/momentos.mjs
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const PASTA = fileURLToPath(new URL('../../capturas/v-p3r2/', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const servidor = await subirServidor();
const navegador = await abrirNavegador();
const problemas = [];
const notas = [];

const FILTROS = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">
 <filter id="deut"><feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0"/></filter>
 <filter id="prot"><feColorMatrix type="matrix" values="0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0"/></filter>
 <filter id="trit"><feColorMatrix type="matrix" values="1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0"/></filter>
</svg>`;

async function abrir(tela, busca, extras = {}) {
  const p = await novaPagina(navegador, tela, { dpr: 2, ...extras });
  await p.pagina.goto(`${servidor.url}${busca}`);
  await esperarJogo(p.pagina);
  await p.pagina.evaluate(() => window.__bomberolho.setTimeScale(0));
  return p;
}
const ate = (pg, cond, max = 3000, passo = 5) => pg.evaluate(([c, m, k]) => {
  const b = window.__bomberolho;
  const f = new Function('s', `return ${c};`);
  for (let i = 0; i < m && !f(b.state); i++) b.step(k);
  return { tick: b.state.tick, tela: b.state.tela };
}, [cond, max, passo]);
const foto = (p, nome) => p.pagina.screenshot({ path: `${PASTA}${nome}.png` });

try {
  // 1. Respingo, perigo, encharcar e descanso, por arena e personagem.
  const combos = [['jardim', 'macula', 'retrato'], ['lago', 'cornea', 'desktop'], ['caverna', 'lente', 'pequeno'], ['vale', 'cilio', 'paisagem'], ['consultorio', 'pupilo', 'retrato']];
  for (const [arena, per, tela] of combos) {
    const p = await abrir(TELAS[tela], `?semente=5&arena=${arena}&personagem=${per}&dificuldade=dificil&demo=1`);
    await ate(p.pagina, "s.tela === 'jogando' && s.tick > 300");
    await ate(p.pagina, 's.gotas.some((g) => g.pavio < 110 && g.pavio > 95)', 3000, 1);
    await foto(p, `m-${arena}-${tela}-perigo`);
    await ate(p.pagina, 's.respingos.length > 0', 600, 1);
    await p.pagina.evaluate(() => window.__bomberolho.step(4));
    await foto(p, `m-${arena}-${tela}-respingo`);
    // alguém encharcado
    const r = await ate(p.pagina, 's.jogadores.some((j) => !j.vivo)', 6000, 2);
    await p.pagina.evaluate(() => window.__bomberolho.step(10));
    await foto(p, `m-${arena}-${tela}-encharcado`);
    await p.pagina.evaluate(() => window.__bomberolho.step(50));
    await foto(p, `m-${arena}-${tela}-descanso`);
    notas.push({ arena, per, tela, r });
    // intervalo
    await ate(p.pagina, "s.tela !== 'jogando'", 9000, 10);
    await p.pagina.evaluate(() => window.__bomberolho.step(30));
    await p.pagina.waitForTimeout(300);
    await foto(p, `m-${arena}-${tela}-intervalo`);
    problemas.push(...p.problemas.map((x) => `[${arena}] ${x}`));
    await p.contexto.close();
  }

  // 2. Humano encharcado (sem demo): faixa "Você foi descansar!".
  {
    const p = await abrir(TELAS.retrato, '?semente=7&personagem=retina');
    await p.pagina.evaluate(() => {
      const b = window.__bomberolho; b.start({ semente: 7, contagem: false }); b.setTimeScale(0);
      for (const id of [1, 2, 3]) b.input(id, {});
      b.input(0, { bomba: true }); b.step(1); b.input(0, {}); b.step(175);
    });
    await foto(p, 'm-humano-molhado');
    await p.pagina.evaluate(() => window.__bomberolho.step(60));
    await p.pagina.waitForTimeout(200);
    await foto(p, 'm-humano-faixa');
    problemas.push(...p.problemas);
    await p.contexto.close();
  }

  // 3. Aperto final e empate.
  {
    const p = await abrir(TELAS.desktop, '?semente=9&arena=vale&demo=1&dificuldade=facil');
    await ate(p.pagina, 's.aperto.ativo && s.aperto.caidas > 30', 12000, 10);
    await foto(p, 'm-aperto');
    problemas.push(...p.problemas);
    await p.contexto.close();
  }

  // 4. Daltonismo: mesmo quadro com filtros.
  for (const [arena, tela] of [['jardim', 'desktop'], ['vale', 'retrato'], ['consultorio', 'pequeno']]) {
    const p = await abrir(TELAS[tela], `?semente=8&arena=${arena}&dificuldade=dificil&demo=1`);
    await ate(p.pagina, 's.tick > 900 && s.gotas.some((g) => g.pavio < 40) && s.respingos.length > 0', 3000, 1);
    await p.pagina.evaluate((svg) => document.body.insertAdjacentHTML('beforeend', svg), FILTROS);
    for (const f of ['nenhum', 'deut', 'prot', 'trit', 'cinza']) {
      await p.pagina.evaluate((f) => {
        document.documentElement.style.filter = f === 'nenhum' ? '' : f === 'cinza' ? 'grayscale(1)' : `url(#${f})`;
      }, f);
      await foto(p, `d-${arena}-${tela}-${f}`);
    }
    await p.contexto.close();
  }

  // 5. Reduzir movimento: menu + respingo.
  {
    const p = await novaPagina(navegador, TELAS.retrato, { dpr: 2, contexto: { reducedMotion: 'reduce' } });
    await p.pagina.goto(servidor.url);
    await esperarJogo(p.pagina);
    await p.pagina.waitForTimeout(800);
    await foto(p, 'r-menu-1');
    await p.pagina.waitForTimeout(700);
    await foto(p, 'r-menu-2');
    problemas.push(...p.problemas);
    await p.contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(JSON.stringify(notas));
console.log(problemas.length ? problemas.join('\n') : 'sem erros, avisos ou 404');
