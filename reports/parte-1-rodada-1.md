# Parte 1 — Motor e regras centrais · Rodada 1 (relatório do executor)

## Resumo

A simulação do Bomberolho funciona inteira e é determinística. Fica em `bomberolho/js/sim/`, em JavaScript puro, com passo fixo de 60 Hz, só inteiros e gerador aleatório com semente. Tudo o que a Parte 1 pede está nela: grade 15×13, movimento contínuo com deslize de quina, gotas, respingo em cruz, cadeia, blocos, itens básicos e eliminação. Por cima dela há:

- desenho em Canvas 2D já original (criaturinhas-olho, gota de colírio com carinha, respingo de água, blocos de pólen, pilares-lente, moldura em forma de armação de óculos);
- teclado;
- placar (HUD) com retratos;
- avisos de pausa e de resultado;
- gancho `window.__bomberolho` completo e parâmetros de URL;
- robôs simples, mas que já leem o perigo (fogem, abrem blocos, pegam itens).

Testes:
- **81 testes** `node --test` da simulação, em cerca de 6,5 s;
- **13 testes de navegador** (Playwright + Chromium, rodados de verdade), em cerca de 16 s.

Medições: zero erro, zero aviso, zero 404. O jogo pesa **106 kB** sem compressão e roda a **60 fps** no desktop.

## Como rodar e testar

```bash
node dev-server.mjs --port 7200          # → http://localhost:7200/bomberolho/
cd qa && npm i                           # só o Playwright (devDependency)
npm test                                 # simulação: node --test "sim/*.test.mjs"
npm run e2e                              # navegador: sobe o servidor sozinho numa porta livre
npm run capturas                         # capturas em qa/capturas/ (4 telas × 3 momentos)
node navegador/desempenho.mjs            # fps em desktop e em "celular de entrada"
```

Os testes de navegador usam o Chromium de `/opt/pw-browsers`; o pacote `playwright@1.56.1` usa a mesma revisão (1194). Se o executável do pacote não existir, `qa/navegador/apoio.mjs` cai no caminho local.

**Controles:**
- setas ou WASD andam;
- Espaço solta a gota (X e J também);
- P ou Esc pausa;
- Enter continua a partida ou joga de novo no resultado.

**Parâmetros de URL:**
- `?semente=` (número ou texto);
- `?dificuldade=facil|medio|dificil`;
- `?arena=jardim`;
- `?demo=1`;
- `?personagem=` (um dos 8 ids, ex. `retina`);
- `?escala=` (velocidade do tempo, de 0 a 8).

Valores inválidos voltam ao padrão sem mostrar erro.

## Estrutura (preparada para as partes 2–4)

```
bomberolho/
  index.html · favicon.svg · css/estilo.css
  js/main.js            liga tudo (DOM, laço rAF, redimensionamento)
  js/jogo.js            controlador sem DOM: mundo + robôs + relógio (roda no Node)
  js/gancho.js          window.__bomberolho
  js/parametros.js      leitura pura da query string
  js/nucleo/relogio.js  acumulador de passo fixo (independência de fps)
  js/sim/               SIMULAÇÃO PURA
    constantes.js aleatorio.js arenas.js grade.js jogadores.js
    movimento.js gotas.js respingo.js itens.js mundo.js retrato.js
  js/ia/perigo.js       mapa de perigo com tempo (cadeia incluída)
  js/ia/robo.js         robôs da parte 1 (3 perfis de reação)
  js/render/            temas.js pecas.js personagens.js efeitos.js renderizador.js
  js/input/teclado.js
  js/ui/hud.js · js/ui/avisos.js
  js/dados/personagens.js  os 8 personagens (cor, íris, acessório de FORMA)
qa/
  package.json (único devDependency: playwright)
  sim/*.test.mjs        81 testes da simulação + regras de arquitetura/originalidade
  navegador/            apoio.mjs, jogo.test.mjs, capturas.mjs, desempenho.mjs
```

Decisões que já preparam as próximas partes:

