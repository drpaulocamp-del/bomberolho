// Ponto de entrada: liga simulação, desenho, teclado, placar, menus, som e
// gancho de teste. Sem parâmetros na URL abre o menu (com uma partida de
// robôs rodando atrás, de vitrine); com parâmetros (?semente=, ?arena=…)
// começa direto na partida — é assim que os testes entram.

import { Jogo } from './jogo.js';
import { lerParametros, pedeJogoDireto } from './parametros.js';
import { Renderizador } from './render/renderizador.js';
import { criarTeclado } from './input/teclado.js';
import { Placar } from './ui/hud.js';
import { Avisos } from './ui/avisos.js';
import { Menu } from './ui/menu.js';
import { criarPreferencias } from './ui/preferencias.js';
import { criarSorteioDeCuriosidades } from './dados/curiosidades.js';
import { ORDEM_PERSONAGENS } from './dados/personagens.js';
import { ORDEM_ARENAS } from './sim/arenas.js';
import { Som } from './audio/som.js';
import { instalarGancho } from './gancho.js';

const parametros = lerParametros(location.search);
const app = document.getElementById('app');
const canvas = document.getElementById('arena');
const palco = document.getElementById('palco');
const botaoPausa = document.getElementById('bt-pausa');
const prefs = criarPreferencias();
const som = new Som({ mudo: prefs.dados.mudo });
const sortear = criarSorteioDeCuriosidades();
const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
const jogo = new Jogo();
const renderizador = new Renderizador(canvas);
const placar = new Placar(document.getElementById('placar'), document.getElementById('barra'));

jogo.demo = parametros.demo;
jogo.escala = parametros.escala;

// Opções da partida: as da URL (jogo direto) ou as escolhidas no menu.
let base = {
  personagem: parametros.personagem ?? 'iris',
  arena: parametros.arena,
  dificuldade: parametros.dificuldade,
  rodadas: parametros.rodadas,
};
let vitrine = false; // partida de robôs atrás do menu

// Sem ?semente= cada partida sorteia um mapa novo; com ela, o mapa é sempre o mesmo.
function sementeNova() {
  return parametros.semente ?? Math.floor(Math.random() * 0x100000000) >>> 0;
}
const sortearDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

function reiniciar(opcoes = {}) {
  sairDoMenu();
  jogo.iniciar({ ...base, ...opcoes, semente: opcoes.semente ?? sementeNova() });
  aoTrocarPartida();
}

function aoTrocarPartida() {
  teclado.limpar();
  som.pausarMusica(false);
  avisos.perguntarSaida(false);
  placar.montar(jogo.mundo);
  ajustarTamanho();
  redesenhar();
  atualizarBotaoPausa();
}

// ── Menu e vitrine ───────────────────────────────────────

function iniciarVitrine() {
  jogo.iniciar({
    personagem: sortearDe(ORDEM_PERSONAGENS), arena: sortearDe(ORDEM_ARENAS), dificuldade: 'medio',
    rodadas: 3, contagem: false, semente: Math.floor(Math.random() * 0x100000000) >>> 0,
  });
  jogo.consumirEventos();
  placar.montar(jogo.mundo);
  ajustarTamanho();
}

function abrirMenu(etapa = 'inicio') {
  vitrine = true;
  jogo.demo = true;
  jogo.pausado = false;
  jogo.escala = 1;
  avisos.perguntarSaida(false);
  app.dataset.modo = 'menu';
  renderizador.humano = -1;
  iniciarVitrine();
  jogo.menu = etapa;
  menu.abrir(etapa);
  som.pausarMusica(false);
  som.intensa(false);
  som.musica('menu');
  redesenhar();
}

function sairDoMenu() {
  if (!vitrine) return;
  vitrine = false;
  jogo.menu = null;
  jogo.demo = parametros.demo;
  menu.fechar();
  jogo.escala = parametros.escala;
  app.dataset.modo = 'jogo';
  renderizador.humano = 0;
}

function jogar(opcoes) {
  base = { ...opcoes };
  reiniciar();
}

// ── Pausa e saída ────────────────────────────────────────

function atualizarBotaoPausa() {
  const rotulo = jogo.pausado ? 'Continuar' : 'Pausar';
  botaoPausa.querySelector('span').textContent = rotulo;
  botaoPausa.setAttribute('aria-label', rotulo);
  botaoPausa.setAttribute('aria-pressed', String(jogo.pausado));
  botaoPausa.classList.toggle('pausado', jogo.pausado);
}

