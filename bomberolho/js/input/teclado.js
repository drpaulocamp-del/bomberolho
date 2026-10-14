// Teclado: setas ou WASD para andar, espaço (ou X/J) para a gota e Shift
// (ou E/K) para o poder do bichinho. Usa `code` (posição física da tecla),
// então WASD funciona em qualquer layout. Nenhuma tecla do jogo rola a página.

import { criarBotoes } from './botoes.js';

const DIRECAO_POR_TECLA = {
  ArrowUp: 'cima', KeyW: 'cima',
  ArrowDown: 'baixo', KeyS: 'baixo',
  ArrowLeft: 'esq', KeyA: 'esq',
  ArrowRight: 'dir', KeyD: 'dir',
};
const TECLAS_GOTA = new Set(['Space', 'KeyX', 'KeyJ']);
const TECLAS_ACAO = new Set(['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK']);

export function criarTeclado(alvo, acoes = {}) {
  const apertadas = new Set();
  // Toques rápidos (apertar e soltar entre dois ticks) não se perdem: ficam
  // guardados até o próximo ler().
  const tocadas = new Set();
  const botoes = criarBotoes();

  function aoApertar(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Controles da bancada de ajuste (deslizantes, texto) usam as setas para si.
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // Menu aberto: as teclas são dos botões do menu.
    if (acoes.ativo && !acoes.ativo()) return;
    // Num cartão (pausa, placar), Enter e Espaço acionam o botão em foco.
    const botaoEmFoco = e.target && e.target.tagName === 'BUTTON';
    if (botaoEmFoco && /^(Enter|NumpadEnter|Space)$/.test(e.code) && acoes.jogando && !acoes.jogando()) return;
    const dir = DIRECAO_POR_TECLA[e.code];
    const botao = TECLAS_GOTA.has(e.code) ? 'bomba' : TECLAS_ACAO.has(e.code) ? 'acao' : null;
    if (dir) {
      apertadas.add(dir);
      tocadas.add(dir);
      e.preventDefault();
    } else if (botao) {
      botoes.apertar(botao, e.repeat);
      e.preventDefault();
    } else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
      acoes.pausar?.();
      e.preventDefault();
    } else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) {
      acoes.confirmar?.();
      e.preventDefault();
    }
  }

  function aoSoltar(e) {
    const dir = DIRECAO_POR_TECLA[e.code];
    if (dir) apertadas.delete(dir);
    else if (TECLAS_GOTA.has(e.code)) botoes.soltar('bomba');
    else if (TECLAS_ACAO.has(e.code)) botoes.soltar('acao');
  }

  // Ao perder o foco as teclas "presas" são soltas (senão o boneco anda sozinho).
  function limpar() {
    apertadas.clear();
    tocadas.clear();
    botoes.limpar();
  }

  alvo.addEventListener('keydown', aoApertar);
  alvo.addEventListener('keyup', aoSoltar);
  alvo.addEventListener('blur', limpar);

  return {
    /** Entrada para o próximo tick. */
    ler() {
      const e = {
        cima: apertadas.has('cima') || tocadas.has('cima'),
        baixo: apertadas.has('baixo') || tocadas.has('baixo'),
        esq: apertadas.has('esq') || tocadas.has('esq'),
        dir: apertadas.has('dir') || tocadas.has('dir'),
        bomba: botoes.ler('bomba'),
        acao: botoes.ler('acao'),
      };
      tocadas.clear();
      return e;
    },
    limpar,
    destruir() {
      alvo.removeEventListener('keydown', aoApertar);
      alvo.removeEventListener('keyup', aoSoltar);
      alvo.removeEventListener('blur', limpar);
    },
  };
}
