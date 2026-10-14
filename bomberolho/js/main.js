// Ponto de entrada: liga simulação, desenho, teclado, placar, menus, som e
// gancho de teste. Sem parâmetros na URL abre o menu (com uma partida de
// robôs rodando atrás, de vitrine); com parâmetros (?semente=, ?arena=…)
// começa direto na partida — é assim que os testes entram.

import { Jogo } from './jogo.js';
import { lerParametros, pedeJogoDireto } from './parametros.js';
import { Renderizador } from './render/renderizador.js';
import { criarDensidade } from './render/densidade.js';
import { criarTeclado } from './input/teclado.js';
import { criarToque } from './input/toque.js';
import { Placar, ICONE_BICHINHO } from './ui/hud.js';
import { Avisos } from './ui/avisos.js';
import { Menu } from './ui/menu.js';
import { criarPreferencias } from './ui/preferencias.js';
import { criarSorteioDeCuriosidades } from './dados/curiosidades.js';
import { ORDEM_PERSONAGENS } from './dados/personagens.js';
import { ORDEM_ARENAS } from './sim/arenas.js';
import { Som } from './audio/som.js';
import { NOMES_BICHINHOS } from './sim/bichinhos.js';
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
const densidade = criarDensidade(window.devicePixelRatio, parametros.densidade);
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
  limparEntradas();
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
  vitrineDesenhada = false;
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

// Ícone acompanha a ação: ⏸ para pausar, ▶ para continuar.
const ICONE_PAUSAR = '<rect x="5" y="4" width="3.4" height="12" rx="1.4"/><rect x="11.6" y="4" width="3.4" height="12" rx="1.4"/>';
const ICONE_CONTINUAR = '<path d="M6.5 3.8v12.4c0 .8.9 1.3 1.6.9l9.6-6.2a1 1 0 0 0 0-1.8L8.1 2.9c-.7-.4-1.6.1-1.6.9z"/>';

