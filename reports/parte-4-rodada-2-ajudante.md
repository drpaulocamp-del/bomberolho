# Parte 4, rodada 2 — relatório do executor ajudante

Trabalhei em paralelo ao executor principal e não toquei em nada dentro de `bomberolho/`. Os meus arquivos foram estes:

- `qa/navegador/desempenho.mjs`
- `README.md`
- `.gitignore` e `qa/lote/.gitignore`
- os JSON gerados que deixaram de ser versionados

O `qa/package.json` não precisou mudar: todos os scripts dele existem. Resolvi os itens **M2**, **M3** e **M4** do parecer `reviews/parte-4-rodada-1.md`.

## M2 — `npm run desempenho` agora mede o que diz

### O defeito

O laço de avanço lia `state.tempoRestante`. Esse campo não existe no retrato, e por isso as três janelas mediam o começo da rodada.

O estado real (`bomberolho/js/gancho.js` → `jogo.retrato()` → `sim/retrato.js`) expõe outros campos:

- `relogio`: segundos que faltam na rodada;
- `aperto.ativo` e `aperto.caidas`;
- `fase` e `tela`;
- `densidade`, vindo de `main.js` pelos `extras`.

### O que o script faz agora (`qa/navegador/desempenho.mjs`)

**Como chega a cada momento**

- Congela o tempo e avança com `step(30)` até `state.relogio` chegar ao alvo:
  - começo: 115 s;
  - meio: 85 s;
  - aperto: 45 s, exigindo `aperto.ativo === true`. O aperto liga com 60 s no relógio, porque `inicioAperto = 3600` ticks em `sim/ajustes.js`.
- Também exige `fase === 'jogando'` e pelo menos 2 competidores vivos.
- Se a rodada acabar antes, tenta a semente seguinte de uma lista fixa.
- Se nenhuma semente servir, ou se algum quadro gravado sair do momento (a rodada acabou, ou o aperto não estava como esperado), o script lista a falha e **termina com código 1**. Nunca mede outro momento no lugar.

**O que mede em cada momento**

Cada momento é medido numa página nova, em duas janelas:

- **adaptação:** o 1,5 s logo após chegar, sem aquecer. É quando a densidade adaptativa desce.
- **estável:** os 6 s seguintes.

Em cada janela, o script registra:

- o fps médio;
- o **p95** do tempo de quadro;
- o tempo de quadro máximo;
- o **fps mínimo**, definido como a pior janela deslizante de 500 ms;
- a fatia de quadros acima de 34 ms;
- a densidade final;
- o relógio no início e no fim da janela, como prova do momento medido.

**Entrada no aperto (nova)**

- O script chega a 64 s, liga a lentidão da CPU, aquece 2,5 s e grava **em tempo real** até 53 s.
- Depois separa três trechos: antes de o aperto ligar, os 2 s seguintes e o resto.

**O resto**

- O menu no celular lento continua sendo medido.
- O script falha se houver erro de console, aviso ou 404.
- Opções: `--vezes N` (padrão 1) e `--json caminho`.
- Cada repetição leva cerca de 1,5 min.

**Cenário:** Jardim, Difícil, demo, sementes [11, 5, 7, …]. A semente 11 chegou a todos os momentos com 4 vivos.

**Telas:**

- desktop 1280×720, DPR 1;
- celular lento emulado 390×844, DPR 3, toque, `Emulation.setCPUThrottlingRate` 4×.

Não mudei nada no jogo.

### Medições

Fiz 3 repetições: uma com `--vezes 1` e duas com `--vezes 2`. As células trazem os três valores, na ordem das repetições. O jogo era o da árvore de trabalho no momento da medição, antes dos últimos ajustes de CSS e HUD do executor principal.

**Desktop 1280×720**

| Momento | fps médio | p95 (ms) | fps mín. (500 ms) | quadros > 34 ms |
|---|---|---|---|---|
| Começo (estável) | 60 / 59 / 60 | 16,7 / 16,8 / 16,7 | 60 / 52 / 60 | 0 / 0,3 / 0 % |
| Meio (estável) | 60 / 60 / 60 | 16,7–16,8 | 60 / 56 / 58 | 0 % |
| Aperto (estável) | 60 / 60 / 60 | 16,7–16,8 | 58 / 56 / 60 | 0 % |
| Entrada no aperto, 2 s após ligar | 60 / 58 / 60 | 16,7–16,8 | 60 / 56 / 60 | 0 / 0,9 / 0 % |

