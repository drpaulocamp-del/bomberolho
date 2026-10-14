// Verificador do TODO, rodada 1: abre o jogo SEM parâmetros, percorre o menu
// com toques/cliques de verdade, escolhe personagem/arena/dificuldade e joga
// uma partida inteira com entradas REAIS (teclado ou toque CDP), em tempo real,
// com uma política simples de "criança esperta" calculada fora do jogo
// (só lê o estado público, como os olhos do jogador). Tira capturas.
// Uso: cd qa && node verificacao/v-todo-r1/jogar-real.mjs <nome> <W> <H> <toque|teclado> <arena> <dif> <rodadas> <personagemIdx>
import { mkdirSync, writeFileSync } from 'node:fs';
import { subirServidor, abrirNavegador, novaPagina, dedo } from '../../navegador/apoio.mjs';

const [nome, W, H, modo, arena, dif, rodadas, pIdx] = process.argv.slice(2);
const w = Number(W), h = Number(H), toque = modo === 'toque';
const CAP = new URL(`../../capturas/todo/${nome}/`, import.meta.url).pathname;
mkdirSync(CAP, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const L = (...a) => { const s = a.join(' '); log.push(s); console.log(`[${nome}]`, s); };

const servidor = await subirServidor();
const nav = await abrirNavegador();
const extras = toque ? { dpr: 2, contexto: { hasTouch: true, isMobile: true } } : { dpr: 1 };
const { pagina, contexto, problemas } = await novaPagina(nav, { width: w, height: h }, extras);
const externos = [];
pagina.on('request', (r) => { if (!r.url().startsWith(servidor.url.replace('/bomberolho/', '/'))) externos.push(r.url()); });
const cdp = toque ? await contexto.newCDPSession(pagina) : null;
let nCap = 0;
const cap = async (rot) => { await pagina.screenshot({ path: `${CAP}${String(++nCap).padStart(2, '0')}-${rot}.png` }); };
const toca = async (sel) => { if (toque) await pagina.tap(sel); else await pagina.click(sel); };

// ── Menu ──
const t0 = Date.now();
await pagina.goto(servidor.url);
await pagina.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela === 'menu');
await espera(1200);
await cap('menu-inicio');
const rolagem = async () => pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
L('menu inicio', JSON.stringify(await rolagem()));
await toca('.bt-ajuda'); await espera(500); await cap('como-jogar');
await toca('[data-acao="fechar-ajuda"]'); await espera(300);
await toca('.bt-jogar'); await espera(600);
const ids = await pagina.$$eval('.cartao-personagem', (b) => b.map((x) => x.dataset.personagem));
await toca(`.cartao-personagem[data-personagem="${ids[Number(pIdx)]}"]`); await espera(700);
await cap('menu-personagem');
L('menu personagem', JSON.stringify(await rolagem()));
await toca('.tela-personagem [data-acao="proximo"]'); await espera(600);
await toca(`.cartao-arena[data-arena="${arena}"]`);
await toca(`[data-campo="dificuldade"] [data-valor="${dif}"]`);
await toca(`[data-campo="rodadas"] [data-valor="${rodadas}"]`);
await espera(600);
await cap('menu-arena');
L('menu arena', JSON.stringify(await rolagem()));
await toca('.bt-comecar');
await espera(700);
await cap('contagem');
L('menu → partida em', ((Date.now() - t0) / 1000).toFixed(1), 's');

