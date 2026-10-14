# Parte 4 — Celular e acabamento · Rodada 2 (relatório do executor)

Li inteiros o `PLAN.md` (incluindo a seção 3.9, "Aceites do dono"), o `CLAUDE.md`, o relatório da rodada 1 e o parecer `reviews/parte-4-rodada-1.md`.

Nesta rodada, o orquestrador dividiu o trabalho em duas frentes, sem sobreposição de arquivos:

| Frente | Arquivos | Itens do parecer |
|---|---|---|
| **Eu** | tudo em `bomberolho/` e os testes novos | B1, M1, M5, M6 |
| **Ajudante** | `README.md`, `.gitignore`, `qa/navegador/desempenho.mjs`, `qa/package.json` e a remoção dos JSON gerados | M2, M3, M4 (seção 6) |

Não editei nenhum arquivo da frente do ajudante.

Para medir antes e depois, usei **os próprios scripts do verificador** em `qa/verificacao/v-p4r1/`: `som-cortado.mjs`, `painel.mjs`, `toque.mjs`, `robustez.mjs` e `teclado.mjs`. Todos usam dedos emulados de verdade: CDP `Input.dispatchTouchEvent`, contexto com `hasTouch` e `isMobile`. As capturas estão em `qa/capturas/p4/` (11 telas) e eu as olhei.

## Suítes

| | Antes (início da rodada) | Depois (com o trabalho do ajudante já na árvore) |
|---|---|---|
| `npm test` | 188/188 | **189/189** |
| `npm run e2e` | 55/55 | **58/58** (rodado de novo ao fechar a rodada: 189/189 e 58/58) |

- Zero erros, avisos ou 404 em todos os scripts, testes e capturas.
- O e2e ficou mais lento (98 s → 227 s): o teste novo de alcance passa por 14 telas, e outro agente rodava em paralelo na mesma máquina.

## B1 — Botão de som cortado no painel deitado com toque (resolvido)

### Causa e correção

**Causa.** As faixas de `@media` não acompanhavam todas as combinações de largura da coluna do painel: orientação, toque (que reserva a faixa dos botões) e largura da tela.

**Correção** (`css/estilo.css`, fim do arquivo):

- O painel virou um *container* (`container: painel / inline-size`).
- **Painel com menos de 280 px de conteúdo:** os três botões do topo (Pausar/Continuar, Sair e Som) ficam só com ícone, lado a lado e do mesmo tamanho (`flex: 1`, mínimo de 44 px).
- **Painel com menos de 200 px:** a barra ("Rodada 1", relógio, troféus) cabe numa linha só.
- **Coluna do desktop:** passou de 300 para 312 px. Assim "Continuar" + "Sair" + som cabem com rótulo em 1280×720.

### Bug parecido no desktop

Medindo, achei **mais um caso do mesmo bug**, que o parecer não pegou: **no desktop 1280×720, pausado**, o rótulo "Continuar" (127 px) empurrava o som para fora em 5 px. Também está resolvido.

### Medição com o script do verificador (`som-cortado.mjs`)

Largura visível do botão de som e se o centro recebe o toque:

| Viewport (toque) | Antes | Depois |
|---|---|---|
| 640×360 | 44 de 44, sim | 44 de 44, sim |
| **740×360** | **14 de 44, não** | **53 de 53, sim** |
| 844×390 | 41 de 44, sim | 62 de 62, sim |
| 915×412, 932×430 | 44 de 44, sim | 68–69, sim |
| **1024×768, 1180×820, 1280×800, 1366×1024** | **18 de 44, não** | **65 de 65, sim** |

**`painel.mjs` do verificador:**

- **Antes:** "desktop toque: bt-som cortado por painel" e "paisagem toque: bt-som cortado".
- **Depois:** "ok" nas 12 combinações.

### Teste novo: `qa/navegador/telas.test.mjs`

**Onde:** 14 telas, com e sem toque.

- Celulares em pé: 360×640, 390×844, 412×915.
- Celulares deitados: 640×360, 740×360, 844×390, 915×412, 932×430.
- Tablets com toque: 768×1024, 1024×768, 1280×800.
- Computadores sem toque: 1024×768, 1280×720, 1366×768.

**Em que momentos:** em cada tela, o teste passa por 5 momentos:

1. menu;
2. "Como jogar";
3. partida montada, com o botão do bichinho;
4. pausa, com o rótulo "Continuar", que é o mais largo;
5. resultado.

**O que confere em cada botão visível:**