function atualizarBotaoPausa() {
  // Rodada ou partida encerrada: não há o que pausar (o cartão já está na tela).
  const fora = jogo.tela === 'resultado' || jogo.tela === 'intervalo';
  botaoPausa.disabled = fora;
  const rotulo = jogo.pausado ? 'Continuar' : 'Pausar';
  botaoPausa.querySelector('span').textContent = rotulo;
  botaoPausa.querySelector('svg').innerHTML = jogo.pausado ? ICONE_CONTINUAR : ICONE_PAUSAR;
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
  limparEntradas();
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

// ── Toque: alavanca flutuante + gota + bichinho ─────────────

const camadaToque = document.getElementById('toque');
const botaoGota = document.getElementById('bt-gota');
const botaoAcao = document.getElementById('bt-acao');
// Controles de toque aparecem em aparelho de toque (ponteiro principal "grosso")
// ou no primeiro toque de dedo; ?toque=1 / ?toque=0 forçam (testes).
let usaToque = parametros.toque ?? window.matchMedia('(pointer: coarse)').matches;
const toque = criarToque(document, {
  alavanca: camadaToque.querySelector('.alavanca'),
  pino: camadaToque.querySelector('.pino'),
  gota: botaoGota,
  acao: botaoAcao,
  ativo: () => usaToque && !vitrine && !jogo.demo && jogo.tela === 'jogando',
  canhoto: () => prefs.dados.canhoto,
  aceitaMouse: parametros.toque === true,
  aoPrimeiroToque: () => {
    if (parametros.toque === false || usaToque) return;
    usaToque = true;
    mostrarModoDeToque();
  },
});

function mostrarModoDeToque() {
  document.body.dataset.toque = usaToque ? 'sim' : 'nao';
  document.body.dataset.lado = prefs.dados.canhoto ? 'canhoto' : 'destro';
  menu.definirToque(usaToque);
  toque.repousar();
}

/** Troca a gota de mão (canhotos); lembrado no aparelho. */
function trocarLados() {
  prefs.mudar({ canhoto: !prefs.dados.canhoto });
  mostrarModoDeToque();
  return prefs.dados.canhoto;
}

let chaveToque = '';
/** Mostra/esconde os controles e mantém o botão do bichinho e a conta de gotas em dia. */
function atualizarToque() {
  const humano = jogo.mundo?.jogadores[0];
  const visivel = usaToque && !vitrine && !jogo.demo && (jogo.tela === 'jogando' || jogo.tela === 'pausado') && !!humano?.vivo;
  const montaria = visivel ? humano.montaria?.tipo ?? null : null;
  const livres = visivel ? Math.max(0, humano.gotas - jogo.mundo.gotas.filter((g) => g.dono === 0).length) : 0;
  const chave = `${visivel}|${montaria}|${livres}|${visivel && humano.recarga > 0}|${visivel && humano.escudo}`;
  if (chave === chaveToque) return;
  chaveToque = chave;
  camadaToque.hidden = !visivel;
  botaoAcao.hidden = !montaria;
  if (montaria) {
    if (botaoAcao.dataset.bichinho !== montaria) {
      botaoAcao.innerHTML = ICONE_BICHINHO[montaria];
      botaoAcao.dataset.bichinho = montaria;
      botaoAcao.setAttribute('aria-label', `Poder do ${NOMES_BICHINHOS[montaria]}`);
    }
    botaoAcao.classList.toggle('recarga', humano.recarga > 0);
    botaoAcao.classList.toggle('ligado', !!humano.escudo);
  }
  botaoGota.querySelector('.conta').textContent = visivel ? String(livres) : '';
  botaoGota.classList.toggle('vazia', visivel && livres === 0);
}

jogo.entradaHumana = () => juntarEntradas(teclado.ler(), toque.ler());

/** Solta tudo o que estiver apertado (teclas e dedos): pausa, troca de tela, foco perdido. */
function limparEntradas() {
  teclado.limpar();
  toque.limpar();
}

function juntarEntradas(a, b) {
  return {
    cima: a.cima || b.cima, baixo: a.baixo || b.baixo, esq: a.esq || b.esq, dir: a.dir || b.dir,
    bomba: a.bomba || b.bomba, acao: a.acao || b.acao,
  };
}

function proximaRodada() {
  jogo.pularIntervalo();
  limparEntradas();
  redesenhar();
}

const avisos = new Avisos(document.getElementById('aviso'), {
  continuar: () => pausar(false),
  recomecar: () => reiniciar(),
  pular: () => proximaRodada(),
  menu: () => abrirMenu(),
  lados: () => trocarLados(),
}, { sortear, reduzido: () => movimentoReduzido.matches, toque: () => usaToque });

const menu = new Menu(document.getElementById('menu'), {
  prefs, som, sortear,
  aoJogar: jogar,
  aoMudarEtapa: (etapa) => { if (vitrine) jogo.menu = etapa; },
  reduzido: () => movimentoReduzido.matches,
  trocarLados,
});
mostrarModoDeToque();

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
  if (document.hidden) limparEntradas();
  som.segundoPlano(document.hidden);
});
// Perdeu o foco (notificação puxada, outra janela, chamada): nada fica
// "apertado" e a partida pausa — a criança volta e escolhe continuar.
window.addEventListener('blur', () => {
  limparEntradas();
  if (jogo.tela === 'jogando' && !vitrine) pausar(true);
});

// Sem menu de contexto nem seleção acidental (público infantil, celular). O
// zoom de pinça e de dois toques já é barrado pelo `touch-action: none` do CSS;
// o Safari do iPhone ignora isso no gesto de pinça, então os seus eventos
// próprios de gesto também são cancelados.
window.addEventListener('contextmenu', (e) => e.preventDefault());
for (const tipo of ['gesturestart', 'gesturechange', 'dblclick']) {
  document.addEventListener(tipo, (e) => e.preventDefault(), { passive: false });
}

renderizador.definirMovimentoReduzido(movimentoReduzido.matches);
movimentoReduzido.addEventListener('change', (e) => renderizador.definirMovimentoReduzido(e.matches));

