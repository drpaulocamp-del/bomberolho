// Placar lateral/superior: um cartão por competidor com retrato e poderes.
// Só reescreve o DOM quando algo muda.

import { PERSONAGENS } from '../dados/personagens.js';
import { desenharPersonagem } from '../render/personagens.js';

const ICONES = {
  gotas: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5C6 5 3.5 7.4 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.4 10 5 8 1.5z" fill="#3BA9FF" stroke="#155BB5" stroke-width="1.2"/></svg>',
  alcance: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.2" fill="#BFE8FF" stroke="#2C3E66" stroke-width="1.6"/><path d="M9.6 9.6l4.2 4.2" stroke="#7A4B12" stroke-width="2.2" stroke-linecap="round"/></svg>',
  velocidade: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 5h4M1 8h5M1.5 11h3.5" stroke="#2BA5F7" stroke-width="1.4" stroke-linecap="round"/><path d="M11 2.5c-1.4 2.5-3.2 4-3.2 6.2a3.2 3.2 0 0 0 6.4 0c0-2.2-1.8-3.7-3.2-6.2z" fill="#5CC2FF" stroke="#155BB5" stroke-width="1.1"/></svg>',
};

export class Placar {
  constructor(raiz) {
    this.raiz = raiz;
    this.cartoes = [];
    this.chave = '';
  }

  montar(mundo) {
    this.raiz.replaceChildren();
    this.cartoes = mundo.jogadores.map((j) => {
      const p = PERSONAGENS[j.personagem];
      const el = document.createElement('li');
      el.className = 'cartao';
      el.style.setProperty('--cor', p.cor);
      const retrato = document.createElement('canvas');
      retrato.className = 'retrato';
      retrato.width = 96;
      retrato.height = 96;
      const ctx = retrato.getContext('2d');
      desenharPersonagem(ctx, p, { x: 48, y: 50, s: 84, dir: 'baixo', andando: false, fase: 0, piscar: 0 });
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `<span class="nome">${p.nome}${j.id === 0 ? ' <em>você</em>' : ''}</span><span class="poderes"></span>`;
      el.append(retrato, info);
      this.raiz.append(el);
      return { el, poderes: info.querySelector('.poderes') };
    });
    this.chave = '';
  }

  atualizar(mundo) {
    const chave = mundo.jogadores.map((j) => `${j.vivo}${j.gotas}${j.alcance}${j.velocidade}`).join('|');
    if (chave === this.chave) return;
    this.chave = chave;
    mundo.jogadores.forEach((j, k) => {
      const c = this.cartoes[k];
      if (!c) return;
      c.el.classList.toggle('fora', !j.vivo);
      c.el.setAttribute('aria-label', `${PERSONAGENS[j.personagem].nome}: ${j.vivo ? 'na arena' : 'descansando'}`);
      c.poderes.innerHTML = j.vivo
        ? `<span title="Gotas ao mesmo tempo">${ICONES.gotas}${j.gotas}</span>`
          + `<span title="Alcance do respingo">${ICONES.alcance}${j.alcance}</span>`
          + `<span title="Velocidade">${ICONES.velocidade}${j.velocidade + 1}</span>`
        : '<span class="descanso">descansando</span>';
    });
  }
}
