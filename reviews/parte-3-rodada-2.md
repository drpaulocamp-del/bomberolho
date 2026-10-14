# Parte 3 — Estética, identidade e som · Rodada 2 (parecer do verificador)

Sou um verificador independente e novo nesta rodada. Li inteiros o `PLAN.md` (seções 2, 3 inteira com 3.4, 3.5 e 3.6, 4, 7 e 8, inclusive os bloqueadores automáticos) e o `CLAUDE.md`. Li também o relatório do executor (`reports/parte-3-rodada-2.md`), o parecer anterior (`reviews/parte-3-rodada-1.md`) e os pareceres aprovados das Partes 1 e 2. Conferi o diff do jogo inteiro entre `661b806` e `02ebdba`.

Não editei nada em `bomberolho/`.

**Scripts** (`qa/verificacao/v-p3r2/`):
- `fluxo.mjs`: o fluxo inteiro com cliques reais nas 4 telas, com toque ligado no celular e um personagem e uma arena diferentes por tela. Mede rolagem, botões fora da tela e abaixo de 44 px, texto cortado e **pixels do retrato da curiosidade** em cada cartão.
- `momentos.mjs`: prévia de perigo **no começo da janela** (pavio 95–110, o pior caso), respingo, encharcar, descanso e intervalo nas 5 arenas. Também cobre a faixa do humano, o aperto, deuteranopia, protanopia, tritanopia, cinza e reduzir-movimento.
- `audio.mjs`: gesto e mudo; render offline **pela `cadeia.js` real** a 44,1 kHz, com detector de estalos de amostra isolada.
- `estalo-controle.mjs`: controle do detector. Ele reintroduz o defeito antigo (ganho nascendo em 1) e confirma que o detector o acusa.

Rodei também `v-p3r1/teclado.mjs`, `v-p3r1/fps2.mjs` (atual contra o commit aprovado da Parte 2, `a58072e`, servido à parte), `p3r2/menu-fps.mjs` e `npm run capturas:p3`.

**Capturas:** `qa/capturas/v-p3r2/` (101 arquivos) e `qa/capturas/p3/`, fora do git. Olhei de perto umas 30.

## O que conferi, e como

### Suítes e regressão
- **`npm test`:** 176/176 (29 s).
- **`npm run e2e`:** 42/42 (85 s). Rodei com o `fluxo.mjs` em paralelo, ou seja, sob carga, e passou.
- **Regressão das Partes 1 e 2:** todos os testes antigos passam. O teclado completo (`teclado.mjs`) funciona: Enter, setas, Esc, Tab, P pausa e Enter retoma nas 5 arenas, sem a página rolar.
- **fps contra o commit aprovado da Parte 2**, na mesma máquina e na mesma sessão:

| Cenário | Parte 3 R2 | Parte 2 aprovada |
|---|---|---|
| Desktop 1280×720, começo / meio / aperto | 60 / 60 / 38 | 60 / 60 / 41 |
| Celular lento (390×844, DPR 3, CPU 4×), começo / meio / aperto | 49 / 27 / 23 | 43 / 25 / 21 |

  A diferença de 38 contra 41 no aperto do desktop é ruído de medição. A rodada anterior mediu 37 contra 38, e no celular a R2 está melhor em tudo. **Sem regressão.**

### Fluxo nas 4 telas (1280×720, 390×844, 844×390, 360×640; DPR 2)
**Percurso:** inicial → outra curiosidade → Como jogar → Entendi → Jogar → personagem (Íris, Lente, Cílio, Córnea) → Próximo → arena (Jardim, Lago, Vale, Consultório), Fácil, 1 troféu → Começar → contagem → jogando → Pausar → Continuar → Sair → "Continuar jogando" → fim → resultado → Jogar de novo → Sair → Menu.

**Medido em todas as 52 capturas:**
- **zero rolagem** horizontal ou vertical;
- **nenhum botão fora da tela**;
- **nenhum botão abaixo de 44 px** (antes eram 117);
- zero 404 e nenhum pedido externo.

