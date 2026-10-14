// Gancho de teste window.__bomberolho — usado pelos testes de navegador e pelo
// verificador. Não altera regras: lê o estado e injeta entradas, passos, ajustes e (só em teste) itens.

import { criarAjuste, AJUSTE_PADRAO } from './sim/ajustes.js';
import { pegarItem, ITENS, ESPECIAIS } from './sim/itens.js';

const CAMPOS_ENTRADA = ['cima', 'baixo', 'esq', 'dir', 'bomba', 'acao'];

export function instalarGancho(app) {
  const api = {
    versao: '3.0.0-parte3',

    /** Retrato do jogo (cópia: mexer nele não muda nada). */
    get state() {
      return { ...app.jogo.retrato(), fps: app.fps(), ...app.extras?.() };
    },

    /**
     * Nova partida. {personagem, arena, dificuldade, semente, rodadas (1–3),
     * contagem (false = começa sem o "3, 2, 1")}; o que faltar mantém o valor
     * atual, exceto a semente, que é sorteada.
     */
    start(opcoes = {}) {
      app.reiniciar(opcoes);
      return api.state;
    },

    /** Abre o menu ('inicio', 'personagem' ou 'arena'); start() fecha e começa a partida. */
    menu(etapa = 'inicio') {
      app.menu(etapa);
      return api.state;
    },

    /** Escala do tempo real: 1 normal, 2 dobro, 0 congela (use step). */
    setTimeScale(n) {
      const v = Number(n);
      if (!Number.isFinite(v) || v < 0 || v > 16) throw new RangeError('setTimeScale: use um número entre 0 e 16');
      app.jogo.escala = v;
      return v;
    },

    /**
     * Fixa a entrada de um competidor (0 = humano) até nova chamada.
     * `input(0, {dir: true})`; `acao` é o segundo botão (poder do bichinho);
     * `input(0, null)` devolve o controle ao teclado/robô.
     */
    input(jogador, comandos) {
      const id = Number(jogador);
      if (!Number.isInteger(id) || id < 0 || id >= app.jogo.mundo.jogadores.length) {
        throw new RangeError(`input: jogador inválido (${jogador})`);
      }
      if (comandos == null) {
        app.jogo.substitutas[id] = undefined;
        return null;
      }
      const e = {};
      for (const c of CAMPOS_ENTRADA) e[c] = !!comandos[c];
      app.jogo.substitutas[id] = e;
      return { ...e };
    },

    /** Roda n ticks (1/60 s cada) na hora, redesenha e devolve o estado. */
    step(n = 1) {
      const k = Math.max(0, Math.floor(Number(n) || 0));
      app.jogo.passos(k);
      app.redesenhar(k);
      return api.state;
    },

    /** Liga/desliga o piloto automático do humano. */
    demo(ligado = true) {
      app.jogo.demo = !!ligado;
      return app.jogo.demo;
    },

    /** Pausa (true), retoma (false) ou alterna (sem argumento). */
    pause(estado) {
      app.pausar(estado);
      return app.jogo.pausado;
    },

    /** Muda parâmetros de sentir na hora (mesmo efeito da bancada ?ajuste=1); devolve o ajuste atual. */
    ajustar(mudancas = {}) {
      Object.assign(app.jogo.ajuste, criarAjuste({ ...app.jogo.ajuste, ...mudancas }));
      app.ajusteMudou?.();
      return { ...app.jogo.ajuste };
    },

    /** Volta todos os parâmetros de sentir ao padrão. */
    restaurarAjuste() {
      Object.assign(app.jogo.ajuste, AJUSTE_PADRAO);
      app.ajusteMudou?.();
      return { ...app.jogo.ajuste };
    },

    /**
     * Só para testes: entrega um item a um competidor, como se ele o pegasse
     * ('gota', 'alcance', 'velocidade', 'chute', 'superLupa', 'cisco', 'pinca',
     * 'penetrante', 'estojo'). Devolve se algo mudou.
     */
    darItem(jogador, tipo) {
      const j = app.jogo.mundo.jogadores[Number(jogador)];
      if (!j || !(ITENS[tipo] || ESPECIAIS[tipo])) throw new RangeError('darItem: jogador ou item inválido');
      const mudou = pegarItem(app.jogo.mundo, j, tipo);
      app.jogo.eventos.push({ tipo: 'item', jogador: j.id, item: tipo, mudou, col: Math.floor(j.x / 1000), lin: Math.floor(j.y / 1000) });
      return mudou;
    },

    /** Impressão digital do estado completo da simulação (determinismo). */
    hash() {
      return app.jogo.impressao();
    },

    /** Impressão digital do todo: mundo, robôs e partida. */
    hashCompleto() {
      return app.jogo.impressaoCompleta();
    },
  };
  Object.defineProperty(window, '__bomberolho', { value: Object.freeze(api), configurable: true });
  return api;
}