- **Arenas.** Uma arena nova (parte 2) entra como uma linha em `sim/arenas.js` (densidade, taxa e pesos de itens) e outra em `render/temas.js` (paleta).
- **Itens.** Ficam numa tabela (`sim/itens.js`). Chute, Super Lupa e Cisco entram ali.
- **Eventos.** A simulação emite eventos por tick (`gota`, `respingo`, `bloco`, `itemSurge`, `item`, `itemQueimado`, `encharcado`, `fim`). O desenho já os usa para partículas; o áudio (parte 3) vai usar a mesma fila.
- **Controlador.** `Jogo.entradaHumana` é uma função trocável: o toque (parte 4) entra sem mexer em `jogo.js`.
- **Robôs.** Leem só o estado público e usam as mesmas regras do humano. O mapa de perigo com tempo (`ia/perigo.js`) já é a base que a IA difícil vai precisar.
- **Retrato.** `retrato.js` dá uma cópia segura do estado (é o `state` do gancho) e um hash FNV-1a do estado completo, incluindo o gerador aleatório.

## Regras implementadas (com as escolhas de "sentir")

| Regra | Implementação | Teste |
|---|---|---|
| Grade | 15×13 com moldura; pilares em linha e coluna pares (30); blocos em **contagem exata** de 78% das 101 casas candidatas (79 blocos) | `grade.test` (200 sementes) |
| Cantos | "L" de 3 casas livre nos 4 cantos, sempre | `grade.test` |
| Itens escondidos | exatamente 32% dos blocos (25): 10 Frasquinho, 10 Lupa, 5 Lágrima Veloz; sorteados com a semente; espalhamento por quadrante conferido | `grade.test` |
| Movimento | contínuo, 55 unidades/tick (≈3,3 casas/s), sem inércia; alinha à faixa antes de avançar, então o corpo nunca sobrepõe algo sólido | `movimento.test` (inclui teste de propriedade com 30 000 ticks aleatórios) |
| Deslize de quina | empurrar contra um pilar estando deslocado para um corredor aberto faz escorregar até ele; funciona com até ~meia casa de desvio, nos dois eixos e para os dois lados; não escorrega para corredor fechado | `movimento.test` |
| Duas teclas (diagonal) | tenta primeiro a direção perpendicular ao movimento atual (vira na próxima esquina); nunca escorrega nem se alinha "para trás"; resultado: escadinha limpa, sem tremer | `movimento.test` |
| Gota | centrada na casa do centro do corpo; solta na **borda** do botão (segurar = 1 gota; um toque rápido entre dois ticks não se perde); limite por jogador; não empilha | `gotas.test` |
| Sair de cima | quem encosta na casa no instante da soltura (o dono e outros) pode sair; ao sair perde o passe e a gota vira sólida também para ele | `gotas.test` |
| Pavio | 165 ticks (2,75 s), contando o tick da soltura; pulsa cada vez mais rápido e pisca no último meio segundo | `gotas.test` |
| Respingo | cruz com o alcance da gota; atravessa casas vazias; para em pilar e moldura; destrói **só o primeiro bloco** de cada braço; bloco "quebrando" continua sólido e segura outros respingos | `respingo.test` |
| Duração letal | 30 ticks (0,5 s) letais do começo ao fim; quem pisa na casa molhada em qualquer desses ticks é encharcado | `respingo.test` |
| Cadeia | imediata, no mesmo tick, em fila determinística; o braço termina na gota atingida; vale para gota de outro dono e com pavio maior; gota solta numa casa ainda molhada estoura | `respingo.test` |
| Itens no chão | aparecem quando o bloco termina de quebrar (o mesmo respingo não os queima); respingo posterior queima item exposto e o braço continua | `respingo.test` |
| Itens básicos | +1 gota (máx. 8), +1 alcance (máx. 8), +velocidade (máx. 4 níveis, 91 unidades/tick); pegos quando o centro do corpo entra na casa | `itens.test` |
| Eliminação | conta a casa do centro do corpo (com o pé na beira do respingo, escapa); quem é atingido fica "encharcado" e vai descansar; o crédito vai para o dono do respingo | `respingo.test`, `fim.test` |
| Fim de rodada | último de pé vence depois de 1,5 s de animação; empate se todos caem juntos ou se o sobrevivente cai nessa pausa | `fim.test` |