- O desktop fica cravado em 60 fps em todos os momentos.
- Os mínimos de 52–56 aparecem numa única repetição e coincidem com a máquina ocupada pelos testes do outro executor. Mesmo assim, ficam bem acima do orçamento.

**Celular lento emulado (390×844, DPR 3, CPU 4×)**

| Momento | fps médio | p95 (ms) | fps mín. (500 ms) | quadros > 34 ms | densidade |
|---|---|---|---|---|---|
| Começo (estável) | 43 / 47 / 43 | 50 / 33,4 / 49,9 | 23 / 23 / 25 | 7 / 3,5 / 5,8 % | desce de 1,5 para 1 dentro da janela |
| Meio (estável) | 46 / 50 / 44 | 33,4 / 33,4 / 33,4 | 34 / 34 / 30 | 2,2 / 1 / 2,3 % | 1 |
| **Aperto (estável, 45→37 s)** | **44 / 45 / 47** | 33,4 / 49,9 / 33,4 | **31 / 31 / 32** | 0,7 / 5,5 / 2,1 % | 1 |
| Adaptação no começo (1,5 s) | 56 / 44 / 39 | 33–50 | 50 / 32 / 33 | 1–8 % | 2 → 1,5 |
| Adaptação no meio (1,5 s) | 28 / 29 / 23 | 67–83 | 18 / 25 / 18 | 27–50 % | → 1 |
| Adaptação no aperto (1,5 s) | 21 / 23 / 27 | 67–83 | 14 / 15 / 17 | 32–58 % | → 1 |
| Menu inicial | 41 / 35 / 35 | 50 / 67 / 50 | 28 / 22 / 25 | — | — |

**Queda transitória ao entrar no aperto** (mesmo celular, em tempo real e com a densidade já acomodada antes):

| Trecho | fps médio | p95 (ms) | fps mín. (500 ms) | quadros > 34 ms |
|---|---|---|---|---|
| Antes de ligar (61→60 s) | 41 / 54 / 45 | 33,4 | 35 / 50 / 41 | 2,1 / 0 / 0 % |
| **2 s após ligar (60→58 s)** | **42 / 49 / 36** | 33,5 / 33,4 / 50 | **29 / 40 / 25** | 4,8 / 0 / 8,3 % |
| Depois (58→53 s) | 47 / 43 / 39 | 33,4 / 33,4 / 50 | 34 / 30 / 27 | 3 / 2,3 / 7,5 % |

### Leitura honesta

- **Desktop:** cumpre os 60 fps em todos os momentos, inclusive no aperto e na entrada nele.
- **Celular de entrada emulado:** a média fica em 43–50 fps em todos os momentos, acima dos 30 fps. Mas há trechos de 0,5 s abaixo de 30 fps:
  - **na entrada no aperto:** mínimo de 25–29 fps em 2 das 3 repetições, com 8% de quadros lentos;
  - **no começo**, enquanto a densidade ainda desce (23–25 fps);
  - **no menu** (22–28 fps).
  - "≥ 30 fps estáveis" vale para a média e, no meio e no aperto já acomodados, também para o mínimo (30–34). Não vale para os mínimos transitórios.
- **"Adaptação" de 1,5 s numa página nova (14–29 fps):** inclui custos de partida fria que não acontecem numa sessão real, porque a página acabou de carregar, a simulação foi avançada com redesenho e a densidade cai de 2 para 1 nesse intervalo. É o mesmo fenômeno que o verificador viu ("22–28 fps logo após chegar"). A queda real ao entrar no aperto durante o jogo é a da tabela de entrada (mínimo de 25–40 fps).
- **Diferença em relação ao verificador:** os meus números de aperto (44–47 fps, p95 de 33–50 ms) são melhores que os dele (34–35 fps, p95 de 50 ms). Os cenários diferem: ele usou Caverna e Médio, e eu Jardim e Difícil. Além disso, o jogo mudou entre as rodadas. Não ajustei o cenário para melhorar números. O Jardim já era o cenário do script original.
- **Ruído:** a máquina estava compartilhada com o outro executor, que rodava testes de navegador em paralelo. A variação entre repetições (por exemplo, 36 a 49 fps nos 2 s após o aperto ligar) mostra esse ruído. A CPU 4× é emulação do Chromium, não um aparelho físico (aceito pelo dono, seção 3.9).

