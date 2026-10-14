// Avisos sobre a arena: pausa, confirmação de saída, "você foi descansar",
// placar entre rodadas e a taça no fim da partida, com uma curiosidade sobre
// os olhos. Frases curtas e botões grandes, para quem está aprendendo a ler.
// O primeiro botão é sempre o caminho principal (Enter também o aciona).

import { PERSONAGENS } from '../dados/personagens.js';
import { desenharPersonagem, desenharPersonagemRapido, encaixarPersonagem } from '../render/personagens.js';
import { ICONES } from './hud.js';

const TAU = Math.PI * 2;
const CONFETE = ['#FF6F61', '#FFC93C', '#2FBF71', '#3FA9F5', '#8B5CF6', '#EC4899'];

export class Avisos {
  /**
   * @param {HTMLElement} elemento #aviso
   * @param {object} acoes { continuar, recomecar, pular, menu }
   * @param {object} op { sortear (curiosidade), reduzido() }
   */
  constructor(elemento, acoes, op) {
    this.el = elemento;
    this.op = op;
    this.titulo = elemento.querySelector('h2');
    this.texto = elemento.querySelector('.aviso-texto');
    this.trofeus = elemento.querySelector('.placar-trofeus');
    this.acoesEl = elemento.querySelector('.acoes');
    this.arte = elemento.querySelector('.aviso-arte');
    this.curiosidade = elemento.querySelector('.curiosidade');
    this.retratoCuriosidade = this.curiosidade.querySelector('canvas');
    this.faixa = document.getElementById('faixa');
    this.retratoFaixa = this.faixa.querySelector('canvas');
    this.acoesEl.addEventListener('click', (e) => {
      const bt = e.target.closest('button');
      if (bt) acoes[bt.dataset.acao]?.();
    });
    this.chave = '';
    this.saindo = false;
    this.cena = null;
    this.t = 0;
  }

  /** Liga/desliga a pergunta "Sair da partida?" (mostrada sobre a pausa). */
  perguntarSaida(sim) {
    this.saindo = !!sim;
    this.chave = '';
  }

  atualizar(jogo, dtSeg = 0) {
    this.t += dtSeg || 1 / 60;
    const m = jogo.mundo;
    const p = jogo.partida;
    const humano = m.jogadores[0];
    let chave = 'nada';
    if (jogo.tela === 'menu') chave = 'nada';
    else if (jogo.tela === 'resultado') chave = `fim${p.campeao}`;
    else if (jogo.tela === 'pausado') chave = this.saindo ? 'sair' : 'pausa';
    else if (jogo.tela === 'intervalo') chave = `intervalo${p.rodada}|${Math.ceil(jogo.intervalo / 60)}|${m.fase}`;
    else if (!humano.vivo && !jogo.demo) chave = 'fora';
    if (chave !== this.chave) this.trocar(jogo, chave);
    if (!this.el.hidden && this.cena) {
      this.desenharCena();
      this.desenharContador();
    }
    if (!this.faixa.hidden) this.desenharFaixa(jogo);
  }