## Arquitetura e determinismo (provas)

- `determinismo.test`:
  - mesma semente e o mesmo roteiro de entradas dão **o mesmo hash em cada um dos 6 000 ticks**;
  - mudar a semente ou uma única entrada muda o resultado;
  - um mundo clonado no meio (por `structuredClone` e por `JSON`) segue idêntico ao original;
  - uma partida inteira com robôs, pelo controlador, é reprodutível.
- `relogio.test`: 10 s de jogo dão 600 ticks a 30, 60, 75, 120 e 144 fps e com quadros irregulares. **A mesma partida rodada a 30, 60 e 120 fps chega ao mesmo hash.** Escala 2× dobra os ticks e 0 congela. Uma aba que volta do segundo plano não despeja uma avalanche de ticks (dt limitado a 250 ms).
- `pureza.test` (lê o código-fonte):
  - `sim/`, `ia/`, `nucleo/` e `jogo.js` não usam `window`, `document`, `Date`, `performance`, timers nem `Math.random`;
  - `sim/` só importa de `sim/`;
  - o jogo não tem URL externa nem `fetch`/cookies, e todos os imports e `src`/`href` são relativos;
  - não há `console.log`;
  - o nome proibido pela seção 2 não aparece em `bomberolho/`, `qa/`, `reports/` nem no README.
- Navegador × Node: o teste e2e roda o mesmo roteiro pelo gancho no Chromium e no Node e compara os hashes. São iguais.

## Gancho `window.__bomberolho`

| Membro | O que faz |
|---|---|
| `state` | cópia com `tela` (`jogando`/`pausado`/`resultado`), `rodada`, `tick`, `tempo`, `semente`, `arena`, `dificuldade`, `grade` (texto com legenda), `jogadores` (x/y em casas, col/lin, vivo, dir, poderes, gotasAtivas, eliminadoPor), `gotas` (pavio, passantes), `respingos` (braços, casas, restante, cadeia), `itens`, `fps`, `timeScale`, `demo` |
| `start({personagem, arena, dificuldade, semente, rodadas})` | nova partida; sem `semente`, sorteia uma |
| `setTimeScale(n)` | de 0 a 16; 0 congela o tempo real (use `step`) |
| `input(jogador, {cima, baixo, esq, dir, bomba})` | fixa a entrada de qualquer competidor; `input(j, null)` devolve o controle |
| `step(n)` | roda n ticks na hora e redesenha |
| `demo(true/false)` | humano no piloto automático |
| `pause(estado)` e `hash()` | extras: pausar e impressão digital do estado |

## Testes de navegador e capturas

`npm run e2e` (13 testes, todos passando) verifica:

- carga limpa (sem erro, aviso, 404 nem falha de requisição) em 1280×720, 390×844, 844×390 e 360×640;
- arena inteira dentro da tela, sem rolagem, e botões do cabeçalho cabendo na tela;
- favicon responde 200;
- formato do gancho;
- jogada clássica de largada por `input`/`step`: gota na ponta do "L" e abrigo na outra ponta;
- teclado real: setas e WASD andam, um toque rápido no Espaço solta uma gota, todas as teclas do jogo bloqueiam o padrão do navegador e a página não rola;
- pausa por P, Enter e botões;
- parâmetros de URL, incluindo a arena igual à do Node;
- hash igual entre navegador e Node;
- tela de resultado e "jogar de novo";
- fps de pelo menos 50.

Tirei capturas das 4 telas em 3 momentos (largada, meio de partida e resultado), olhei todas e corrigi o que estava ruim:

