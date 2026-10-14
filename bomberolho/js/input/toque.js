// Controle de toque: alavanca flutuante + botão grande de gota + botão do
// bichinho (só aparece montado). A alavanca nasce onde o polegar encosta, em
// qualquer ponto livre da metade da tela do lado dela (esquerda; direita no
// modo canhoto), e segue o dedo se ele passar da borda. Zona morta no centro e
// 4 direções bem definidas, com histerese: a direção só troca de eixo quando o
// dedo passa claramente para o outro lado da diagonal (sem "tremer" na
// diagonal). Com o polegar já encostado na borda da alavanca (a base vindo
// atrás), a virada também vale pelo movimento recente do dedo: escorregar o
// polegar uns 16 px para o lado vira na hora, como no direcional de um console.
// Vários dedos ao mesmo tempo: um dedo para a alavanca, um para cada botão;
// dedos a mais são ignorados.

import { criarBotoes } from './botoes.js';

export const ZONA_MORTA = 12; // px do centro em que a alavanca não manda andar
export const RAIO = 44; // px até o pino encostar na borda (depois a base segue o dedo)
const HISTERESE = 1.35; // para trocar de eixo, o outro eixo precisa ser 35% maior
export const VIRADA = 16; // px de escorregão lateral (recente) que viram a alavanca já inclinada
const JANELA_VIRADA = 200; // ms de "movimento recente" olhados para a virada
const NOMES = ['cima', 'baixo', 'esq', 'dir'];
const VETOR = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };

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
 * Virada pelo movimento recente (função pura): com a alavanca inclinada em
 * `atual`, o dedo andou (mx, my) px nos últimos ~200 ms. Se o escorregão foi
 * claramente para um lado (≥ VIRADA px e 35% maior que o movimento no eixo
 * atual), devolve a direção nova; senão, null. Voltar no próprio eixo não vira
 * (é o gesto de parar).
 */
export function viradaPeloMovimento(atual, mx, my) {
  if (!atual) return null;
  const vertical = atual === 'cima' || atual === 'baixo';
  const lado = vertical ? mx : my;
  const eixo = vertical ? my : mx;
  if (Math.abs(lado) < VIRADA || Math.abs(lado) < Math.abs(eixo) * HISTERESE) return null;
  if (vertical) return lado < 0 ? 'esq' : 'dir';
  return lado < 0 ? 'cima' : 'baixo';
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
  // (x, y) = centro lógico, sempre no ponto onde o polegar encostou (ou atrás
  // dele, se passou da borda); só o desenho é preso dentro da tela.
  const alavanca = { id: null, x: 0, y: 0, dir: null, trilha: [] };
  let tocou = false;

  const elementoDoBotao = { bomba: op.gota, acao: op.acao };

  function aceita(e) {
    return e.pointerType === 'touch' || e.pointerType === 'pen' || (op.aceitaMouse && e.pointerType === 'mouse');
  }

  function noLadoDaAlavanca(x) {
    const meio = janela.innerWidth / 2;
    return op.canhoto() ? x >= meio : x < meio;
  }

  /**
   * Desenha a base inteira dentro da tela (o dedo perto da borda não esconde a
   * alavanca) e o pino deslocado (dx, dy) a partir dela. Prender só o desenho
   * é de propósito: se o centro lógico também fosse empurrado para dentro, o
   * polegar parado perto da borda já começaria fora da zona morta e o boneco
   * andaria sozinho.
   */
  function mostrarAlavanca(dx, dy) {
    const el = op.alavanca;
    const r = el.offsetWidth / 2 || RAIO + 16;
    const x = Math.min(Math.max(alavanca.x, r + 4), janela.innerWidth - r - 4);
    const y = Math.min(Math.max(alavanca.y, r + 4), janela.innerHeight - r - 4);
    el.style.transform = `translate(${x - r}px, ${y - r}px)`;
    el.classList.remove('repouso');
    el.classList.add('ativa');
    el.dataset.dir = alavanca.dir || '';
    op.pino.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
  }

  /** Onde o dedo estava ~JANELA_VIRADA ms atrás (a trilha guarda só o necessário). */
  function lembrarDedo(x, y, t) {
    const trilha = alavanca.trilha;
    trilha.push({ x, y, t });
    while (trilha.length > 2 && trilha[1].t <= t - JANELA_VIRADA) trilha.shift();
    return trilha[0];
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
    op.pino.style.transform = '';
    alavanca.trilha.length = 0;
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
    op.alavanca.classList.add('conhecida'); // já achou a alavanca: o contorno de dica pode sumir (CSS)
    alavanca.x = e.clientX;
    alavanca.y = e.clientY;
    alavanca.dir = null;
    alavanca.trilha.length = 0;
    lembrarDedo(e.clientX, e.clientY, e.timeStamp);
    mostrarAlavanca(0, 0);
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
    let nova = direcaoDaAlavanca(dx, dy, alavanca.dir);
    const antes = lembrarDedo(e.clientX, e.clientY, e.timeStamp);
    // Polegar na borda e escorregando de lado: vira já (a base, que vinha atrás
    // do dedo, passa a ficar atrás dele na direção nova).
    if (nova === alavanca.dir && dist >= RAIO * 0.8) {
      const virada = viradaPeloMovimento(nova, e.clientX - antes.x, e.clientY - antes.y);
      if (virada) {
        nova = virada;
        [dx, dy] = VETOR[virada].map((v) => v * RAIO);
        alavanca.x = e.clientX - dx;
        alavanca.y = e.clientY - dy;
        alavanca.trilha.length = 0;
        lembrarDedo(e.clientX, e.clientY, e.timeStamp);
      }
    }
    if (nova && nova !== alavanca.dir) tocadas.add(nova);
    alavanca.dir = nova;
    mostrarAlavanca(dx, dy);
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