// ── Política ──
const PASSA = /[.gavcszpneT]/;
const V = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
function perigo(s, extra) {
  const D = new Set();
  const g = s.grade;
  const gotas = s.gotas.filter((x) => x.estado === 'chao').map((x) => ({ col: x.col, lin: x.lin, a: x.alcance }));
  if (extra) gotas.push(extra);
  for (const x of gotas) {
    D.add(`${x.col},${x.lin}`);
    for (const [dc, dl] of Object.values(V)) {
      for (let k = 1; k <= x.a; k++) {
        const c = x.col + dc * k, l = x.lin + dl * k;
        const ch = g[l]?.[c];
        if (!ch || ch === '#' || ch === 'M') break;
        D.add(`${c},${l}`);
        if (ch === 'B' || ch === 'q') break;
      }
    }
  }
  for (const r of s.respingos) for (const c of r.casas) D.add(`${c.col},${c.lin}`);
  if (s.aperto?.proxima) D.add(`${s.aperto.proxima.col},${s.aperto.proxima.lin}`);
  return D;
}
function bfs(s, de, alvo, evitar, maxd = 40) {
  const g = s.grade;
  const fila = [[de[0], de[1], null, 0]];
  const vis = new Set([`${de[0]},${de[1]}`]);
  while (fila.length) {
    const [c, l, pri, d] = fila.shift();
    if (alvo(c, l, d)) return { c, l, pri, d };
    if (d >= maxd) continue;
    for (const [nomeDir, [dc, dl]] of Object.entries(V)) {
      const nc = c + dc, nl = l + dl, k = `${nc},${nl}`;
      if (vis.has(k)) continue;
      const ch = g[nl]?.[nc];
      if (!ch || !PASSA.test(ch)) continue;
      if (evitar && evitar(nc, nl, d + 1)) continue;
      vis.add(k);
      fila.push([nc, nl, pri || nomeDir, d + 1]);
    }
  }
  return null;
}
function decidir(s) {
  const eu = s.jogadores[0];
  if (!eu.vivo) return { dir: null, bomba: false };
  const pos = [eu.col, eu.lin];
  const D = perigo(s);
  const aqui = `${pos[0]},${pos[1]}`;
  const rivais = s.jogadores.filter((j) => j.id !== 0 && j.vivo);
  if (D.has(aqui)) {
    const r = bfs(s, pos, (c, l) => !D.has(`${c},${l}`), (c, l) => s.respingos.some((x) => x.casas.some((q) => q.col === c && q.lin === l)));
    return { dir: r?.pri || null, bomba: false, m: 'foge' };
  }
  const g = s.grade;
  const vizBloco = Object.values(V).some(([dc, dl]) => g[pos[1] + dl]?.[pos[0] + dc] === 'B');
  const rivalPerto = rivais.some((j) => (j.col === pos[0] && Math.abs(j.lin - pos[1]) <= eu.poderes.alcance) || (j.lin === pos[1] && Math.abs(j.col - pos[0]) <= eu.poderes.alcance));
  const podeGota = eu.gotasAtivas < eu.poderes.gotas && g[pos[1]][pos[0]] !== 'o';
  if (podeGota && (vizBloco || rivalPerto)) {
    const D2 = perigo(s, { col: pos[0], lin: pos[1], a: eu.poderes.alcance });
    const r = bfs(s, pos, (c, l) => !D2.has(`${c},${l}`), null, 5);
    if (r) return { dir: r.pri, bomba: true, m: 'gota' };
  }
  const seguro = (c, l) => D.has(`${c},${l}`);
  let r = bfs(s, pos, (c, l, d) => d > 0 && /[gavsnpe c]/.test(g[l][c]) && g[l][c] !== 'z', seguro, 12);
  if (!r) r = bfs(s, pos, (c, l, d) => d > 0 && Object.values(V).some(([dc, dl]) => g[l + dl]?.[c + dc] === 'B'), seguro);
  if (!r && rivais.length) r = bfs(s, pos, (c, l, d) => d > 0 && rivais.some((j) => Math.abs(j.col - c) + Math.abs(j.lin - l) <= 1), seguro);
  return { dir: r?.pri || null, bomba: false, m: 'anda' };
}

