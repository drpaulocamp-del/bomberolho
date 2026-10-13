# Parecer do verificador — Parte 1 (Motor e regras centrais), Rodada 1

Verificador independente. Li inteiros `PLAN.md` e `CLAUDE.md`. Não usei o relatório do executor como evidência: rodei as suítes, li todo o código da simulação, do controlador, do gancho, do teclado e da IA, e joguei com Playwright. Testei as regras sozinho, pelo gancho no Chromium e direto na simulação em Node. Não editei nada em `bomberolho/`.

## O que eu fiz

- **Suítes.**
  - `npm test`: **81/81** testes, 6,9 s.
  - `npm run e2e`: **13/13** testes, 15,8 s.
  - Rodei `npm test` de novo no fim, já com meus scripts dentro de `qa/`, e ele continua com 81/81. Isso importa porque o teste de originalidade também lê a pasta `qa/`.
- **Navegador**: servidor próprio na porta 7231, encerrado pelo PID no fim.
  - Abri o jogo em 1280×720, 390×844, 844×390 e 360×640, com DPR 2.
  - Joguei pelo teclado real (setas e Espaço): andar, soltar a gota, fugir.
  - Rodei uma partida até a tela de resultado.
  - Coletei console, `pageerror`, respostas ≥ 400, requisições que falharam e requisições para fora do localhost.
  - Resultado nas 4 telas: **zero problemas e zero requisições externas**.
  - Página sem rolagem: `scrollWidth`/`scrollHeight` iguais ao tamanho da janela nas 4 telas.
  - Arena inteira visível em todas.
- **Scripts próprios** em `qa/verificacao/`:
  - `sondas-sim.mjs`: mede o "sentir" e confere as regras em Node, mais um lote de robôs;
  - `jogar.mjs`: teclado e regras pelo gancho, nas 4 telas;
  - `cadeia.mjs` e `cadeia-nav.mjs`: cadeia controlada e cadeia em partida real, reproduzida no navegador.
- **Capturas** em `qa/capturas/v-*.png`. Olhei todas.

## Regras conferidas por mim (valores medidos)

| Regra | Como testei | Resultado |
|---|---|---|
| Deslize de quina | Gancho, semente 7: andei 15 ticks para a direita (x = 2,325, em cima do pilar (2,2)) e segurei "baixo". | Escorrega 2,27 → 2,05 → 1,83 → 1,61 → 1,5 e desce sem parar (y 1,61 … 2,875). Não enganchou. |
| Deslize, tolerância | Node, mapa de teste. Desvio de −490 a +490 unidades sobre o pilar. | Escorrega para o lado certo em todo desvio diferente de 0. Entra no corredor em 28 a 37 ticks (0,47 a 0,62 s). Com desvio 0 (alinhado com o pilar) não anda, como deve ser. |
| Virar a esquina correndo | Node, x0 de 2600 a 3900, abertura em (3,2). | Só com "baixo": 19 a 35 ticks, sempre entra na abertura certa. Com "baixo"+"dir" e x0 = 3600, ver melhoria M1. |
| Sair de cima da gota | Gancho: gota em (1,1), segurei "baixo". | `passantes: [0]` na soltura. O passe some após 19 ticks, em y = 2,545. Empurrando "cima" por 20 ticks, o personagem para em y = 2,5, encostado na gota. Ela virou sólida. |
| Não atravessa | O teste de propriedade do executor (30 000 ticks) e minhas trajetórias. | Nunca há sobreposição com casa sólida. A velocidade máxima é de 91 un/tick, menor que uma casa, então não há como "tunelar". |
| Pavio | Gancho. | `pavio` 164 no estado logo após a soltura. O estouro sai 165 ticks depois, contando o tick da soltura (2,75 s). Dentro de 2,5–3 s. |
| Cruz, pilar, primeiro bloco | Gancho, semente 7, alcance 2 em (1,1). | Braços `{cima:0, baixo:2, esq:0, dir:1}`. O braço direito parou no bloco (3,1), que quebrou e sumiu. O bloco seguinte, (5,1), ficou intacto. Em Node, com alcance 6 e dois blocos seguidos, só o primeiro quebrou (`100430001`). |
| Duração letal | Gancho e Node. | Exatamente **30 ticks** letais, com `restante` indo de 30 a 1. Em Node, a casa (3,1) fica letal do tick 165 ao 194. Fora do alcance, sobrevive. |
| Cadeia imediata | Node: gota A com pavio 63 e gota B (outro dono) com pavio 124. Partidas de robôs (sementes 35, 42 e 69). | Os dois respingos saem **no mesmo tick**, e B fica com `cadeia: true`. Reproduzi a semente 35 no navegador pelo gancho: no tick 1935, a gota (5,8) com pavio 16 estoura junto com a (5,5), que tinha pavio 1. Captura `v-cadeia.png`. |
| Itens queimados | Teste do executor (lido e conferido) e código. | `mundo.js` queima item exposto em casa letal. O item escondido só aparece quando o bloco termina de quebrar, então o mesmo respingo não o queima. |
| Determinismo | Gancho e Node, semente 4242, Difícil, demo, 3000 ticks. | Navegador `ff8d3210`. Navegador de novo em passos 1000 + 2000: `ff8d3210`. Node, pelo mesmo controlador: `ff8d3210`. Três execuções em Node de 5000 ticks: hashes iguais. Outra semente muda o hash. |
| Geração da arena | Código e teste. | Contagem exata: 79 blocos (78% das 101 casas candidatas) e 25 itens escondidos (32%). "L" livre nos 4 cantos. Tudo sorteado pela semente. |