- o botão "Recomeçar" era cortado em 360 px;
- o subtítulo quebrava em 390 px;
- a arena ficava centralizada demais no retrato (agora fica no alto, deixando embaixo o espaço para os controles de toque da parte 4);
- as partículas não envelheciam quando o tempo avançava só por `step` (agora envelhecem).

## Medições

- **Peso:** `bomberolho/` tem 106 kB sem compressão: 27 arquivos, cerca de 2 700 linhas de JS, mais CSS, HTML e SVG. Não há imagens nem fontes baixadas. O orçamento é de 600 kB.
- **fps** (`node navegador/desempenho.mjs`, Chromium headless com renderização por software, 5 s de partida em demo):
  - desktop 1280×720: **60 fps** médios, quadro p95 de 16,7 ms;
  - "celular de entrada" (390×844, DPR 3, CPU emulada 4× mais lenta): **42 fps** médios, quadro p95 de 33 ms.

  Para chegar aí, cenário (fundo + blocos parados) e itens são pré-desenhados e só refeitos quando um bloco muda, e a densidade fica limitada a 2. Antes dessas otimizações o celular emulado dava 20 fps.
- **Suítes:**
  - `npm test`: 81/81 testes em cerca de 6,5 s;
  - `npm run e2e`: 13/13 testes em cerca de 16 s.
- **Robôs em lote** (60 partidas por nível, sem cabeça, limite de 3 min, medido durante o desenvolvimento):

  | Nível | Rodadas encerradas em 3 min | Quedas | Quedas pela própria gota |
  |---|---|---|---|
  | Fácil | 4 de 60 | 97 | 39 |
  | Médio | 8 de 60 | 107 | 57 |
  | Difícil | 11 de 60 | 116 | 61 |

  Nos casos que investiguei, boa parte dessas quedas "pela própria gota" é de robôs encurralados porque outro competidor fechou a rota de fuga: o crédito vai para o respingo mais recente.

## Limitações conhecidas (honestas)

- **Robôs são da parte 1.**
  - Os três níveis diferem só no tempo de reação e na vontade de soltar gota e perseguir.
  - Ainda morrem com frequência pela própria gota (ver tabela) e às vezes ficam parados quando não acham alvo seguro.
  - No fácil eles atacam já nos primeiros segundos, o que o plano não quer.
  - A IA de verdade, com taxa de auto-eliminação medida e baixa, é da parte 2.
- **Rodada sem cronômetro nem aperto final** (são da parte 2). Entre robôs uma rodada pode se arrastar por minutos. Não há contagem "3, 2, 1, já!", partida em N rodadas nem troféus: `rodada` é sempre 1 e `rodadas` é aceito em `start`, mas ainda não é usado.
- **Itens avançados** (chute, Super Lupa, Cisco) ainda não existem.
- **Uma arena só** (Jardim da Íris).
- **Sem controle de toque.** No celular o jogo carrega e desenha certinho em retrato e paisagem, mas só se joga com teclado físico. O toque é da parte 4. Já existem `touch-action: none`, sem seleção de texto, sem menu de contexto, sem "puxar para atualizar" e pausa automática quando a aba fica escondida.
- **Personagens:** os 8 estão desenhados e escolhíveis por `?personagem=`, mas sem animação além de piscar, andar e encharcar. Não há tela de seleção, menus nem som (parte 3).
- **fps em celular:** o número de 42 fps é de emulação (CPU 4× mais lenta com rasterização por software). Não medi em aparelho físico.
- **Crédito da eliminação:** quando duas cruzes cobrem a mesma casa, `eliminadoPor` vai para o respingo mais recente. É só informativo; não afeta regras.
- **A arte é "funcional, já original"**, como pede a parte. Efeitos e acabamento visual completos ficam para a parte 3.

## Originalidade

Toda a arte é desenhada por código (Canvas e um SVG próprio para o favicon). Nomes, sons (não há som ainda) e o layout da arena (sorteado por semente) são do projeto. Nenhum arquivo foi baixado da internet além do pacote `playwright` em `qa/`. O teste `pureza.test` vigia o nome proibido e endereços externos.