**Ressalvas que conferi:**
- **Avisos de console:** o único aviso foi "Canvas2D: Multiple readback operations…", e quem o causou foi **o meu script**, que lê os pixels do retrato com `getImageData`. O jogo não usa `getImageData` (grep vazio). O `momentos.mjs`, que não faz essa leitura, e o `capturas:p3` saíram com **"sem erros, avisos ou 404"**.
- **"Texto cortado":** o detector marcou o cartão do placar ("Córnea você…") no 390 e no 360. Nas capturas (`pequeno-08-jogando`, `pequeno-12-resultado`) nada aparece cortado; é o `overflow` do cartão do HUD com o conteúdo justo. **Falso positivo.**

**Sem becos sem saída:** Voltar está sempre à vista e Sair pede confirmação. No resultado, "Jogar de novo" e "Menu"; na faixa "Você foi descansar!", Recomeçar, além de Sair no HUD.

### M1 — retrato de quem conta a curiosidade (resolvido)
Em **todo** cartão o canvas da curiosidade tem 36–38% de pixels opacos: pausa, sair, intervalo e resultado, nas 4 telas.

Visualmente (`pequeno-09-pausa`, `desktop-09-pausa`, `m-vale-paisagem-intervalo`, `paisagem-12-resultado`, `pequeno-12-resultado`), aparece sempre o personagem do assunto:
- a Retina conta dos cones;
- a Córnea, da córnea;
- a Íris, da íris;
- a Lente, do nervo óptico.

O retrato acena e pisca. `quemConta` deixou de ser código morto (`avisos.js` `desenharContador`).

### M2 — prévia do alcance (resolvida, e bem)
Capturei a prévia **no começo da janela de 2 s**, o momento mais fraco.

**Arenas:**
- `m-caverna-pequeno-perigo` (360×640): ciano tracejado e listrado sobre o piso escuro, claríssimo.
- `m-lago-desktop-perigo` e `p3/arena-lago-desktop`: índigo listrado, separado do azul do lago. Onde duas prévias se sobrepõem, a casa escurece, e isso lê-se como "mais perigo".
- `pequeno-08-jogando` (Consultório): as casas listradas destacam-se dos blocos verde-água.

**Daltonismo:**
- `d-jardim-desktop-cinza`: **em cinza, as listras diagonais e o tracejado continuam evidentes.** Era o ponto fraco da rodada 1.
- `d-consultorio-pequeno-deut`: em deuteranopia, a prévia azul se lê perfeitamente.

**Código:**
- a casa é pré-desenhada (`renderizador.js` `spriteDePerigo`), com a gotinha central maior;
- cada arena tem a sua cor de perigo (`temas.js` `perigo`);
- o contraste é testado em `qa/sim/temas.test.mjs`.

### M3/M3b — volume pela cadeia real e estalos (resolvidos)
Meu render é independente do script do executor, mas usa a mesma `criarCadeia` que o jogo usa (`som.js` → `cadeia.js`).

| Medida | Valor |
|---|---|
| Faixa de pico dos 25 efeitos | **−4,4 a −10,8 dBFS** (antes −14,7 a −50,9) |
| Arremesso / disparada / chute / clique | −10,1 / −9,7 / −7,3 / −10,6 dBFS (antes −43 / −43 / −29 / −33) |
| Trilhas, 90 s cada, RMS (pico) | −26,7 a −27,8 dBFS (pico −6,6 a −7,5) |
| Partida intensa (aperto + respingo a cada 0,7 s), RMS (pico) | **−19,3 dBFS** (pico −3,3: não estoura) |
| Estalos de amostra isolada (efeitos, 6 trilhas × 90 s, partida intensa) | **0** |
| Controle: mesmo detector com o defeito antigo reintroduzido | **2 estalos em 20 s**: o detector funciona |

- **Relação entre trilha e efeitos:** a trilha fica cerca de 8 dB abaixo da partida, como o parecer anterior pedia.
- **O achado M3b é real e foi bem diagnosticado:** o `GainNode` nascia com ganho 1 (`sintese.js`, agora com `g.gain.value = 0`).

### M4 — música (resolvida)
- 4 frases por trilha e forma de 8 voltas (`musica.js` `FORMA`), com o desenho do arpejo trocando a cada volta e segunda voz em A'. O ciclo dá 256 colcheias, ou **69–91 s** conforme o andamento.
- O baixo passou a triangular com 2f e 3f, que um alto-falante de celular reproduz.
- **Não ouvi em alto-falante.** Avalio pela partitura, pela forma e pelas medidas.

