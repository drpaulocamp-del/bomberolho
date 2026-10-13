// Teclado: setas ou WASD para andar, espaço para soltar a gota.
// Usa `code` (posição física da tecla), então WASD funciona em qualquer layout.
// Nenhuma tecla do jogo rola a página.

const DIRECAO_POR_TECLA = {
  ArrowUp: 'cima', KeyW: 'cima',
  ArrowDown: 'baixo', KeyS: 'baixo',
  ArrowLeft: 'esq', KeyA: 'esq',
  ArrowRight: 'dir', KeyD: 'dir',
};
const TECLAS_GOTA = new Set(['Space', 'KeyX', 'KeyJ']);

export function criarTeclado(alvo, acoes = {}) {
  const apertadas = new Set();
  let gotaPendente = false; // toque rápido entre dois ticks não se perde
  let ultimaGota = false;

  function aoApertar(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = DIRECAO_POR_TECLA[e.code];
    if (dir) {
      apertadas.add(dir);
      e.preventDefault();
    } else if (TECLAS_GOTA.has(e.code)) {
      if (!e.repeat) gotaPendente = true;
      apertadas.add('bomba');
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
    else if (TECLAS_GOTA.has(e.code)) apertadas.delete('bomba');
  }

  // Ao perder o foco as teclas "presas" são soltas (senão o boneco anda sozinho).
  function limpar() {
    apertadas.clear();
    gotaPendente = false;
  }

  alvo.addEventListener('keydown', aoApertar);
  alvo.addEventListener('keyup', aoSoltar);
  alvo.addEventListener('blur', limpar);

  return {
    /** Entrada para o próximo tick. */
    ler() {
      let bomba = gotaPendente || apertadas.has('bomba');
      // A simulação só solta gota na borda (solto → apertado); se o botão
      // continuou "apertado" desde o tick anterior, entrega um tick solto antes.
      if (gotaPendente && ultimaGota) bomba = false;
      else gotaPendente = false;
      ultimaGota = bomba;
      return {
        cima: apertadas.has('cima'),
        baixo: apertadas.has('baixo'),
        esq: apertadas.has('esq'),
        dir: apertadas.has('dir'),
        bomba,
      };
    },
    limpar,
    destruir() {
      alvo.removeEventListener('keydown', aoApertar);
      alvo.removeEventListener('keyup', aoSoltar);
      alvo.removeEventListener('blur', limpar);
    },
  };
}