function pausar(estado) {
  if (jogo.tela === 'resultado' || jogo.tela === 'intervalo' || jogo.tela === 'menu') return;
  jogo.pausado = estado === undefined ? !jogo.pausado : !!estado;
  if (!jogo.pausado) avisos.perguntarSaida(false);
  atualizarBotaoPausa();
  som.pausarMusica(jogo.pausado);
  teclado.limpar();
  redesenhar(); // o cartão aparece/some já, sem esperar o próximo quadro
}

function pedirSaida() {
  // Rodada já acabou: não há o que perder, sai direto.
  if (jogo.tela === 'resultado' || jogo.tela === 'intervalo') {
    abrirMenu();
    return;
  }
  pausar(true);
  avisos.perguntarSaida(true);
  redesenhar();
}

const teclado = criarTeclado(window, {
  pausar: () => pausar(),
  ativo: () => !vitrine,
  jogando: () => jogo.tela === 'jogando',
  confirmar: () => {
    if (jogo.tela === 'resultado') reiniciar();
    else if (jogo.tela === 'pausado') pausar(false);
    else if (jogo.tela === 'intervalo') proximaRodada();
  },
});
jogo.entradaHumana = () => teclado.ler();

function proximaRodada() {
  jogo.pularIntervalo();
  teclado.limpar();
  redesenhar();
}

const avisos = new Avisos(document.getElementById('aviso'), {
  continuar: () => pausar(false),
  recomecar: () => reiniciar(),
  pular: () => proximaRodada(),
  menu: () => abrirMenu(),
}, { sortear, reduzido: () => movimentoReduzido.matches });

const menu = new Menu(document.getElementById('menu'), {
  prefs, som, sortear,
  aoJogar: jogar,
  aoMudarEtapa: (etapa) => { if (vitrine) jogo.menu = etapa; },
  reduzido: () => movimentoReduzido.matches,
});

document.getElementById('bt-faixa').addEventListener('click', () => reiniciar());
document.getElementById('bt-sair').addEventListener('click', (e) => { e.currentTarget.blur(); som.tocar('clique'); pedirSaida(); });
botaoPausa.addEventListener('click', (e) => { e.currentTarget.blur(); som.tocar('clique'); pausar(); });

// ── Som: só depois de um gesto; mudo lembrado entre visitas ─

const botoesSom = [...document.querySelectorAll('.bt-som')];
const ICONE_SOM = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor"/><path d="M13.5 7a4 4 0 0 1 0 6M15.6 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICONE_MUDO = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor"/><path d="M13.5 7.5l4 5M17.5 7.5l-4 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function mostrarSom() {
  const mudo = prefs.dados.mudo;
  for (const b of botoesSom) {
    b.innerHTML = mudo ? ICONE_MUDO : ICONE_SOM;
    b.setAttribute('aria-label', mudo ? 'Som desligado (tocar para ligar)' : 'Som ligado (tocar para desligar)');
    b.setAttribute('aria-pressed', String(mudo));
    b.classList.toggle('mudo', mudo);
  }
}
for (const b of botoesSom) {
  b.addEventListener('click', (e) => {
    e.currentTarget.blur();
    const mudo = !prefs.dados.mudo;
    prefs.mudar({ mudo });
    som.definirMudo(mudo);
    if (!mudo) {
      som.destravar();
      som.tocar('escolha');
    }
    mostrarSom();
  });
}
mostrarSom();
const destravarSom = () => som.destravar();
window.addEventListener('pointerdown', destravarSom, true);
window.addEventListener('keydown', destravarSom, true);

// Aba escondida (a criança foi chamada para a consulta): pausa sozinho.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && jogo.tela === 'jogando') pausar(true);
  som.segundoPlano(document.hidden);
});

// Sem menu de contexto nem seleção acidental (público infantil, celular).
window.addEventListener('contextmenu', (e) => e.preventDefault());

renderizador.definirMovimentoReduzido(movimentoReduzido.matches);
movimentoReduzido.addEventListener('change', (e) => renderizador.definirMovimentoReduzido(e.matches));

