# Parte 3 — Estética, identidade e som · Rodada 2 (relatório do executor)

Li inteiros o `PLAN.md`, o `CLAUDE.md`, o relatório da rodada 1 e o parecer `reviews/parte-3-rodada-1.md` (nota 84, 0 bloqueadores, não impressionado). Esta rodada trata **todas** as melhorias M1–M8 do parecer. Cada uma foi medida antes e depois com os scripts do verificador (`qa/verificacao/v-p3r1/`) e com ferramentas novas.

Para medir o "antes", extraí o commit da rodada 1 (`git archive HEAD`) numa pasta temporária e servi essa cópia com as mesmas ferramentas.

No caminho apareceu um defeito que o parecer não tinha visto: **estalos de uma amostra no som**, que existiam desde a rodada 1 (ver M3b). Foi corrigido e está coberto por teste.

## Suítes

| | Antes (rodada 1) | Depois |
|---|---|---|
| `npm test` | 164/164 | **176/176** (30 s) |
| `npm run e2e`, rodado sozinho | 41/41 | **42/42** (81 s) |
| `npm run e2e` com **2 Chromium carregando a máquina ao mesmo tempo** (dois `fps2.mjs` do verificador em paralelo) | 40/41 no parecer | **42/42** (96 s) |

**Testes novos:**
- `qa/sim/temas.test.mjs`: contraste da prévia do respingo, 5 testes;
- `qa/sim/musica.test.mjs`: forma da música e ganho inicial zero, 7 testes;
- um teste e2e de som pela cadeia real.

**Peso:** 385,6 kB (antes 373,9 kB), para um orçamento de 600 kB.

**Console:** zero erros e zero avisos. Também zero 404 e nenhum pedido externo, em todas as capturas, no `fluxo.mjs`, no `momentos.mjs` e no `audio.mjs` do verificador.

## Como cada item do parecer foi tratado

### M1 (alta): o contador da curiosidade não aparecia nos cartões
- **Correção:**
  - Em `Avisos.desenharContador()` (`js/ui/avisos.js`), o personagem ligado ao assunto (`quemConta`) agora é desenhado no canvas do "Você sabia?" de **todo** cartão: pausa, sair, intervalo e resultado.
  - Ele acena, pisca e fica parado com "reduzir movimento".
  - O campo `quemConta`, que antes era código morto, passou a ser usado.
- **Antes:** buraco vazio de 54 px em todo cartão.
- **Depois:** o retrato aparece nas capturas `desktop-09-pausa`, `paisagem-09-pausa`, `pequeno-13-resultado` e `m-vale-paisagem-intervalo`, sempre o personagem do assunto (a Retina conta da retina, a Córnea da córnea).

### M2 (alta): prévia do alcance fraca nas arenas claras e para daltônicos
A prévia foi refeita em `renderizador.js` (`spriteDePerigo` e `desenharAlcance`).

**Forma, não só cor.** Cada casa em perigo ganhou:
- **listras diagonais**;
- **contorno tracejado**;
- uma **gotinha central com raio de 9% a 14% da casa** (antes, 3% a 6%).

**Cor por arena.** Cada arena tem a sua cor de perigo, escolhida para contrastar com o piso (`temas.js`, campo `perigo`):
- azul-escuro no Jardim, no Vale e no Consultório;
- índigo no Lago, onde tudo já é azul;
- ciano claro na Caverna, que é escura.

**Tempo e desempenho:**
- Aparece nos **últimos 2 s** do pavio (antes, 1,25 s).
- Pulsa cada vez mais forte e mais rápido.
- A casa é pré-desenhada e o quadro só a copia, então o custo é baixo.

**Contraste medido**, em WCAG contra o tom principal do piso. A tabela usa o pior caso, que é o começo da prévia; o teste confere os dois tons do piso.

| Arena | Antes: fundo (0,10 → 0,26) | Depois: cor pura | Depois: contorno no mínimo | Depois: listras no mínimo |
|---|---|---|---|---|
| Jardim | 1,11 → 1,33 | 5,38 | **2,56** | 2,11 |
| Lago | 1,11 → 1,33 | 9,50 | **3,34** | 2,57 |
| Caverna | 1,10 → 1,31 | 8,36 | **4,00** | 3,17 |
| Vale | 1,12 → 1,34 | 5,51 | **2,63** | 2,16 |
| Consultório | 1,12 → 1,36 | 6,20 | **2,76** | 2,24 |