  trocar(jogo, chave) {
    const m = jogo.mundo;
    const p = jogo.partida;
    const novo = chave.replace(/\|.*$/, '') !== this.chave.replace(/\|.*$/, '');
    this.chave = chave;
    this.faixa.hidden = chave !== 'fora';
    if (chave === 'nada' || chave === 'fora') {
      this.el.hidden = true;
      this.cena = null;
      return;
    }
    this.el.hidden = false;
    const nome = (id) => PERSONAGENS[m.jogadores[id].personagem].nome;
    const voce = (id) => id === 0 && !jogo.demo;
    if (chave === 'sair') {
      this.mostrar('Sair da partida?', 'A partida para aqui. Você pode jogar outra depois!',
        [['Continuar jogando', 'continuar'], ['Sair', 'menu']], null, { tipo: 'sono', ids: [0] }, jogo);
    } else if (chave === 'pausa') {
      this.mostrar('Pausado', 'Respire fundo e pisque os olhos. Quando quiser, é só continuar!',
        [['Continuar', 'continuar'], ['Recomeçar', 'recomecar'], ['Menu', 'menu']], null, { tipo: 'sono', ids: [0] }, jogo);
    } else if (jogo.tela === 'intervalo') {
      const v = m.vencedor;
      const titulo = m.fase !== 'fim' ? 'Fim da rodada!' : v === null ? 'Empate!' : voce(v) ? 'Você ganhou a rodada!' : `${nome(v)} ganhou a rodada!`;
      const motivo = v === null ? (m.tempoEsgotado ? 'O tempo acabou e ninguém levou troféu.' : 'Todos se molharam juntos!') : 'Mais um troféu na estante.';
      const s = Math.ceil(jogo.intervalo / 60);
      const cena = v === null ? { tipo: 'empate', ids: [0, 1, 2, 3] } : { tipo: 'vitoria', ids: [v] };
      this.mostrar(titulo, `${motivo} Próxima rodada em ${s}…`, [['Próxima rodada', 'pular']], jogo, cena, jogo);
    } else if (p.campeao === null) {
      this.mostrar('Partida empatada!', 'Foi uma disputa e tanto. Vamos de novo?',
        [['Jogar de novo', 'recomecar'], ['Menu', 'menu']], jogo, { tipo: 'empate', ids: [0, 1, 2, 3] }, jogo);
    } else if (voce(p.campeao)) {
      this.mostrar('Você levou a taça!', p.desempate ? 'Empate nos troféus, mas você molhou mais rivais!' : 'Que pontaria! Os respingos foram certeiros.',
        [['Jogar de novo', 'recomecar'], ['Menu', 'menu']], jogo, { tipo: 'taca', ids: [p.campeao] }, jogo);
    } else {
      const fecho = jogo.demo ? 'Que partida! Vamos de novo?' : 'Na próxima é você. Vamos de novo?';
      this.mostrar(`${nome(p.campeao)} levou a taça!`, p.desempate ? 'Empate nos troféus: levou quem molhou mais rivais. Vamos de novo?' : fecho,
        [['Jogar de novo', 'recomecar'], ['Menu', 'menu']], jogo, { tipo: 'taca', ids: [p.campeao] }, jogo);
    }
    if (novo) {
      this.trocarCuriosidade();
      this.acoesEl.querySelector('button')?.focus({ preventScroll: true });
    }
  }

  trocarCuriosidade() {
    const c = this.op.sortear();
    this.curiosidade.querySelector('p').textContent = c.texto;
    this.quemConta = c.quem;
  }

  mostrar(titulo, texto, botoes, placarDe, cena, jogo) {
    this.titulo.textContent = titulo;
    this.texto.textContent = texto;
    this.acoesEl.replaceChildren(...botoes.map(([rotulo, acao], k) => {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.dataset.acao = acao;
      bt.textContent = rotulo;
      if (k > 0) bt.className = 'secundario';
      return bt;
    }));
    this.cena = { ...cena, personagens: cena.ids.map((id) => jogo.mundo.jogadores[id].personagem), desde: this.t };
    this.arte.hidden = false;
    this.curiosidade.hidden = false;
    this.el.dataset.cena = cena.tipo;
    this.trofeus.hidden = !placarDe;
    if (placarDe) {
      const m = placarDe.mundo;
      const p = placarDe.partida;
      this.trofeus.innerHTML = m.jogadores.map((j) => {
        const per = PERSONAGENS[j.personagem];
        const tacas = Array.from({ length: p.alvo }, (_, t) => `<i class="${t < p.vitorias[j.id] ? 'ganho' : ''}">${ICONES.trofeu}</i>`).join('');
        return `<li style="--cor:${per.cor}"><span>${per.nome}${j.id === 0 && !placarDe.demo ? ' (você)' : ''}</span><span class="tacas">${tacas}</span></li>`;
      }).join('');
    }
  }

