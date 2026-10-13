// Controlador da partida: junta simulação, robôs e relógio de passo fixo.
// Não toca em DOM — roda igual no navegador e no Node (ver qa/sim/jogo.test.mjs).

import { criarMundo, passo, ENTRADA_VAZIA } from './sim/mundo.js';
import { retratar, impressaoDigital } from './sim/retrato.js';
import { criarRobo, decidir } from './ia/robo.js';
import { criarRelogio, avancarRelogio, fracaoDoTick } from './nucleo/relogio.js';
import { escalarPersonagens } from './dados/personagens.js';

export const HUMANO = 0;

export class Jogo {
  constructor() {
    this.relogio = criarRelogio();
    this.escala = 1;
    this.pausado = false;
    this.demo = false;
    this.entradaHumana = () => ENTRADA_VAZIA; // trocada pelo teclado (e, na parte 4, pelo toque)
    this.substitutas = []; // entradas fixadas pelo gancho de teste, por jogador
    this.eventos = []; // acumulados até a apresentação consumir
    this.anteriores = []; // posições antes do último tick (interpolação do desenho)
    this.mundo = null;
  }

  /** Começa uma partida nova. Campos ausentes mantêm o valor anterior. */
  iniciar(op = {}) {
    const anterior = this.opcoes || {};
    this.opcoes = {
      personagem: op.personagem ?? anterior.personagem ?? 'iris',
      arena: op.arena ?? anterior.arena ?? 'jardim',
      dificuldade: op.dificuldade ?? anterior.dificuldade ?? 'facil',
      semente: (op.semente ?? anterior.semente ?? 1) >>> 0,
      rodadas: op.rodadas ?? anterior.rodadas ?? 2, // usado a partir da parte 2
    };
    const { semente, arena, dificuldade, personagem } = this.opcoes;
    this.mundo = criarMundo({ semente, arena, personagens: escalarPersonagens(personagem) });
    this.robos = this.mundo.jogadores.map((j) => criarRobo(j.id, dificuldade, semente));
    this.relogio = criarRelogio();
    this.pausado = false;
    this.eventos = [{ tipo: 'inicio' }];
    this.guardarAnteriores();
    return this;
  }

  entradaDe(id) {
    if (this.substitutas[id]) return this.substitutas[id];
    if (id === HUMANO && !this.demo) return this.entradaHumana();
    return decidir(this.robos[id], this.mundo);
  }

  guardarAnteriores() {
    this.anteriores = this.mundo.jogadores.map((j) => ({ x: j.x, y: j.y }));
  }

  /** Um tick de simulação (1/60 s de jogo). */
  tick() {
    const entradas = this.mundo.jogadores.map((j) => this.entradaDe(j.id));
    this.guardarAnteriores();
    passo(this.mundo, entradas);
    if (this.mundo.eventos.length) this.eventos.push(...this.mundo.eventos);
    if (this.eventos.length > 500) this.eventos.splice(0, this.eventos.length - 500);
  }

  passos(n = 1) {
    for (let k = 0; k < n; k++) this.tick();
  }

  /** Chamado a cada quadro com o tempo real decorrido; devolve ticks rodados. */
  quadro(dtMs) {
    if (this.pausado || this.escala <= 0 || !this.mundo) return 0;
    const n = avancarRelogio(this.relogio, dtMs, this.escala);
    this.passos(n);
    return n;
  }

  fracao() {
    return this.pausado || this.escala <= 0 ? 1 : fracaoDoTick(this.relogio);
  }

  consumirEventos() {
    const e = this.eventos;
    this.eventos = [];
    return e;
  }

  get tela() {
    if (!this.mundo) return 'carregando';
    if (this.mundo.fase === 'fim') return 'resultado';
    return this.pausado ? 'pausado' : 'jogando';
  }

  retrato() {
    return {
      tela: this.tela,
      rodada: 1,
      pausado: this.pausado,
      timeScale: this.escala,
      demo: this.demo,
      dificuldade: this.opcoes.dificuldade,
      personagem: this.opcoes.personagem,
      ...retratar(this.mundo),
    };
  }

  impressao() {
    return impressaoDigital(this.mundo);
  }
}