### M5–M8 (resolvidos)
- **M5:** o teste agora usa `setTimeScale(0)` e `waitForFunction`, e a suíte passou sob carga.
- **M6:** os acessórios ficam inteiros nos cartões da escolha (`pequeno-04-cornea`: o losango da Córnea e o broto da Mácula aparecem), na taça, nos retratos e no desfile. Função `encaixarPersonagem`.
- **M7:**
  - menu no celular lento: **36 fps** (antes 23 no meu colega da R1); com reduzir-movimento, **57 fps**;
  - com reduzir-movimento, a vitrine fica congelada: em `r-menu-1` contra `r-menu-2`, a única diferença de pixels é o piscar do desfile.
- **M8:**
  - **botão de pausa:** quando pausado, vira **▶ Continuar** verde (`desktop-09-pausa`, `pequeno-09-pausa`);
  - **balão "Você":** fica acima do acessório e só na contagem (`paisagem-07-contagem`);
  - **HUD:** os botões têm 44 px;
  - **paisagem baixa:** o cartão mostra a arte do vencedor sem rolar (`m-vale-paisagem-intervalo`, `paisagem-12-resultado`).

### Originalidade (seção 2)
- O grep não encontra "Bomberman", empresas, URLs externas, `fetch`, cookies nem `console.log`.
- A pasta só tem `.js`, `.css`, `.html` e `.svg`: **385,6 kB**, para um orçamento de 600 kB.
- **Personagens** (`p3/folha-personagens.png`): criaturinhas-olho redondas com pálpebra colorida e um acessório próprio cada:
  - Íris: flor;
  - Pupilo: topete;
  - Córnea: losango;
  - Retina: coroa de cones;
  - Cristalino: faixa;
  - Mácula: broto;
  - Cílio: laço e cílios;
  - Lente: óculos.

  **Nada lembra o herói clássico do gênero:** sem capacete, antena, cinto nem luvas.
- **Peças:** são temáticas (lentes, espirais, pupilas, cones e bastonetes, armações e estojos).

### Textos e curiosidades
As 24 curiosidades são verdadeiras, simples e sem promessa médica. O português está correto e o tom acolhedor ("Respire fundo e pisque os olhos", "Você foi descansar!", "Que partida! Vamos de novo?").

### Reduzir movimento
`renderizador.js` desliga o tremor e o chacoalhar, corta as partículas para 35%, para o balanço do balão e o pulso da prévia, e congela a vitrine. Os cartões ficam quietos (`avisos.js` `quieto`).

## O que está muito bom
- **A identidade continua o ponto alto:**
  - o logo com os "o" virando olhinhos que piscam;
  - o desfile de mãos dadas;
  - as miniaturas reais das arenas;
  - as gotinhas como ícone de dificuldade;
  - a criança indo "descansar" numa nuvenzinha;
  - o seu personagem cochilando no cartão de pausa.
- **A prévia de perigo virou um elemento de design**, não um remendo: listras diagonais mais tracejado lembram fita de "cuidado", com a gotinha no meio e a cor escolhida por arena. Funciona em cinza e em 360 px.
- **A cadeia de som num único módulo, usada pelo jogo e pela medição**, mais o teste de estalos, é engenharia de áudio de verdade. O executor achou e corrigiu um defeito que eu não tinha pedido.
- **Os cartões ficaram completos:** a curiosidade contada pelo personagem do assunto dá à espera da consulta um toque educativo e fofo.

## Bloqueadores

**Nenhum.**
- Console limpo (os únicos avisos vieram do meu script de medição) e sem 404.
- Sem rede externa.
- Nenhuma tela quebrada em 360–390 px.
- Originalidade respeitada.
- Suítes verdes, também sob carga.
- Sem regressão das Partes 1 e 2.

## Melhorias priorizadas (nenhuma impede a aprovação)

