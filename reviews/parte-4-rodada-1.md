# Parecer do verificador — Parte 4 (Celular e acabamento), rodada 1

Verificador independente. Li inteiros o `PLAN.md` (incluindo a nova seção 3.9, "Aceites do dono após a parte 4, rodada 1", que apliquei como fonte da verdade), o `CLAUDE.md`, o relatório `reports/parte-4-rodada-1.md` e os pareceres aprovados das Partes 1, 2 e 3. Não confiei no relatório: rodei as suítes, joguei com dedos emulados de verdade (CDP `Input.dispatchTouchEvent`, contexto `hasTouch`/`isMobile`) em tempo real, medi e olhei as capturas.

Scripts próprios em `qa/verificacao/v-p4r1/` e capturas em `qa/capturas/v-p4r1/`:

| Script | O que faz |
|---|---|
| `toque.mjs` | trajeto por casas, zona morta, diagonal, borda, botões, toque múltiplo, bichinho, canhoto, zoom, seleção, menu de contexto |
| `painel.mjs`, `som-cortado.mjs`, `som-captura.mjs` | botões do painel cortados |
| `fps.mjs` | fps por momento da rodada, inclusive a adaptação da densidade |
| `memoria.mjs` | 5 min de partidas |
| `robustez.mjs` | segundo plano, girar, redimensionar, recarregar, foco |
| `teclado.mjs` | fluxo só com teclado, foco, reduzir movimento |
| `peso.mjs` | primeira carga e rede |

Aplicando a seção 3.9:

- **Fácil e IA:** a força do Fácil (criança ≈ 15%, empates ≈ 30%) e a auto-eliminação do Difícil ≈ Médio **não** entram como desconto nem bloqueador.
- **Celular emulado:** não testar em aparelho físico também não entra, porque o relatório diz isso com honestidade.

## Suítes

- `npm test`: **188/188** (24,5 s).
- `npm run e2e`: **55/55** (99 s).
- Zero erros, avisos ou 404 em todos os meus scripts e no `capturas:p4`.

## 1. Jogar no celular (medido)

### Trajeto por toque em tempo real

Os robôs ficaram parados e o roteiro saiu da casa (1,1): baixo até (1,3), cima até (1,1), direita até (2,1) e esquerda até (1,1). Em cada trecho segurei a alavanca até chegar ao centro da casa alvo.

| Tela | Casas visitadas | Tempo por trecho | Parou em |
|---|---|---|---|
| 390×844 | 1,1>1,2>1,3 · 1,3>1,2>1,1 · **(trecho 3 não andou)** | 824 / 811 ms | 1,50;3,42 → 1,50;1,55 |
| 844×390 | 1,1>1,2>1,3 · 1,3>1,2>1,1 · 1,1>2,1 · 2,1>1,1 | 825 / 808 / 544 / 507 ms | 2,44;1,50 → 1,55;1,50 |
| 360×640 | igual a 844×390 | 814 / 775 / 560 / 508 ms | idem |

- Nenhum trecho desviou de eixo, e soltar o dedo para o boneco.
- A falha do trecho 3 em retrato está explicada no item M1 abaixo.

### O que funciona bem

| Verificação | Resultado |
|---|---|
| **Zona morta** | dedo 7/6 px fora do centro por 0,5 s → 0 casa andada. |
| **Diagonal com histerese** | dedo a (22, 26) px, tremendo ±3 px por 10 leituras → só "baixo", 0,00 casa de desvio lateral. |
| **Botão de gota** | gota na casa certa (1,1). A contagem passa de "1" para "0" e o botão fica desbotado. |
| **Toque múltiplo** | dedo 1 andando, dedo 2 solta a gota, dedo 3 é ignorado. Ao tirar o dedo 2, o boneco continua andando (1,5 → 3,3). |
| **Bichinho** | o botão só aparece montado: 64 px em retrato, 60 px em 360×640 e 844×390, com `aria-label` "Poder do Cascudo". A carapaça fecha com o dedo (`escudo: true`). |
| **Canhoto pela pausa** | "Trocar lados" (280×44) → `data-lado=canhoto`. A gota vai para a esquerda, e a metade esquerda deixa de mover o boneco. |
| **Pinça de dois dedos, arrasto do topo, toque longo de 1,2 s no placar** | `visualViewport.scale = 1`, `scrollX/Y = 0`, seleção vazia, 0 eventos `contextmenu` que passassem. `overscroll-behavior: none` no corpo. |
| **Sem rolagem em nenhuma tela** | `scrollWidth/Height` = viewport em todas, inclusive 640×360 e 768×1024. |