### Memória (conferida de passagem)

O `npm run memoria` (5 min) terminou assim:

- heap de 4,45 a 4,61 MB entre 210 e 300 s, com variação de 0,71 MB de 30 a 300 s;
- ouvintes constantes em 57;
- nós do DOM de 1 327 para 1 252;
- sem erros.

## M3 — JSON gerados fora do versionamento

Os arquivos abaixo saíram do índice com `git rm --cached`. As cópias locais continuam no disco, agora ignoradas. O histórico não foi reescrito, e nenhum script, resumo `.md` ou parecer foi apagado.

| Arquivo | Tamanho | Como se recria |
|---|---|---|
| `qa/lote/p4.json` | 4 466 848 B (4,3 MB) | `node lote/simular.mjs --escala 0.5 --json lote/p4.json --md lote/p4.md` (o `p4.md` continua versionado) |
| `qa/verificacao/v-p2r2/lote.json` | 2 024 698 B | `--juntar` de `l1`/`l2` com `lote/simular.mjs` (o `lote.md` continua versionado) |
| `qa/verificacao/v-p2r2/l1.json` | 1 336 030 B | `lote/simular.mjs --fatia 1/2 --parcial …` |
| `qa/verificacao/v-p2r2/l2.json` | 1 331 538 B | `lote/simular.mjs --fatia 2/2 --parcial …` |
| `qa/verificacao/p2r1/jogar.out.json` | 10 409 B | saída de `qa/verificacao/p2r1/jogar.mjs` |
| `qa/verificacao/v-p3r1/test.out` | 35 002 B | saída do `npm test` daquela verificação (citada no parecer, item M3) |
| `qa/verificacao/v-p3r2/test.out` | 37 389 B | idem |

São cerca de 9,2 MB a menos na árvore versionada. O `.git` continua com cerca de 5 MB, porque o histórico antigo fica como estava.

Regras novas:

- **`qa/lote/.gitignore`:** `*.json` (não há fixtures JSON pequenos no lote) e `rapido.md`. Os resumos `resultado.md` e `p4.md` continuam versionados.
- **`.gitignore` da raiz:** `qa/verificacao/**/*.json` e `qa/verificacao/**/test.out`.

Conferido:

- `git check-ignore` casa os três padrões e não casa os `.md`.
- Rodei `npm run lote:rapido` e um `npm run lote -- --escala 0.02` com saída no scratchpad. Os dois recriaram JSON e `.md`, e nada novo apareceu no `git status`.

O commit desta mudança foi feito pelo orquestrador (`3e7f391`).

## M4 — README

O que mudou:

**Instalação numa máquina nova**

- `cd qa && npm i && npx playwright install chromium`.
- Nota de que o `npm test` não precisa de navegador.
- Nota sobre Chromium pré-instalado: usar o `executablePath`. O `apoio.mjs` já faz isso sozinho com `/opt/pw-browsers/chromium-1194/...`; para outro caminho, basta trocar a constante `local` em `abrirNavegador()`.

**Suítes**

- `npm test`, `npm run e2e`, `npm run todos` e `npm run test:regras`, com a duração medida.
- Nota de que os testes sobem o servidor sozinhos.

**`npm run desempenho`**

- Descrição correta do que mede: momentos com o relógio, métricas, entrada no aperto, opções `-- --vezes`/`-- --json` e saída com erro se um momento não for alcançado.

**Ferramentas e arquivos ignorados**

- `lote` e `lote:rapido` ganharam linhas separadas, com a duração real.
- Parágrafo explicando que JSON brutos e capturas ficam fora do git.

**Parâmetros de URL**