  /** Arte do cartão: quem venceu comemorando (com confete), todos encharcados no empate, ou cochilando na pausa. */
  desenharCena() {
    const c = this.arte;
    if (c.clientWidth < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const quieto = this.op.reduzido();
    const t = quieto ? 0.5 : this.t;
    const cena = this.cena;
    const n = cena.personagens.length;
    // Cabe inteiro: acessório (0,87 s) + pés (0,46 s) + pulo (0,1 s); largura ~1,2 s cada.
    const s = Math.min(h / 1.43, (w / n) / 1.15);
    if (cena.tipo === 'taca' || cena.tipo === 'vitoria') this.confete(ctx, w, h, t, quieto, cena.tipo === 'taca' ? 26 : 12);
    cena.personagens.forEach((id, k) => {
      const x = (w / n) * (k + 0.5);
      const fase = t + k * 0.8;
      let o;
      if (cena.tipo === 'sono') {
        o = { expressao: 'sono', fase: quieto ? 0 : fase * 0.3 };
        zzz(ctx, x + s * 0.32, h * 0.32, s, t);
      } else if (cena.tipo === 'empate') {
        o = { molhado: 1, fase };
      } else {
        const pulo = quieto ? 0 : Math.abs(Math.sin(fase * 5)) * s * 0.1;
        o = { expressao: 'alegre', bracos: 'cima', fase, pulo };
      }
      desenharPersonagem(ctx, PERSONAGENS[id], {
        x, y: h - s * 0.47 - (o.pulo || 0), s, dir: 'baixo', sombra: !o.pulo || o.pulo < 2, ...o,
      });
      if (cena.tipo === 'taca') taca(ctx, x + s * 0.48, h - s * 0.32, s * 0.42);
    });
  }

  /**
   * Quem conta a curiosidade: o personagem ligado ao assunto, acenando ao lado
   * do "Você sabia?" (parado com reduzir-movimento).
   */
  desenharContador() {
    const c = this.retratoCuriosidade;
    const id = this.quemConta;
    if (!id || !PERSONAGENS[id] || c.clientWidth < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const quieto = this.op.reduzido();
    const fase = quieto ? 0 : this.t;
    desenharPersonagemRapido(ctx, PERSONAGENS[id], {
      ...encaixarPersonagem(w, h), dir: 'baixo', fase, sombra: false,
      expressao: 'normal', bracos: quieto ? 'repouso' : 'aceno', piscar: (fase % 3.1) < 0.12 ? 1 : 0,
    }, dpr);
  }

  confete(ctx, w, h, t, quieto, n) {
    for (let k = 0; k < n; k++) {
      const semente = Math.sin(k * 91.7) * 1000;
      const fx = semente - Math.floor(semente);
      const vel = 0.25 + ((k * 37) % 10) / 25;
      const y = quieto ? ((k * 0.37) % 1) * h : (((t * vel + fx) % 1) * (h + 20)) - 10;
      const x = fx * w + Math.sin(t * 2 + k) * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + k);
      ctx.fillStyle = CONFETE[k % CONFETE.length];
      ctx.fillRect(-3, -1.6, 6, 3.2);
      ctx.restore();
    }
  }

  desenharFaixa(jogo) {
    const c = this.retratoFaixa;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const p = PERSONAGENS[jogo.mundo.jogadores[0].personagem];
    desenharPersonagem(ctx, p, { ...encaixarPersonagem(c.width, c.height), dir: 'baixo', expressao: 'sono', fase: this.t * 0.3, sombra: false });
  }
}

function zzz(ctx, x, y, s, t) {
  ctx.save();
  ctx.fillStyle = '#5B6B8C';
  ctx.textAlign = 'center';
  for (let k = 0; k < 3; k++) {
    const f = (t * 0.5 + k / 3) % 1;
    ctx.globalAlpha = Math.sin(f * Math.PI);
    ctx.font = `800 ${Math.round(s * (0.14 + f * 0.12))}px system-ui, sans-serif`;
    ctx.fillText('z', x + f * s * 0.25, y - f * s * 0.35);
  }
  ctx.restore();
}

/** Taça dourada pequena, ao lado de quem venceu a partida. */
function taca(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#FFE58F');
  g.addColorStop(1, '#E0A100');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#9A6B00';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.8);
  ctx.lineTo(r * 0.5, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.5, r * 0.1, 0, r * 0.15);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.1, -r * 0.5, -r * 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-r * 0.1, r * 0.15, r * 0.2, r * 0.35);
  ctx.roundRect(-r * 0.38, r * 0.48, r * 0.76, r * 0.22, r * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = r * 0.1;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(lado * r * 0.52, -r * 0.5, r * 0.22, -Math.PI / 2, Math.PI / 2, lado < 0);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.45, r * 0.07, r * 0.22, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}
