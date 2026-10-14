// Simulação em lote, sem cabeça, reproduzível (sementes fixas).
// Uso (de dentro de qa/):
//   npm run lote                       → lote completo (≈ 2 300 partidas), tabelas em Markdown
//   node lote/simular.mjs --escala 0.1 → lote rápido (10%)
// Opções: --escala N · --trabalhadores N · --json caminho (padrão lote/resultado.json)
//         --md caminho (padrão lote/resultado.md) · --so REGEX (só os cenários que casam)
// Em pedaços (o contêiner pode reiniciar; cada pedaço grava o seu resultado):
//   node lote/simular.mjs --fatia 1/4 --parcial lote/p1.json   (… 2/4, 3/4, 4/4)
//   node lote/simular.mjs --juntar lote/p1.json,lote/p2.json,lote/p3.json,lote/p4.json

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { montarPartidas } from './cenarios.mjs';
import { jogarPartida } from './partida.mjs';

function opcao(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
}

async function principal() {
  const escala = Number(opcao('escala', '1'));
  const n = Number(opcao('trabalhadores', String(Math.max(1, availableParallelism()))));
  const pastaLote = fileURLToPath(new URL('./', import.meta.url));
  const caminhoJson = opcao('json', `${pastaLote}resultado.json`);
  const caminhoMd = opcao('md', `${pastaLote}resultado.md`);
  const juntar = opcao('juntar', null);
  let resultados;
  let segundos;
  if (juntar) {
    const pedacos = juntar.split(',').map((c) => JSON.parse(readFileSync(c, 'utf8')));
    resultados = pedacos.flatMap((p) => p.resultados);
    segundos = pedacos.reduce((t, p) => t + p.segundos, 0);
  } else {
    let partidas = montarPartidas(escala);
    const so = opcao('so', null);
    if (so) partidas = partidas.filter((p) => new RegExp(so).test(p.cenario));
    const fatia = opcao('fatia', null);
    if (fatia) {
      const [k, total] = fatia.split('/').map(Number);
      partidas = partidas.filter((_, i) => i % total === k - 1);
    }
    const inicio = Date.now();
    const fatias = Array.from({ length: n }, (_, k) => partidas.filter((_, i) => i % n === k));
    resultados = (await Promise.all(fatias.map((f) => new Promise((ok, falha) => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { partidas: f } });
      w.once('message', ok);
      w.once('error', falha);
    })))).flat();
    segundos = (Date.now() - inicio) / 1000;
    const parcial = opcao('parcial', null);
    if (parcial) {
      writeFileSync(parcial, JSON.stringify({ segundos, resultados }));
      console.log(`pedaço ${fatia || 'inteiro'}: ${resultados.length} partidas em ${segundos.toFixed(0)} s → ${parcial}`);
      return;
    }
  }
  const md = relatorio(resultados, segundos, escala, juntar ? 'vários pedaços' : n);
  writeFileSync(caminhoJson, JSON.stringify(resumoJson(resultados, segundos), null, 1));
  writeFileSync(caminhoMd, md);
  console.log(md);
}