## 2. Desempenho e peso

**Peso** (`peso.mjs`, CDP `encodedDataLength`):

- **412 kB** na primeira carga, com 52 pedidos, tanto pelo menu quanto direto no jogo;
- 422 kB com `?ajuste=1`;
- **0 pedidos externos**.

Cumpre o limite de 600 kB.

**fps:** fiz outro cenário que o do executor (Caverna, Médio, semente 5), em janelas de 5 s.

| Tela | Começo | Meio | Aperto (35 s) | Aperto (14 s) |
|---|---|---|---|---|
| Desktop 1280×720 | 60 | 60 | 60 | 60 |
| 390×844, DPR 3, CPU 4× | 51 | 49 | **34** (p95 50 ms; 12% dos quadros acima de 34 ms) | 41 |
| 844×390, DPR 3, CPU 4× | 53 | 49 | **35** (p95 50 ms; 11%) | 43 |
| 360×640, DPR 2, CPU 6× (mais duro que o plano) | 34 | 35 | 26 | 38 |

- **Desktop:** 60 fps cravados, com o aperto incluído. Confirmo que a correção do `backdrop-filter` funciona.
- **Celular de entrada (CPU 4×):** ≥ 30 fps também no aperto, mas no limite: 34–35 fps, com p95 de 50 ms.
- **Adaptação da densidade:** no 1,5 s logo após chegar ao meio ou ao aperto, cai para 22–28 fps (até 51% de quadros lentos). Depois se acomoda em densidade 1.

**Memória** (`memoria.mjs`): 5 min em 390×844 com toque, Difícil, demo, arenas alternadas e passagem pelo menu.

- O heap fica entre 3,99 e 4,91 MB depois da coleta de lixo forçada, de 30 a 300 s.
- Os ouvintes ficam constantes em 57 e os nós do DOM entre 1 222 e 1 334.
- **Sem vazamento.** Junto com a série do executor (28 partidas), isso me convence.

## 3. Robustez (`robustez.mjs`)

| Situação | Resultado |
|---|---|
| Perda de foco durante a contagem "3, 2, 1" | pausa (`tela: pausado`, contagem congelada em 3). |
| Perda de foco com a seta ↓ presa | ao continuar, o boneco não anda sozinho (0,00). |
| Aba escondida com o dedo na alavanca | pausa. Ao voltar e continuar, o boneco não anda sozinho. |
| Girar 390×844 → 844×390 com o dedo na alavanca | a arena é refeita (420×364, cabe na tela) e a alavanca volta ao repouso. Andou sozinho: 0. |
| Redimensionar 360×640 → 768×1024 → 640×360 → 1280×720 → 390×844 | a arena cabe em todos, sem rolagem. |
| Recarregar no meio | volta limpo, sem erros. |
| Teclado: Espaço, PageDown, End, ↓, Tab | `scrollX/Y = 0`. |

- **Ressalva sobre a aba em segundo plano:** o Chromium sem janela não troca a visibilidade com `bringToFront`. Por isso, como o executor, simulei com `document.hidden` e `visibilitychange`. O código (`main.js:304–317`) está correto.

## 4. Acessibilidade (`teclado.mjs` e `acessibilidade.test.mjs`)