// ── Controles reais ──
let tecla = null;
const TECLA = { cima: 'ArrowUp', baixo: 'ArrowDown', esq: 'ArrowLeft', dir: 'ArrowRight' };
const anc = h > w ? [Math.round(w * 0.25), h - 110] : [Math.round(w * 0.12), Math.round(h * 0.6)];
let dedoDir = null;
async function aplicarDir(d) {
  if (!toque) {
    if (tecla === d) return;
    if (tecla) await pagina.keyboard.up(TECLA[tecla]);
    if (d) await pagina.keyboard.down(TECLA[d]);
    tecla = d; return;
  }
  if (dedoDir === d) return;
  if (!d) { await dedo(cdp, 'touchEnd', [[anc[0], anc[1], 0]]); dedoDir = null; return; }
  const p = [anc[0] + V[d][0] * 42, anc[1] + V[d][1] * 42, 0];
  if (!dedoDir) { await dedo(cdp, 'touchStart', [[anc[0], anc[1], 0]]); }
  await dedo(cdp, 'touchMove', [p]);
  dedoDir = d;
}
async function gota() {
  if (!toque) { await pagina.keyboard.press('Space'); return; }
  const g = await pagina.evaluate(() => { const b = document.getElementById('bt-gota').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  const junto = dedoDir ? [[anc[0] + V[dedoDir][0] * 42, anc[1] + V[dedoDir][1] * 42, 0]] : [];
  await dedo(cdp, 'touchStart', [...junto, [g[0], g[1], 1]]);
  await espera(40);
  await dedo(cdp, 'touchEnd', [[g[0], g[1], 1]]);
}
async function soltarTudo() { await aplicarDir(null); }

// ── Partida ──
let ultimaTela = '', ultimoCap = Date.now(), apertoVisto = false, rodadaAtual = 0;
const rodadas_ = [];
let gotasPostas = 0, itensPegos = 0, ultimoPoder = null, montariaVista = false, ciscoVisto = false;
let fpsAmostras = [];
const LIMITE = 9 * 60 * 1000;
const inicio = Date.now();
while (true) {
  const s = await pagina.evaluate(() => window.__bomberolho.state);
  if (s.fps) fpsAmostras.push(s.fps);
  if (s.tela !== ultimaTela) {
    L('tela', s.tela, 'rodada', s.rodada, 'troféus', JSON.stringify(s.partida.vitorias), 'relógio', s.relogio);
    if (s.tela === 'intervalo' || s.tela === 'resultado') {
      await soltarTudo();
      const eu = s.jogadores[0];
      rodadas_.push({ rodada: s.rodada, vencedor: s.vencedor, relogio: s.relogio, eu: { vivo: eu.vivo, eliminadoPor: eu.eliminadoPor, poderes: eu.poderes }, molhados: s.partida.molhados });
      await espera(900);
      await cap(`${s.tela}-r${s.rodada}`);
    }
    if (s.tela === 'pausado') { L('PAUSOU sozinho?'); await cap('pausado-inesperado'); }
    ultimaTela = s.tela;
  }
  if (s.tela === 'resultado') break;
  if (s.tela === 'jogando' && s.rodada !== rodadaAtual) { rodadaAtual = s.rodada; apertoVisto = false; }
  if (s.tela === 'jogando') {
    const eu = s.jogadores[0];
    if (JSON.stringify(eu.poderes) !== ultimoPoder) { if (ultimoPoder) itensPegos++; ultimoPoder = JSON.stringify(eu.poderes); }
    if (eu.montaria && !montariaVista) { montariaVista = true; L('montou', eu.montaria); await cap(`montado-${eu.montaria}`); }
    if (eu.cisco && !ciscoVisto) { ciscoVisto = true; L('cisco', JSON.stringify(eu.cisco)); }
    if (s.aperto.ativo && !apertoVisto) { apertoVisto = true; await espera(1500); await cap(`aperto-r${s.rodada}`); }
    if (Date.now() - ultimoCap > 20000) { ultimoCap = Date.now(); await cap(`jogo-r${s.rodada}-${Math.round(s.relogio)}s`); }
    if (Date.now() - inicio > LIMITE && !s.demo) {
      L('LIMITE de tempo real: liga piloto automático para terminar');
      await soltarTudo();
      await pagina.evaluate(() => { window.__bomberolho.demo(true); window.__bomberolho.setTimeScale(4); });
    }
    if (!s.demo && eu.vivo) {
      const d = decidir(s);
      if (d.bomba) { await gota(); gotasPostas++; }
      await aplicarDir(d.dir);
    } else if (!eu.vivo) await soltarTudo();
  }
  if (s.tela === 'intervalo' && Date.now() - ultimoCap > 4000) { /* espera o próximo */ }
  await espera(45);
}
const s = await pagina.evaluate(() => window.__bomberolho.state);
const dur = (Date.now() - inicio) / 1000;
await espera(1500);
await cap('resultado-final');
// botões do resultado e volta ao menu
const botoes = await pagina.$$eval('#aviso .acoes button', (b) => b.map((x) => x.textContent.trim()));
await toca('#aviso .acoes button[data-acao="menu"]');
await espera(800);
const telaDepois = await pagina.evaluate(() => window.__bomberolho.state.tela);
await cap('volta-menu');
fpsAmostras = fpsAmostras.filter(Boolean);
const res = {
  nome, w, h, modo, arena, dif, rodadas, personagem: s.personagem,
  campeao: s.partida.campeao, vitorias: s.partida.vitorias, historico: s.partida.historico,
  duracaoReal_s: Math.round(dur), rodadas_: rodadas_, gotasPostas, itensPegos, montariaVista, ciscoVisto,
  fps: fpsAmostras.length ? { min: Math.min(...fpsAmostras), med: Math.round(fpsAmostras.reduce((a, b) => a + b, 0) / fpsAmostras.length) } : null,
  botoesResultado: botoes, telaDepoisMenu: telaDepois, placarLocal: s.placarLocal,
  problemas, externos,
};
writeFileSync(`${CAP}resultado.json`, JSON.stringify({ res, log }, null, 1));
L('FIM', JSON.stringify(res));
await contexto.close(); await nav.close(); await servidor.fechar();
