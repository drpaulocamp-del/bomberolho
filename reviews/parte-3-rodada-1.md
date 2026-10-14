# Parte 3 — Estética, identidade e som · Rodada 1 (parecer do verificador)

Sou um verificador independente e novo. Li inteiros o `PLAN.md` (seções 2, 3 inteira com 3.4, 3.5 e 3.6, 4, 7 e 8) e o `CLAUDE.md`. Li também o relatório do executor (`reports/parte-3-rodada-1.md`) e os pareceres aprovados das Partes 1 e 2.

Não editei nada em `bomberolho/`.
- Scripts: `qa/verificacao/v-p3r1/`.
  - `fluxo.mjs`: o fluxo inteiro com cliques reais nas 4 telas.
  - `momentos.mjs`: respingo, perigo, encharcar, descanso, intervalo e aperto, nas 5 arenas, com filtros de daltonismo e reduzir-movimento.
  - `audio.mjs`: gesto, mudo e render offline pela cadeia real.
  - `teclado.mjs`: menu e partidas só pelo teclado, em tempo real.
  - `fps.mjs` e `fps2.mjs`: fps ao longo da rodada.
  - `comp.mjs`: efeito do compressor no volume.
- Capturas: `qa/capturas/v-p3r1/` (fora do git), mais as que regenerei em `qa/capturas/p3/` (arenas, personagens e folha).

Olhei de perto umas 45 capturas.

## O que conferi, e como

### Suítes
- **`npm test`:** 164/164 (29 s).
- **`npm run e2e`, rodada sozinha:** 41/41.
- **`npm run e2e` com outro Chromium rodando ao mesmo tempo:** 40/41. Falhou `parte3.test.mjs:142` (`assert.equal(s.tick, 0)` depois de "Recomeçar"), com tick = 4: corrida com o relógio real. Rodando o teste isolado 3 vezes, ele passa 3 vezes. É um teste **instável sob carga** (ver M5). Não conto como bloqueador porque a suíte passa limpa sozinha.
- **Regressão das Partes 1 e 2:**
  - todos os testes antigos passam;
  - o pavio, a cruz, a cadeia e o túnel aparecem iguais nas capturas;
  - o fps da partida é igual ao do commit aprovado da Parte 2 (`a58072e`, que extraí e servi à parte; tabela abaixo).
  - **Sem regressão.**

### Fluxo de telas nas 4 resoluções (cliques reais)
- **Percurso** em 1280×720, 390×844, 844×390 e 360×640, com DPR 2: inicial → outra curiosidade → Como jogar → Entendi → Jogar → escolher Cristalino → Próximo → Caverna, Fácil e 1 troféu → Começar → contagem → jogando → Pausar → Continuar → Sair → "Continuar jogando" → fim da rodada → resultado → Jogar de novo → Sair → Sair → menu.
- **Medições em cada tela:**
  - **zero rolagem** (scrollWidth/Height = viewport);
  - **nenhum botão fora da tela**;
  - nenhum texto cortado;
  - **zero erro ou aviso de console, zero 404**, nenhum pedido externo.
  - Fora o HUD (ver M8), todos os botões de menu e cartão têm ≥ 44 px.
- **Só teclado** (`teclado.mjs`):
  - Enter abre a escolha;
  - as setas andam na grade;
  - Esc volta;
  - Tab chega a "Próximo";
  - Enter em "Começar!" inicia;
  - nas 5 arenas, P pausa, Enter retoma e a página nunca rola.
- **Sem becos sem saída:** Voltar está sempre à vista e Sair pede confirmação. Com a rodada acabada, Sair vai direto ao menu.

### Originalidade (seção 2)
- O grep não encontra "Bomberman", empresas, URLs externas, `fetch`, cookies nem `console.log`.
- Peso de 374 kB; nenhum arquivo de mídia; tudo em Canvas, SVG inline e WebAudio.
- A folha de personagens (`qa/capturas/p3/folha-personagens.png`) mostra criaturinhas-olho com pálpebra colorida e acessório. **Nada lembra o herói clássico do gênero:** sem capacete, antena, cinto nem luvas.
- Os nomes são todos do tema.
- **Aprovado.**

### Daltonismo
Passei `feColorMatrix` de deuteranopia, protanopia e tritanopia, mais `grayscale(1)`, sobre a página inteira (`d-*.png`).
- **Personagens:** distinguem-se pela silhueta e pelo acessório (flor, topete, losango, coroa de cones, faixa, broto, laço e cílios, óculos), também em cinza. Em deuteranopia, Retina e Mácula ficam da mesma cor cáqui; ainda se separam pela coroa contra o broto, mas na casa de ~20 px do 360×640 isso exige atenção.
- **Peças:** pilar escuro e bloco claro se separam bem em cinza.
- **Perigo:** a prévia do alcance quase some em cinza e em arenas claras (ver M2).

