// Controlador da partida: junta simulação, robôs, rodadas e relógio de passo
// fixo. Não toca em DOM — roda igual no navegador e no Node.

import { criarMundo, passo, ENTRADA_VAZIA } from './sim/mundo.js';
import { retratar, impressaoDigital, hashDe } from './sim/retrato.js';
import { criarAjuste } from './sim/ajustes.js';
import { criarPartida, registrarRodada, sementeDaRodada } from './sim/partida.js';
import { criarRobo, decidir } from './ia/robo.js';
import { criarRelogio, avancarRelogio, fracaoDoTick } from './nucleo/relogio.js';
import { escalarPersonagens } from './dados/personagens.js';

export const HUMANO = 0;
export const INTERVALO = 270; // 4,5 s de placar entre uma rodada e outra

export class Jogo {
  constructor() {
    this.relogio = criarRelogio();
    this.escala = 1;
    this.pausado = false;
    this.demo = false;
    this.ajuste = criarAjuste(); // compartilhado com o mundo: a bancada muda em tempo real
    this.entradaHumana = () => ENTRADA_VAZIA; // trocada pelo teclado (e, na parte 4, pelo toque)
    this.substitutas = []; // entradas fixadas pelo gancho de teste, por jogador
    this.eventos = []; // acumulados até a apresentação consumir
    this.anteriores = []; // posições antes do último tick (interpolação do desenho)
    this.mundo = null;
    this.partida = null;
    this.intervalo = 0;
  }

  /**
   * Começa uma partida nova. {personagem, arena, dificuldade, semente,
   * rodadas (1–3), contagem (false = sem "3, 2, 1")}. Campos ausentes mantêm
   * o valor anterior.
   */
  iniciar(op = {}) {
    const anterior = this.opcoes || {};
    this.opcoes = {
      personagem: op.personagem ?? anterior.personagem ?? 'iris',
      arena: op.arena ?? anterior.arena ?? 'jardim',
      dificuldade: op.dificuldade ?? anterior.dificuldade ?? 'facil',
      semente: (op.semente ?? anterior.semente ?? 1) >>> 0,
      rodadas: op.rodadas ?? anterior.rodadas ?? 2,
      contagem: op.contagem ?? true,
      niveis: op.niveis ?? null, // nível por competidor (simulações em lote); null = todos na dificuldade
    };
    this.partida = criarPartida(this.opcoes.rodadas, 4);
    this.opcoes.rodadas = this.partida.alvo;
    this.relogio = criarRelogio();
    this.pausado = false;
    this.eventos = [{ tipo: 'inicio' }];
    this.novaRodada();
    return this;
  }

  novaRodada() {
    const { arena, dificuldade, personagem, semente, contagem } = this.opcoes;
    const s = sementeDaRodada(semente, this.partida.rodada);
    this.mundo = criarMundo({
      semente: s,
      arena,
      personagens: escalarPersonagens(personagem),
      ajuste: this.ajuste,
      contagem: contagem ? this.ajuste.contagem : 0,
      duracao: this.ajuste.duracaoRodada,
    });
    const niveis = this.opcoes.niveis;
    this.robos = this.mundo.jogadores.map((j) => criarRobo(j.id, niveis?.[j.id] ?? dificuldade, s));
    this.intervalo = 0;
    this.registrada = false;
    this.eventos.push({ tipo: 'rodada', rodada: this.partida.rodada });
    this.guardarAnteriores();
  }

  entradaDe(id) {
    if (this.substitutas[id]) return this.substitutas[id];
    if (id === HUMANO && !this.demo) return this.entradaHumana();
    return decidir(this.robos[id], this.mundo);
  }

  guardarAnteriores() {
    this.anteriores = this.mundo.jogadores.map((j) => ({ x: j.x, y: j.y }));
  }

  /** Um tick (1/60 s de jogo): simulação, ou contagem do intervalo entre rodadas. */
  tick() {
    if (this.partida.encerrada) return;
    if (this.intervalo > 0) {
      this.intervalo--;
      if (this.intervalo === 0) this.novaRodada();
      return;
    }
    const entradas = this.mundo.jogadores.map((j) => this.entradaDe(j.id));
    this.guardarAnteriores();
    passo(this.mundo, entradas);
    if (this.mundo.eventos.length) this.eventos.push(...this.mundo.eventos);
    if (this.mundo.fase === 'fim' && !this.registrada) this.encerrarRodada();
    if (this.eventos.length > 500) this.eventos.splice(0, this.eventos.length - 500);
  }

  encerrarRodada() {
    this.registrada = true;
    registrarRodada(this.partida, this.mundo.vencedor);
    this.eventos.push({ tipo: 'fimRodada', vencedor: this.mundo.vencedor, encerrada: this.partida.encerrada, campeao: this.partida.campeao });
    if (!this.partida.encerrada) this.intervalo = INTERVALO;
  }

  /** Pula o placar entre rodadas (Enter / botão "Próxima rodada"). */
  pularIntervalo() {
    if (this.intervalo > 0) {
      this.intervalo = 0;
      this.novaRodada();
    }
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
    return this.pausado || this.escala <= 0 || this.intervalo > 0 ? 1 : fracaoDoTick(this.relogio);
  }

  consumirEventos() {
    const e = this.eventos;
    this.eventos = [];
    return e;
  }

  /** 'jogando' (inclui a contagem), 'pausado', 'intervalo' (placar entre rodadas) ou 'resultado' (fim da partida). */
  get tela() {
    if (!this.mundo) return 'carregando';
    if (this.partida.encerrada) return 'resultado';
    if (this.pausado) return 'pausado';
    if (this.intervalo > 0 || this.mundo.fase === 'fim') return 'intervalo';
    return 'jogando';
  }

  retrato() {
    const p = this.partida;
    return {
      tela: this.tela,
      rodada: p.rodada,
      partida: {
        alvo: p.alvo, vitorias: [...p.vitorias], historico: [...p.historico],
        campeao: p.campeao, encerrada: p.encerrada, intervalo: this.intervalo,
      },
      pausado: this.pausado,
      timeScale: this.escala,
      demo: this.demo,
      dificuldade: this.opcoes.dificuldade,
      personagem: this.opcoes.personagem,
      ajuste: { ...this.ajuste },
      ...retratar(this.mundo),
    };
  }

  /** Impressão digital do todo: mundo, robôs e partida. */
  impressao() {
    return impressaoDigital(this.mundo);
  }

  impressaoCompleta() {
    const robos = this.robos.map((r) => ({ rng: r.rng.estado, alvo: r.alvo, motivo: r.motivo, roteiro: r.roteiro, ultimaGota: r.ultimaGota }));
    return hashDe({ mundo: impressaoDigital(this.mundo), robos, partida: this.partida, intervalo: this.intervalo });
  }
}