1. **(média, Parte 4) fps no aperto.** Medi 38 fps no desktop e 23 no celular lento (390×844, DPR 3, CPU 4×), igual à Parte 2. O plano pede 60 no desktop e ≥ 30 no celular. Investigar o custo de desenhar as peças que caem e as casas de muro: pré-rasterizar a peça do muro uma vez por tamanho e desenhar o piso coberto num canvas estático.
2. **(baixa) Retina e Mácula em deuteranopia.** As duas ficam com a mesma cor cáqui (`d-consultorio-pequeno-deut`, retratos do placar). Separam-se pela coroa contra o broto, mas, na casa de ~20 px, só com atenção. Sugestão: dar à Retina um tom mais quente e escuro de pálpebra, ou um contorno de corpo de cor diferente.
3. **(baixa) Narrador da curiosidade.** Em algumas, o personagem não tem ligação com o assunto:
   - a Mácula conta das lágrimas de riso e do ponto cego (que fica no disco óptico, não na mácula);
   - a Lente conta das sobrancelhas;
   - a Íris conta dos bebês.

   Fica mais coerente trocar (ponto cego → Lente, que já conta o nervo óptico; lágrimas → Córnea).
4. **(baixa) "Como jogar".** Em 360 px, "(ou W A S D)" quebra no meio (`p3/pequeno-05-ajuda`): usar "WASD" ou um espaço que não quebra (`&nbsp;`). No celular, o texto fala só de teclado; isso entra quando os controles de toque chegarem na Parte 4.
5. **(baixa) Botão Pausar no cartão de resultado.** Ele continua ativo no HUD com a partida encerrada (`paisagem-12-resultado`). Desabilitar ou esconder nessa tela.

## Nota pela rubrica

| Item | Peso | Nota | Por quê |
|---|---|---|---|
| Beleza e originalidade | 30 | **28** | Criaturinhas carismáticas, inconfundivelmente próprias; tema oftalmológico em tudo; 5 arenas bonitas e distintas, com o Lago agora com folhinhas e flores. Acessórios inteiros. Pequeno desconto: alguns cartões ainda ficam um pouco vazios em telas largas. |
| Legibilidade em jogo | 20 | **18** | A prévia de perigo agora se lê num relance em todas as arenas, em 360 px e em cinza; os itens têm medalhão; o respingo é claro. Desconto: Retina e Mácula em deuteranopia na casa pequena. |
| Interface | 20 | **18** | Fluxo de uma decisão por tela, padrão do site, alvos ≥ 44 px em todo lugar, zero rolagem, ícone de pausa e continuar correto, cartões completos. Descontos pequenos: quebra do "W A S D", Pausar ativo no resultado. |
| Animação e efeitos | 15 | **13** | Piscar, acenar, andar, susto, encharcar, cochilar, confete e taça; a prévia pulsa cada vez mais rápido; reduzir-movimento bem cumprido. O aperto ainda pesa no fps. |
| Áudio | 10 | **9** | Só depois do gesto, mudo persistente (0 contextos depois de recarregar), cadeia real medida, sons fracos agora audíveis, zero estalos, música longa de 69–91 s com variação. Não ouvido em alto-falante. |
| Textos e curiosidades | 5 | **5** | Português correto, tom certo, 24 fatos verdadeiros e sem promessa médica. |
| **Total** | 100 | **91** | |

## Fiquei impressionado? **Sim**

A rodada 1 tinha três defeitos visíveis, e os três foram resolvidos acima do pedido, com medida antes e depois:
- **o contador da curiosidade:** agora presente e coerente com o assunto;
- **a prévia de perigo:** virou uma linguagem visual própria, com fita listrada e tracejada que sobrevive ao cinza e à tela de 360 px. Era justamente o que ensina uma criança de 6 anos a fugir;
- **o som:** volume corrigido pela cadeia real.

Além disso, o executor descobriu sozinho um defeito sutil de áudio, o estalo de uma amostra que existia desde a rodada 1, e o cobriu com teste. Eu o reproduzi com um controle e confirmei a correção.

O conjunto (logo que pisca, desfile, cartões com personagem contando curiosidades, criança "indo descansar") tem capricho de estúdio e cara de produto pronto para a sala de espera. As pendências são pequenas ou pertencem à Parte 4.

NOTA: 91
IMPRESSIONADO: sim
BLOQUEADORES: 0
VEREDITO: APROVADO