- está inteiro na tela;
- não é cortado por nenhum ancestral com `overflow`;
- `elementFromPoint` no centro acerta o próprio botão, ou seja, nada fica por cima;
- tem pelo menos 44 px, ou 56 px nos controles de toque;
- os controles de toque ficam fora da arena;
- não há rolagem.

**Cartões do placar:** o teste também confere que cada cartão fica inteiro dentro do painel e que nada dentro dele é cortado (nome, selo "você", troféus e poderes). Para isso usa o personagem de nome mais longo (Cristalino) com 3 troféus.

**Antes e depois:**

- Rodei o teste contra o CSS antigo: ele **falha** com 20+ linhas, como "740×360 toque · jogando montado: Som cortado por .painel" e "1024×768 toque · resultado: Som… coberto por app".
- Com o CSS novo, **passa**.

## M1 — A alavanca nascia fora do ponto do toque perto das bordas (resolvido)

### Causa e correção

**Causa.** `prender()` empurrava o **centro lógico** para dentro da tela. O polegar parado perto da borda já ficava fora da zona morta.

**Correção** (`js/input/toque.js`):

- O centro lógico agora é **sempre o ponto onde o polegar encostou**.
- Só o **desenho** da base é preso dentro da tela, em `mostrarAlavanca(dx, dy)`, com o pino deslocado a partir dela.
- A alavanca continua inteira visível, e o primeiro toque sempre tem dx = dy = 0.

### Medição com o `toque.mjs` do verificador (3 telas)

| Caso | Antes | Depois |
|---|---|---|
| Polegar parado a 6 px da borda de baixo, tremor de 1 px | `dir: baixo`, andou **1,38 casa** sozinho | `dir: ""`, **0** |
| Borda direita, canhoto, polegar parado | andou **1 casa** | **0** |
| Encostar na parte esquerda do contorno em repouso e empurrar 30 px para a direita | **0 casa** (`dir: ""`) | `dir: dir`, **andou** |
| Trajeto do roteiro em retrato, trecho 3 | **não andou** (1,1 → 1,1, 3 310 ms) | **1,1 → 2,1** em 536 ms |

O trajeto inteiro casa a casa agora é idêntico ao esperado **nas 3 telas**:

| Trecho | Casas visitadas | Tempo |
|---|---|---|
| 1 | 1,1 → 1,2 → 1,3 | 841–845 ms |
| 2 | 1,3 → 1,2 → 1,1 | 805–847 ms |
| 3 | 1,1 → 2,1 | 536–546 ms |
| 4 | 2,1 → 1,1 | 505–546 ms |

Zona morta, diagonal com histerese, toque múltiplo, gota com contagem, bichinho (`escudo: true`), canhoto, zoom, seleção e menu de contexto continuam iguais aos de antes. A saída completa ficou guardada fora do repositório; o script reproduz.

### Teste novo em `navegador/toque.test.mjs`

O teste "polegar parado perto das bordas não anda sozinho; empurrão curto a partir do contorno anda" roda em 390×844, 844×390 e 360×640. Ele confere:

- a 6 px da borda de baixo, da esquerda e do canto, com tremor de 1 px: direção vazia e **0 casa**;
- o desenho da alavanca inteiro dentro da tela;
- a partir do contorno em repouso, um empurrão de 30 px faz andar.

**Rodei esse teste contra o `toque.js` antigo: ele falha.**

## M5 — Virar com a alavanca toda inclinada exigia ~60 px (resolvido)

### Correção

**Virada pelo movimento recente do dedo.** Ela vale quando o polegar já está na borda (deflexão ≥ 80% do raio) e a direção é mantida pela posição. Se, nos últimos ~200 ms, o dedo escorregou **16 px ou mais para o lado**, e esse escorregão é 35% maior que o movimento no eixo atual, a alavanca **vira na hora**.

Depois da virada, a base é reposicionada atrás do dedo na direção nova, e a histerese passa a segurar essa direção.

**O que não vira:**

- tremor;
- diagonal;
- voltar no próprio eixo, que é o gesto de parar. Isso é de propósito: a criança que puxa o polegar de volta para parar não pode ver o boneco dar meia-volta.

A regra está na função pura `viradaPeloMovimento`, que é exportada e tem teste em Node.

### Medição (`rolagemPolegar` do verificador)

O polegar desce além do raio e depois escorrega **30 px** para a direita:

- **Antes:** continuava `baixo`.
- **Depois:** `dir`, nas 3 telas.

### Testes novos