## Leitura de código

- `js/sim/` é pura e só com inteiros (1 casa = 1000 unidades). Não importa nada de fora da própria pasta.
- O gerador aleatório (mulberry32) guarda o estado dentro do mundo, então clonar o mundo clona também a sequência.
- A ordem das etapas do tick é fixa e documentada (`mundo.js:73`).
- O acumulador de passo fixo (`nucleo/relogio.js`) limita o dt a 250 ms e conta em milésimos de tick, sem erro acumulado.
- Módulos pequenos e coesos (maior arquivo: 328 linhas), comentados em português com o porquê.
- Sem `console.log` e sem código morto óbvio.
- A IA lê só o estado público. Não toca em `ocultos`: `grep` confirma que só a simulação e o retrato usam esse campo.
- O gancho está completo (`state`, `start`, `setTimeScale`, `input`, `step`, `demo`, mais `pause`/`hash`), e os parâmetros de URL funcionam.
- Peso real: **109 955 bytes** (o `du` mostra 216K por causa do bloco do disco). Bate com os "106 kB" do relatório.

## Originalidade (seção 2)

- `grep` sem diferenciar maiúsculas pelo nome proibido e por nomes de empresas e consoles: só aparece em `PLAN.md`, que enuncia a regra.
- Nenhuma URL externa, imagem ou fonte baixada. Toda a arte é feita por Canvas, mais um SVG próprio para o favicon.
- Os personagens são criaturinhas-olho redondas, com íris colorida e acessórios de forma (flor, antenas, broto). Nada lembra o herói clássico do gênero.
- Pilares em forma de lente, blocos de pólen, moldura de armação e respingo de água: identidade própria.
- **Sem violação.**

## Bloqueadores (seção 8)

**Nenhum.**
- Zero erro ou aviso no console e zero 404, nas 4 telas.
- O jogo inicia.
- As suítes passam.
- Não há rede externa nem coleta de dados.
- O conteúdo é adequado para crianças: os personagens "vão descansar", sem violência.

## Nota pela rubrica

| Item | Peso | Nota | Justificativa |
|---|---|---|---|
| Movimento | 25 | **23** | Contínuo, sem inércia, com alinhamento automático. Deslize de quina generoso e nos dois eixos. Nunca atravessa, provado por propriedade e por medição. Sair de cima da gota funciona. Perde 2 pontos pelos detalhes de M1 e M2. |
| Gotas e respingo | 25 | **24** | Todas as regras corretas e cobertas por teste: pavio, cruz, pilar, 1º bloco, 30 ticks letais, cadeia no mesmo tick (inclusive com pavio maior e de outro dono), itens queimados, bloco "quebrando" segurando respingo. Perde 1 ponto: falta um teste que meça a cadeia **em várias etapas** (A→B→C no mesmo tick, com braço terminando em gota). |
| Arquitetura | 20 | **19** | Simulação pura, com passo fixo e independente de fps, provada em teste (30/60/120 fps dão o mesmo hash). O hash é igual entre Node e navegador. Gancho completo. Perde 1 ponto: `impressaoDigital` não inclui o estado dos robôs (`rng`, `alvo`), que vive em `Jogo`. O determinismo da partida completa está provado só pelo hash do mundo após N ticks (ver M4). |
| Suíte de testes | 15 | **14** | 94 testes legíveis, com nomes em português que descrevem a regra. A suíte de simulação roda em cerca de 7 s, e `npm run todos` roda tudo. Perde 1 ponto: 5,5 dos 6,7 s são um único teste de lote de robôs; dava para separar o rápido do lento (M5). |
| Geração de arena | 10 | **9** | Densidade exata, cantos sempre livres, itens por semente e espalhamento conferido por quadrante. Perde 1 ponto: o espalhamento é conferido só "em média". Nada impede que uma semente concentre os Lágrima Veloz num canto só (M6). |
| Relatório e limpeza | 5 | **5** | Os números do relatório batem com os que medi: 81 e 13 testes, ~110 kB e o lote de robôs. As limitações são honestas, inclusive "no fácil eles atacam já nos primeiros segundos", o que confirmei na captura `v-desktop-1.png`, com três gotas aos 0,5 s. |
| **Total** | 100 | **94** | |

## Melhorias priorizadas (nenhuma é bloqueadora)

