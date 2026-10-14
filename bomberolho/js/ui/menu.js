// Menus: tela inicial (logo, desfile dos personagens, Jogar, som, curiosidade),
// escolha do personagem e escolha de arena + robôs + troféus. Feitos para
// quem mal lê: figuras grandes, uma decisão por tela, Voltar sempre à vista.

import { PERSONAGENS, ORDEM_PERSONAGENS, escalarPersonagens } from '../dados/personagens.js';
import { ARENAS, ORDEM_ARENAS } from '../sim/arenas.js';
import { criarMundo } from '../sim/mundo.js';
import { BLOCO, LARGADAS } from '../sim/constantes.js';
import { criarPecas } from '../render/pecas.js';
import { obterTema } from '../render/temas.js';
import { desenharPersonagem, desenharPersonagemRapido } from '../render/personagens.js';
import { desenharLogo } from '../render/logo.js';
import { desenharGota, desenharItem, desenharRespingos } from '../render/efeitos.js';
import { ICONES } from './hud.js';

const DESCRICAO_ARENA = {
  jardim: 'Flores e pólen',
  lago: 'Correnteza leva você',
  caverna: 'Túneis de lado a lado',
  vale: 'Clareira no meio',
  consultorio: 'Lente no chão: gota maior',
  surpresa: 'Uma arena diferente a cada rodada',
};

const DIFICULDADES = [
  { id: 'facil', nome: 'Fácil', dica: 'Para começar', gotas: 1 },
  { id: 'medio', nome: 'Médio', dica: 'Já sei jogar', gotas: 2 },
  { id: 'dificil', nome: 'Difícil', dica: 'Desafio!', gotas: 3 },
];

const AJUDA = [
  { arte: 'andar', texto: 'Ande com as setas (ou W A S D).' },
  { arte: 'gota', texto: 'Aperte Espaço para soltar uma gotinha.' },
  { arte: 'respingo', texto: 'Ela estoura em cruz. Saia da frente!' },
  { arte: 'item', texto: 'O respingo abre os blocos. Pegue os prêmios!' },
  { arte: 'taca', texto: 'Quem ficar sequinho por último ganha um troféu.' },
];

