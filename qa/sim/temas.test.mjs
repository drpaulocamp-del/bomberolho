// Legibilidade do alcance do respingo: em cada arena, a cor de "perigo" tem
// contraste forte contra os dois tons do piso, inclusive já misturada com a
// transparência mínima usada no desenho (renderizador.js, spriteDePerigo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMAS } from '../../bomberolho/js/render/temas.js';

const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const lista = (t) => t.split(',').map(Number);
const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const sobre = (cor, fundo, alfa) => cor.map((c, k) => c * alfa + fundo[k] * (1 - alfa));

// Menor opacidade efetiva do contorno tracejado e das listras no começo da prévia.
const ALFA_CONTORNO = 0.95 * 0.62;
const ALFA_LISTRA = 1 - (1 - 0.34 * 0.62) * (1 - 0.55 * 0.62);

for (const [nome, tema] of Object.entries(TEMAS)) {
  test(`${nome}: prévia do respingo contrasta com o piso`, () => {
    for (const chave of ['cor', 'penetrante']) {
      const cor = lista(tema.perigo[chave]);
      for (const p of tema.piso) {
        const piso = hex(p);
        const pura = contraste(cor, piso);
        const contorno = contraste(sobre(cor, piso, ALFA_CONTORNO), piso);
        const listra = contraste(sobre(cor, piso, ALFA_LISTRA), piso);
        assert.ok(pura >= 3.5, `${nome}.${chave} sobre ${p}: ${pura.toFixed(2)}:1`);
        assert.ok(contorno >= 2.2, `${nome}.${chave} contorno sobre ${p}: ${contorno.toFixed(2)}:1`);
        assert.ok(listra >= 1.6, `${nome}.${chave} listra sobre ${p}: ${listra.toFixed(2)}:1`);
      }
    }
  });
}