- **Teste:** `qa/sim/temas.test.mjs` exige, nos 2 tons do piso de cada arena, para a cor normal e para a do Penetrante:
  - cor pura ≥ 3,5:1;
  - contorno ≥ 2,2:1;
  - listras ≥ 1,6:1.
- **Capturas:** `pequeno-08-perigo`, `m-caverna-pequeno-perigo` e `arena-lago-pequeno`. A cruz se lê num relance em 360×640, também no Lago e na Caverna. Em cinza, as listras e o tracejado continuam lá, porque a diferença é de luminância.

### M3 (média): som baixo, medido antes da cadeia
**Cadeia num módulo só.** A cadeia de saída virou `js/audio/cadeia.js`. O jogo e a medição usam o mesmo código:
- efeitos e trilha;
- mestre;
- compressor suave (−20 dB, 3:1, joelho de 8 dB);
- **ganho de compensação de +7 dB**;
- limitador (−8 dB, 20:1);
- **saturação suave em tanh**, que garante nunca estourar.

**Medição pela cadeia real.** `qa/ferramentas/medir-som.mjs` foi reescrita. Ela mede **pela cadeia real**, com pico em dBFS e sonoridade em **LUFS**: ponderação K da ITU-R BS.1770, integrada com portas, e momentânea máxima.

**Volumes refeitos:**
- Sons fracos subiram: arremesso, disparada, chute, pousou, bloco e clique.
- O arremesso e a disparada foram redesenhados: o ruído de banda estreita, que quase não tinha energia, deu lugar a ruído largo com um tom deslizando.
- Arpejos (item, estojo, vitória) desceram uns 3 dB, para não passar por cima do respingo.

| Som (pico em dBFS, pela cadeia real) | Antes | Depois |
|---|---|---|
| Respingo | −17,3 | **−6,1** |
| Gota | −22,4 | **−8,1** |
| Bloco | −26,9 | **−8,8** |
| Chute | −27,0 | **−6,9** |
| Arremesso (Pinça) | −48,2 | **−9,8** |
| Disparada | −50,9 | **−8,9** |
| Clique de interface | −33,5 | **−10,0** |
| Faixa de todos os 25 efeitos | −14,7 a −50,9 (36 dB de espalhamento) | **−4,3 a −10,7** (6 dB) |

| Conjunto (LUFS integrado) | Antes | Depois |
|---|---|---|
| Trilhas, sozinhas (90 s) | −37,6 a −38,7 | **−26,8 a −28,2** |
| Partida calma: trilha + gota e respingo a cada 4 s | −33,2 | **−24,0** |
| Partida intensa: aperto + respingo a cada 0,7 s | −26,5 | **−18,7** (pico −3,4 dBFS, sem estouro) |

- **Relação entre trilha e efeitos:**
  - a momentânea do respingo (−19,4) fica cerca de 8 LU acima da trilha (−27 LUFS);
  - a partida intensa fica cerca de 9 LU acima da trilha sozinha;
  - isso dentro da meta do parecer, de trilha 8–10 dB abaixo dos efeitos e conjunto em −16 a −20 LUFS.
- **Teste:** o e2e `som pela cadeia real…` exige, para cada um dos 25 efeitos:
  - pico entre −14 e −1 dBFS;
  - partida intensa ≤ −1 dBFS;
  - trilha ao menos 6 dB abaixo da partida e audível (RMS > −40 dB).
- **Aviso sobre o `audio.mjs` do verificador:** o render offline dele usa a cadeia antiga escrita à mão, não `cadeia.js`. Por isso os números dele já não representam o jogo. Os números certos saem de `npm run som`.

#### M3b (achado novo): estalos de uma amostra
Ao medir os picos, a trilha mostrava pico de −3 dBFS com sonoridade de −38 LUFS. Isso é impossível para música suave.

**Causa:**
- No render, apareceu **uma única amostra de 0,5** entre vizinhas de 0,005: um estalo.
- `ruido()` e `tom()` criavam o `GainNode` com o valor padrão 1 e só agendavam 0,0001 no instante do som. Com o início em fração de amostra do Chromium, a primeira amostra do ruído passava com ganho 1.
- O chiadinho da percussão toca a cada colcheia, então havia **estalos aleatórios durante toda a música e em todo respingo**. Isso é exatamente o tipo de coisa que irrita em repetição.

**Correção:** `g.gain.value = 0` na criação, em `sintese.js`.

**Medido:** o pico da trilha do Consultório, sem a cadeia, foi de −3,1 para **−11,8 dBFS**, com forma de onda lisa.