function dprLimitado() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Ajusta o canvas ao tamanho CSS (nítido em telas densas). Devolve o contexto escalado. */
function prepararCanvas(c) {
  const dpr = dprLimitado();
  const w = Math.max(1, Math.round(c.clientWidth));
  const h = Math.max(1, Math.round(c.clientHeight));
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export class Menu {
  /**
   * @param {HTMLElement} raiz  #menu
   * @param {object} op { prefs, som, sortear (curiosidade), aoJogar(opcoes), reduzido() }
   */
  constructor(raiz, op) {
    this.raiz = raiz;
    this.op = op;
    this.etapa = null;
    this.t = 0;
    this.ultimo = 0;
    this.quadro = this.quadro.bind(this);
    const dados = op.prefs.dados;
    this.escolha = { personagem: dados.personagem, arena: dados.arena, dificuldade: dados.dificuldade, rodadas: dados.rodadas };
    this.montarPersonagens();
    this.montarArenas();
    this.montarPilulas();
    this.montarAjuda();
    this.trocarCuriosidade();
    raiz.addEventListener('click', (e) => this.aoClicar(e));
    raiz.addEventListener('keydown', (e) => this.aoTeclar(e));
    raiz.querySelector('.bt-outra').addEventListener('click', () => { this.op.som.tocar('clique'); this.trocarCuriosidade(); });
  }

  get aberto() {
    return this.etapa !== null;
  }

  abrir(etapa = 'inicio') {
    this.raiz.hidden = false;
    this.mostrar(etapa);
    this.atualizarTacas();
    if (!this.raf) {
      this.ultimo = performance.now();
      this.raf = requestAnimationFrame(this.quadro);
    }
  }

  fechar() {
    this.raiz.hidden = true;
    this.etapa = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.raiz.querySelector('.ajuda').hidden = true;
  }

  mostrar(etapa) {
    this.etapa = etapa;
    for (const tela of this.raiz.querySelectorAll('.tela')) tela.hidden = tela.dataset.etapa !== etapa;
    this.raiz.dataset.etapa = etapa;
    this.op.aoMudarEtapa?.(etapa);
    // Foco no que importa em cada tela (teclado e leitores de tela).
    const alvo = etapa === 'inicio' ? '.bt-jogar'
      : etapa === 'personagem' ? '.grade-personagens [aria-checked="true"]'
        : '.bt-comecar';
    requestAnimationFrame(() => this.raiz.querySelector(alvo)?.focus({ preventScroll: true }));
    if (etapa === 'personagem') this.atualizarDestaque();
  }

  aoClicar(e) {
    const bt = e.target.closest('button');
    if (!bt) return;
    const acao = bt.dataset.acao;
    if (acao) this.op.som.tocar(acao === 'comecar' ? 'escolha' : 'clique');
    if (acao === 'escolher') this.mostrar('personagem');
    else if (acao === 'proximo') this.mostrar('arena');
    else if (acao === 'voltar') this.mostrar(this.etapa === 'arena' ? 'personagem' : 'inicio');
    else if (acao === 'comecar') this.comecar();
    else if (acao === 'ajuda') this.abrirAjuda(true);
    else if (acao === 'fechar-ajuda') this.abrirAjuda(false);
  }

  /** Setas andam entre as opções de um grupo; Esc volta. */
  aoTeclar(e) {
    if (e.key === 'Escape') {
      if (!this.raiz.querySelector('.ajuda').hidden) this.abrirAjuda(false);
      else if (this.etapa !== 'inicio') this.mostrar(this.etapa === 'arena' ? 'personagem' : 'inicio');
      e.preventDefault();
      return;
    }
    const grupo = e.target.closest('.grade-foco');
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!grupo || !passo) return;
    const botoes = [...grupo.querySelectorAll('button')];
    const i = botoes.indexOf(e.target.closest('button'));
    const proximo = botoes[(i + passo + botoes.length) % botoes.length];
    proximo.focus();
    proximo.click();
    e.preventDefault();
  }

  comecar() {
    const { personagem, arena, dificuldade, rodadas } = this.escolha;
    this.op.prefs.mudar({ personagem, arena, dificuldade, rodadas });
    this.op.aoJogar({ personagem, arena, dificuldade, rodadas });
  }

  abrirAjuda(abrir) {
    const caixa = this.raiz.querySelector('.ajuda');
    caixa.hidden = !abrir;
    if (abrir) {
      this.desenharAjuda();
      caixa.querySelector('button').focus({ preventScroll: true });
    } else {
      this.raiz.querySelector('.bt-ajuda').focus({ preventScroll: true });
    }
  }

  // ── Montagem ─────────────────────────────────────────────

  montarPersonagens() {
    const grade = this.raiz.querySelector('.grade-personagens');
    this.cartoesPersonagem = ORDEM_PERSONAGENS.map((id) => {
      const p = PERSONAGENS[id];
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'cartao-personagem';
      bt.setAttribute('role', 'radio');
      bt.dataset.personagem = id;
      bt.style.setProperty('--cor', p.cor);
      bt.innerHTML = `<canvas aria-hidden="true"></canvas><span>${p.nome}</span>`;
      bt.addEventListener('click', () => {
        if (this.escolha.personagem !== id) this.op.som.tocar('escolha');
        this.escolha.personagem = id;
        this.desde = this.t;
        this.atualizarSelecao();
      });
      grade.append(bt);
      return { id, bt, canvas: bt.querySelector('canvas') };
    });
    this.atualizarSelecao();
  }

  montarArenas() {
    const grade = this.raiz.querySelector('.grade-arenas');
    this.cartoesArena = [...ORDEM_ARENAS, 'surpresa'].map((id) => {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'cartao-arena';
      bt.setAttribute('role', 'radio');
      bt.dataset.arena = id;
      const nome = id === 'surpresa' ? 'Surpresa!' : ARENAS[id].nome;
      bt.innerHTML = `<canvas aria-hidden="true"></canvas><span class="nome-arena">${nome}</span><span class="desc-arena">${DESCRICAO_ARENA[id]}</span>`;
      bt.addEventListener('click', () => {
        if (this.escolha.arena !== id) this.op.som.tocar('escolha');
        this.escolha.arena = id;
        this.atualizarSelecao();
      });
      grade.append(bt);
      return { id, bt, canvas: bt.querySelector('canvas'), pronto: '' };
    });
  }

  montarPilulas() {
    const dif = this.raiz.querySelector('[data-campo="dificuldade"]');
    for (const d of DIFICULDADES) {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = `pilula dif-${d.id}`;
      bt.setAttribute('role', 'radio');
      bt.dataset.valor = d.id;
      bt.innerHTML = `<span class="gotinhas">${ICONES.gotas.repeat(d.gotas)}</span><span class="pilula-texto"><b>${d.nome}</b><small>${d.dica}</small></span>`;
      dif.append(bt);
    }
    const rod = this.raiz.querySelector('[data-campo="rodadas"]');
    for (const n of [1, 2, 3]) {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'pilula pilula-trofeus';
      bt.setAttribute('role', 'radio');
      bt.dataset.valor = String(n);
      bt.setAttribute('aria-label', `${n} ${n === 1 ? 'troféu' : 'troféus'}`);
      bt.innerHTML = `<span class="trofeuzinhos">${ICONES.trofeu.repeat(n)}</span><b>${n}</b>`;
      rod.append(bt);
    }
    for (const grupo of this.raiz.querySelectorAll('.pilulas')) {
      grupo.addEventListener('click', (e) => {
        const bt = e.target.closest('button');
        if (!bt) return;
        const campo = grupo.dataset.campo;
        const valor = campo === 'rodadas' ? Number(bt.dataset.valor) : bt.dataset.valor;
        if (this.escolha[campo] !== valor) this.op.som.tocar('escolha');
        this.escolha[campo] = valor;
        this.atualizarSelecao();
      });
    }
    this.atualizarSelecao();
  }

  montarAjuda() {
    const lista = this.raiz.querySelector('.passos-ajuda');
    lista.innerHTML = AJUDA.map((a) => `<li><canvas data-arte="${a.arte}" aria-hidden="true"></canvas><span>${a.texto}</span></li>`).join('');
  }

  atualizarSelecao() {
    for (const c of this.cartoesPersonagem || []) c.bt.setAttribute('aria-checked', String(c.id === this.escolha.personagem));
    for (const c of this.cartoesArena || []) c.bt.setAttribute('aria-checked', String(c.id === this.escolha.arena));
    for (const grupo of this.raiz.querySelectorAll('.pilulas')) {
      const atual = String(this.escolha[grupo.dataset.campo]);
      for (const bt of grupo.querySelectorAll('button')) bt.setAttribute('aria-checked', String(bt.dataset.valor === atual));
    }
    this.atualizarDestaque();
  }

  atualizarDestaque() {
    const p = PERSONAGENS[this.escolha.personagem];
    const caixa = this.raiz.querySelector('.destaque-texto');
    caixa.querySelector('strong').textContent = p.nome;
    caixa.querySelector('span').textContent = p.frase;
    this.raiz.querySelector('.destaque').style.setProperty('--cor', p.cor);
  }

  atualizarTacas() {
    const placar = this.op.prefs.dados.placar;
    const el = this.raiz.querySelector('.tacas-salvas');
    el.innerHTML = placar.partidas ? `${ICONES.trofeu}<b>${placar.tacas}</b> ${placar.tacas === 1 ? 'taça' : 'taças'}` : '';
    el.hidden = !placar.partidas;
  }

  trocarCuriosidade() {
    this.curiosidade = this.op.sortear();
    this.raiz.querySelector('.curiosidade-menu p').textContent = this.curiosidade.texto;
  }

  // ── Desenho (laço próprio enquanto o menu está aberto) ───

  quadro(agora) {
    const dt = Math.min(0.1, (agora - this.ultimo) / 1000);
    this.ultimo = agora;
    this.t += dt;
    this.par = !this.par;
    // Quadros alternados com a vitrine (ver main.js): ~30 qps bastam aqui.
    if (this.par) {
      this.raf = requestAnimationFrame(this.quadro);
      return;
    }
    const quieto = this.op.reduzido();
    if (this.etapa === 'inicio') this.desenharInicio(quieto);
    else if (this.etapa === 'personagem') this.desenharEscolhaPersonagem(quieto);
    else if (this.etapa === 'arena') this.desenharArenas();
    this.raf = requestAnimationFrame(this.quadro);
  }

  desenharInicio(quieto) {
    const logo = prepararCanvas(this.raiz.querySelector('.logo'));
    desenharLogo(logo.ctx, logo.w, logo.h, this.t, quieto);

    // Desfile: os oito, saltitando em fila, cada um no seu ritmo.
    const { ctx, w, h } = prepararCanvas(this.raiz.querySelector('.desfile'));
    ctx.clearRect(0, 0, w, h);
    const n = ORDEM_PERSONAGENS.length;
    const s = Math.min(h * 0.86, (w / n) * 0.98);
    ORDEM_PERSONAGENS.forEach((id, k) => {
      const fase = this.t + k * 0.7;
      const pulo = quieto ? 0 : Math.max(0, Math.sin(fase * 3.2)) * s * 0.12;
      const x = (w / n) * (k + 0.5);
      const y = h - s * 0.42 - pulo;
      const acenando = !quieto && Math.sin(this.t * 0.6 + k * 1.9) > 0.75;
      // Sombra à parte (encolhe no pulo): o boneco em si sai do cache de quadros.
      ctx.fillStyle = 'rgba(30, 40, 70, 0.18)';
      ctx.beginPath();
      ctx.ellipse(x, h - s * 0.05, s * 0.26 * (1 - pulo / s), s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      desenharPersonagemRapido(ctx, PERSONAGENS[id], {
        x, y, s, dir: 'baixo', fase, andando: false, sombra: false,
        expressao: acenando ? 'alegre' : 'normal', bracos: acenando ? 'aceno' : 'repouso',
        piscar: ((fase * 0.8) % 3.3) < 0.12 ? 1 : 0,
      }, dprLimitado());
    });

    this.desenharRetratoCuriosidade(this.raiz.querySelector('.curiosidade-menu canvas'), this.curiosidade.quem, quieto);
  }

  desenharRetratoCuriosidade(canvas, id, quieto) {
    const { ctx, w, h } = prepararCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const fase = quieto ? 0 : this.t;
    desenharPersonagemRapido(ctx, PERSONAGENS[id], {
      x: w / 2, y: h * 0.52, s: Math.min(w, h) * 0.95, dir: 'baixo', fase,
      expressao: 'normal', bracos: quieto ? 'repouso' : 'aceno', piscar: (fase % 3.1) < 0.12 ? 1 : 0,
    }, dprLimitado());
  }

  desenharEscolhaPersonagem(quieto) {
    for (const c of this.cartoesPersonagem) {
      const { ctx, w, h } = prepararCanvas(c.canvas);
      ctx.clearRect(0, 0, w, h);
      const escolhido = c.id === this.escolha.personagem;
      const fase = (quieto ? 0 : this.t) + ORDEM_PERSONAGENS.indexOf(c.id) * 0.9;
      desenharPersonagemRapido(ctx, PERSONAGENS[c.id], {
        x: w / 2, y: h * 0.55, s: Math.min(w, h) * 0.86, dir: 'baixo', fase, andando: escolhido && !quieto,
        expressao: escolhido ? 'alegre' : 'normal', piscar: ((fase * 0.7) % 3.6) < 0.12 ? 1 : 0,
      }, dprLimitado());
    }
    // Destaque: o escolhido grande, comemorando logo que é escolhido.
    const { ctx, w, h } = prepararCanvas(this.raiz.querySelector('.destaque-arte'));
    ctx.clearRect(0, 0, w, h);
    const recente = this.t - (this.desde ?? -9) < 1.2;
    const fase = quieto ? 0 : this.t;
    const pulo = recente && !quieto ? Math.abs(Math.sin((this.t - this.desde) * 7)) * h * 0.06 : 0;
    desenharPersonagem(ctx, PERSONAGENS[this.escolha.personagem], {
      x: w / 2, y: h * 0.56 - pulo, s: Math.min(w, h) * 0.9, dir: 'baixo', fase,
      expressao: recente ? 'alegre' : 'normal', bracos: recente ? 'cima' : 'aceno',
      piscar: (fase % 3.2) < 0.12 ? 1 : 0, sombra: pulo < 2,
    });
  }

  /** Miniatura de cada arena: o mapa de verdade (semente fixa), com os quatro nos cantos (o escolhido no primeiro). */
  desenharArenas() {
    for (const c of this.cartoesArena) {
      const w = Math.round(c.canvas.clientWidth);
      const h = Math.round(c.canvas.clientHeight);
      const chave = `${w}x${h}@${dprLimitado()}|${this.escolha.personagem}`;
      if (c.pronto === chave || w < 4) continue;
      c.pronto = chave;
      if (c.id === 'surpresa') this.desenharSurpresa(c.canvas);
      else this.desenharMiniatura(c.canvas, c.id);
    }
  }

  desenharMiniatura(canvas, arena) {
    const { ctx, w, h } = prepararCanvas(canvas);
    const mundo = criarMundo({ semente: 20240 + arena.length, arena, personagens: escalarPersonagens(this.escolha.personagem) });
    const s = Math.min(w / mundo.colunas, h / mundo.linhas);
    const dpr = dprLimitado();
    const pecas = criarPecas(mundo, obterTema(arena), s, dpr);
    const ox = (w - s * mundo.colunas) / 2;
    const oy = (h - s * mundo.linhas) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(pecas.fundo, ox, oy, s * mundo.colunas, s * mundo.linhas);
    mundo.grade.forEach((t, i) => {
      if (t === BLOCO) ctx.drawImage(pecas.bloco, ox + (i % mundo.colunas) * s, oy + Math.floor(i / mundo.colunas) * s, s, s);
    });
    mundo.jogadores.forEach((j, k) => {
      const l = LARGADAS[k];
      desenharPersonagem(ctx, PERSONAGENS[j.personagem], { x: ox + (l.col + 0.5) * s, y: oy + (l.lin + 0.5) * s, s: s * 1.25, dir: 'baixo', fase: k });
    });
  }

  desenharSurpresa(canvas) {
    const { ctx, w, h } = prepararCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const faixas = ['#D6F3DE', '#D8F1FB', '#3A3460', '#FFE1DA', '#F4F6FA'];
    const r = Math.min(w, h) * 0.12;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88, r);
    ctx.clip();
    faixas.forEach((cor, k) => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.moveTo(w * (k / 5) - w * 0.3, h);
      ctx.lineTo(w * ((k + 1) / 5) - w * 0.3, h);
      ctx.lineTo(w * ((k + 1) / 5) + w * 0.3, 0);
      ctx.lineTo(w * (k / 5) + w * 0.3, 0);
      ctx.fill();
    });
    ctx.restore();
    ctx.font = `900 ${Math.round(h * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = h * 0.08;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText('?', w / 2, h * 0.53);
    ctx.fillStyle = '#0071E3';
    ctx.fillText('?', w / 2, h * 0.53);
  }

  desenharAjuda() {
    for (const c of this.raiz.querySelectorAll('.passos-ajuda canvas')) {
      const { ctx, w, h } = prepararCanvas(c);
      ctx.clearRect(0, 0, w, h);
      const s = Math.min(w, h);
      const x = w / 2;
      const y = h / 2;
      switch (c.dataset.arte) {
        case 'andar':
          desenharPersonagem(ctx, PERSONAGENS[this.escolha.personagem], { x, y: y + s * 0.05, s: s * 0.8, dir: 'dir', andando: true, fase: 0.4 });
          setinhas(ctx, x, y, s);
          break;
        case 'gota':
          desenharGota(ctx, x, y - s * 0.12, s * 0.95, { pavio: 120, pavioTotal: 165 }, 0);
          break;
        case 'respingo':
          ctx.save();
          ctx.translate(x - s * 0.48, y - s * 0.48);
          desenharRespingos(ctx, [{ id: 1, col: 1, lin: 1, t: 22, duracao: 30, bracos: { cima: 1, baixo: 1, esq: 1, dir: 1 }, batida: { cima: false, baixo: false, esq: false, dir: false } }], s * 0.32, 0);
          ctx.restore();
          break;
        case 'item':
          desenharItem(ctx, 'gota', x - s * 0.22, y, s * 0.62);
          desenharItem(ctx, 'alcance', x + s * 0.22, y, s * 0.62);
          break;
        default: // quem ficou sequinho comemora
          desenharPersonagem(ctx, PERSONAGENS[this.escolha.personagem], { x, y: y + s * 0.02, s: s * 0.78, dir: 'baixo', fase: 0.6, expressao: 'alegre', bracos: 'cima' });
      }
    }
  }
}

function setinhas(ctx, x, y, s) {
  ctx.strokeStyle = '#0071E3';
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
    const px = x + dx * s * 0.42;
    const py = y + dy * s * 0.42;
    ctx.beginPath();
    ctx.moveTo(px - dy * s * 0.07 - dx * s * 0.06, py - dx * s * 0.07 - dy * s * 0.06);
    ctx.lineTo(px, py);
    ctx.lineTo(px + dy * s * 0.07 - dx * s * 0.06, py + dx * s * 0.07 - dy * s * 0.06);
    ctx.stroke();
  }
}
