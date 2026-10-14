// Táticas dos robôs com os itens avançados e os bichinhos: chute, Pinça
// (levantar e arremessar), pulo do Saltinho, carapaça do Cascudo e arrancada
// da Disparada. Cada função devolve uma sequência de entradas (uma por tick)
// ou null. Tudo com as mesmas regras e a mesma leitura que o humano tem.

import {
  CASA, MEIA_CASA, VAZIO, MOLDURA, TUNEL, DIRECOES, NOMES_DIRECOES, DISTANCIA_SALTO, DURACAO_SALTO,
} from '../sim/constantes.js';
import { gotaEm } from '../sim/gotas.js';
import { colDe, linDe } from '../sim/jogadores.js';
import { darVolta } from '../sim/pinca.js';
import { analisar, alcanceDaGota, secaDesde, secaDurante, SEGURO } from './perigo.js';
import { casaDe, casasComGota, planejarFuga } from './caminhos.js';

export function entrada(extra = {}) {
  return { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false, ...extra };
}

const rivaisVivos = (m, j) => m.jogadores.filter((o) => o.vivo && o.id !== j.id);

/** Casa livre para uma gota parar/pousar (sem olhar jogadores). */
function livreParaGota(m, c, l, ignorar) {
  if (m.grade[l * m.colunas + c] !== VAZIO) return false;
  const g = gotaEm(m, c, l);
  return !g || g === ignorar;
}

/** Onde uma gota chutada para `dir` pararia (para em jogador também). */
export function paradaDoChute(m, g, dir) {
  const { dc, dl } = DIRECOES[dir];
  let c = g.col;
  let l = g.lin;
  for (let k = 0; k < 20; k++) {
    const nc = c + dc;
    const nl = l + dl;
    if (!livreParaGota(m, nc, nl, g)) break;
    if (m.jogadores.some((o) => o.vivo && colDe(o) === nc && linDe(o) === nl)) break;
    c = nc;
    l = nl;
  }
  return { col: c, lin: l };
}

/** Onde uma gota arremessada de (c, l) para `dir` pousaria (quicando em casa ocupada). */
export function pousoDoArremesso(m, c, l, dir) {
  const { dc, dl } = DIRECOES[dir];
  let p = darVolta(m, c + dc * m.ajuste.distanciaPinca, l + dl * m.ajuste.distanciaPinca);
  for (let k = 0; k < 30; k++) {
    const ocupada = !livreParaGota(m, p.col, p.lin, null) || m.jogadores.some((o) => o.vivo && colDe(o) === p.col && linDe(o) === p.lin);
    if (!ocupada) return p;
    p = darVolta(m, p.col + dc, p.lin + dl);
  }
  return null;
}

/** Algum rival dentro da cruz de uma gota nesta casa e sem saída boa? Devolve o melhor alvo. */
function rivalAcertado(m, j, gotaHipotetica, nivel, notaMinima = nivel.notaMinimaTatica) {
  const an = analisar(m, [gotaHipotetica]);
  const cruz = alcanceDaGota(m, gotaHipotetica, an.ocupadas);
  let melhor = null;
  for (const o of rivaisVivos(m, j)) {
    if (!cruz.includes(casaDe(m, o))) continue;
    const fuga = planejarFuga(m, o, an, casasComGota(m, o), { margem: 0, camadas: 12 });
    const nota = fuga.ok ? (fuga.seguras.length <= 1 ? 2 : 1) : 3;
    if (!melhor || nota > melhor.nota) melhor = { rival: o, nota };
  }
  return melhor && melhor.nota >= notaMinima ? melhor : null;
}

/** Depois da jogada, o próprio robô continua com fuga? */
function seguroDepois(m, j, extras, margem) {
  const an = analisar(m, extras);
  if (an.primeiro[casaDe(m, j)] === SEGURO) return true;
  return planejarFuga(m, j, an, casasComGota(m, j, extras), { margem }).ok;
}

/** Chute ofensivo: gota colada, rival na cruz de onde ela vai parar. */
export function taticaChute(m, j, nivel) {
  if (!j.chute) return null;
  const c = colDe(j);
  const l = linDe(j);
  for (const dir of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[dir];
    const g = gotaEm(m, c + dc, l + dl);
    if (!g || g.mov || g.pavio > 150 || g.passantes.length) continue;
    const parada = paradaDoChute(m, g, dir);
    if (parada.col === g.col && parada.lin === g.lin) continue;
    const hip = { col: parada.col, lin: parada.lin, pavio: Math.max(1, g.pavio - 8), alcance: g.alcance, penetrante: g.penetrante };
    // Chutar não gasta gota: basta o rival ficar na cruz de onde ela vai parar.
    const alvo = rivalAcertado(m, j, hip, nivel, Math.max(1, nivel.notaMinimaTatica - 1));
    if (!alvo) continue;
    if (!seguroDepois(m, j, [], nivel.margem)) continue;
    return [entrada({ [dir]: true }), entrada({ [dir]: true })];
  }
  return null;
}