**Testes:**
- `qa/sim/musica.test.mjs` confere que todo envelope começa em 0;
- o e2e procura amostras isoladas mais de 2× maiores que tudo à volta (±0,5 ms) em todos os efeitos, na trilha e numa partida intensa.

### M4 (média): música curta e repetitiva
- **Forma longa.** Cada trilha ganhou **duas frases novas** (C e D), compostas aqui, e uma forma de **8 voltas**: A B A C D B A' e uma volta de respiro.
  - Em A', a melodia ganha uma segunda voz uma terça abaixo.
  - Nas voltas C e D, o baixo anda.
  - **O desenho do arpejo muda a cada volta.**
- **Duração.**

  | | Volta completa | Repetições numa rodada de 2:00 |
  |---|---|---|
  | Antes | 34–46 s | ~3 |
  | Depois | **69–91 s**, conforme o andamento | ~1,5 |

- **Teste:** `qa/sim/musica.test.mjs` usa um contexto de áudio falso e confere em cada trilha:
  - 4 frases de 32 passos;
  - nenhuma volta igual à anterior;
  - pelo menos 7 voltas distintas em 8;
  - ciclo ≥ 65 s.
- **Graves no alto-falante pequeno:** o baixo passou de senoidal para **triangular + 2f + 3f**. O harmônico de 110–300 Hz é o que um alto-falante de celular toca.

### M5 (média): teste instável sob carga
- **Teste apontado:** `parte3.test.mjs`, "pausa tem Continuar…". Agora ele congela o relógio (`setTimeScale(0)`) e avança com `step()`. "Recomeçar" deixa o tick em 0 sem depender do relógio real.
- **Mais 4 esperas fixas trocadas por `waitForFunction`**, que espera a condição e não um prazo:
  - "a vitrine anda sozinha";
  - o modo demo (`jogo.test.mjs`);
  - as teclas de andar;
  - o Espaço.
- **Medida do alvo:** o teste de alvos passou a medir o tamanho de layout (`offsetWidth/Height`). Antes ele pegava o cartão no meio da animação de entrada (escala 0,92) e via 40,5 px num botão de 44.
- **Prova:** 42/42 com dois Chromium carregando a máquina em paralelo.
- **Ressalva:** o teste de fps da parte 1 (`fps >= 50`) mede o relógio real por natureza. Não o mudei; ele passou nas rodadas sob carga.

### M6 (baixa): acessórios cortados no topo
- **Medição:** `qa/verificacao/p3r2/extensao.mjs` mede a extensão real de cada personagem, em todas as poses. O ponto mais alto é o losango da Córnea, a 0,85 casa acima do centro; os pés e a sombra chegam a 0,44 casa abaixo.
- **Correção:** a nova `encaixarPersonagem(w, h, folga)`, em `personagens.js`, calcula o tamanho e a posição para caber inteiro. Ela é usada em:
  - cartões e destaque da escolha;
  - retrato da curiosidade;
  - desfile;
  - arte dos cartões, faixa "Você foi descansar!" e retratos do placar.
- **Depois:** nada é cortado em `pequeno-02-personagem` e `pequeno-13-resultado`: topete do Pupilo, losango da Córnea, cones da Retina, broto da Mácula, cílios da Cílio e a taça.

### M7 (média, Parte 4): fps no menu e na partida
- **Vitrine adaptativa (`main.js`):**
  - Ela atrás do menu continua em quadros alternados.
  - Se o quadro médio passar de 40 ms, ela passa a ser desenhada **um quadro em cada quatro**, com histerese.
  - Com "reduzir movimento", ela **fica parada** num quadro, poupando bateria. O menu continua animado onde deve.
- **Menu no celular lento** (390×844, DPR 3, CPU 4×, depois de 3 s; `qa/verificacao/p3r2/menu-fps.mjs`):

  | | Antes | Depois |
  |---|---|---|
  | Normal | 31 fps (p50 33 ms) | **35 fps** (p50 17 ms) |
  | Reduzir movimento | 42 fps | **50 fps** |

  Nos 5 primeiros segundos frios (`desempenho.mjs`), foi de 21 para 25 fps.
- **Partida** (`desempenho.mjs`):

  | | Antes | Depois |
  |---|---|---|
  | Desktop | 60 | 59–60 |
  | Celular lento | 40 | 43 |

- **Ressalva honesta:** não mexi no custo do aperto. Isso é da Parte 4, e a queda no aperto, que já vinha da Parte 2, continua (ver limitações).

