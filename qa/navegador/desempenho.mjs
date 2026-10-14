// Mede quadros por segundo e tempo de quadro numa partida em modo demo, em três
// momentos da rodada (começo, meio e aperto final), no desktop 1280×720 e no
// "celular de entrada" emulado (390×844, DPR 3, CPU 4× mais lenta). Mede também
// a queda transitória ao ENTRAR no aperto (rodando em tempo real através do
// instante em que ele liga) e o menu inicial no celular lento.
//
// Como chega a cada momento: congela o relógio (setTimeScale(0)), avança a
// simulação com step() até o relógio da rodada (state.relogio, em segundos)
// chegar ao alvo e, para o aperto, até state.aperto.ativo ser verdadeiro. Se a
// rodada acabar antes (alguém venceu), tenta a semente seguinte da lista. Se
// nenhuma semente chegar, ou se a rodada sair do momento durante a medição, o
// script avisa e termina com código 1 — nunca mede outro momento no lugar.
//
// Cada momento é medido numa página nova: "adaptação" = 1,5 s logo depois de
// chegar (inclui a descida da densidade adaptativa de render/densidade.js);
// "estável" = os 6 s seguintes.
//
// Uso: node navegador/desempenho.mjs [--vezes N] [--json caminho]   (dentro de qa/)

import { writeFileSync } from 'node:fs';
import { subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
};
const VEZES = Number(arg('vezes', '1'));
const ADAPTACAO = 1500; // ms logo após chegar ao momento (sem aquecer)
const JANELA = 6000; // ms medidos depois disso
const SEMENTES = [11, 5, 7, 23, 42, 3, 19, 101];
const BASE = { arena: 'jardim', dificuldade: 'dificil', rodadas: 3, contagem: false };

const telas = [
  { nome: 'desktop 1280×720', tela: { width: 1280, height: 720 }, dpr: 1, lentidao: 1, toque: false },
  { nome: 'celular lento 390×844 (DPR 3, CPU 4×)', tela: { width: 390, height: 844 }, dpr: 3, lentidao: 4, toque: true },
];
// O aperto final liga com 60 s no relógio (inicioAperto = 3600 ticks em sim/ajustes.js).
const momentos = [
  { nome: 'começo', relogio: 115, aperto: false },
  { nome: 'meio', relogio: 85, aperto: false },
  { nome: 'aperto', relogio: 45, aperto: true },
];
const ENTRADA = { antes: 64, aquecer: 2500, ate: 53 }; // transição: de 64 s (sem aperto) até 53 s

/** Avança a partida congelada até o relógio-alvo, trocando de semente se a rodada acabar antes. */
async function chegar(pagina, alvo, exigeAperto) {
  return pagina.evaluate(({ alvo, exigeAperto, sementes, base }) => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    for (const semente of sementes) {
      b.start({ ...base, semente });
      b.demo(true);
      let s = b.state;
      while (s.tela === 'jogando' && s.fase === 'jogando' && s.relogio > alvo) s = b.step(30);
      const vivos = s.jogadores.filter((j) => j.vivo).length;
      if (s.tela === 'jogando' && s.fase === 'jogando' && vivos >= 2 && s.aperto.ativo === exigeAperto) {
        b.setTimeScale(1);
        return { ok: true, semente, relogio: s.relogio, vivos, aperto: s.aperto.ativo, caidas: s.aperto.caidas };
      }
    }
    return { ok: false };
  }, { alvo, exigeAperto, sementes: SEMENTES, base: BASE });
}

/** Grava o tempo de cada quadro por `janela` ms, com o relógio da rodada em cada um. */
function gravar(pagina, janela) {
  return pagina.evaluate((janela) => new Promise((ok) => {
    const quadros = [];
    let antes = performance.now();
    const fim = antes + janela;
    function q(agora) {
      const s = window.__bomberolho.state;
      quadros.push({ dt: agora - antes, relogio: s.relogio, aperto: s.aperto.ativo, tela: s.tela, densidade: s.densidade });
      antes = agora;
      if (agora < fim) requestAnimationFrame(q);
      else ok(quadros);
    }
    requestAnimationFrame(q);
  }), janela);
}

function resumir(quadros) {
  if (!quadros.length) return null;
  const t = quadros.map((x) => x.dt).sort((a, b) => a - b);
  const soma = t.reduce((a, b) => a + b, 0);
  // fps mínimo: pior janela deslizante de 500 ms (um quadro isolado lento não é "fps").
  let minFps = Infinity;
  for (let i = 0; i < quadros.length; i++) {
    let acc = 0;
    let n = 0;
    for (let k = i; k < quadros.length && acc < 500; k++) { acc += quadros[k].dt; n++; }
    if (acc >= 500) minFps = Math.min(minFps, (n * 1000) / acc);
  }
  return {
    fps: Math.round((t.length * 1000) / soma),
    p95: +t[Math.floor(t.length * 0.95)].toFixed(1),
    max: +t.at(-1).toFixed(1),
    fpsMin500ms: Number.isFinite(minFps) ? Math.round(minFps) : null,
    lentos: +((100 * t.filter((x) => x > 34).length) / t.length).toFixed(1),
    densidade: quadros.at(-1).densidade,
    relogio: [quadros[0].relogio, quadros.at(-1).relogio],
  };
}

const texto = (r) => `${r.fps} fps, p95 ${r.p95} ms, máx ${r.max} ms, mín (500 ms) ${r.fpsMin500ms} fps, `
  + `quadros > 34 ms ${r.lentos}%, densidade ${r.densidade}, relógio ${r.relogio[0]}→${r.relogio[1]} s`;