function ajustarTamanho() {
  if (!jogo.mundo) return;
  const estilo = getComputedStyle(palco);
  const largura = palco.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  const altura = palco.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  // Densidade até 2 (nítido em qualquer celular e bem mais leve que 3), descendo
  // sozinha se o aparelho não der conta (render/densidade.js). Atrás do menu
  // (vitrine, embaçada pelo vidro) basta densidade 1.
  renderizador.ajustar(largura, altura, vitrine ? 1 : densidade.valor, jogo.mundo);
}
new ResizeObserver(() => { ajustarTamanho(); redesenhar(); }).observe(palco);

// Medidor de quadros por segundo (exposto no gancho como state.fps).
const medidor = { quadros: 0, desde: performance.now(), fps: 0 };
let ultimo = performance.now();
let relogioAnimacao = 0;
let ultimoMundo = null;
let ultimaTela = null;
let bancada = null;
let vitrineDaVez = false;
let dtVitrine = 0;
let contaVitrine = 0;
let mediaQuadro = 16.7; // média móvel do quadro no menu (ms)
let vitrineDesenhada = false;
let vitrineLenta = false;

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
  if (jogo.tela !== ultimaTela) {
    ultimaTela = jogo.tela;
    atualizarBotaoPausa();
  }
  renderizador.desenhar(jogo.mundo, jogo.anteriores, jogo.fracao(), relogioAnimacao, dtSeg);
  placar.atualizar(jogo);
  avisos.atualizar(jogo, dtSeg);
  atualizarToque();
  bancada?.atualizar();
}

function quadro(agora) {
  const dt = Math.min(agora - ultimo, 250);
  ultimo = agora;
  // Com "reduzir movimento", a vitrine atrás do menu fica parada num quadro
  // (poupa bateria e não distrai); fora do menu nada muda.
  const vitrineParada = vitrine && movimentoReduzido.matches && vitrineDesenhada;
  if (!vitrineParada) jogo.quadro(dt);
  // Vitrine: sem placar entre rodadas e, no fim, outra partida de robôs.
  if (vitrine && jogo.intervalo > 0) jogo.pularIntervalo();
  if (vitrine && jogo.partida.encerrada) iniciarVitrine();
  const dtSeg = jogo.pausado ? 0 : (dt / 1000) * Math.min(jogo.escala, 4);
  relogioAnimacao += dtSeg;
  // No menu, a vitrine é desenhada em quadros alternados com as animações do
  // menu (cada uma a ~30 qps): o celular simples não precisa fazer as duas juntas.
  // Celular lento no menu (quadro médio acima de 40 ms): a vitrine passa a
  // ser desenhada um quadro em cada quatro; o menu continua fluido.
  if (vitrine) mediaQuadro = mediaQuadro * 0.95 + dt * 0.05;
  if (mediaQuadro > 40) vitrineLenta = true;
  else if (mediaQuadro < 24) vitrineLenta = false;
  const vezes = vitrineLenta ? 4 : 2;
  contaVitrine = (contaVitrine + 1) % vezes;
  vitrineDaVez = contaVitrine === 0;
  if (!vitrine) {
    if (jogo.tela === 'jogando' && !document.hidden) {
      if (densidade.registrar(dt, agora)) ajustarTamanho();
    } else densidade.esquecer();
    redesenhar(dtSeg);
  }
  else if (vitrineParada) { /* quadro congelado */ }
  else if (vitrineDaVez) { redesenhar(dtSeg + dtVitrine); dtVitrine = 0; vitrineDesenhada = true; } else dtVitrine += dtSeg;

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
  extras: () => ({ densidade: densidade.valor, mudo: prefs.dados.mudo, audio: som.ctx ? som.ctx.state : 'inativo', placarLocal: prefs.dados.placar }),
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
    bancada = new Bancada(document.getElementById('app'), jogo, { aoFechar: () => limparEntradas() });
  });
}
requestAnimationFrame(quadro);