### Áudio
`audio.mjs` usa um `AudioContext` instrumentado.
- **Antes de qualquer gesto:** 0 contextos criados e `state.audio = 'inativo'`. Depois de um clique: 1 contexto, 'running'.
- **Mudo:**
  - o botão suspende o contexto e o rótulo vira "Som desligado (tocar para ligar)";
  - depois de recarregar, com clique e tecla, **0 contextos criados**;
  - o HUD da partida já mostra mudo;
  - religar no HUD cria o contexto e passa a 'running'.
  - **Correto e persistente.**
- **Código** (`sintese.js`, `musica.js`, `som.js`):
  - envelopes exponenciais sem estalo;
  - intervalo mínimo entre sons iguais;
  - cadeia num quadro só vira um splash mais cheio;
  - o empate é suave, nunca uma "derrota" triste;
  - a música para na pausa e no fim.
- **Render offline pela cadeia real** (efeitos 0,9 → mestre 0,8 → compressor −18 dB / 4:1 → saída): ver M3. **A saída real fica cerca de 10–12 dB abaixo dos números do relatório**, que foram medidos antes da cadeia.
- Não ouvi em alto-falante. Avalio pelo código e pelas medidas.

### Curiosidades e textos
As 24 curiosidades estão corretas, simples e sem promessa médica. Conferi uma a uma: pupila, íris única, piscar ~15/min, cones e bastonetes, ponto cego, imagem invertida, lágrima reflexa etc. "Nunca olhe direto para o Sol" é aviso de segurança, aceitável. O português dos cartões está correto e o tom é acolhedor: "Você foi descansar!", "Na próxima é você", "Respire fundo e pisque os olhos".

### Desempenho e peso
- **Peso:** 374 kB na pasta inteira, para um orçamento de 600 kB.
- **fps:**

| Cenário (Chromium sem cabeça, raster por software) | Parte 3 | Parte 2 aprovada |
|---|---|---|
| Desktop, começo / meio / aperto | 60 / 60 / **37** | 60 / 59 / 38 |
| Celular lento (390×844, DPR 3, CPU 4×), começo / meio / aperto | 46 / **25** / **21** | 41 / 24 / 19 |
| Menu no celular lento | **23** (o relatório diz 29) | — |

Não há regressão. Mas o "43 fps no celular" do relatório mede só os 5 primeiros segundos da rodada. No meio e no aperto, a partida cai abaixo de 30 (ver M7, assunto da Parte 4).

## O que está muito bom

- **Identidade visual coesa e própria:**
  - logo "Bomberolho" com os três "o" virando olhinhos;
  - desfile dos 8;
  - miniaturas **reais** de cada arena na escolha;
  - "Surpresa!";
  - gotinhas como ícone de dificuldade e troféus desenhados.
  - O conjunto tem cara de produto, segue o padrão do site (azul `#0071E3`, vidro fosco, cantos arredondados, fonte do sistema) e o jogo é mais colorido que o site, como pede o plano.
- **Personagens carismáticos:** olho-corpo com pálpebra colorida, bochechas, bracinhos e pezinhos. Expressões de susto, alegria, esforço, encharcado e sono. Na folha, tudo é legível e fofo.
- **"Ir descansar" sem violência e engraçado:** chacoalha encharcado com pingos, cochila numa nuvenzinha, "z z" e sobe. O retrato no placar fica cinza "descansando".
- **Arenas distintas:** pólen e lentes no Jardim; cristais e espirais com esteira no Lago; Caverna escura com bocas de túnel; cones e bastonetes no Vale; armações e estojos de lente no Consultório. Na Caverna o contraste está garantido (blocos claros sobre piso escuro).
- **Cartões:** o vencedor pula com confete e taça; na pausa, o seu personagem cochila; no fim, "Jogar de novo / Menu".

## Bloqueadores

**Nenhum.** Nesta rodada:
- console limpo e sem 404;
- sem rede externa;
- nenhuma tela quebrada em 360–390 px;
- originalidade respeitada;
- suítes verdes quando rodadas sozinhas;
- sem regressão.

## Melhorias priorizadas

### M1 (alta) — O "contador" da curiosidade não aparece em nenhum cartão da partida
- **Onde:** pausa, sair, intervalo e resultado.
- **Evidência:**
  - `desktop-a09-pausa.png`, `desktop-a12-resultado.png`, `paisagem-a10-sair.png`, `pequeno-a12-resultado.png` e `m-vale-paisagem-intervalo.png`: o "Você sabia?" tem um **buraco vazio de 54 px à esquerda**, onde deveria estar o personagem.
  - `avisos.js:109` guarda `this.quemConta = c.quem`, mas **nada usa esse valor** (o grep dá uma única ocorrência). O `<canvas>` de `index.html` (`.curiosidade canvas`, `estilo.css:347`) nunca é desenhado.
  - Só a tela inicial desenha o retrato (`menu.js` `desenharRetratoCuriosidade`).
