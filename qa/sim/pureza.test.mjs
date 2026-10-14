// Regras de arquitetura e de originalidade verificadas no código-fonte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const JOGO = join(RAIZ, 'bomberolho');

function arquivos(pasta, filtro = () => true) {
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    if (nome === 'node_modules' || nome === 'capturas' || nome.startsWith('.')) continue;
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho, filtro));
    else if (filtro(caminho)) saida.push(caminho);
  }
  return saida;
}

const semComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('simulação, IA e controlador não tocam em DOM, relógio real nem Math.random', () => {
  const proibidos = /\b(window|document|navigator|localStorage|sessionStorage|performance|requestAnimationFrame|setTimeout|setInterval|Date|fetch|XMLHttpRequest)\b|Math\.random/;
  const puros = [
    ...arquivos(join(JOGO, 'js/sim')),
    ...arquivos(join(JOGO, 'js/ia')),
    ...arquivos(join(JOGO, 'js/nucleo')),
    join(JOGO, 'js/jogo.js'),
  ];
  assert.ok(puros.length >= 12);
  for (const f of puros) {
    const codigo = semComentarios(readFileSync(f, 'utf8'));
    const achado = codigo.match(proibidos);
    assert.equal(achado, null, `${relative(RAIZ, f)} usa "${achado && achado[0]}"`);
  }
});

test('simulação não depende de nada fora de js/sim', () => {
  for (const f of arquivos(join(JOGO, 'js/sim'))) {
    const imports = [...readFileSync(f, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const i of imports) assert.ok(i.startsWith('./'), `${relative(RAIZ, f)} importa ${i}`);
  }
});

test('jogo 100% estático com caminhos relativos e sem rede externa', () => {
  const fontes = arquivos(JOGO, (f) => /\.(js|html|css|svg)$/.test(f));
  for (const f of fontes) {
    const texto = readFileSync(f, 'utf8');
    const rel = relative(RAIZ, f);
    const urls = (texto.match(/https?:\/\/[^\s"')]+/g) || []).filter((u) => u !== 'http://www.w3.org/2000/svg');
    assert.deepEqual(urls, [], `${rel} cita endereço externo`);
    assert.doesNotMatch(semComentarios(texto), /\bfetch\(|document\.cookie|XMLHttpRequest|navigator\.sendBeacon/, rel);
    for (const m of texto.matchAll(/(?:from\s+|import\(\s*)'([^']+)'/g)) assert.ok(m[1].startsWith('.'), `${rel}: import não relativo ${m[1]}`);
    for (const m of texto.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(!m[1].startsWith('/'), `${rel}: caminho absoluto ${m[1]}`);
  }
});

test('originalidade: nenhum nome de jogo de terceiros no repositório', () => {
  const proibida = ['bomber', 'man'].join(''); // montada para não aparecer escrita aqui
  // PLAN.md fica de fora: é o documento que enuncia a própria regra.
  const pastas = ['bomberolho', 'qa', 'reports'].map((p) => join(RAIZ, p));
  const textos = [join(RAIZ, 'README.md'), ...pastas.flatMap((p) => arquivos(p, (f) => /\.(js|mjs|html|css|svg|md|json)$/.test(f) && !f.includes('package-lock')))];
  for (const f of textos) {
    assert.ok(!readFileSync(f, 'utf8').toLowerCase().includes(proibida), `${relative(RAIZ, f)} contém nome proibido`);
  }
});

test('sem console.log de depuração no jogo', () => {
  for (const f of arquivos(join(JOGO, 'js'))) {
    assert.doesNotMatch(semComentarios(readFileSync(f, 'utf8')), /console\.(log|debug|info|warn)/, relative(RAIZ, f));
  }
});