### M8 (baixa): detalhes de interface
- **Botão de pausa:** vira **▶ Continuar** (verde) quando pausado, e ⏸ Pausar quando não (`desktop-09-pausa`, `paisagem-09-pausa`).
- **Balão "Você":**
  - subiu para acima do acessório (1,2 casa);
  - aparece só na contagem e no primeiro 1,5 s;
  - some suavemente;
  - não balança com "reduzir movimento";
  - já não cobre a cabeça de ninguém (`paisagem-06-contagem`).
- **Botões do HUD (Pausar, Sair, Som):** agora têm **44 px** em todas as telas.
  - O `fluxo.mjs` do verificador listava **117** botões abaixo de 44 px nas 4 telas; agora lista **0**.
  - O teste e2e passou a exigir ≥ 44 px (antes, ≥ 36).
- **Paisagem baixa:** o cartão do intervalo e do resultado volta a mostrar a arte do vencedor, numa faixa de 58 px, **sem rolar** (`m-vale-paisagem-intervalo`; o teste confere que não há rolagem).

## O que mais melhorou
- **Lago menos monocromático:** folhinhas boiando com florzinhas rosa no piso (`temas.js` `folhinhas`, `pecas.js`), um toque quente no lago azul (`arena-lago-*`).
- **Retratos do placar** inteiros: antes o acessório era cortado pela borda do canvas.
- **Medição de som de verdade:** LUFS pela cadeia real, reprodutível com `npm run som`, mais `--so-efeitos` para iterar rápido.

## Como testar
```
cd qa && npm test && npm run e2e
npm run som                             # pico e LUFS de efeitos, trilhas e partida, pela cadeia real
npm run capturas:p3                     # todas as telas → qa/capturas/p3/
node verificacao/v-p3r1/fluxo.mjs       # fluxo do verificador nas 4 telas (alvos, rolagem, console)
node verificacao/v-p3r1/momentos.mjs    # momentos de jogo, daltonismo, reduzir movimento
node verificacao/p3r2/extensao.mjs      # extensão real dos personagens (corte de acessórios)
node verificacao/p3r2/menu-fps.mjs      # fps do menu no celular lento
```

Olhei as capturas nas 4 resoluções (1280×720, 390×844, 844×390 e 360×640): início, escolha, pausa, intervalo, resultado, perigo, contagem e as arenas.

## Limitações conhecidas
- **Não ouvi em alto-falante.** O som foi avaliado só por medição. Os LUFS são calculados pela ponderação K que implementei no próprio script, sem medidor certificado, e a parte de "agradável" ainda pede um ouvido humano.
- **Momentânea baixa nos sons curtos.** Chute, pousou, arremesso e clique duram 50–250 ms e ficam numa momentânea de −26 a −33 LUFS, porque a janela é de 400 ms, embora o pico esteja em −7 a −10 dBFS. É o pico que decide se eles se ouvem num celular.
- **fps no aperto e no meio da rodada, no celular lento**, continua abaixo de 30, como na Parte 2: não houve regressão, mas também não foi otimizado. É assunto da Parte 4. O menu no celular lento continua com p95 de 67 ms.
- **Retina e Mácula em deuteranopia** continuam com a mesma cor. Elas se distinguem pela coroa de cones contra o broto (forma), e nada mudou nisso nesta rodada.
- **O `audio.mjs` do verificador** usa a cadeia antiga escrita à mão: os números de render dele não valem mais. A parte de gesto e mudo dele continua válida e passou igual: 0 contextos antes do gesto, mudo persistente, religar no HUD.
- **A Prévia pode escurecer.** Várias gotas com prévias sobrepostas somam opacidade, e a casa fica mais escura. É intencional: há mais perigo ali.

## Arquivos

**Novos:**
- `bomberolho/js/audio/cadeia.js`;
- `qa/sim/temas.test.mjs`;
- `qa/sim/musica.test.mjs`;
- `qa/verificacao/p3r2/extensao.mjs`;
- `qa/verificacao/p3r2/menu-fps.mjs`.

**Alterados:**
- jogo, em `bomberolho/`:
  - `css/estilo.css`;
  - `js/audio/musica.js`, `js/audio/sintese.js`, `js/audio/som.js`;
  - `js/main.js`;
  - `js/render/pecas.js`, `js/render/personagens.js`, `js/render/renderizador.js`, `js/render/temas.js`;
  - `js/ui/avisos.js`, `js/ui/hud.js`, `js/ui/menu.js`;
- QA:
  - `qa/ferramentas/medir-som.mjs`;
  - `qa/navegador/jogo.test.mjs`;
  - `qa/navegador/parte3.test.mjs`.
