// Avisos sobre a arena: pausa, "você foi descansar" e resultado.

import { PERSONAGENS } from '../dados/personagens.js';

export class Avisos {
  constructor(elemento, acoes) {
    this.el = elemento;
    this.titulo = elemento.querySelector('h2');
    this.texto = elemento.querySelector('p');
    this.botao = elemento.querySelector('button');
    this.faixa = document.getElementById('faixa');
    this.botao.addEventListener('click', () => acoes[this.acao]?.());
    this.chave = '';
  }

  atualizar(jogo) {
    const m = jogo.mundo;
    const humano = m.jogadores[0];
    let chave = 'nada';
    if (jogo.tela === 'resultado') chave = `fim${m.vencedor}`;
    else if (jogo.tela === 'pausado') chave = 'pausa';
    else if (!humano.vivo && !jogo.demo) chave = 'fora';
    if (chave === this.chave) return;
    this.chave = chave;

    this.faixa.hidden = chave !== 'fora';
    if (chave === 'nada' || chave === 'fora') {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    if (chave === 'pausa') {
      this.mostrar('Pausado', 'Respire fundo e pisque os olhos. Quando quiser, é só continuar!', 'Continuar', 'continuar');
    } else if (m.vencedor === null) {
      this.mostrar('Empate!', 'Ninguém ficou de pé desta vez.', 'Jogar de novo', 'recomecar');
    } else if (m.vencedor === 0 && !jogo.demo) {
      this.mostrar('Você venceu!', 'Que pontaria! Os respingos foram todos certeiros.', 'Jogar de novo', 'recomecar');
    } else {
      const nome = PERSONAGENS[m.jogadores[m.vencedor].personagem].nome;
      this.mostrar(`${nome} venceu!`, 'Na próxima é você. Vamos de novo?', 'Jogar de novo', 'recomecar');
    }
    this.botao.focus({ preventScroll: true });
  }

  mostrar(titulo, texto, rotulo, acao) {
    this.titulo.textContent = titulo;
    this.texto.textContent = texto;
    this.botao.textContent = rotulo;
    this.acao = acao;
  }
}