- **`sim/toque.test.mjs`:** "escorregão lateral recente vira; tremor, diagonal e volta no eixo não", com 8 casos.
- **`navegador/toque.test.mjs`:** com dedos reais, desce além do raio, espera, escorrega 20 px para o lado e vira para `dir`.
  - Um tremor depois da virada mantém `dir`.
  - Escorregar para cima vira para `cima`.
  - Continuar no próprio eixo não vira.
- **Rodei contra o código antigo: o teste falha.**

## M6 — Detalhes de layout (resolvidos)

### Troféu cortado nos cartões

O parecer citou só "Cílio" em 360 px. **Medi todos os 8 personagens × 2 e 3 troféus × 9 telas** e o problema era bem maior. Cartões com algo cortado, antes:

| Tela | Cartões cortados |
|---|---|
| 360×640 | 36 |
| 390×844 | 21 |
| 412×915 | 14 |
| 1024×768 com toque | 14 |
| 640×360 | 1 |

O pior caso era "Pupilo" com 3 troféus, que perdia 34 px.

**Correção** (`css/estilo.css` e `js/ui/hud.js`):

- **Contorno azul no cartão de quem joga** (`.cartao.eu`). O jogador se reconhece mesmo sem o selo.
- **Cartão estreito** (menos de 230 px, por *container query* no próprio cartão): o selo "você" sai.
- **Último recurso:** os troféus descem de linha (`.nome` com `flex-wrap`). Isso só acontece com Cristalino e 3 troféus em 360 px; o placar passa de 90 para 101 px de altura.

**Depois: 0 cartão cortado em todas as combinações.** O `telas.test.mjs` cobre o caso com Cristalino e 3 troféus.

### Barra e contorno da alavanca

- **"Rodada 1" quebrando em 740×360:** agora fica numa linha só. A barra compacta vem pela consulta de largura do painel (captura `paisagem-740-05-montado.png`).
- **Contorno da alavanca em repouso cobrindo o placar deitado:**
  - Continua visível como dica (opacidade 0,4) até a criança usar a alavanca pela primeira vez.
  - Depois, **deitado, ele some** (`.alavanca.repouso.conhecida`), e o placar volta a ficar legível.
  - Em pé, ele fica, porque está na faixa vazia dos controles.

## Trabalho do ajudante (M2, M3, M4)

Resumo de `reports/parte-4-rodada-2-ajudante.md`. Os detalhes e as tabelas completas estão lá.

### M2 — `npm run desempenho` agora mede o que diz

`qa/navegador/desempenho.mjs` foi reescrito:

- avança por `state.relogio` (começo 115 s, meio 85 s, aperto 45 s);
- exige `aperto.ativo`, fase "jogando" e pelo menos 2 vivos;
- se a rodada acabar antes, troca de semente; se não alcançar um momento, termina com código 1;
- mede a janela de adaptação (1,5 s) e a estável (6 s), com fps, p95, fps mínimo em 500 ms e quadros lentos;
- mede também a entrada no aperto em tempo real.

Medido em 3 repetições, na mesma máquina compartilhada:

| Tela | Resultado |
|---|---|
| Desktop | **60 fps** em todos os momentos |
| Celular lento emulado (390×844, DPR 3, CPU 4×), aperto estável | **44–47 fps**, mínimo de 31–32 |
| Celular lento emulado, no geral | média de 43–50 fps |

O ajudante registra com honestidade os mínimos transitórios abaixo de 30 fps (0,5 s):

- 25–29 fps nos 2 s após o aperto ligar;
- 23–25 fps enquanto a densidade desce no começo;
- 22–28 fps no menu.

Memória: sem vazamento (heap de 4,45–4,61 MB entre 210 e 300 s, 57 ouvintes constantes).

### M3 — arquivos gerados fora do versionamento

- `git rm --cached` em `qa/lote/p4.json`, `qa/verificacao/v-p2r2/{lote,l1,l2}.json`, `qa/verificacao/p2r1/jogar.out.json` e `qa/verificacao/v-p3r*/test.out`: cerca de 9,2 MB a menos.
- As cópias continuam no disco, e os scripts as recriam sob demanda.
- Regras novas: `*.json` e `rapido.md` em `qa/lote/.gitignore`; `qa/verificacao/**/*.json` e `**/test.out` no `.gitignore` da raiz.
- Nenhum script, resumo `.md` ou parecer foi apagado.

### M4 — README

- **Instalação numa máquina nova:** `npm i && npx playwright install chromium`.
- **`npm run desempenho`:** descrição corrigida.
- **Parâmetros de URL e gancho:** conferidos contra o código.
- **Estrutura:** entrou `js/nucleo/`.
- **Integração da etapa 2:** comando `cp -R` corrigido e conferência com `python3 -m http.server`.

