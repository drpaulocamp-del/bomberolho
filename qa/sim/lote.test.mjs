// Parte 2 — amostra pequena da simulação em lote (o lote completo é `npm run
// lote`): partidas inteiras pelo controlador real terminam, sem NaN, sem
// rodada além do limite e com o placar consistente.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jogarPartida } from '../lote/partida.mjs';
import { montarPartidas } from '../lote/cenarios.mjs';
import { limiteDeRodadas } from '../../bomberolho/js/sim/partida.js';

test('amostra do lote: partidas terminam, placar fecha com o histórico, sem NaN nem rodada sem fim', () => {
  const amostra = montarPartidas(1).filter((_, k) => k % 400 === 0);
  assert.ok(amostra.length >= 5);
  for (const spec of amostra) {
    const r = jogarPartida({ ...spec, rodadas: 1 });
    assert.deepEqual(r.problemas, [], `${spec.cenario} ${spec.semente}`);
    assert.equal(r.encerrada, true);
    assert.ok(r.rodadas.length >= 1 && r.rodadas.length <= limiteDeRodadas(1));
    const vitorias = [0, 0, 0, 0];
    for (const rd of r.rodadas) {
      if (rd.vencedor !== null) vitorias[rd.vencedor]++;
      assert.ok(rd.segundos > 0 && rd.segundos <= 120);
      if (rd.vencedor !== null) assert.equal(rd.vivosNoFim, 1, 'vencedor = único de pé');
    }
    if (r.campeao !== null) assert.equal(vitorias[r.campeao], 1);
  }
});