- **Foco:** o anel de foco é sólido, `#0B57C2`, com 3 px, e é visível em todos os botões do menu (`teclado-01-menu-foco.png`).
- **Teclado:** o fluxo menu → personagem (setas) → arena → jogar funciona, e Esc volta.
- **Reduzir movimento:** 0 animações CSS rodando.
- **Contraste:** as correções (Continuar #147A3F, dourado #8A6200 etc.) estão no CSS.
- **Alvos:** ≥ 44 px nos menus e ≥ 56 px nos controles de toque.
- **Desconto:** o mudo deixa de ser alcançável em paisagem com toque (bloqueador B1).

## 5. Limpeza, README e originalidade

- **Código do jogo:** sem `console.log`, `debugger`, TODO nem FIXME. Todos os módulos são importados.
- **Exportações:** sobram algumas exportações sem uso fora do próprio arquivo (`HUMANO`, `misturar`, `livrePara`, `casasDaGota`, `BICHINHOS`…). Não é código morto, porque são usadas internamente; é só API larga demais.
- **Originalidade (seção 2):** respeitada. Nada de nomes de terceiros no jogo, nada baixado, arte e som por código.
- **README:** completo e claro. A seção "Integração ao site (etapa 2)" é seguível por outro agente sem ajuda:
  - o que copiar e o que não copiar;
  - link relativo ou absoluto;
  - por que não usar iframe;
  - como conferir (console e 404);
  - os três motivos de tela em branco.

  Problemas no README e no repositório estão em M3 e M4.

## 6. Pendências dos pareceres anteriores

| Pendência | Situação |
|---|---|
| fps no aperto (desktop) | resolvido: 60 fps. |
| fps no aperto (celular) | ≥ 30, mas no limite (34–35). |
| Cascudo | limite de 1,5 s e recarga de 2,5 s, com testes. Verifiquei o botão de toque fechando a carapaça. |
| Curiosidades com o narrador certo | ok (`curiosidades.js`). |
| "WASD" em 360 px | ok. |
| Pausar desligado no resultado | ok (`main.js:126–129`). |
| Fácil e Difícil | aceitos pelo dono (3.9). |
| Retina × Mácula em deuteranopia | não tratado. O relatório diz isso, e a pendência é baixa. |

---

## Bloqueadores

### B1 — Botão de som (mudo) cortado e inalcançável no painel, em paisagem com toque

Isso é regressão do que foi aprovado na Parte 3: o "botão de mudo persistente" (3.5).

**Causa.** Com `body[data-toque="sim"]` em paisagem, `toque.css:22` encolhe a coluna do painel para `minmax(150px, min(240px, 26vw))`. Os três botões do topo, Pausar, Sair e Som, não cabem, e o painel corta o último. Medido com `som-cortado.mjs`:

| Viewport (toque) | Largura visível do botão de som (de 44 px) | O centro recebe o toque? |
|---|---|---|
| 640×360 | 44 | sim |
| **740×360** (celular Android comum deitado) | **14** | **não** |
| 844×390 | 41 | sim |
| 915×412, 932×430 | 44 | sim |
| **1024×768** (tablet deitado) | **18** | **não** |
| **1180×820, 1280×800, 1366×1024** | **18** | **não** |

- **Capturas:** `som-740x360.png`, `som-1024x768.png` e `painel-desktop-t.png`. Na própria captura do executor, `qa/capturas/p4/paisagem-07-canhoto.png`, o ícone já aparece cortado na borda.
- **Por que bloqueia:** numa sala de espera, com um celular deitado ou um tablet, a criança ou o responsável **não consegue desligar o som durante a partida**.
- **Sem toque está tudo certo** em todas essas telas (`painel.mjs`): o defeito nasceu nesta rodada.

**Correção sugerida:**

- deixar o painel deitado com os botões só com ícone quando a coluna for estreita, como já acontece em 640×360, por uma *container query* ou pela largura real, em vez de faixas de `vw`;
- ou deixar o grupo `.botoes` quebrar em duas linhas;
- e incluir no teste "nenhum botão cortado por ancestral com overflow" as telas 740×360 e 1024×768 com toque. O `painel.mjs` serve de modelo.

## Melhorias priorizadas

### M1 (alta) — A alavanca não nasce exatamente onde o polegar toca perto das bordas: movimento fantasma e empurrão perdido

**Causa.** `toque.js:63–70` (`prender`) desloca o **centro lógico** da alavanca para que a base caiba na tela. O dedo fica então até ~56 px fora do centro já no primeiro toque, e qualquer tremor de 1 px dispara uma direção.

**Medido** (`toque.mjs`, `bordaFantasma` e `bordaDireitaCanhoto`):

- **Borda de baixo:** polegar parado a 6 px da borda, só com tremor de 1 px. A alavanca vira "baixo" e o boneco **anda sozinho 1,38 casa em 0,4 s**, nas 3 telas. A faixa de baixo é justamente a área de controle em retrato.
- **Borda direita, modo canhoto:** o polegar parado anda **1 casa** sozinho.
- **Parte esquerda do contorno em repouso:** em 390×844, encostar na parte esquerda do contorno (x = 38, onde a dica visual manda pôr o dedo) e empurrar 30 px para a direita resulta em **0 casa**. O centro foi para x = 60, então o deslocamento útil é de 10 px, menor que a zona morta de 12 px. Foi o trecho 3 do trajeto, que não andou em retrato.

**Sugestão:** manter o centro lógico no ponto do toque e prender só o desenho. Ou, ao prender, usar a posição presa também como ponto de partida do dedo (dx = dy = 0 no primeiro toque). Cobrir com um teste "toque a 6 px da borda e tremor de 1 px → 0 casa".

### M2 (média) — `npm run desempenho` não mede o meio nem o aperto, e a tabela do relatório para esses momentos está errada

**Causa.** `qa/navegador/desempenho.mjs:68` avança enquanto `b.state.tempoRestante > alvo`, mas `state.tempoRestante` **não existe**: o retrato expõe `relogio`, em segundos (`sim/retrato.js:49`). O laço não roda nenhuma vez, e as três janelas medem o **começo**. Por isso o relatório (seção 2) mostra "Aperto 44/44" no celular.

**Medido de verdade no aperto:** 34–35 fps, com p95 de 50 ms e 11–12% de quadros lentos. O orçamento ainda passa, mas por pouco, e não com a folga relatada. Como o script vai no README como ferramenta oficial, ele precisa medir o que diz.

**Sugestão:**

- usar `state.relogio` (segundos) e checar `state.aperto.ativo` antes de medir;
- abortar se o momento não foi atingido;
- aliviar o aperto no celular: por exemplo, não refazer o fundo estático a cada queda e pré-rasterizar a peça que cai.

### M3 (média) — Arquivos gerados e grandes versionados

- `qa/lote/p4.json` tem **4,3 MB** (243 mil linhas), gerado pelo lote e versionado nesta rodada **duas vezes**: o commit de checkpoint e o final reescrevem 77 mil linhas. Isso infla o histórico, e o `.git` tem 5 MB.
- O `qa/lote/.gitignore` já ignora `resultado.json` e `rapido.json`, mas não `p4.json`.
- Também estão versionados `qa/verificacao/v-p2r2/*.json` (4,6 MB) e `v-p3r*/test.out`.

**Sugestão:** versionar só o `.md` com as tabelas e ignorar `lote/*.json`, exceto pequenos fixtures, e `verificacao/**/test.out`.

### M4 (média-baixa) — README

- "Como testar" diz só `npm install`. Numa máquina nova, o Playwright precisa de `npx playwright install chromium`. A alternativa `/opt/pw-browsers` é deste ambiente, não do computador do dono.
- O README apresenta `npm run desempenho` como medidor "no começo, no meio e no aperto", o que hoje não é verdade (M2).

### M5 (baixa) — Virar a partir da alavanca toda inclinada exige ~60 px laterais

Com o dedo além do raio (base seguindo) e a histerese de 1,35, sair de "baixo" para "direita" num movimento puramente lateral exige dx > 1,35 × 44 ≈ 59 px.

- **Medido** (`rolagemPolegar`): 30 px para a direita continua "baixo".
- **Por que importa:** no gênero, virar rápido em cruzamento é essencial.

**Sugestão:** reduzir a histerese quando a deflexão estiver acima do raio (por exemplo, 1,15), ou calcular a direção pelo **movimento recente** do dedo quando ele já está fora do raio.

### M6 (baixa)

- **Troféu cortado:** o segundo troféu do cartão "você" é cortado com nomes longos em 360 px (`qa/capturas/p4/pequeno-05-montado.png`, "Cílio").
- **"Rodada 1" quebra:** em duas linhas em 740×360 (`som-740x360.png`).
- **Contorno em repouso deitado:** cobre os cartões de Retina e Mácula do placar. A sobreposição é intencional, mas em 740×360 tira a legibilidade do placar. Dá para baixar a opacidade ou movê-lo para debaixo do placar.

## Nota pela rubrica

| Item | Peso | Nota | Por quê |
|---|---|---|---|
| Jogar no celular | 35 | **26** | **A favor:** trajeto por toque real idêntico ao esperado casa a casa em 844×390 e 360×640; zona morta, histerese, toque múltiplo, botão de gota com contagem, bichinho só montado e canhoto funcionando; nenhuma rolagem, zoom, seleção ou menu de contexto.<br>**Descontos:** movimento fantasma e empurrão perdido nas bordas (M1, medidos, e reproduz no trajeto em retrato); virada lenta com a alavanca toda inclinada (M5); mudo inalcançável em paisagem com toque (B1). |
| Desempenho e peso | 20 | **15** | **A favor:** 412 kB sem rede externa; 60 fps no desktop em todos os momentos; sem vazamento em 5 min.<br>**Descontos:** celular de entrada no aperto a 34–35 fps (p95 de 50 ms), apenas no limite; queda para 22–28 fps durante a adaptação; ferramenta de medição quebrada e tabela errada no relatório (M2). |
| Robustez | 20 | **18** | Pausa ao perder o foco (também na contagem), entradas soltas, girar com o dedo na tela, redimensionar e recarregar, tudo limpo. Desconto pequeno: não dá para provar o segundo plano real no Chromium sem janela, e minha verificação usou a mesma simulação do executor. O código está correto. |
| Limpeza e documentação | 15 | **11** | **A favor:** código limpo, sem depuração; README muito bom, com integração da etapa 2 exemplar.<br>**Descontos:** 4,3 MB de JSON gerado versionado (duas vezes) e outros 4,6 MB antigos (M3); README sem a instalação do Chromium e citando uma ferramenta que não mede o que diz (M4). |
| Acessibilidade | 10 | **8** | Foco visível e forte, Enter e Esc, contraste corrigido com teste, reduzir movimento, alvos ≥ 56 px no jogo. Desconto: mudo fora de alcance em paisagem com toque. |
| **Total** | 100 | **78** | |

## Fiquei impressionado? **Não**

Há trabalho de qualidade aqui:

- os controles de toque têm boa engenharia (botões com borda compartilhada com o teclado, histerese, toque múltiplo, canhoto lembrado);
- o desktop voltou a 60 fps no aperto;
- a robustez a foco e giro está correta;
- o README de integração é o melhor documento do projeto.

Mas "impressionar" exige superar a expectativa, e três coisas que eu, jogando, encontrei em minutos ficaram de fora:

- **O botão de mudo some** num celular Android comum deitado e em tablets. É uma regressão.
- **O boneco anda sozinho** quando o polegar descansa perto da borda de baixo, exatamente onde fica a área de controle em retrato.
- **A medição oficial de desempenho não mede** o meio nem o aperto, e o relatório apresenta números de aperto que na verdade são do começo.

Para uma criança na sala de espera, a precisão do polegar é o produto. Para o dono, o mudo tem de estar sempre à mão.

NOTA: 78
IMPRESSIONADO: não
BLOQUEADORES: 1
VEREDITO: REPROVADO
