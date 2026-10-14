// Verificador P4R2: gestos de toque em tempo real (CDP touch) — zona morta,
// bordas da tela, diagonal, virada rolando o polegar, viradas indesejadas
// (deriva lenta, polegar "nervoso"), botão de gota, os 3 bichinhos, toque
// múltiplo, canhoto (ajuda, pausa, recarga), e nada de rolagem/zoom/seleção/
// menu de contexto/puxar-para-atualizar no jogo e nos menus.
// Uso: cd qa && node verificacao/v-p4r2/gestos.mjs [filtro]
import { subirServidor, abrirNavegador, novaPagina, esperarJogo, dedo } from '../../navegador/apoio.mjs';

const OUT = new URL('../../capturas/v-p4r2/', import.meta.url).pathname;
const filtro = process.argv[2];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const TELAS = [[390, 844], [844, 390], [740, 360], [915, 412], [360, 640], [1024, 768], [1280, 800], [768, 1024]];
const servidor = await subirServidor();
const nav = await abrirNavegador();

const res = {};
for (const [W, H] of TELAS) {
  const id = `${W}x${H}`;
  if (filtro && !id.includes(filtro)) continue;
  const p = await novaPagina(nav, { width: W, height: H }, { dpr: 2, contexto: { hasTouch: true, isMobile: true } });
  const { pagina } = p;
  const cdp = await p.contexto.newCDPSession(pagina);
  const r = (res[id] = {});
  await pagina.goto(servidor.url + '?semente=112&arena=jardim');
  await esperarJogo(pagina);
  const eu = () => pagina.evaluate(() => { const j = window.__bomberolho.state.jogadores[0]; return { x: j.x, y: j.y, vivo: j.vivo, escudo: j.escudo, noAr: j.noAr, disp: j.disparando, mont: j.montaria }; });
  const dir = () => pagina.evaluate(() => document.querySelector('.alavanca').dataset.dir);
  const nova = async () => {
    await pagina.evaluate(() => { const b = window.__bomberolho; b.restaurarAjuste(); b.start({ semente: 112, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) b.input(i, {}); });
    await espera(150);
  };
  const andou = (a, b) => +(Math.abs(b.x - a.x) + Math.abs(b.y - a.y)).toFixed(2);
  const ax = H > W ? Math.round(W * 0.25) : Math.round(W * 0.12);
  const ay = H > W ? H - 110 : Math.round(H * 0.7);
  await nova();

  // 1. zona morta (dedo 9 px fora, parado 0,6 s)
  { const a = await eu(); await dedo(cdp, 'touchStart', [[ax, ay]]); await dedo(cdp, 'touchMove', [[ax + 6, ay + 7]]); await espera(600); const b = await eu(); r.zonaMorta = { dir: await dir(), andou: andou(a, b) }; await dedo(cdp, 'touchEnd', []); }

  // 2. bordas: polegar parado a 2 px da borda (tremor 1 px) e depois empurrão de 30 px para dentro
  r.bordas = {};
  for (const [nome, x, y, empurra] of [['baixo', ax, H - 2, [0, -30]], ['esquerda', 2, ay, [30, 0]], ['canto', 2, H - 2, [0, -30]]]) {
    await nova();
    if (nome !== 'baixo') await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(1); });
    const a = await eu();
    await dedo(cdp, 'touchStart', [[x, y]]);
    await dedo(cdp, 'touchMove', [[x + 1, y]]);
    await dedo(cdp, 'touchMove', [[x, y]]);
    await espera(400);
    const b = await eu();
    const d0 = await dir();
    const vis = await pagina.evaluate(() => { const q = document.querySelector('.alavanca').getBoundingClientRect(); return q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight; });
    // empurrão para dentro (para baixo/direita a partir de (1,1) anda; para cima bate na moldura — usar a direção que anda)
    const emp = nome === 'esquerda' ? [30, 0] : [0, -30];
    await dedo(cdp, 'touchMove', [[x + emp[0], y + emp[1]]]);
    await espera(120);
    const d1 = await dir();
    await dedo(cdp, 'touchEnd', []);
    r.bordas[nome] = { parado: { dir: d0, andou: andou(a, b) }, alavancaInteira: vis, empurrao: d1 };
  }

  // 3. diagonal tremida (22,26) ± 3 px
  await nova();
  { const a = await eu(); await dedo(cdp, 'touchStart', [[ax, ay - 60]]); const ds = new Set();
    for (let k = 0; k < 12; k++) { await dedo(cdp, 'touchMove', [[ax + 22 + (k % 2 ? 3 : -3), ay - 60 + 26 + (k % 2 ? -3 : 3)]]); ds.add(await dir()); await espera(35); }
    await dedo(cdp, 'touchEnd', []); const b = await eu(); r.diagonal = { dirs: [...ds], desvioX: +(b.x - a.x).toFixed(2) }; }

  // 4. virada rolando o polegar (escorregão de 20 px) e viradas indesejadas
  await nova();
  {
    const y0 = ay - 80;
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]); // além do raio
    await espera(250);
    const antes = await dir();
    for (let k = 1; k <= 4; k++) { await dedo(cdp, 'touchMove', [[ax + 5 * k, y0 + 72]]); await espera(10); }
    const depois = await dir();
    await dedo(cdp, 'touchEnd', []);
    r.virada20px = [antes, depois];
  }
  await nova();
  {
    // deriva lenta: 24 px para o lado em 1,2 s segurando "baixo"
    const y0 = ay - 80;
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]);
    const ds = new Set();
    for (let k = 1; k <= 24; k++) { await dedo(cdp, 'touchMove', [[ax + k, y0 + 72]]); await espera(50); ds.add(await dir()); }
    await dedo(cdp, 'touchEnd', []);
    r.derivaLenta = [...ds];
  }
  await nova();
  {
    // polegar "nervoso": oscila ±8 px de lado a ~12 Hz segurando "baixo"
    const y0 = ay - 80;
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]);
    const ds = new Set();
    for (let k = 0; k < 20; k++) { await dedo(cdp, 'touchMove', [[ax + (k % 2 ? 8 : -8), y0 + 72]]); await espera(40); ds.add(await dir()); }
    await dedo(cdp, 'touchEnd', []);
    r.polegarNervoso8 = [...ds];
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]);
    const ds2 = new Set();
    for (let k = 0; k < 20; k++) { await dedo(cdp, 'touchMove', [[ax + (k % 2 ? 12 : -12), y0 + 72]]); await espera(40); ds2.add(await dir()); }
    await dedo(cdp, 'touchEnd', []);
    r.polegarNervoso12 = [...ds2];
    // puxar de volta para parar (voltar no eixo, rápido) não pode virar
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]);
    await espera(100);
    const ds3 = [];
    for (let k = 1; k <= 6; k++) { await dedo(cdp, 'touchMove', [[ax + 3, y0 + 72 - 12 * k]]); ds3.push(await dir()); }
    await dedo(cdp, 'touchEnd', []);
    r.voltarParaParar = ds3;
  }

  // 5. botão de gota: posição e contagem
  await nova();
  const geo = await pagina.evaluate(() => { const q = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2, Math.round(b.width)]; }; return { gota: q('#bt-gota'), pausa: q('#bt-pausa') }; });
  {
    const c0 = await pagina.evaluate(() => document.querySelector('#bt-gota .conta').textContent);
    await dedo(cdp, 'touchStart', [[geo.gota[0], geo.gota[1]]]); await espera(50); await dedo(cdp, 'touchEnd', []); await espera(100);
    const s = await pagina.evaluate(() => window.__bomberolho.state.gotas.map((g) => [g.col, g.lin]));
    const c1 = await pagina.evaluate(() => document.querySelector('#bt-gota .conta').textContent);
    // borda do botão (8 px para dentro do contorno) também conta
    r.gota = { gotas: s, conta: [c0, c1], tamanho: geo.gota[2] };
  }

  // 6. bichinhos: os três tipos, apertando o botão de poder com o dedo
  r.bichinhos = {};
  for (let t = 0; t < 6 && Object.keys(r.bichinhos).length < 3; t++) {
    await nova();
    // Saltinho precisa de algo à frente: olhar para baixo em (1,1) com (1,2) livre não pula; anda até (1,1) olhando para a direita (bloco ou pilar)
    for (let k = 0; k <= t; k++) await pagina.evaluate(() => window.__bomberolho.darItem(0, 'estojo'));
    await espera(100);
    const m = (await eu()).mont;
    if (!m || r.bichinhos[m]) continue;
    const ac = await pagina.evaluate(() => { const b = document.getElementById('bt-acao'); const q = b.getBoundingClientRect(); return { hidden: b.hidden, x: q.x + q.width / 2, y: q.y + q.height / 2, w: Math.round(q.width), label: b.getAttribute('aria-label') }; });
    // vira para a direita com um toque curto na alavanca
    await dedo(cdp, 'touchStart', [[ax, ay]]); await dedo(cdp, 'touchMove', [[ax + 30, ay]]); await espera(30); await dedo(cdp, 'touchEnd', []);
    await espera(150);
    const a = await eu();
    await dedo(cdp, 'touchStart', [[ac.x, ac.y]]);
    let viu = { escudo: false, noAr: false, disp: false };
    for (let k = 0; k < 12; k++) { const e = await eu(); viu = { escudo: viu.escudo || e.escudo, noAr: viu.noAr || e.noAr, disp: viu.disp || e.disp }; await espera(25); }
    await dedo(cdp, 'touchEnd', []);
    await espera(500);
    const b = await eu();
    r.bichinhos[m] = { botao: `${ac.w}px "${ac.label}" hidden=${ac.hidden}`, efeito: viu, de: [a.x, a.y], para: [b.x, b.y] };
    if (Object.keys(r.bichinhos).length === 1) await pagina.screenshot({ path: `${OUT}gestos-${id}-montado.png` });
  }
  // Saltinho de verdade: em (1,2) olhando para a direita há um pilar em (2,2) e (3,2) livre
  await nova();
  {
    await pagina.evaluate(() => {
      const b = window.__bomberolho; b.setTimeScale(0);
      for (let k = 0; k < 120 && b.state.jogadores[0].y < 2.5; k++) { b.input(0, { baixo: true }); b.step(1); }
      b.input(0, { dir: true }); b.step(1); b.input(0, null); b.setTimeScale(1);
      for (let k = 0; k < 6 && b.state.jogadores[0].montaria !== 'saltinho'; k++) b.darItem(0, 'estojo');
    });
    await espera(150);
    const a = await eu();
    const ac = await pagina.evaluate(() => { const q = document.getElementById('bt-acao').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
    await dedo(cdp, 'touchStart', [ac]);
    let ar = false;
    for (let k = 0; k < 15; k++) { ar = ar || (await eu()).noAr; await espera(25); }
    await dedo(cdp, 'touchEnd', []);
    await espera(600);
    const b = await eu();
    r.saltinhoNoPilar = { mont: a.mont, de: [a.x, a.y], para: [b.x, b.y], noAr: ar };
  }
  // polegar com oscilação menor (±5 px) não vira
  await nova();
  {
    const y0 = ay - 80;
    await dedo(cdp, 'touchStart', [[ax, y0]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[ax, y0 + 12 * k]]);
    const ds = new Set();
    for (let k = 0; k < 20; k++) { await dedo(cdp, 'touchMove', [[ax + (k % 2 ? 5 : -5), y0 + 72]]); await espera(40); ds.add(await dir()); }
    await dedo(cdp, 'touchEnd', []);
    r.polegarNervoso5 = [...ds];
  }
  // sem bichinho o botão some
  await nova();
  r.acaoSemBichinho = await pagina.evaluate(() => document.getElementById('bt-acao').hidden);

  // 7. toque múltiplo — ATENÇÃO: aqui o touchEnd com lista solta os dedos LISTADOS (o 0 e o 2), não "os que ficam";
  //    o resultado "continuouAndando" deste bloco não vale. A medição correta está em multitoque.mjs.
  await nova();
  await pagina.evaluate(() => { const b = window.__bomberolho; b.ajustar({ pavio: 900 }); b.darItem(0, 'gota'); });
  {
    await dedo(cdp, 'touchStart', [[ax, ay, 0]]);
    await dedo(cdp, 'touchMove', [[ax, ay + 30, 0]]);
    await espera(250);
    await dedo(cdp, 'touchStart', [[ax, ay + 30, 0], [geo.gota[0], geo.gota[1], 1]]);
    await espera(50);
    await dedo(cdp, 'touchStart', [[ax, ay + 30, 0], [geo.gota[0], geo.gota[1], 1], [W * 0.6, H * 0.3, 2]]);
    await espera(50);
    const a0 = await eu();
    await dedo(cdp, 'touchEnd', [[ax, ay + 30, 0], [W * 0.6, H * 0.3, 2]]);
    const a = await eu();
    const dirMeio = await dir();
    await espera(300);
    const b = await eu();
    r.multiploPos = { comDoisDedos: [a0.x, a0.y], soltouGota: [a.x, a.y], depois: [b.x, b.y], dirAoSoltar: dirMeio };
    await dedo(cdp, 'touchEnd', []);
    const s = await pagina.evaluate(() => window.__bomberolho.state);
    r.multiplo = { gotas: s.gotas.length, continuouAndando: andou(a, b), tela: s.tela };
  }

  // 8. rolagem, zoom, seleção, menu de contexto, puxar para atualizar — no jogo
  let ctx = 0;
  await pagina.exposeFunction('__ctx', () => { ctx++; });
  await pagina.evaluate(() => window.addEventListener('contextmenu', (e) => { if (!e.defaultPrevented) window.__ctx(); }, false));
  const gestosLivres = async () => {
    await dedo(cdp, 'touchStart', [[W * 0.35, H * 0.4, 0], [W * 0.65, H * 0.6, 1]]);
    for (let k = 1; k <= 6; k++) await dedo(cdp, 'touchMove', [[W * 0.35 - 12 * k, H * 0.4 - 12 * k, 0], [W * 0.65 + 12 * k, H * 0.6 + 12 * k, 1]]);
    await dedo(cdp, 'touchEnd', []);
    for (const x of [W * 0.5, W * 0.85]) {
      await dedo(cdp, 'touchStart', [[x, 8]]);
      for (let k = 1; k <= 10; k++) await dedo(cdp, 'touchMove', [[x, 8 + 35 * k]]);
      await dedo(cdp, 'touchEnd', []);
    }
    // dois toques rápidos (zoom de dois toques) e toque longo num texto
    for (let k = 0; k < 2; k++) { await dedo(cdp, 'touchStart', [[W * 0.5, H * 0.15]]); await dedo(cdp, 'touchEnd', []); await espera(60); }
    const txt = await pagina.evaluate(() => { for (const s of ['.barra', '.lema', 'h2', '.nome', 'p']) { const e = [...document.querySelectorAll(s)].find((x) => x.offsetParent); if (e) { const b = e.getBoundingClientRect(); return [b.x + Math.min(20, b.width / 2), b.y + b.height / 2]; } } return null; });
    if (txt) { await dedo(cdp, 'touchStart', [txt]); await espera(1100); await dedo(cdp, 'touchEnd', []); }
    await espera(200);
    return pagina.evaluate(() => ({ escala: visualViewport.scale, sx: scrollX, sy: scrollY, sel: String(getSelection()).slice(0, 20), recarregou: !!window.__marca === false }));
  };
  await pagina.evaluate(() => { window.__marca = 1; });
  r.gestosJogo = { ...(await gestosLivres()), contextmenu: ctx };
  // no menu (personagem e ajuda)
  await pagina.evaluate(() => window.__bomberolho.menu('personagem'));
  await espera(300);
  r.gestosMenuPersonagem = { ...(await gestosLivres()), contextmenu: ctx };
  await pagina.evaluate(() => window.__bomberolho.menu('inicio'));
  await espera(300);
  r.gestosMenuInicio = { ...(await gestosLivres()), contextmenu: ctx };

  // 9. canhoto pelo "Como jogar", vale na partida e persiste depois de recarregar
  await pagina.locator('[data-acao="ajuda"]').tap();
  await espera(200);
  const lados = pagina.locator('[data-acao="lados"]');
  r.canhoto = { botaoVisivel: await lados.isVisible() };
  if (r.canhoto.botaoVisivel) {
    await lados.tap();
    r.canhoto.pressionado = await lados.getAttribute('aria-pressed');
    await pagina.locator('[data-acao="fechar-ajuda"]').tap();
    await pagina.reload();
    await esperarJogo(pagina);
    await pagina.evaluate(() => { const b = window.__bomberolho; b.start({ semente: 112, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) b.input(i, {}); });
    await espera(200);
    r.canhoto.lado = await pagina.evaluate(() => document.body.dataset.lado);
    const g = await pagina.evaluate(() => { const b = document.getElementById('bt-gota').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
    r.canhoto.gotaNaEsquerda = g[0] < W / 2;
    const a = await eu();
    await dedo(cdp, 'touchStart', [[W * 0.2, H * 0.6]]); await dedo(cdp, 'touchMove', [[W * 0.2, H * 0.6 + 30]]); await espera(300); await dedo(cdp, 'touchEnd', []);
    const b = await eu();
    await dedo(cdp, 'touchStart', [[W - ax, ay]]); await dedo(cdp, 'touchMove', [[W - ax, ay + 30]]); await espera(300); await dedo(cdp, 'touchEnd', []);
    const c = await eu();
    await dedo(cdp, 'touchStart', [[W - 2, ay]]); await dedo(cdp, 'touchMove', [[W - 3, ay]]); await espera(400);
    const d = await eu();
    await dedo(cdp, 'touchEnd', []);
    r.canhoto.esquerdaMove = andou(a, b); r.canhoto.direitaMove = andou(b, c); r.canhoto.bordaDireitaParado = andou(c, d);
    await dedo(cdp, 'touchStart', [[g[0], g[1]]]); await espera(40); await dedo(cdp, 'touchEnd', []); await espera(80);
    r.canhoto.gotaPeloBotao = await pagina.evaluate(() => window.__bomberolho.state.gotas.length);
    await pagina.screenshot({ path: `${OUT}gestos-${id}-canhoto.png` });
    // volta ao destro pela pausa
    await pagina.locator('#bt-pausa').tap();
    await pagina.locator('#aviso button', { hasText: /lado/i }).tap();
    r.canhoto.voltouPelaPausa = await pagina.evaluate(() => document.body.dataset.lado);
  }
  r.problemas = p.problemas;
  console.log(id, JSON.stringify(r));
  await p.contexto.close();
}
await nav.close();
await servidor.fechar();