- **Situação:** o relatório afirma "Todos os cartões têm uma curiosidade… contada pelo personagem". É um defeito visível em **todo** cartão, mais código morto.
- **Sugestão:** em `Avisos.atualizar`, desenhar `quemConta` no canvas da curiosidade, como o menu faz (`desenharPersonagem` com aceno; parado em reduzir-movimento). Cobrir com teste de pixel: o canvas não pode ficar transparente.

### M2 (alta) — A prévia do alcance do respingo é fraca demais nas arenas claras e para daltônicos
- **Evidência:** `renderizador.js:441` pinta as casas com `rgba(30,130,240, 0.10 + 0.16·forca·pulso)`, ou seja, de **0,10 a no máximo 0,26** de opacidade. A gotinha central tem raio de 5% da casa, cerca de 1 px a 360 px de largura.
- **Contraste calculado** sobre o piso do Vale (`#FFE1DA`): de **1,1:1 no início a ~1,35:1 no pico**. Sobre o Jardim (`#D6F3DE`) e o Consultório, é parecido.
- **Nas capturas:**
  - `arena-vale-pequeno.png`, `m-consultorio-retrato-perigo.png`: as casas em perigo mal se veem;
  - `d-jardim-desktop-cinza.png`: em cinza, quase somem;
  - no Lago, tudo azul (gota, respingo, prévia e pilares), a prévia se confunde com o piso.
- **Situação:** a rubrica pede "perigo e alcance claros num relance, inclusive em tela pequena e para daltônicos". O respingo em si é ótimo; a **prévia**, que é o que ensina a criança a fugir, não cumpre.
- **Sugestão:**
  - opacidade mínima ~0,25 e máxima ~0,5;
  - contorno tracejado ou listras diagonais na casa (forma, não só cor);
  - gotinha com raio ≥ 12% da casa;
  - cor de prévia escolhida por arena, com contraste ≥ 1,8:1 contra o piso (medir em teste).

### M3 (média) — O som real sai baixo, e o relatório mede antes da cadeia
- **Medido pela cadeia real** (`audio.mjs` e `comp.mjs`):

| Som | Pico real | Janela RMS máxima |
|---|---|---|
| Respingo | **−17 dBFS** | −28 |
| Gota | −21 | −35 |
| Bloco | −31 | −47 |
| Clique de interface | −33 | −50 |
| Chute | −29 | — |
| Arremesso da Pinça | **−43** | — |
| Disparada | **−43** | — |

- **Trilhas:** mediana de **−40 dBFS**.
- **Partida intensa** (trilha do aperto, respingo a cada 0,7 s): RMS de −27 dBFS.
- **Causa:** o compressor (−18 dB, 4:1, joelho padrão de 30 dB) tira cerca de 10 dB: o respingo sai a −6 dBFS sem compressor e a −17 com ele.
- **Situação:** o relatório diz "efeitos: pico entre −4 e −21 dBFS", mas isso é **antes** dos ganhos e do compressor. Num celular de sala de espera, vários efeitos (arremesso, disparada, chute, clique) ficam praticamente inaudíveis.
- **Sugestão:**
  - ganho de compensação depois do compressor (+8 a +10 dB) ou limiar −10 dB com joelho menor;
  - subir arremesso e disparada em ~15 dB;
  - mirar ~−16 a −20 LUFS no conjunto, com trilha ~8–10 dB abaixo dos efeitos;
  - medir pela cadeia completa em `medir-som.mjs`.

### M4 (média) — Música curta e repetitiva para uma sala de espera
- **Medido:** cada trilha tem 2 frases de 4 compassos, e a volta completa (A, B, A, respiro) dura **34–46 s**. Numa rodada de 2:00, a mesma volta toca ~3 vezes. Em 10 minutos de espera, umas 15.
- **Graves inaudíveis no celular:** o baixo é senoidal em 55–100 Hz (`musica.js`, `nota(..., -2)`) e some no alto-falante do celular. Lá sobram só a melodia e o chiado.
- **Sugestão:**
  - 3–4 frases por trilha, com variação de oitava ou ritmo a cada volta;
  - baixo com um harmônico (onda triangular, ou f×2 baixinho) para soar em alto-falante pequeno;
  - pausa de trilha opcional entre rodadas.

### M5 (média) — Teste novo instável sob carga
- **Onde:** `parte3.test.mjs:142` espera `tick === 0` logo depois do clique em "Recomeçar", com o relógio real rodando. Falhou (tick 4) quando o e2e rodou junto com outro Chromium.
- **Sugestão:** `setTimeScale(0)` antes do clique, ou conferir `tick < 10` e a semente nova.