### `npm run capturas`

O ajudante achou que esse script estava quebrado. Como `qa/navegador/capturas.mjs` não era da frente dele, só tirou a menção do README.

**Consertei** (`capturas.mjs`): em tela baixa ou estreita, a bancada `?ajuste=1` começa recolhida. Agora o script toca em "Mostrar tudo" antes de preencher o pavio. `npm run capturas` roda até o fim ("nenhum erro, aviso ou 404"), e olhei a captura `bancada-paisagem.png`.

### Suítes com tudo junto (minha frente e a do ajudante), ao fechar a rodada

- `npm test`: **189/189** (21 s).
- `npm run e2e`: **58/58** (199 s).

### O que fiz do lado do jogo para o M2

Fiz um perfil de CPU no aperto, a 390×844 com DPR 3 e CPU 4×:

| Parte do quadro | Peso |
|---|---|
| "(program)" (raster e composição em software do Chromium sem GPU) | ~53% |
| `drawImage` | ~10% |
| IA | ~2–3% |

- Desligar o pulso do relógio no aperto **não mudou** o fps de forma mensurável (39 contra 39–38).
- Como outro agente usava a máquina ao mesmo tempo, as medições oscilaram de 30 a 40 fps entre execuções iguais. Não consegui provar ganho de nenhuma micro-otimização, por isso **não mexi no renderizador nesta rodada**.
- **Nesta máquina, o aperto no celular emulado fica em ~35–40 fps.** Isso cumpre o "≥ 30" da seção 3.1, mas sem folga grande.

## Não regredi

| Verificação | Resultado |
|---|---|
| `robustez.mjs` do verificador | igual ao parecer: pausa ao perder o foco na contagem, tecla presa solta, rolagem 0, zero problemas |
| `teclado.mjs` | foco sólido 3 px `#0B57C2` nos menus, Esc volta, 0 animações com reduzir movimento |
| Suítes das Partes 1–3 | dentro de `npm test` e `npm run e2e`, todas passando |
| Originalidade (seção 2) | nada baixado, nenhum nome de terceiros; só CSS e JS escritos aqui |

## Limitações honestas

- **Celular emulado:** todo o toque foi emulado no Chromium (aceito pelo dono na seção 3.9). Não houve teste em aparelho físico.
- **Container queries:** exigem Chrome/Android 105+ e Safari/iOS 16+, de 2022. Em navegadores mais velhos, valem as regras antigas de `@media`. Nesses navegadores, o som pode voltar a ficar parcialmente cortado em tablet deitado com toque.
- **Virada pelo movimento:** é um comportamento novo de sentir.
  - Ela foi calibrada por raciocínio e por teste emulado (16 px em 200 ms), não por crianças reais.
  - Para trocar o número, basta mudar `VIRADA` em `toque.js`. Ele não entrou na bancada `?ajuste=1`, porque é da entrada, não da simulação.
- **Desempenho no aperto do celular emulado:** está no limite (ver acima), e não houve otimização do renderizador nesta rodada.
- **Retina e Mácula em deuteranopia** (pendência baixa da Parte 3): continua sem tratamento.

## Arquivos (minha frente)

**Alterados:**

- `bomberolho/js/input/toque.js`: centro lógico no ponto do toque, desenho preso, virada pelo movimento e classe `conhecida`;
- `bomberolho/css/estilo.css`: consultas de largura do painel e do cartão, contorno do cartão do jogador e coluna do desktop de 312 px;
- `bomberolho/css/toque.css`: contorno em repouso some deitado depois do primeiro uso;
- `bomberolho/js/ui/hud.js`: classe `eu` no cartão do jogador;
- `qa/navegador/toque.test.mjs`: 2 testes novos;
- `qa/sim/toque.test.mjs`: 1 teste novo;
- `qa/navegador/capturas-p4.mjs`: 11 telas, mais um filtro opcional por nome;
- `qa/navegador/capturas.mjs`: abre a bancada recolhida antes de preencher o pavio (`npm run capturas` volta a funcionar).

**Novo:**

- `qa/navegador/telas.test.mjs`: alcance de todos os botões e cartões em 14 telas;
- `reports/parte-4-rodada-2.md`.

## Como reproduzir

```bash
cd qa
npm test && npm run e2e
node verificacao/v-p4r1/som-cortado.mjs     # B1
node verificacao/v-p4r1/painel.mjs          # B1
node verificacao/v-p4r1/toque.mjs           # M1, M5 e o resto do toque
node navegador/capturas-p4.mjs              # qa/capturas/p4/ (11 telas)
```