**M1 — Diagonal que passa da esquina por pouco perde a curva.** (`sim/movimento.js:110-112`)
- Medido: correndo para a direita com x = 3,6, ou seja, 0,1 casa depois da abertura (3,2), e segurando "baixo"+"dir", o personagem segue até a coluna 5. Leva **53 ticks** para descer.
- Só com "baixo", ele volta e desce em **20 ticks**.
- A regra "nunca ajustar para trás" evita tremer. Mas quem rola as teclas (aperta "baixo" antes de soltar "dir") passa da porta por um fio e erra a curva, que é exatamente o "enganchar ao virar" que 3.7 pede para evitar.
- **Sugestão:** aceitar o ajuste "para trás" quando o desvio for pequeno (≤ ~150–200 unidades) e a casa da frente na faixa atual estiver aberta. Em outras palavras, uma janela de tolerância para virar logo depois de passar.
- Pode virar parâmetro da bancada da parte 2, como "tolerância do deslize".

**M2 — Toque muito rápido numa seta pode se perder.** (`input/teclado.js:39`, `:55`)
- Uma seta apertada e solta dentro do mesmo quadro some antes do `ler()`.
- Já existe tratamento para a gota (`gotaPendente`), mas não para as direções.
- **Sugestão:** guardar "direção tocada desde o último tick" e entregá-la por pelo menos 1 tick, como já é feito com a gota.
- Pouco frequente no teclado, mas no toque da parte 4 vai importar.

**M3 — Deslize de um quase-alinhado percorre uma casa inteira.**
- Medido: com desvio de 10 unidades sobre o pilar, empurrar contra ele leva o personagem 990 unidades para o lado, em 37 ticks (~0,6 s).
- É generoso e coerente com "nunca enganchar". Mas vale expor o limite como parâmetro (3.7) para o dono decidir pelo sentir.
- Não é defeito.

**M4 — Incluir o estado dos robôs na impressão digital do controlador.** (`jogo.js`, método `impressao`)
- **Sugestão:** concatenar o hash do mundo com `rng.estado`/`alvo` de cada robô. Assim o teste de "mesmo estado" prova o todo, e não só o mundo.

**M5 — Separar o lote de robôs da suíte rápida.**
- Por exemplo, um `robos-lote.test.mjs` fora do padrão do `npm test`, ou com `{ timeout }` e menos partidas por padrão.
- A suíte de regras cairia para cerca de 1 s.

**M6 — Distribuição de itens por quadrante garantida por semente, e não só em média.**
- **Sugestão:** depois de sortear, garantir pelo menos 1 Lágrima Veloz e 2 itens de cada outro tipo por quadrante, ou sortear por quadrante.
- É justiça básica numa partida de 4 cantos.

**M7 — Para a parte 2 (anotado, não conta nesta nota):**
- No lote de 40 partidas por nível, limitadas a 2 min, só **3, 3 e 4** rodadas terminam.
- **41–57%** das quedas são pela própria gota.
- Robôs ficam parados até **241 ticks (4 s)**.
- No Fácil eles soltam gota aos 0,5 s. O plano quer que, no Fácil, os robôs não ataquem nos primeiros segundos (3.2).
- O executor já lista tudo isso nas limitações, e é escopo da parte 2.

**M8 — Pequeno visual:**
- As gotinhas de respingo saem por cima da borda da moldura no braço que toca a borda (`v-retrato-2-respingo.png`, canto superior esquerdo). Recortar as partículas ao interior da arena ou à moldura.
- Na tela de resultado (`v-resultado.png`), o último respingo fica congelado sob o cartão. Aceitável, mas um esmaecer ficaria mais caprichado (parte 3).

## Fiquei impressionado? **Sim** — por quê

O resultado vai além da lista da parte 1.

- **Motor.** É inteiro em inteiros, e o mesmo hash sai no Chromium e no Node depois de 3000 ticks com robôs.
- **Testes.** Há um teste de propriedade com 30 000 ticks contra sobreposição e uma prova de independência de fps (mesmo hash a 30, 60 e 120 fps).
- **Deslize de quina.** É generoso e funciona nos dois eixos, sem nunca enganchar ao entrar num corredor só com uma direção.
- **Cadeia.** É imediata e confirmada em partida real, além do teste unitário.
- **Arte.** Uma parte que pedia "renderização funcional, ainda simples" já entrega arte original e caprichada, nítida em 360 px: criaturinhas-olho, gotas com carinha, respingo de água, pilares-lente e moldura de armação.
- **Placar e avisos.** Já existe um placar com retratos e um aviso de resultado no tom certo para crianças ("Na próxima é você. Vamos de novo?").
- **Relatório.** É honesto até nos pontos fracos.

Os defeitos que encontrei são de ajuste fino (M1, M2), não de regra.

NOTA: 94
IMPRESSIONADO: sim
BLOQUEADORES: 0
VEREDITO: APROVADO
