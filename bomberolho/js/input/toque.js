// Controle de toque: alavanca flutuante + botão grande de gota + botão do
// bichinho (só aparece montado). A alavanca nasce onde o polegar encosta, em
// qualquer ponto livre da metade da tela do lado dela (esquerda; direita no
// modo canhoto), e segue o dedo se ele passar da borda. Zona morta no centro e
// 4 direções bem definidas, com histerese: a direção só troca de eixo quando o
// dedo passa claramente para o outro lado da diagonal (sem "tremer" na
// diagonal). Vários dedos ao mesmo tempo: um dedo para a alavanca, um para cada
// botão; dedos a mais são ignorados.

import { criarBotoes } from './botoes.js';

export const ZONA_MORTA = 12; // px do centro em que a alavanca não manda andar
export const RAIO = 44; // px até o pino encostar na borda (depois a base segue o dedo)
const HISTERESE = 1.35; // para trocar de eixo, o outro eixo precisa ser 35% maior
const NOMES = ['cima', 'baixo', 'esq', 'dir'];

/**
 * Direção da alavanca (função pura): deslocamento do dedo (dx, dy) em px em
 * relação à base, direção atual (para a histerese) → 'cima' | 'baixo' | 'esq' |
 * 'dir' | null (dentro da zona morta).
 */
export function direcaoDaAlavanca(dx, dy, atual = null, zona = ZONA_MORTA) {
  const dist = Math.hypot(dx, dy);
  // Saindo da zona morta precisa de `zona`; para voltar a "parado", um pouco menos.
  if (dist < (atual ? zona * 0.7 : zona)) return null;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let horizontal = ax >= ay;
  if (atual === 'esq' || atual === 'dir') horizontal = ay <= ax * HISTERESE;
  else if (atual === 'cima' || atual === 'baixo') horizontal = ax > ay * HISTERESE;
  if (horizontal) return dx < 0 ? 'esq' : 'dir';
  return dy < 0 ? 'cima' : 'baixo';
}

/**
 * @param {Document} doc
 * @param {object} op
 *   alavanca, pino: elementos da alavanca (base que se move e o pino);
 *   gota, acao: botões; ativo(): a partida aceita toque agora?;
 *   canhoto(): alavanca à direita?; aceitaMouse: alavanca também com mouse (teste);
 *   aoPrimeiroToque(): chamado no primeiro toque de dedo (liga a interface de toque).
 */
