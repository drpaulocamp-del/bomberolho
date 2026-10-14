// Placar: barra da rodada (número, relógio, troféus para a taça) e um cartão por
// competidor com retrato, troféus e poderes. Só reescreve o DOM quando algo muda.

import { PERSONAGENS } from '../dados/personagens.js';
import { desenharPersonagem, encaixarPersonagem } from '../render/personagens.js';
import { NOMES_BICHINHOS } from '../sim/bichinhos.js';

export const ICONES = {
  gotas: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5C6 5 3.5 7.4 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.4 10 5 8 1.5z" fill="#3BA9FF" stroke="#155BB5" stroke-width="1.2"/></svg>',
  alcance: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.2" fill="#BFE8FF" stroke="#2C3E66" stroke-width="1.6"/><path d="M9.6 9.6l4.2 4.2" stroke="#7A4B12" stroke-width="2.2" stroke-linecap="round"/></svg>',
  velocidade: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 5h4M1 8h5M1.5 11h3.5" stroke="#2BA5F7" stroke-width="1.4" stroke-linecap="round"/><path d="M11 2.5c-1.4 2.5-3.2 4-3.2 6.2a3.2 3.2 0 0 0 6.4 0c0-2.2-1.8-3.7-3.2-6.2z" fill="#5CC2FF" stroke="#155BB5" stroke-width="1.1"/></svg>',
  chute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h3.5c.3 2 1.2 2.6 3 3 1.6.4 2.5 1.3 2.5 3v1.5H3.5z" fill="#FF8A3D" stroke="#B4501A" stroke-width="1.1"/><path d="M3.5 10h10.5" stroke="#fff" stroke-width="1.2"/></svg>',
  pinca: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2l7.5 10M6 1.5l6 10" stroke="#5E6B7D" stroke-width="1.6" stroke-linecap="round"/><path d="M13 11.5c-.6 1-1.4 1.6-1.4 2.4a1.4 1.4 0 0 0 2.8 0c0-.8-.8-1.4-1.4-2.4z" fill="#43B4FF"/></svg>',
  penetrante: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="6.5" y="3" width="3.5" height="10" rx="1" fill="#FFD772" stroke="#C9842E"/><path d="M1.5 8h12M11 5.5 13.5 8 11 10.5" stroke="#8B3FE0" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  trofeu: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h8v3.5a4 4 0 0 1-8 0z" fill="currentColor"/><path d="M4 3H2v1.5A2.5 2.5 0 0 0 4.5 7M12 3h2v1.5A2.5 2.5 0 0 1 11.5 7" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M7 9.2h2V12H7z" fill="currentColor"/><rect x="4.5" y="12" width="7" height="2.2" rx="1" fill="currentColor"/></svg>',
  relogio: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="5.6" fill="#fff" stroke="currentColor" stroke-width="1.6"/><path d="M8 5.8V9l2.2 1.4M6.5 1.8h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

export const ICONE_BICHINHO = {
  saltinho: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 11a5.5 5.5 0 0 1 11 0z" fill="#2FB777" stroke="#1F8A5C" stroke-width="1.2"/><path d="M4 6.2 3 5M8 5.5V4M12 6.2l1-1.2" stroke="#1F8A5C" stroke-width="1.2" stroke-linecap="round"/><path d="M3 11l-1 2.5M13 11l1 2.5" stroke="#1F8A5C" stroke-width="1.4" stroke-linecap="round"/></svg>',
  cascudo: '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="9" rx="6.5" ry="3.6" fill="#9FDCF8" stroke="#2C7FB8" stroke-width="1.4"/><path d="M4.5 7.6c1-1 2.6-1.4 4-1.2" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>',
  disparada: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14.5 8c-2.5-3-7-3-10-0 3 3 7.5 3 10 0z" fill="#F7962F" stroke="#B4560F" stroke-width="1.1"/><path d="M1 6.5h3M.8 9.5h3" stroke="#FFB067" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="11.6" r="1.3" fill="#3B2A1E"/><circle cx="10.5" cy="11.6" r="1.3" fill="#3B2A1E"/></svg>',
};

const NOMES_CISCO = { lento: 'olho embaçado: anda devagar', ligeiro: 'piscando sem parar: anda depressa demais', espirro: 'espirrando: solta gotas sem querer' };

/** Retrato do cartão: acordado na arena, cochilando quando foi descansar. */
function retratar(canvas, p, vivo) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  desenharPersonagem(ctx, p, { ...encaixarPersonagem(canvas.width, canvas.height), dir: 'baixo', fase: 0.4, sombra: false, expressao: vivo ? 'normal' : 'sono' });
}

