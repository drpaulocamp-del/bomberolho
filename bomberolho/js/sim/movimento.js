// Movimento contínuo com alinhamento automático e deslize de quina.
//
// O corpo tem uma casa de lado. Para avançar num eixo o jogador primeiro se
// alinha ao centro da faixa (linha ou coluna) em que está; se a casa da frente
// está fechada mas ele está um pouco deslocado para uma faixa aberta, escorrega
// para ela ("deslize de quina"). Assim nunca há sobreposição com casas sólidas.

import { CASA, MEIA_CASA, VAZIO, TUNEL, DIRECOES } from './constantes.js';
import { gotaEm } from './gotas.js';
import { velocidadeDe } from './jogadores.js';
import { tentarChutar } from './chute.js';

export function livrePara(m, col, lin, j) {
  const t = m.grade[lin * m.colunas + col];
  if (t !== VAZIO && t !== TUNEL) return false;
  const g = gotaEm(m, col, lin);
  return !g || g.passantes.includes(j.id);
}

function sinal(v) {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/**
 * Calcula (sem aplicar) o deslocamento numa direção.
 * `ladoPermitido` restringe o lado do deslize (0 = qualquer, null = nenhum),
 * para que "direita+baixo" nunca faça o jogador escorregar para a esquerda.
 */
export function tentarMover(m, j, nomeDir, orcamento, ladoPermitido = 0) {
  const { dc, dl } = DIRECOES[nomeDir];
  const eixo = dc !== 0 ? 0 : 1; // 0 = horizontal, 1 = vertical
  const sentido = dc !== 0 ? dc : dl;
  const p = [j.x, j.y];
  const cel = [Math.floor(p[0] / CASA), Math.floor(p[1] / CASA)];
  const lat = 1 - eixo;
  const livre = (a, b) => (eixo === 0 ? livrePara(m, a, b, j) : livrePara(m, b, a, j));

  const centroFrente = cel[eixo] * CASA + MEIA_CASA;
  const centroLado = cel[lat] * CASA + MEIA_CASA;
  const desvio = p[lat] - centroLado;
  let resto = orcamento;
  const aberta = livre(cel[eixo] + sentido, cel[lat]);

  if (aberta) {
    // Caminho aberto: alinha primeiro, depois avança com o que sobrou.
    const ajuste = Math.min(Math.abs(desvio), resto);
    p[lat] -= sinal(desvio) * ajuste;
    resto -= ajuste;
    p[eixo] += sentido * resto;
  } else {
    // Caminho fechado: pode ir até o centro da própria casa...
    const ateCentro = (centroFrente - p[eixo]) * sentido;
    if (ateCentro > 0) {
      const passo = Math.min(ateCentro, resto);
      p[eixo] += sentido * passo;
      resto -= passo;
    }
    // ...e, se estiver deslocado para uma faixa aberta, escorrega para ela.
    const lado = sinal(desvio);
    if (resto > 0 && lado !== 0 && ladoPermitido !== null && (ladoPermitido === 0 || ladoPermitido === lado)
      && Math.abs(desvio) <= m.ajuste.toleranciaQuina
      && livre(cel[eixo] + sentido, cel[lat] + lado) && livre(cel[eixo], cel[lat] + lado)) {
      const alvo = centroLado + lado * CASA;
      p[lat] += lado * Math.min(resto, Math.abs(alvo - p[lat]));
    }
  }
  const antes = [j.x, j.y];
  return {
    x: p[0],
    y: p[1],
    moveu: p[0] !== j.x || p[1] !== j.y,
    avancou: p[eixo] !== antes[eixo], // andou no eixo pedido
    lateral: sinal(p[lat] - antes[lat]), // -1/0/1: para que lado se ajustou
    desvio: Math.abs(desvio),
    aberta,
  };
}

function nomePeloDeslocamento(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'dir' : 'esq';
  return dy > 0 ? 'baixo' : 'cima';
}

/** Teclas de direção resumidas em dois eixos (-1, 0, 1). */
export function eixosDaEntrada(entrada) {
  return {
    h: (entrada.dir ? 1 : 0) - (entrada.esq ? 1 : 0),
    v: (entrada.baixo ? 1 : 0) - (entrada.cima ? 1 : 0),
  };
}

/** Aplica um resultado de tentarMover ao jogador (com o túnel da moldura). */
function aplicar(m, j, r, nome) {
  const dx = r.x - j.x;
  const dy = r.y - j.y;
  j.x = r.x;
  j.y = r.y;
  atravessarTunel(m, j, dx);
  // No deslize de quina o rosto acompanha o movimento de fato.
  j.dir = r.avancou ? nome : nomePeloDeslocamento(dx, dy);
  j.andando = true;
}

/**
 * Túnel (Caverna da Pupila): quem passa do centro da casa-túnel de um lado
 * reaparece no túnel do lado oposto, continuando no mesmo sentido.
 */
export function atravessarTunel(m, j, dx) {
  const ultima = (m.colunas - 1) * CASA;
  if (dx < 0 && j.x <= MEIA_CASA) j.x += ultima;
  else if (dx > 0 && j.x >= ultima + MEIA_CASA) j.x -= ultima;
}

/**
 * Aplica a entrada {cima, baixo, esq, dir} ao jogador por um tick.
 * Com duas direções (ex.: direita+baixo), tenta primeiro a perpendicular ao
 * movimento atual — é o que deixa "virar a esquina" fácil — e cai para a outra
 * se a primeira não andar. `orcamento` permite andar mais (arrancada).
 */
export function moverJogador(m, j, entrada, orcamento = velocidadeDe(j, m.ajuste)) {
  const { h, v } = eixosDaEntrada(entrada);
  const antes = j.eixosAntes || { h: 0, v: 0 };
  j.eixosAntes = { h, v };
  const dirH = h > 0 ? 'dir' : h < 0 ? 'esq' : null;
  const dirV = v > 0 ? 'baixo' : v < 0 ? 'cima' : null;
  j.andando = false;
  if (!dirH || !dirV) j.virando = null;
  if (!dirH && !dirV) return;

  let tentativas;
  const horizontalAgora = j.dir === 'esq' || j.dir === 'dir';
  if (dirH && dirV) {
    tentativas = horizontalAgora
      ? [[dirV, h], [dirH, v]]
      : [[dirH, v], [dirV, h]];
  } else {
    tentativas = [[dirH || dirV, 0]];
  }

  // Chute-Pisca: andar contra uma gota parada a empurra (o jogador fica onde está).
  if (j.chute) {
    for (const [nome] of tentativas) {
      if (tentarChutar(m, j, nome)) {
        j.dir = nome;
        return;
      }
    }
  }

  // "Rolar" as teclas (segurar →, passar da esquina por um fio e só então
  // juntar ↓) abre uma janela curta para voltar e pegar a esquina.
  const fresca = dirH && dirV && (horizontalAgora
    ? antes.h === h && antes.v === 0
    : antes.v === v && antes.h === 0);

  for (let k = 0; k < tentativas.length; k++) {
    const [nome, lado] = tentativas[k];
    const r = tentarMover(m, j, nome, orcamento, lado);
    // Na primeira de duas tentativas, só vale se o ajuste lateral (alinhar ou
    // escorregar) for para o lado da outra tecla; ajustar "para trás" faria o
    // jogador ir e voltar entre as duas direções. Resultado: com diagonal
    // segurada ele anda em escadinha, virando em cada cruzamento.
    let aceita;
    if (tentativas.length === 1 || k > 0) aceita = r.moveu;
    else {
      const voltaCurta = r.aberta && r.desvio <= m.ajuste.janelaVirada && (fresca || j.virando === nome);
      aceita = r.moveu && (r.lateral === 0 || r.lateral === lado || voltaCurta);
    }
    if (aceita) {
      if (k === 0 && tentativas.length === 2) j.virando = r.avancou ? null : nome;
      aplicar(m, j, r, nome);
      return;
    }
  }
  // Empurrando parede com uma só direção: vira o rosto, não anda. Com duas,
  // mantém o rosto para a escolha da tentativa não alternar a cada tick.
  if (tentativas.length === 1) j.dir = tentativas[0][0];
}

/** Correnteza (Lago Lacrimal): empurra quem está alinhado à faixa da água. */
export function aplicarCorrente(m, j) {
  const i = Math.floor(j.y / CASA) * m.colunas + Math.floor(j.x / CASA);
  const dir = m.piso[i];
  if (!DIRECOES[dir] || !m.ajuste.forcaCorrente) return;
  const { dc } = DIRECOES[dir];
  const desvio = dc !== 0 ? j.y - (Math.floor(j.y / CASA) * CASA + MEIA_CASA) : j.x - (Math.floor(j.x / CASA) * CASA + MEIA_CASA);
  if (Math.abs(desvio) > 150) return; // atravessando a correnteza de lado: quase não puxa
  const r = tentarMover(m, j, dir, m.ajuste.forcaCorrente, null);
  if (r.moveu) {
    j.x = r.x;
    j.y = r.y;
  }
}