### M6 (baixa) — Acessórios cortados no topo dos cartões
- **Evidência:** `pequeno-a03-personagem.png` e `desktop-a03-personagem.png`: o topete do Pupilo, o losango da Córnea, os cones da Retina, o broto da Mácula e os cílios da Cílio são cortados reto pela borda do canvas. Também na taça: `pequeno-a12-resultado.png`, topete do Pupilo.
- **Causa:** `menu.js:347` usa `s = min(w,h)·0,86`, centrado em `y = h·0,55`. A arte do cartão (`avisos.js`) tem o mesmo problema.
- **Sugestão:** `y ≈ h·0,62` e `s ≈ 0,78`, ou reservar ~18% de altura para o acessório.

### M7 (média, para a Parte 4) — fps cai no meio da rodada e no aperto
- **Medido:** ver a tabela acima. No desktop, 37 fps no aperto; no celular lento, 25 e 21 fps. **Não é regressão**: a Parte 2 dá o mesmo.
- **Pedido ao relatório:** passar a medir também o meio e o aperto.
- **Menu:** fica em 23 fps no celular lento. Como o próprio executor admite, a vitrine de robôs atrás do vidro gasta CPU e bateria.
- **Sugestão:**
  - congelar a vitrine num quadro pré-desenhado quando o celular estiver lento ou com reduzir-movimento;
  - investigar o custo do desenho das peças do aperto.

### M8 (baixa) — Detalhes de interface
- **Botão de pausa:** quando vira "Continuar" (verde), mantém o ícone ⏸ em vez de ▶ (`main.js:114`, `desktop-a09-pausa.png`).
- **Balão "Você":** nos 3 primeiros segundos cobre a cabeça do jogador em telas pequenas (`m-consultorio-retrato-perigo.png`). Subir uns 20% ou desenhar só durante a contagem.
- **HUD:** Pausar, Sair e Som têm 36 px de altura em 1280×720 e 844×390. Ficam abaixo dos 44 px dos menus; o alvo de 56 px é da Parte 4.
- **Paisagem baixa:** o cartão do intervalo esconde a arte do vencedor (`estilo.css:361`). É aceitável por espaço, mas vale um retrato pequeno ao lado do título.

## Nota pela rubrica

| Item | Peso | Nota | Por quê |
|---|---|---|---|
| Beleza e originalidade | 30 | **27** | Identidade própria, charmosa e coesa: logo, desfile, criaturinhas, 5 arenas distintas e bonitas. Descontos: acessórios cortados (M6) e o Lago monocromático demais. |
| Legibilidade em jogo | 20 | **15** | Personagens e peças claros também em cinza; itens com medalhão legível. A prévia do alcance é fraca (M2). Retina e Mácula ficam próximas em deuteranopia na tela de 360 px. |
| Interface | 20 | **17** | Fluxo claro, uma decisão por tela, sem becos sem saída, padrão do site respeitado, teclado completo. O buraco do contador em todos os cartões (M1), o ícone de pausa e os botões do HUD de 36 px tiram pontos. |
| Animação e efeitos | 15 | **13** | Piscar, andar, susto, alegria, encharcar, cochilar, confete e taça: muita vida, sem poluir. Reduzir-movimento cumprido nos cartões e no menu. |
| Áudio | 10 | **7** | Gesto e mudo exemplares; síntese cuidadosa e não agressiva. Volume real baixo, com efeitos inaudíveis (M3), e música curta e repetitiva (M4). |
| Textos e curiosidades | 5 | **5** | Português correto, tom certo, 24 fatos verdadeiros e simples, sem promessa médica. |
| **Total** | 100 | **84** | |

## Fiquei impressionado? **Não**, por pouco

A parte visual chegou perto de me impressionar. O logo com os olhinhos, o desfile, as miniaturas reais das arenas e a criança "indo descansar" numa nuvenzinha têm capricho de estúdio, e nada disso foi pedido item a item.

Mas ainda falta para superar a expectativa:
- **um defeito visível em todo cartão:** o contador da curiosidade que o relatório diz existir e que não é desenhado;
- **a prévia do perigo:** é justamente o que ensina uma criança de 6 anos a fugir, e quase some em 3 das 5 arenas, em tela pequena e em cinza;
- **o som real:** cerca de 10 dB mais baixo do que o relatório afirma, com sons que não se ouvem.

Todos são consertos pequenos e localizados. Com M1–M3 resolvidos, espero aprovar na próxima rodada.

NOTA: 84
IMPRESSIONADO: não
BLOQUEADORES: 0
VEREDITO: REPROVADO
