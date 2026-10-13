// Ponto de entrada: liga simulação, desenho, teclado, placar e gancho de teste.

import { Jogo } from './jogo.js';
import { lerParametros } from './parametros.js';
import { Renderizador } from './render/renderizador.js';
import { criarTeclado } from './input/teclado.js';
import { Placar } from './ui/hud.js';
import { Avisos } from './ui/avisos.js';
import { instalarGancho } from './gancho.js';

const parametros = lerParametros(location.search);
const canvas = document.getElementById('arena');
const palco = document.getElementById('palco');
const jogo = new Jogo();
const renderizador = new Renderizador(canvas);
const placar = new Placar(document.getElementById('placar'));
const botaoPausa = document.getElementById('bt-pausa');

jogo.demo = parametros.demo;
jogo.escala = parametros.escala;

// Sem ?semente= cada partida sorteia um mapa novo; com ela, o mapa é sempre o mesmo.
function sementeNova() {
  return parametros.semente ?? Math.floor(Math.random() * 0x100000000) >>> 0;
}

function reiniciar(opcoes = {}) {
  jogo.iniciar({
    personagem: parametros.personagem ?? 'iris',
    arena: parametros.arena,
    dificuldade: parametros.dificuldade,
    ...opcoes,
    semente: opcoes.semente ?? sementeNova(),
  });
  teclado.limpar();
  placar.montar(jogo.mundo);
  ajustarTamanho();
  redesenhar();
}

function pausar(estado) {
  if (jogo.tela === 'resultado') return;
  jogo.pausado = estado === undefined ? !jogo.pausado : !!estado;
  botaoPausa.textContent = jogo.pausado ? 'Continuar' : 'Pausar';
  botaoPausa.setAttribute('aria-pressed', String(jogo.pausado));
  teclado.limpar();
}

const teclado = criarTeclado(window, {
  pausar: () => pausar(),
  confirmar: () => {
    if (jogo.tela === 'resultado') reiniciar();
    else if (jogo.tela === 'pausado') pausar(false);
  },
});
jogo.entradaHumana = () => teclado.ler();

const avisos = new Avisos(document.getElementById('aviso'), {
  continuar: () => pausar(false),
  recomecar: () => reiniciar(),
});
document.getElementById('bt-recomecar').addEventListener('click', (e) => { e.currentTarget.blur(); reiniciar(); });
document.getElementById('bt-faixa').addEventListener('click', () => reiniciar());
botaoPausa.addEventListener('click', (e) => { e.currentTarget.blur(); pausar(); });

// Aba escondida (a criança foi chamada para a consulta): pausa sozinho.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && jogo.tela === 'jogando') pausar(true);
});

// Sem menu de contexto nem seleção acidental (público infantil, celular).
window.addEventListener('contextmenu', (e) => e.preventDefault());

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
renderizador.definirMovimentoReduzido(movimentoReduzido.matches);
movimentoReduzido.addEventListener('change', (e) => renderizador.definirMovimentoReduzido(e.matches));

function ajustarTamanho() {
  if (!jogo.mundo) return;
  const estilo = getComputedStyle(palco);
  const largura = palco.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  const altura = palco.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  // Densidade limitada a 2: nítido em qualquer celular e bem mais leve que 3.
  renderizador.ajustar(largura, altura, Math.min(window.devicePixelRatio || 1, 2), jogo.mundo);
}
new ResizeObserver(() => { ajustarTamanho(); redesenhar(); }).observe(palco);

// Medidor de quadros por segundo (exposto no gancho como state.fps).
const medidor = { quadros: 0, desde: performance.now(), fps: 0 };
let ultimo = performance.now();
let relogioAnimacao = 0;

function redesenhar(dtSeg = 0) {
  renderizador.reagir(jogo.consumirEventos());
  renderizador.desenhar(jogo.mundo, jogo.anteriores, jogo.fracao(), relogioAnimacao, dtSeg);
  placar.atualizar(jogo.mundo);
  avisos.atualizar(jogo);
}

function quadro(agora) {
  const dt = Math.min(agora - ultimo, 250);
  ultimo = agora;
  jogo.quadro(dt);
  const dtSeg = jogo.pausado ? 0 : (dt / 1000) * Math.min(jogo.escala, 4);
  relogioAnimacao += dtSeg;
  redesenhar(dtSeg);

  medidor.quadros++;
  if (agora - medidor.desde >= 1000) {
    medidor.fps = Math.round((medidor.quadros * 1000) / (agora - medidor.desde));
    medidor.quadros = 0;
    medidor.desde = agora;
  }
  requestAnimationFrame(quadro);
}

reiniciar();
// Passos do gancho também envelhecem as partículas (senão elas se acumulam na tela).
instalarGancho({
  jogo, reiniciar, pausar, fps: () => medidor.fps,
  redesenhar: (ticks) => {
    const dtSeg = Math.min(ticks / 60, 1);
    relogioAnimacao += dtSeg;
    redesenhar(dtSeg);
  },
});
requestAnimationFrame(quadro);