/** Pinça ofensiva: em cima (ou colado) de uma gota, arremessa onde há rival. */
export function taticaPinca(m, j, nivel) {
  if (!j.pinca || j.segurando !== null) return null;
  const c = colDe(j);
  const l = linDe(j);
  const embaixo = gotaEm(m, c, l);
  if (!embaixo || embaixo.mov || embaixo.pavio < 40) return null;
  for (const dir of NOMES_DIRECOES) {
    const pouso = pousoDoArremesso(m, c, l, dir);
    if (!pouso) continue;
    const voo = m.ajuste.distanciaPinca * m.ajuste.vooPorCasa;
    const hip = { col: pouso.col, lin: pouso.lin, pavio: Math.max(embaixo.pavio - 2, voo), alcance: embaixo.alcance, penetrante: embaixo.penetrante };
    if (!rivalAcertado(m, j, hip, nivel)) continue;
    // Sem a gota embaixo, o robô precisa ficar seguro com ela lá no pouso.
    return [entrada({ bomba: true }), entrada({ [dir]: true })];
  }
  return null;
}

/** Fuga com a Pinça: levanta a gota de baixo de si e a joga para longe. */
export function fugaComPinca(m, j, margem) {
  if (!j.pinca || j.segurando !== null) return null;
  const c = colDe(j);
  const l = linDe(j);
  const embaixo = gotaEm(m, c, l);
  if (!embaixo || embaixo.mov || embaixo.pavio < 12) return null;
  const outras = m.gotas.filter((g) => g !== embaixo);
  for (const dir of NOMES_DIRECOES) {
    const pouso = pousoDoArremesso(m, c, l, dir);
    if (!pouso) continue;
    const hip = { col: pouso.col, lin: pouso.lin, pavio: Math.max(embaixo.pavio, 22), alcance: embaixo.alcance, penetrante: embaixo.penetrante };
    const sem = { ...m, gotas: outras };
    const an = analisar(sem, [hip]);
    if (an.primeiro[l * m.colunas + c] === SEGURO || planejarFuga(sem, j, an, casasComGota(sem, j, [hip]), { margem }).ok) {
      return [entrada({ bomba: true }), entrada({ [dir]: true })];
    }
  }
  return null;
}

/** Destino do pulo do Saltinho numa direção (mesma regra da simulação). */
function destinoDoPulo(m, j, dir) {
  const { dc, dl } = DIRECOES[dir];
  const c = colDe(j);
  const l = linDe(j);
  const meio = m.grade[(l + dl) * m.colunas + c + dc];
  if (meio === MOLDURA || meio === TUNEL) return null;
  const col = c + dc * DISTANCIA_SALTO;
  const lin = l + dl * DISTANCIA_SALTO;
  if (col < 1 || lin < 1 || col > m.colunas - 2 || lin > m.linhas - 2) return null;
  if (!livreParaGota(m, col, lin, null)) return null;
  if (m.jogadores.some((o) => o.vivo && o !== j && Math.abs(o.x - (col * CASA + MEIA_CASA)) < CASA && Math.abs(o.y - (lin * CASA + MEIA_CASA)) < CASA)) return null;
  return lin * m.colunas + col;
}