- Conferidos um a um contra `bomberolho/js/parametros.js`.
- Corrigido o `?escala=`: o README dizia "0 a 8", mas o código aceita de 0 (exclusive) a 8. Fora disso, vale 1.
- Nota de que valores desconhecidos caem no padrão.

**Gancho de teste**

- Lista completa de métodos, conferida em `gancho.js`: entraram `restaurarAjuste()`, `darItem()` e `hashCompleto()`.
- Nota de que o relógio é `state.relogio` e o aperto é `state.aperto.ativo`.

**Estrutura**

- Incluída a pasta `js/nucleo/`, que faltava.

**Integração ao site (etapa 2)**

- O comando de cópia virou `cp -R bomberolho ~/meu-site/`. O exemplo antigo, `cp -R bomberolho ~/meu-site/bomberolho`, cria `bomberolho/bomberolho/` se a pasta já existir. Agora há um aviso para apagar a versão antiga antes.
- O fluxo de conferência inclui o botão **Próximo**, que existe entre personagem e arena (`index.html`).
- Conferência local antes de publicar com `python3 -m http.server`, e aviso de que `file://` não funciona.
- O resto foi mantido, porque o verificador o considerou exemplar:
  - o que copiar e o que não copiar;
  - caminhos relativos e ausência de build;
  - link sugerido, relativo ou absoluto;
  - nada de iframe;
  - console e 404;
  - os três motivos de tela em branco.
- O README não tem dados pessoais do dono.

### Comandos conferidos

Rodei cada script do `qa/package.json`, de dentro de `qa/`:

| Script | Resultado |
|---|---|
| `npm test` | 189/189, 22 s |
| `npm run test:regras` | 165/165, 3 s |
| `npm run e2e` | 58/58, 202 s |
| `npm run todos` | é `npm test && npm run e2e`; as duas partes passaram separadamente |
| `npm run desempenho` | código 0, 3 execuções (acima) |
| `npm run memoria` | código 0, 302 s, sem erros |
| `npm run capturas:p3` | código 0, 127 s, "sem erros, avisos ou 404" |
| `npm run capturas:p4` | código 0, 155 s, "sem erros, avisos ou 404" |
| `npm run som` | código 0, 170 s |
| `npm run lote:rapido` | código 0, 181 s, 152/152 partidas encerradas |
| `npm run lote` | rodei com `-- --escala 0.02` (67 partidas, 65 s, código 0), com saída no scratchpad para não sobrescrever o `resultado.md` versionado. O lote completo (≈ 2 300 partidas, dezenas de minutos) não rodei inteiro. |
| **`npm run capturas`** | **falha** (código 1): `capturas.mjs:80` faz `fill` em `#ajuste-pavio`, mas desde a parte 2, rodada 2, a bancada começa recolhida e o controle fica invisível. |

O `capturas.mjs` não é arquivo da minha frente, então não o corrigi. **Tirei a menção a `npm run capturas` do README**, que agora só cita comandos que funcionam. O conserto é pequeno, abrir a bancada antes do `fill`. Fica para o executor principal ou para o orquestrador decidir: consertar ou remover o script do `package.json`.

## Suítes ao fim

- `npm test`: **189/189**, sem falhas.
- `npm run e2e`: **58/58**, sem falhas, em 202 s. Inclui os testes novos do executor principal (`telas.test.mjs`) no estado em que estavam.

## Limitações

- Os números de desempenho vêm de celular emulado (Chromium com CPU 4× e DPR 3), numa máquina compartilhada com outro executor que rodava testes ao mesmo tempo. Há ruído entre repetições.
- Medi um só cenário de mapa e dificuldade (Jardim, Difícil, semente 11). O verificador anterior usou Caverna e Médio e obteve números piores no aperto.
- O celular lento passa dos 30 fps na média em todos os momentos, mas tem mínimos de 0,5 s entre 22 e 29 fps:
  - na entrada no aperto, em 2 de 3 repetições;
  - durante a descida da densidade no começo;
  - no menu.
  - Isso é medição. Melhorar esses números é trabalho do jogo, fora da minha frente.
- O lote completo não foi rodado inteiro: só o rápido e uma fração de 2%.
- `npm run capturas` está quebrado (ver acima) e só deixou de ser citado no README.