async function abrir(navegador, servidor, c) {
  const { pagina, contexto, problemas } = await novaPagina(navegador, c.tela, { dpr: c.dpr, contexto: { hasTouch: c.toque, isMobile: c.toque } });
  await pagina.goto(`${servidor.url}?demo=1&semente=${SEMENTES[0]}&dificuldade=${BASE.dificuldade}&rodadas=3&arena=${BASE.arena}`);
  await esperarJogo(pagina);
  const lentidao = async () => {
    if (c.lentidao > 1) await (await contexto.newCDPSession(pagina)).send('Emulation.setCPUThrottlingRate', { rate: c.lentidao });
  };
  return { pagina, contexto, problemas, lentidao };
}

const resultados = [];
const falhas = [];
const servidor = await subirServidor();
const navegador = await abrirNavegador();
try {
  for (let vez = 1; vez <= VEZES; vez++) {
    for (const c of telas) {
      for (const mo of momentos) {
        const { pagina, contexto, problemas, lentidao } = await abrir(navegador, servidor, c);
        const chegada = await chegar(pagina, mo.relogio, mo.aperto);
        if (!chegada.ok) {
          falhas.push(`${c.nome} · ${mo.nome}: nenhuma semente chegou ao momento (relógio ${mo.relogio} s)`);
          await contexto.close();
          continue;
        }
        await lentidao();
        const quadros = await gravar(pagina, ADAPTACAO + JANELA);
        let acc = 0;
        const corte = quadros.findIndex((q) => (acc += q.dt) >= ADAPTACAO);
        const adaptacao = resumir(quadros.slice(0, corte));
        const estavel = resumir(quadros.slice(corte));
        const fora = quadros.filter((q) => q.tela !== 'jogando' || q.aperto !== mo.aperto).length;
        if (fora) falhas.push(`${c.nome} · ${mo.nome}: ${fora} quadros fora do momento (a rodada mudou durante a medição)`);
        if (problemas.length) falhas.push(`${c.nome} · ${mo.nome}: ${problemas.join(' | ')}`);
        resultados.push({ vez, tela: c.nome, momento: mo.nome, semente: chegada.semente, vivos: chegada.vivos, adaptacao, estavel });
        console.log(`[${vez}] ${c.nome} · ${mo.nome} (semente ${chegada.semente}, vivos ${chegada.vivos})`);
        console.log(`      adaptação 1,5 s: ${texto(adaptacao)}`);
        console.log(`      estável 6 s:     ${texto(estavel)}`);
        await contexto.close();
      }

      // Entrada no aperto, em tempo real: aquece antes (densidade já acomodada),
      // grava de ~61 s até ~53 s e separa antes/depois do instante em que liga.
      const { pagina, contexto, problemas, lentidao } = await abrir(navegador, servidor, c);
      const chegada = await chegar(pagina, ENTRADA.antes, false);
      if (!chegada.ok) {
        falhas.push(`${c.nome} · entrada no aperto: nenhuma semente chegou a ${ENTRADA.antes} s`);
      } else {
        await lentidao();
        await pagina.waitForTimeout(ENTRADA.aquecer);
        const ms = await pagina.evaluate((ate) => Math.max(1000, (window.__bomberolho.state.relogio - ate) * 1000), ENTRADA.ate);
        const quadros = await gravar(pagina, ms);
        const i = quadros.findIndex((q) => q.aperto);
        if (i < 0 || quadros.some((q) => q.tela !== 'jogando')) {
          falhas.push(`${c.nome} · entrada no aperto: o aperto não ligou durante a gravação ou a rodada acabou`);
        } else {
          let acc = 0;
          let j = i;
          while (j < quadros.length && (acc += quadros[j].dt) < 2000) j++;
          const r = {
            antes: resumir(quadros.slice(0, i)),
            primeiros2s: resumir(quadros.slice(i, j)),
            depois: resumir(quadros.slice(j)),
          };
          if (problemas.length) falhas.push(`${c.nome} · entrada no aperto: ${problemas.join(' | ')}`);
          resultados.push({ vez, tela: c.nome, momento: 'entrada no aperto', semente: chegada.semente, ...r });
          console.log(`[${vez}] ${c.nome} · entrada no aperto (semente ${chegada.semente})`);
          console.log(`      antes de ligar:     ${texto(r.antes)}`);
          console.log(`      2 s após ligar:     ${texto(r.primeiros2s)}`);
          console.log(`      depois:             ${texto(r.depois)}`);
        }
      }
      await contexto.close();
    }

    // Menu inicial (vitrine de robôs atrás + desfile) no celular lento.
    const { pagina, contexto } = await novaPagina(navegador, { width: 390, height: 844 }, { dpr: 3, contexto: { hasTouch: true, isMobile: true } });
    await pagina.goto(servidor.url);
    await esperarJogo(pagina);
    await (await contexto.newCDPSession(pagina)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pagina.waitForTimeout(ADAPTACAO);
    const r = resumir(await gravar(pagina, JANELA));
    resultados.push({ vez, tela: 'celular lento', momento: 'menu', estavel: r });
    console.log(`[${vez}] menu no celular lento: ${r.fps} fps, p95 ${r.p95} ms, mín (500 ms) ${r.fpsMin500ms} fps`);
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
const json = arg('json', null);
if (json) writeFileSync(json, JSON.stringify(resultados, null, 1));
if (falhas.length) {
  console.error(`\nMedição incompleta:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
