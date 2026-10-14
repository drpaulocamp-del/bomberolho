// Avisos sobre a arena: pausa, "você foi descansar", placar entre rodadas e
// a taça no fim da partida. Frases curtas, para quem está aprendendo a ler.

import { PERSONAGENS } from '../dados/personagens.js';
import { ICONES } from './hud.js';

export class Avisos {
  constructor(elemento, acoes) {
    this.el = elemento;
    this.titulo = elemento.querySelector('h2');
    this.texto = elemento.querySelector('p');
    this.trofeus = elemento.querySelector('.placar-trofeus');
    this.botao = elemento.querySelector('button');
    this.faixa = document.getElementById('faixa');
    this.botao.addEventListener('click', () => acoes[this.acao]?.());
    this.chave = '';
  }

  atualizar(jogo) {
    const m = jogo.mundo;
    const p = jogo.partida;
    const humano = m.jogadores[0];
    let chave = 'nada';
    if (jogo.tela === 'resultado') chave = `fim${p.campeao}`;
    else if (jogo.tela === 'pausado') chave = 'pausa';
    else if (jogo.tela === 'intervalo') chave = `intervalo${p.rodada}|${Math.ceil(jogo.intervalo / 60)}|${m.fase}`;
    else if (!humano.vivo && !jogo.demo) chave = 'fora';
    if (chave === this.chave) return;
    const novo = chave.replace(/\|.*$/, '') !== this.chave.replace(/\|.*$/, '');
    this.chave = chave;

    this.faixa.hidden = chave !== 'fora';
    if (chave === 'nada' || chave === 'fora') {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    const nome = (id) => PERSONAGENS[m.jogadores[id].personagem].nome;
    if (chave === 'pausa') {
      this.mostrar('Pausado', 'Respire fundo e pisque os olhos. Quando quiser, é só continuar!', 'Continuar', 'continuar', null);
    } else if (jogo.tela === 'intervalo') {
      const v = m.vencedor;
      const titulo = m.fase !== 'fim' ? 'Fim da rodada!' : v === null ? 'Empate!' : v === 0 && !jogo.demo ? 'Você ganhou a rodada!' : `${nome(v)} ganhou a rodada!`;
      const motivo = v === null ? (m.tempoEsgotado ? 'O tempo acabou e ninguém levou troféu.' : 'Todos se molharam juntos!') : 'Mais um troféu na estante.';
      const s = Math.ceil(jogo.intervalo / 60);
      this.mostrar(titulo, `${motivo} Próxima rodada em ${s}…`, 'Próxima rodada', 'pular', jogo);
    } else if (p.campeao === null) {
      this.mostrar('Partida empatada!', 'Foi uma disputa e tanto. Vamos de novo?', 'Jogar de novo', 'recomecar', jogo);
    } else if (p.campeao === 0 && !jogo.demo) {
      this.mostrar('Você levou a taça!', p.desempate ? 'Empate nos troféus, mas você molhou mais rivais!' : 'Que pontaria! Os respingos foram todos certeiros.', 'Jogar de novo', 'recomecar', jogo);
    } else {
      this.mostrar(`${nome(p.campeao)} levou a taça!`, p.desempate ? 'Empate nos troféus: levou quem molhou mais rivais. Vamos de novo?' : 'Na próxima é você. Vamos de novo?', 'Jogar de novo', 'recomecar', jogo);
    }
    if (novo) this.botao.focus({ preventScroll: true });
  }

  mostrar(titulo, texto, rotulo, acao, jogo) {
    this.titulo.textContent = titulo;
    this.texto.textContent = texto;
    this.botao.textContent = rotulo;
    this.acao = acao;
    this.trofeus.hidden = !jogo;
    if (jogo) {
      const m = jogo.mundo;
      const p = jogo.partida;
      this.trofeus.innerHTML = m.jogadores.map((j) => {
        const per = PERSONAGENS[j.personagem];
        const tacas = Array.from({ length: p.alvo }, (_, t) => `<i class="${t < p.vitorias[j.id] ? 'ganho' : ''}">${ICONES.trofeu}</i>`).join('');
        return `<li style="--cor:${per.cor}"><span>${per.nome}${j.id === 0 && !jogo.demo ? ' (você)' : ''}</span><span class="tacas">${tacas}</span></li>`;
      }).join('');
    }
  }
}