function relogio(segundos) {
  const t = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export class Placar {
  constructor(raiz, barra) {
    this.raiz = raiz;
    this.barra = barra;
    this.cartoes = [];
    this.chave = '';
    this.chaveBarra = '';
  }

  montar(mundo) {
    this.raiz.replaceChildren();
    this.cartoes = mundo.jogadores.map((j) => {
      const p = PERSONAGENS[j.personagem];
      const el = document.createElement('li');
      el.className = j.id === 0 ? 'cartao eu' : 'cartao';
      el.style.setProperty('--cor', p.cor);
      const retrato = document.createElement('canvas');
      retrato.className = 'retrato';
      retrato.width = 96;
      retrato.height = 96;
      retratar(retrato, p, true);
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `<span class="nome">${p.nome}${j.id === 0 ? ' <em>você</em>' : ''}<span class="trofeus"></span></span><span class="poderes"></span>`;
      el.append(retrato, info);
      this.raiz.append(el);
      return { el, retrato, p, vivo: true, poderes: info.querySelector('.poderes'), trofeus: info.querySelector('.trofeus') };
    });
    this.chave = '';
    this.chaveBarra = '';
  }

  /** @param {object} jogo controlador (mundo + partida) */
  atualizar(jogo) {
    const m = jogo.mundo;
    const p = jogo.partida;
    // No placar entre rodadas, a barra ainda mostra a rodada que acabou.
    this.atualizarBarra(m, p, m.fase === 'fim' && !p.encerrada ? p.historico.length : p.rodada);
    const chave = m.jogadores.map((j) => [j.vivo, j.gotas, j.alcance, j.velocidade, j.chute, j.pinca, j.penetrante,
      j.montaria?.tipo, j.cisco?.tipo, p.vitorias[j.id]].join(',')).join('|') + p.alvo;
    if (chave === this.chave) return;
    this.chave = chave;
    m.jogadores.forEach((j, k) => {
      const c = this.cartoes[k];
      if (!c) return;
      const nome = PERSONAGENS[j.personagem].nome;
      c.el.classList.toggle('fora', !j.vivo);
      if (c.vivo !== j.vivo) {
        c.vivo = j.vivo;
        retratar(c.retrato, c.p, j.vivo);
      }
      c.el.setAttribute('aria-label', `${nome}: ${p.vitorias[j.id]} de ${p.alvo} troféus, ${j.vivo ? 'na arena' : 'descansando'}`);
      c.trofeus.innerHTML = Array.from({ length: p.alvo }, (_, t) => `<i class="${t < p.vitorias[j.id] ? 'ganho' : ''}">${ICONES.trofeu}</i>`).join('');
      if (!j.vivo) {
        c.poderes.innerHTML = '<span class="descanso">descansando</span>';
        return;
      }
      let html = `<span title="Gotas ao mesmo tempo">${ICONES.gotas}${j.gotas}</span>`
        + `<span title="Alcance do respingo">${ICONES.alcance}${j.alcance}</span>`
        + `<span title="Velocidade">${ICONES.velocidade}${j.velocidade + 1}</span>`;
      if (j.chute) html += `<span class="selo" title="Chute-Pisca: ande contra a gota para chutar">${ICONES.chute}</span>`;
      if (j.pinca) html += `<span class="selo" title="Pinça: aperte em cima da gota para levantar, solte para jogar">${ICONES.pinca}</span>`;
      if (j.penetrante) html += `<span class="selo" title="Colírio Penetrante: o respingo atravessa blocos">${ICONES.penetrante}</span>`;
      if (j.montaria) html += `<span class="selo bichinho" title="${NOMES_BICHINHOS[j.montaria.tipo]}: vida extra e poder no segundo botão">${ICONE_BICHINHO[j.montaria.tipo]}</span>`;
      if (j.cisco) html += `<span class="selo cisco" title="Cisco: ${NOMES_CISCO[j.cisco.tipo]}">cisco!</span>`;
      c.poderes.innerHTML = html;
    });
  }

  atualizarBarra(m, p, rodada) {
    if (!this.barra) return;
    const seg = m.tempoRestante === null ? null : m.tempoRestante / 60;
    const aperto = m.aperto.ativo;
    const chave = `${rodada}|${p.alvo}|${seg === null ? '' : Math.ceil(seg)}|${aperto}|${m.arena}`;
    if (chave === this.chaveBarra) return;
    this.chaveBarra = chave;
    this.barra.classList.toggle('apertando', aperto);
    this.barra.innerHTML = `<span class="rodada">Rodada ${rodada}</span>`
      + `<span class="tempo" title="Tempo da rodada">${ICONES.relogio}${seg === null ? '—' : relogio(seg)}</span>`
      + `<span class="meta" title="Quem juntar ${p.alvo} ${p.alvo === 1 ? 'troféu' : 'troféus'} leva a taça">${ICONES.trofeu}${p.alvo}</span>`;
  }
}
