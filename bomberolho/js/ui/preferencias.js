// Preferências e placar local, guardados só neste aparelho (localStorage).
// Nada sai daqui: sem rede, sem identificação. Tudo dentro de try/catch —
// em janela anônima ou com o armazenamento bloqueado, o jogo segue sem lembrar.

import { PERSONAGENS } from '../dados/personagens.js';
import { ARENAS } from '../sim/arenas.js';

const CHAVE = 'bomberolho.v1';
const DIFICULDADES = ['facil', 'medio', 'dificil'];

const PADRAO = Object.freeze({
  mudo: false,
  personagem: 'iris',
  arena: 'jardim',
  dificuldade: 'facil',
  rodadas: 2,
  placar: { partidas: 0, tacas: 0, rodadas: 0, porPersonagem: {} },
});

function ler() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return bruto && typeof bruto === 'object' ? bruto : {};
  } catch {
    return {};
  }
}

/** Valida cada campo: valor estranho (ou adulterado) volta ao padrão. */
function limpar(b) {
  const placar = b.placar && typeof b.placar === 'object' ? b.placar : {};
  const inteiro = (v) => (Number.isInteger(v) && v >= 0 && v < 1e7 ? v : 0);
  const porPersonagem = {};
  for (const id of Object.keys(PERSONAGENS)) {
    const v = inteiro(placar.porPersonagem?.[id]);
    if (v) porPersonagem[id] = v;
  }
  return {
    mudo: b.mudo === true,
    personagem: PERSONAGENS[b.personagem] ? b.personagem : PADRAO.personagem,
    arena: ARENAS[b.arena] || b.arena === 'surpresa' ? b.arena : PADRAO.arena,
    dificuldade: DIFICULDADES.includes(b.dificuldade) ? b.dificuldade : PADRAO.dificuldade,
    rodadas: [1, 2, 3].includes(b.rodadas) ? b.rodadas : PADRAO.rodadas,
    placar: { partidas: inteiro(placar.partidas), tacas: inteiro(placar.tacas), rodadas: inteiro(placar.rodadas), porPersonagem },
  };
}

export function criarPreferencias() {
  let dados = limpar(ler());
  function gravar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch {
      // Armazenamento indisponível: fica só na memória desta visita.
    }
  }
  return {
    get dados() { return dados; },
    mudar(campos) {
      dados = limpar({ ...dados, ...campos });
      gravar();
      return dados;
    },
    /** Fim de partida do humano: conta partida, rodadas e taça (por personagem). */
    registrarPartida({ personagem, venceu, rodadasGanhas }) {
      const p = dados.placar;
      const porPersonagem = { ...p.porPersonagem };
      if (venceu) porPersonagem[personagem] = (porPersonagem[personagem] || 0) + 1;
      dados = limpar({
        ...dados,
        placar: { partidas: p.partidas + 1, tacas: p.tacas + (venceu ? 1 : 0), rodadas: p.rodadas + rodadasGanhas, porPersonagem },
      });
      gravar();
      return dados.placar;
    },
  };
}