function ajustarTamanho() {
  if (!jogo.mundo) return;
  const estilo = getComputedStyle(palco);
  const largura = palco.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  const altura = palco.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  // Densidade limitada a 2: nítido em qualquer celular e bem mais leve que 3.
  // Atrás do menu (vitrine, embaçada pelo vidro) basta densidade 1.
  renderizador.ajustar(largura, altura, vitrine ? 1 : Math.min(window.devicePixelRatio || 1, 2), jogo.mundo);
}
new ResizeObserver(() => { ajustarTamanho(); redesenhar(); }).observe(palco);

// Medidor de quadros por segundo (exposto no gancho como state.fps).
const medidor = { quadros: 0, desde: performance.now(), fps: 0 };
let ultimo = performance.now();
let relogioAnimacao = 0;
let ultimoMundo = null;
let bancada = null;
let vitrineDaVez = false;
let dtVitrine = 0;

/** Eventos da partida: som, placar local guardado no aparelho. */
function tratarEventos(eventos) {
  renderizador.reagir(eventos);
  if (vitrine) return;
  som.reagir(eventos);
  for (const e of eventos) {
    if (e.tipo === 'fimRodada' && e.encerrada) {
      som.musica(null);
      if (!jogo.demo) {
        prefs.registrarPartida({ personagem: jogo.opcoes.personagem, venceu: e.campeao === 0, rodadasGanhas: jogo.partida.vitorias[0] });
      }
    }
  }
}

function redesenhar(dtSeg = 0) {
  tratarEventos(jogo.consumirEventos());
  if (jogo.mundo !== ultimoMundo) {
    // Rodada nova (outra arena na "Surpresa"): refaz o placar, as peças e a trilha.
    ultimoMundo = jogo.mundo;
    placar.montar(jogo.mundo);
    ajustarTamanho();
    if (!vitrine) som.musica(jogo.mundo.arena);
  }
  if (!vitrine) som.intensa(jogo.mundo.aperto.ativo);
  renderizador.desenhar(jogo.mundo, jogo.anteriores, jogo.fracao(), relogioAnimacao, dtSeg);
  placar.atualizar(jogo);
  avisos.atualizar(jogo, dtSeg);
  bancada?.atualizar();
}

function quadro(agora) {
  const dt = Math.min(agora - ultimo, 250);
  ultimo = agora;
  jogo.quadro(dt);
  // Vitrine: sem placar entre rodadas e, no fim, outra partida de robôs.
  if (vitrine && jogo.intervalo > 0) jogo.pularIntervalo();
  if (vitrine && jogo.partida.encerrada) iniciarVitrine();
  const dtSeg = jogo.pausado ? 0 : (dt / 1000) * Math.min(jogo.escala, 4);
  relogioAnimacao += dtSeg;
  // No menu, a vitrine é desenhada em quadros alternados com as animações do
  // menu (cada uma a ~30 qps): o celular simples não precisa fazer as duas juntas.
  vitrineDaVez = !vitrineDaVez;
  if (!vitrine) redesenhar(dtSeg);
  else if (vitrineDaVez) { redesenhar(dtSeg + dtVitrine); dtVitrine = 0; } else dtVitrine = dtSeg;

  medidor.quadros++;
  if (agora - medidor.desde >= 1000) {
    medidor.fps = Math.round((medidor.quadros * 1000) / (agora - medidor.desde));
    medidor.quadros = 0;
    medidor.desde = agora;
  }
  requestAnimationFrame(quadro);
}

if (pedeJogoDireto(location.search)) reiniciar();
else abrirMenu();

// Passos do gancho também envelhecem as partículas (senão elas se acumulam na tela).
instalarGancho({
  jogo, reiniciar, pausar, fps: () => medidor.fps,
  menu: (etapa) => abrirMenu(etapa),
  extras: () => ({ mudo: prefs.dados.mudo, audio: som.ctx ? som.ctx.state : 'inativo', placarLocal: prefs.dados.placar }),
  ajusteMudou: () => bancada?.sincronizar(),
  redesenhar: (ticks) => {
    const dtSeg = Math.min(ticks / 60, 1);
    relogioAnimacao += dtSeg;
    redesenhar(dtSeg);
  },
});
// Bancada de ajuste: só com ?ajuste=1 (fora disso o módulo nem é baixado).
if (parametros.ajuste) {
  import('./ui/bancada.js').then(({ Bancada }) => {
    bancada = new Bancada(document.getElementById('app'), jogo, { aoFechar: () => teclado.limpar() });
  });
}
requestAnimationFrame(quadro);