/** Emergência com bichinho: pula, fecha a carapaça ou arranca. */
export function fugaComBichinho(m, j, an, margem) {
  const tipo = j.montaria?.tipo;
  if (!tipo || j.recarga > 0) return null;
  const aqui = casaDe(m, j);
  if (tipo === 'saltinho') {
    for (const dir of NOMES_DIRECOES) {
      const alvo = destinoDoPulo(m, j, dir);
      if (alvo !== null && secaDesde(an, alvo, Math.max(0, DURACAO_SALTO - margem))) return [entrada({ [dir]: true, acao: true })];
    }
    for (const dir of NOMES_DIRECOES) {
      const alvo = destinoDoPulo(m, j, dir);
      if (alvo !== null && secaDurante(an, alvo, DURACAO_SALTO - 2, DURACAO_SALTO + 40)) return [entrada({ [dir]: true, acao: true })];
    }
  }
  if (tipo === 'cascudo') {
    const lado = ladoUnicoDaAmeaca(m, j, an);
    if (lado) return [entrada({ [lado]: true, acao: true })];
  }
  if (tipo === 'disparada') {
    for (const dir of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[dir];
      // Corredor reto e livre: a arrancada leva até a casa seca mais próxima nele.
      for (let k = 1; k <= 6; k++) {
        const i = aqui + dl * k * m.colunas + dc * k;
        const t = m.grade[i];
        if (t !== VAZIO || gotaEm(m, i % m.colunas, Math.floor(i / m.colunas))) break;
        if (an.primeiro[i] === SEGURO && k >= 2) return [entrada({ [dir]: true, acao: true })];
      }
    }
  }
  return null;
}

/** Se todo o perigo da casa vem de gotas numa só direção, devolve essa direção. */
export function ladoUnicoDaAmeaca(m, j, an) {
  const c = colDe(j);
  const l = linDe(j);
  const aqui = l * m.colunas + c;
  const lados = new Set();
  an.gotas.forEach((g, k) => {
    const cruz = alcanceDaGota(m, g, an.ocupadas);
    if (!cruz.includes(aqui) || an.tempo[k] > 90) return;
    if (g.col === c && g.lin === l) lados.add('centro');
    else if (g.lin === l) lados.add(g.col > c ? 'dir' : 'esq');
    else lados.add(g.lin > l ? 'baixo' : 'cima');
  });
  for (const r of m.respingos) {
    if (r.col === c && r.lin === l) lados.add('centro');
    else if (r.lin === l && Math.abs(r.col - c) <= Math.max(r.bracos.esq, r.bracos.dir)) lados.add(r.col > c ? 'dir' : 'esq');
    else if (r.col === c && Math.abs(r.lin - l) <= Math.max(r.bracos.cima, r.bracos.baixo)) lados.add(r.lin > l ? 'baixo' : 'cima');
  }
  if (lados.size !== 1 || lados.has('centro')) return null;
  return [...lados][0];
}

/** Disparada para encurtar uma fuga reta e urgente. */
export function arrancadaNaFuga(m, j, an, caminho) {
  if (j.montaria?.tipo !== 'disparada' || j.recarga > 0 || caminho.length < 3) return null;
  const aqui = caminho[0];
  if (an.primeiro[aqui] > 45) return null;
  const passo = caminho[1] - aqui;
  if (passo === 0 || caminho[2] - caminho[1] !== passo) return null;
  const dir = passo === 1 ? 'dir' : passo === -1 ? 'esq' : passo > 0 ? 'baixo' : 'cima';
  return [entrada({ [dir]: true, acao: true })];
}

/** Atalho do Saltinho: pular encurta muito o caminho até o alvo. */
export function atalhoDoSaltinho(m, j, distAteAlvo) {
  if (j.montaria?.tipo !== 'saltinho' || j.recarga > 0) return null;
  const atual = distAteAlvo(casaDe(m, j));
  if (atual < 4) return null;
  const an = analisar(m);
  for (const dir of NOMES_DIRECOES) {
    const alvo = destinoDoPulo(m, j, dir);
    if (alvo === null || an.primeiro[alvo] !== SEGURO) continue;
    const d = distAteAlvo(alvo);
    if (d >= 0 && d + 3 <= atual) return [entrada({ [dir]: true, acao: true })];
  }
  return null;
}

/** Fuga com chute: sem saída a pé, chuta para longe a gota colada que fecha o caminho. */
export function fugaComChute(m, j, margem) {
  if (!j.chute) return null;
  const c = colDe(j);
  const l = linDe(j);
  for (const dir of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[dir];
    const g = gotaEm(m, c + dc, l + dl);
    if (!g || g.mov || g.passantes.length) continue;
    const parada = paradaDoChute(m, g, dir);
    if (Math.abs(parada.col - c) + Math.abs(parada.lin - l) < 3) continue; // não vai longe o bastante
    const outras = m.gotas.filter((o) => o !== g);
    const hip = { col: parada.col, lin: parada.lin, pavio: g.pavio, alcance: g.alcance, penetrante: g.penetrante };
    const sem = { ...m, gotas: outras };
    if (planejarFuga(sem, j, analisar(sem, [hip]), casasComGota(sem, j, [hip]), { margem }).ok) return [entrada({ [dir]: true })];
  }
  return null;
}