export function criarToque(doc, op) {
  const janela = doc.defaultView;
  const botoes = criarBotoes();
  const tocadas = new Set(); // direção que durou menos de um tick não se perde
  const dedosDosBotoes = new Map(); // pointerId → 'bomba' | 'acao'
  const alavanca = { id: null, x: 0, y: 0, dir: null };
  let tocou = false;

  const elementoDoBotao = { bomba: op.gota, acao: op.acao };

  function aceita(e) {
    return e.pointerType === 'touch' || e.pointerType === 'pen' || (op.aceitaMouse && e.pointerType === 'mouse');
  }

  function noLadoDaAlavanca(x) {
    const meio = janela.innerWidth / 2;
    return op.canhoto() ? x >= meio : x < meio;
  }

  /** Base inteira dentro da tela (o dedo perto da borda não esconde a alavanca). */
  function prender(x, y) {
    const r = op.alavanca.offsetWidth / 2 || RAIO + 16;
    return {
      x: Math.min(Math.max(x, r + 4), janela.innerWidth - r - 4),
      y: Math.min(Math.max(y, r + 4), janela.innerHeight - r - 4),
    };
  }

  function mostrarAlavanca() {
    const el = op.alavanca;
    const r = el.offsetWidth / 2 || RAIO + 16;
    el.style.transform = `translate(${alavanca.x - r}px, ${alavanca.y - r}px)`;
    el.classList.remove('repouso');
    el.classList.add('ativa');
    el.dataset.dir = alavanca.dir || '';
  }

  function moverPino(dx, dy) {
    op.pino.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
  }

  /** Alavanca em repouso: um contorno claro no canto (CSS), mostrando onde pôr o polegar. */
  function repousar() {
    alavanca.id = null;
    alavanca.dir = null;
    const el = op.alavanca;
    el.style.transform = '';
    el.classList.remove('ativa');
    el.classList.add('repouso');
    el.dataset.dir = '';
    moverPino(0, 0);
  }

  function apertarBotao(nome, e) {
    dedosDosBotoes.set(e.pointerId, nome);
    botoes.apertar(nome);
    elementoDoBotao[nome].classList.add('apertado');
  }

  function soltarBotao(id) {
    const nome = dedosDosBotoes.get(id);
    if (!nome) return;
    dedosDosBotoes.delete(id);
    if (![...dedosDosBotoes.values()].includes(nome)) {
      botoes.soltar(nome);
      elementoDoBotao[nome].classList.remove('apertado');
    }
  }

  function aoEncostar(e) {
    if (!aceita(e)) return;
    if (!tocou && e.pointerType !== 'mouse') {
      tocou = true;
      op.aoPrimeiroToque?.();
    }
    if (!op.ativo()) return;
    const alvo = e.target instanceof janela.Element ? e.target : null;
    const botao = alvo?.closest('button, a, input, select, textarea, [role="dialog"]');
    if (botao === op.gota || botao === op.acao) {
      e.preventDefault();
      apertarBotao(botao === op.gota ? 'bomba' : 'acao', e);
      return;
    }
    if (botao) return; // Pausar, Sair, Som… continuam sendo botões normais
    if (alavanca.id !== null || !noLadoDaAlavanca(e.clientX)) return;
    e.preventDefault();
    alavanca.id = e.pointerId;
    ({ x: alavanca.x, y: alavanca.y } = prender(e.clientX, e.clientY));
    alavanca.dir = null;
    moverPino(e.clientX - alavanca.x, e.clientY - alavanca.y);
    mostrarAlavanca();
  }

  function aoArrastar(e) {
    if (e.pointerId !== alavanca.id) return;
    e.preventDefault();
    let dx = e.clientX - alavanca.x;
    let dy = e.clientY - alavanca.y;
    const dist = Math.hypot(dx, dy);
    if (dist > RAIO) {
      // A base vem atrás do dedo: mudar de direção nunca exige voltar até o centro antigo.
      const k = (dist - RAIO) / dist;
      alavanca.x += dx * k;
      alavanca.y += dy * k;
      dx -= dx * k;
      dy -= dy * k;
    }
    const nova = direcaoDaAlavanca(dx, dy, alavanca.dir);
    if (nova && nova !== alavanca.dir) tocadas.add(nova);
    alavanca.dir = nova;
    moverPino(dx, dy);
    mostrarAlavanca();
  }

  function aoSoltar(e) {
    if (e.pointerId === alavanca.id) repousar();
    soltarBotao(e.pointerId);
  }

  /** Solta tudo (pausa, aba escondida, perda de foco, tela girada). */
  function limpar() {
    for (const id of [...dedosDosBotoes.keys()]) soltarBotao(id);
    botoes.limpar();
    tocadas.clear();
    repousar();
  }

  // Sem o comportamento padrão do toque nas áreas de jogo (rolagem, zoom com
  // dois toques, lupa, menu de "copiar"); os botões normais seguem clicáveis.
  function aoTocarTela(e) {
    if (!op.ativo()) return;
    const alvo = e.target instanceof janela.Element ? e.target : null;
    const botao = alvo?.closest('button, a, input, select, textarea, [role="dialog"]');
    if (!botao || botao === op.gota || botao === op.acao) e.preventDefault();
  }

  doc.addEventListener('pointerdown', aoEncostar, { passive: false });
  doc.addEventListener('pointermove', aoArrastar, { passive: false });
  doc.addEventListener('pointerup', aoSoltar);
  doc.addEventListener('pointercancel', aoSoltar);
  doc.addEventListener('touchstart', aoTocarTela, { passive: false });
  janela.addEventListener('blur', limpar);
  janela.addEventListener('resize', limpar);
  repousar();

  return {
    /** Entrada para o próximo tick (mesmo formato do teclado). */
    ler() {
      const e = { bomba: botoes.ler('bomba'), acao: botoes.ler('acao') };
      for (const n of NOMES) e[n] = alavanca.dir === n || tocadas.has(n);
      tocadas.clear();
      return e;
    },
    limpar,
    /** Recoloca a alavanca em repouso (troca de lado, tela girada). */
    repousar,
    get usando() {
      return alavanca.id !== null || dedosDosBotoes.size > 0;
    },
  };
}