// ───────────────────────── agregação ─────────────────────────

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
/** Proporção com intervalo de 95% (aproximação normal): "23.4% ± 2.1". */
const pctIC = (a, b) => {
  if (!b) return '—';
  const p = a / b;
  return `${(100 * p).toFixed(1)}% ± ${(196 * Math.sqrt((p * (1 - p)) / b)).toFixed(1)}`;
};
const media = (l) => (l.length ? l.reduce((s, v) => s + v, 0) / l.length : 0);
const quantil = (l, q) => {
  if (!l.length) return 0;
  const o = [...l].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(q * o.length))];
};
const tabela = (cab, linhas) => [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');

function resumoJson(res, segundos) {
  return { segundos, partidas: res.length, resultados: res.map(({ itens, poderes, contas, ...r }) => r) };
}

function relatorio(res, segundos, escala, n) {
  const partes = [];
  const rodadas = res.flatMap((r) => r.rodadas);
  const problemas = res.flatMap((r) => [...new Set(r.problemas)]);
  partes.push(`# Simulação em lote — ${res.length} partidas, ${rodadas.length} rodadas`);
  partes.push(`Escala ${escala}, ${n} trabalhadores, ${segundos.toFixed(0)} s de processamento. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).`);

  // 1. Visão geral por cenário
  const cenarios = [...new Set(res.map((r) => r.cenario))];
  partes.push('## 1. Visão geral por cenário');
  partes.push(tabela(
    ['Cenário', 'Partidas', 'Rodadas', 'Rodadas com vencedor', 'Empate (relógio)', 'Empate (todos caíram)', 'Duração média', 'p90', 'Máx.', 'Rodadas/partida (máx.)', 'Taça no desempate', 'Partida empatada'],
    cenarios.map((c) => {
      const rs = res.filter((r) => r.cenario === c);
      const rd = rs.flatMap((r) => r.rodadas);
      const seg = rd.map((x) => x.segundos);
      return [c, rs.length, rd.length, pct(rd.filter((x) => x.vencedor !== null).length, rd.length),
        pct(rd.filter((x) => x.tempoEsgotado).length, rd.length), pct(rd.filter((x) => x.vencedor === null && !x.tempoEsgotado).length, rd.length),
        `${media(seg).toFixed(0)} s`, `${quantil(seg, 0.9).toFixed(0)} s`, `${Math.max(...seg).toFixed(0)} s`,
        `${media(rs.map((r) => r.rodadas.length)).toFixed(2)} (${Math.max(...rs.map((r) => r.rodadas.length))})`,
        pct(rs.filter((r) => r.desempate).length, rs.length), pct(rs.filter((r) => r.campeao === null).length, rs.length)];
    }),
  ));

  // 2. Justiça por canto (mesmo nível)
  partes.push('## 2. Vitórias de partida por canto (todos do mesmo nível)');
  partes.push('Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).');
  partes.push(tabela(['Nível', 'Partidas', 'Canto 0', 'Canto 1', 'Canto 2', 'Canto 3', 'Partida sem campeão'],
    ['facil', 'medio', 'dificil'].map((nv) => {
      const rs = res.filter((r) => r.cenario === `mesmo:${nv}`);
      return [nv, rs.length, ...[0, 1, 2, 3].map((k) => pctIC(rs.filter((r) => r.campeao === k).length, rs.length)), pct(rs.filter((r) => r.campeao === null).length, rs.length)];
    })));
  partes.push('Por rodada (amostra maior): fração das rodadas **com vencedor** que cada canto venceu. Esperado 25% ± intervalo de 95%.');
  partes.push(tabela(['Nível', 'Rodadas com vencedor', 'Canto 0', 'Canto 1', 'Canto 2', 'Canto 3'],
    ['facil', 'medio', 'dificil', 'todos'].map((nv) => {
      const rd = res.filter((r) => (nv === 'todos' ? r.cenario.startsWith('mesmo:') : r.cenario === `mesmo:${nv}`)).flatMap((r) => r.rodadas).filter((x) => x.vencedor !== null);
      return [nv, rd.length, ...[0, 1, 2, 3].map((k) => pctIC(rd.filter((x) => x.vencedor === k).length, rd.length))];
    })));

  // 3. Por arena
  partes.push('## 3. Por arena (todos do mesmo nível, os três níveis juntos)');
  const arenas = [...new Set(res.map((r) => r.arena))];
  partes.push(tabela(['Arena', 'Rodadas', 'Com vencedor', 'Empate', 'Duração média', 'Quedas no aperto', 'Itens pegos/rodada'],
    arenas.map((a) => {
      const rs = res.filter((r) => r.arena === a && r.cenario.startsWith('mesmo:'));
      const rd = rs.flatMap((r) => r.rodadas);
      const quedas = rd.flatMap((x) => x.quedas);
      const itens = rs.reduce((s, r) => s + r.itens.reduce((t, o) => t + Object.values(o).reduce((u, v) => u + v, 0), 0), 0);
      return [a, rd.length, pct(rd.filter((x) => x.vencedor !== null).length, rd.length), pct(rd.filter((x) => x.vencedor === null).length, rd.length),
        `${media(rd.map((x) => x.segundos)).toFixed(0)} s`, pct(quedas.filter((q) => q.motivo === 'aperto').length, quedas.length), (itens / rd.length).toFixed(1)];
    })));

  // 4. Quedas por causa, por nível de quem caiu
  partes.push('## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)');
  partes.push('"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.');
  const porNivel = {};
  for (const r of res) {
    r.rodadas.forEach((rd) => {
      r.niveis.forEach((nv) => { (porNivel[nv] ??= { jogadas: 0, quedas: [] }).jogadas++; });
      for (const q of rd.quedas) porNivel[r.niveis[q.jogador]].quedas.push(q);
    });
  }
  partes.push('"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). "Encurralado" = caiu com a própria gota, mas a saída estava fechada por um rival (casa vizinha com gota dele ou molhada por respingo dele). As duas últimas colunas são taxas por competidor por rodada jogada: a primeira tira só as apostas; a segunda tira também os encurralados (erro "puro", sem rival envolvido).');
  const apostou = (x) => x.motivo === 'propria' && x.restante !== null && x.restante <= 300;
  partes.push(tabela(['Quem caiu', 'Rodadas jogadas', 'Quedas', 'Própria gota', '…aposta final', '…encurralado por rival', 'Própria, em cadeia', 'Rival', 'Aperto final', 'Auto-eliminação por rodada (sem apostas)', 'Erro puro por rodada (sem apostas nem encurralados)'],
    Object.entries(porNivel).map(([nv, d]) => {
      const q = d.quedas;
      const propria = q.filter((x) => x.motivo === 'propria').length;
      const apostas = q.filter(apostou).length;
      const cercados = q.filter((x) => x.motivo === 'propria' && !apostou(x) && x.encurralado).length;
      return [nv, d.jogadas, q.length, pct(propria, q.length), pct(apostas, q.length), pct(cercados, q.length), pct(q.filter((x) => x.motivo === 'respingo' && x.por === x.jogador).length, q.length),
        pct(q.filter((x) => x.motivo === 'respingo' && x.por !== x.jogador).length, q.length), pct(q.filter((x) => x.motivo === 'aperto').length, q.length),
        pct(propria - apostas, d.jogadas), pct(propria - apostas - cercados, d.jogadas)];
    })));

  // 5. Proxies de gente
  partes.push('## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)');
  partes.push(tabela(['Cenário', 'Partidas', 'Proxy campeão', 'Rodadas vencidas pelo proxy', 'Proxy caiu sozinho (por rodada)', 'Robôs campeões', 'Sem campeão'],
    cenarios.filter((c) => c.includes('×')).map((c) => {
      const rs = res.filter((r) => r.cenario === c);
      const rd = rs.flatMap((r) => r.rodadas.map((x) => ({ ...x, proxy: r.proxy })));
      return [c, rs.length, pctIC(rs.filter((r) => r.campeao === r.proxy).length, rs.length), pctIC(rd.filter((x) => x.vencedor === x.proxy).length, rd.length),
        pct(rd.filter((x) => x.quedas.some((q) => q.jogador === x.proxy && q.motivo === 'propria')).length, rd.length),
        pct(rs.filter((r) => r.campeao !== null && r.campeao !== r.proxy).length, rs.length), pct(rs.filter((r) => r.campeao === null).length, rs.length)];
    })));

  // 6. Níveis misturados
  const mistos = res.filter((r) => r.cenario === 'misto');
  if (mistos.length) {
    partes.push('## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)');
    const vit = { dificil: 0, medio: 0, facil: 0, nenhum: 0 };
    for (const r of mistos) vit[r.campeao === null ? 'nenhum' : r.niveis[r.campeao]]++;
    const rv = { dificil: 0, medio: 0, facil: 0, nenhum: 0 };
    let nr = 0;
    for (const r of mistos) for (const x of r.rodadas) { nr++; rv[x.vencedor === null ? 'nenhum' : r.niveis[x.vencedor]]++; }
    partes.push(tabela(['Campeão', 'Partidas', '% das partidas (IC 95%)', 'Rodadas vencidas', '% das rodadas (IC 95%)', 'Esperado se fossem iguais'], [
      ['Difícil', vit.dificil, pctIC(vit.dificil, mistos.length), rv.dificil, pctIC(rv.dificil, nr), '25%'],
      ['Médio', vit.medio, pctIC(vit.medio, mistos.length), rv.medio, pctIC(rv.medio, nr), '25%'],
      ['Fácil (cada um)', (vit.facil / 2).toFixed(0), pctIC(vit.facil / 2, mistos.length), (rv.facil / 2).toFixed(0), pctIC(rv.facil / 2, nr), '25%'],
      ['Sem campeão / empate', vit.nenhum, pct(vit.nenhum, mistos.length), rv.nenhum, pct(rv.nenhum, nr), '—'],
    ]));
  }

  // 7. Itens e poderes
  partes.push('## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)');
  const tiposItem = ['gota', 'alcance', 'velocidade', 'chute', 'superLupa', 'cisco', 'pinca', 'penetrante', 'estojo'];
  const tiposPoder = ['chute', 'arremesso', 'penetrante', 'montou', 'salto', 'disparada', 'defendeu', 'perdeuBichinho', 'cisco', 'espirro'];
  const somar = (campo, tipos) => {
    const t = {};
    for (const r of res) {
      r.niveis.forEach((nv, k) => {
        const alvo = (t[nv] ??= { rodadas: 0, ...Object.fromEntries(tipos.map((x) => [x, 0])) });
        alvo.rodadas += r.rodadas.length;
        for (const x of tipos) alvo[x] += r[campo][k][x] || 0;
      });
    }
    return t;
  };
  const it = somar('itens', tiposItem);
  partes.push(tabela(['Quem', ...tiposItem], Object.entries(it).map(([nv, d]) => [nv, ...tiposItem.map((x) => (d[x] / d.rodadas).toFixed(2))])));
  const po = somar('poderes', tiposPoder);
  partes.push('Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.');
  partes.push(tabela(['Quem', ...tiposPoder], Object.entries(po).map(([nv, d]) => [nv, ...tiposPoder.map((x) => (d[x] / d.rodadas).toFixed(3))])));

  // 8. Robustez
  partes.push('## 8. Robustez');
  const paradoS = res.flatMap((r) => r.paradoMax).map((t) => t / 60);
  partes.push(tabela(['Checagem', 'Resultado'], [
    ['Posições NaN/infinitas', String(problemas.filter((p) => p.startsWith('NaN')).length)],
    ['Rodadas além do limite (relógio + contagem + pausa)', String(problemas.filter((p) => p.startsWith('rodada')).length)],
    ['Partidas sem fim', String(problemas.filter((p) => p.startsWith('partida')).length)],
    ['Partidas encerradas normalmente', `${res.filter((r) => r.encerrada).length} de ${res.length}`],
    ['Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx.', `${quantil(paradoS, 0.5).toFixed(1)} s / ${quantil(paradoS, 0.95).toFixed(1)} s / ${Math.max(...paradoS).toFixed(1)} s`],
  ]));
  return partes.join('\n\n') + '\n';
}

if (!isMainThread) {
  parentPort.postMessage(workerData.partidas.map((spec) => jogarPartida(spec)));
} else {
  await principal();
}
