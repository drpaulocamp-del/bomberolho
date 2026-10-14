# Parte 2 — Batalha completa · Rodada 2 (relatório do executor)

Este relatório responde ponto a ponto ao parecer `reviews/parte-2-rodada-1.md` (nota 70, 1 bloqueador). Para cada item: o que estava errado (com a causa no código), o que mudou e a medição **antes → depois**, feita com os scripts do verificador (`qa/verificacao/p2r1/`) e com scripts novos em `qa/verificacao/p2r2/`. As tabelas completas do lote estão no fim e em `qa/lote/resultado.md` (reproduzíveis: sementes fixas).

Para medir o "antes" com os mesmos scripts novos, usei uma cópia do commit anterior (`git worktree` de `HEAD`, fora do repositório, já removida).

## Resumo

| Item do parecer | Situação | Medição antes → depois |
|---|---|---|
| **B1** túnel da Caverna era esconderijo imune | **Resolvido** | Robô/humano com o centro do corpo na moldura: 29% do tempo vivo (Difícil) → **0** (por construção e medido em 22 900 amostras no navegador). Rodadas empatadas na Caverna: 58% → **39,0%** (outras arenas: 34,7–37,8%). Humano parado no canto, Fácil, Caverna: molhado antes de 10 s em **34 de 40** sementes → **0 de 40**. |
| **M1** Difícil mais fraco que o Médio | **Resolvido** | Misto (taças): Difícil 36% / Médio 60% → **Difícil 66,0% ± 4,2 / Médio 32,5% ± 4,2** (rodadas: 41,6% / 25,9%). |
| **M2** canto do humano desfavorecido | **Resolvido** (três causas achadas e corrigidas) | Taças por canto: canto 0 18,3% e canto 3 28,7% → rodadas por canto **25,2 / 25,6 / 25,3 / 23,9%** (± 1,5; todos dentro do esperado). |
| **M3** chute quase não usado pela IA | **Resolvido** | Chutes do Difícil por rodada: 0,054 → **1,23** (≈ 23×). |
| **M4** muitos empates entre robôs bons | **Melhorado** | Rodadas no relógio: Médio×Médio 31,8% → **21,9%**, Difícil×Difícil 37,4% → **23,7%** (mas empates por "todos caíram" subiram um pouco; ver M4). |
| **M5** salto Fácil → Médio grande demais | **Melhorado** | Proxy "novato" contra o Médio: taça 5,3% → **22,0% ± 4,7** (contra o Fácil continua 92%). |
| **M6** Cisco copiava em vez de passar | **Resolvido** | Agora **passa** (quem tinha fica livre, 1 s sem pegar de volta); nunca mais de um com o mesmo azar. |
| **M7** bancada cobria metade da arena em 360×640 | **Resolvido** | Botão **Recolher**: cobre 50% → **23,8%** da arena em 360×640; 44% → 18,6% em 844×390. |
| **M8** "Copiar ajuste" copiava os 12 valores | **Resolvido** | Copia só o que mudou (`{"bomberolhoAjuste":{"pavio":168}}`). |
| **M9** "Na próxima é você" no modo demo | **Resolvido** | Texto neutro no demo ("Que partida! Vamos de novo?"). |

Além do parecer, achei e corrigi três defeitos da IA que distorciam o balanceamento (detalhes em M1 e M3): a nota de "rival encurralado" contava rivais que não corriam perigo nenhum; o chute era avaliado com a gota ainda no lugar antigo (e podia mandar a gota para dentro de um respingo, estourando colada em quem chutou); e, fugindo, Médio e Difícil tratavam o item Cisco como parede e às vezes se deixavam molhar para não pegá-lo.

## B1 — Túnel da Caverna (bloqueador)

**Causa** (confirmada com `qa/verificacao/p2r1/tunel.mjs`): a boca do túnel era uma casa da moldura onde dava para parar; nela o respingo não chegava (`respingo.js` para em tudo que não é `VAZIO`), o aperto não caía (só percorre o interior) e a IA a tratava como casa normal e sempre seca.

**Correção** (escolhi a sugestão (a) do parecer e a de afastar as bocas):

1. **A boca é um portal sem largura.** `movimento.js` (`atravessarTunel`, `livrePara`): assim que o centro do corpo entra na casa da moldura, o jogador reaparece **dentro da arena**, na coluna 13 (ou 1), no mesmo sentido. As colunas 1 e 13 ficam "vizinhas" pelo túnel; o centro do corpo nunca fica na moldura. A passagem só abre se a casa do outro lado estiver livre (sem bloco, peça do aperto ou gota) — com o outro lado murado pelo aperto, o túnel simplesmente fecha.
2. **Bocas nas linhas 5 e 7**, em vez de 3 e 9 (`arenas.js`): a 4 casas do "L" de largada, não a 2.
3. **IA** (`ia/caminhos.js`, `vizinhos`): da casa (1,5), à esquerda vem (13,5) direto; a moldura deixou de ser casa transitável para a busca.
4. **Segurança da largada** (efeito colateral apontado no parecer, `cedo.mjs`): antes da "calma" de cada nível (Fácil 20 s, Médio 12 s, Difícil 3 s), nenhum robô solta gota cuja cruz pegue um rival — nem "para abrir bloco" (`ia/robo.js`, `podeSoltar`). Era isso que molhava o humano parado aos 6 s.

**Medições:**

| Medição | Antes | Depois |
|---|---|---|
| `p2r1/tunel.mjs` (roteiro do verificador, linha 3): fica na moldura? sobrevive ao respingo e ao aperto? | x = 0,675 (moldura); vivo; vivo e vence | não existe mais túnel na linha 3; o mesmo roteiro na linha 5 é o teste `arenas.test` "túnel não é esconderijo": nunca sai da arena; **molhado** |
| `p2r2/tunel-ia.mjs`, 12 rodadas na Caverna, Difícil: empates no relógio / empates com alguém na moldura / fração do tempo vivo na moldura | 10 / 10 / 29% (números do parecer) | **2 / 0 / 0,0%** (9 rodadas com vencedor) |
| Idem, Médio | 9 / 7 / 20% | **2 / 0 / 0,0%** |
| Idem, Fácil | 2 / 1 / 11% | **2 / 0 / 0,0%** |
| `p2r2/navegador.mjs`: Caverna, Difícil, partida inteira em demo nas 4 telas — amostras de jogador vivo com o centro na moldura | — | **0 de 22 935** (em cada tela) |
| Lote: rodadas empatadas na Caverna (todos do mesmo nível) | 58,1% (64,8% no lote do verificador) | **39,0%** (outras arenas: 34,7–37,8%) |
| `p2r2/cedo.mjs`: humano **parado** no canto, Fácil, 40 sementes por arena — molhado antes de 10 s / antes de 20 s | Caverna **34 / 39**; Vale 0/1; Consultório 0/2; Jardim 0/1; Lago 0/0 | **0 / 0 em todas as arenas** (primeira molhada: 22,8 s a 24,6 s, já depois da calma de 20 s) |

**Testes novos** (`qa/sim/arenas.test.mjs`): o túnel leva de um lado ao outro em meia casa e o centro do corpo **nunca** fica na moldura (tick a tick); com o outro lado murado, ou com gota do outro lado, não passa; quem fica junto da boca é molhado pelo respingo da mesma linha; **o aperto completo não deixa casa livre fora do miolo em nenhuma das 5 arenas** (e as bocas não levam a lugar nenhum fora dele). `ia.test`: a vizinhança dos robôs liga (1,5)↔(13,5) e não existe mais túnel na linha 3.

## M1 — Escada de dificuldade (Difícil > Médio > Fácil)

**Causas achadas** (com um experimento que partia dos parâmetros do Médio e acrescentava um traço do Difícil por vez, 80 partidas mistas cada):

- O traço que derrubava o Difícil era a **armadilha**, e por um defeito: `notaDoAtaque` dava nota 2 ("fuga apertada") a rivais **fora da cruz que não corriam perigo nenhum**, porque a fuga de quem está seguro "termina" na primeira camada com uma ou duas casas. O Difícil gastava gotas à toa e se expunha.
- A própria medida de "fuga apertada" (`seguras.length <= 2`) era enganosa também para quem está na cruz: a primeira camada segura quase sempre tem 1–2 casas, mesmo com a arena aberta. Troquei por um critério de tempo (`apertoDaFuga` em `ia/caminhos.js`): **3** = sem fuga; **2** = só foge com folga zero (não foge com 14 ticks de folga); **1** = na cruz, mas foge com folga.
- O Difícil com folga 8 na fuga e na gota soltava menos, abria menos blocos e pegava menos itens.

**Mudanças nos níveis** (`ia/robo.js`, `NIVEIS`):

| | Médio (antes → depois) | Difícil (antes → depois) |
|---|---|---|
| Folga | 2 → 2 | 8 → **4**, com **cautela no aperto** (não aceita fuga justa enquanto o aperto cai e há mais de dois de pé; no duelo ou com a arena fechada, arrisca) |
| Reação a gota alheia | 14 → 18 ticks | 0 |
| Planeja a fuga | 9 → 8 passos | 16 |
| Calma (começa a atacar) | 6 s → 12 s | 3 s |
| Ataca / persegue / persegue no fim | 0,7 / 0,3 / 0,75 → **0,3 / 0,08 / 0,35** | 0,95 / 0,6 / 0,95 |
| 2ª gota na fuga / emboscada | 0,25 / a cada 0,75 s → **0 / não** | 0,6 / a cada 0,25 s |
| Táticas avançadas (chute, Pinça) | 0,6 → 0,35 | 1 |

**Resultado (lote completo, cenário misto com 480 partidas — o dobro da rodada 1, para ter folga estatística):**

| Campeão | Rodada 1 | Rodada 2 |
|---|---|---|
| Difícil | 36,3% das taças | **66,0% ± 4,2** (rodadas: 41,6% ± 2,4) |
| Médio | 60,0% | **32,5% ± 4,2** (rodadas: 25,9% ± 2,1) |
| cada Fácil | 0,8% | 0,2% (rodadas: 1,5%) |

E o proxy "bom" (que joga com a leitura do Difícil) agora acha o Difícil mais duro que o Médio: taça **25,3% ± 4,9** contra três Difíceis e **35,3% ± 7,6** contra três Médios (rodada 1: 21% e 19%, ao contrário).

## M2 — Justiça dos cantos

Três causas, todas corrigidas e cobertas por teste:

1. **Itens por quadrante** (a maior): a coluna e a linha do meio contavam para os quadrantes da esquerda e de cima (`quadrante` usava `<=`). Cada quadrante recebe a mesma cota de itens, então os da esquerda/cima a espalhavam por mais casas — parte dela no meio, terra de ninguém — e os cantos da direita (1 e 3) achavam mais itens perto de casa. Isso explicava o desenho "canto 3 e canto 1 acima, cantos 0 e 2 abaixo". Agora a cruz do meio é um quinto "monte", de ninguém, no rodízio (`grade.js`): cada canto recebe **exatamente** a mesma cota (±1), inclusive de Frasquinho/Lupa.
2. **Espiral do aperto**: começava sempre no canto (1,1), o do humano. Agora o canto inicial é derivado da semente da rodada (`cantoInicialDoAperto`, distribuição 25/25/25/25 testada), sempre a mesma espiral girada e o mesmo "H" no fim.
3. **Ordem de processamento**: o jogador 0 sempre andava, soltava gota e pegava o item disputado primeiro. Agora a ordem gira a cada tick (`mundo.js`, `emRodizio`). Também os desempates da busca da IA preferiam sempre as mesmas direções; a ordem das direções agora muda por rodada (fixa dentro dela — mudar a cada tick fazia o robô hesitar, medi e descartei).

**Resultado** (rodadas com vencedor, todos do mesmo nível; IC 95%):

| | Canto 0 | Canto 1 | Canto 2 | Canto 3 |
|---|---|---|---|---|
| Rodada 1 (taças, 1200 partidas) | 18,3% | ~24% | ~23% | 28,7% |
| Rodada 2 só com (2) e (3) (taças, 1200 partidas) | 20,5% | 25,7% | 20,1% | 29,2% — **ainda torto**: foi isso que levou à causa (1) |
| **Rodada 2 final** (rodadas com vencedor, 3172) | **25,2% ± 1,5** | **25,6% ± 1,5** | **25,3% ± 1,5** | **23,9% ± 1,5** |

## M3 — Chute pela IA

- **"Solta e chuta"**: o chute de ataque só era tentado quando o robô estava em casa **segura** — e colado numa gota ele nunca está. Agora, antes de fugir, Médio e Difícil conferem se chutar a gota colada (a própria, recém-solta, ou a de um rival) põe alguém na cruz de onde ela vai parar (`robo.js` → `taticas.taticaChute`).
- **Ir até o ponto de chute**: `pontoDeChute` acha a casa colada a uma gota, do lado oposto ao rival, e o robô vai até lá por casas cujo perigo só começa depois que ele passa.
- **Segurança do chute** (os primeiros testes mostraram auto-eliminação dobrando): a conferência agora é feita **com a gota já parada no destino** (antes olhava a gota no lugar antigo) e o deslize precisa estar seco enquanto a gota passa — gota chutada para dentro de um respingo estoura ali, colada em quem chutou.

| Chutes por competidor por rodada | Rodada 1 | Rodada 2 |
|---|---|---|
| Difícil | 0,054 | **1,232** |
| Médio | 0,087 | **0,555** |
| Fácil | 0,020 | 0,027 (tímido, como pede 3.3) |

Testes novos (`ia.test`): o Difícil chuta a própria gota contra o rival no fim do corredor e fica a salvo (o rival é molhado); não chuta para dentro de um respingo.

## M4 — Empates entre robôs bons

A maior parte era o B1. Além dele, a nota de ataque corrigida e a cautela do Difícil só na fase em que o aperto ainda cai (no duelo e com a arena fechada ele arrisca) reduziram os empates. Testei também terminar o aperto mais perto do fim (8 s em vez de 20 s): os empates do Difícil **subiram** (31% → 40% das rodadas no relógio, 80 partidas), então mantive o "H" e os 20 s.

| Rodadas que vão ao relógio | Rodada 1 | Rodada 2 |
|---|---|---|
| Médio × Médio — no relógio | 31,8% | **21,9%** |
| Médio × Médio — todos caíram juntos | 16,4% | 20,1% |
| Médio × Médio — rodadas empatadas no total | 48,2% | **42,1%** |
| Difícil × Difícil — no relógio | 37,4% | **23,7%** |
| Difícil × Difícil — todos caíram juntos | 18,6% | 21,0% |
| Difícil × Difícil — rodadas empatadas no total | 56,0% | **44,7%** |
| Partidas empatadas até no desempate (Médio / Difícil) | 8,5% / 7,8% | 7,8% / 6,8% |

Leitura honesta: menos rodadas vão ao relógio, mas parte delas virou "todos caíram juntos" (o fim no "H" ficou mais disputado). Entre robôs bons, ~42–45% das rodadas ainda empatam; no Fácil contra o proxy de criança, nenhuma das 300 partidas terminou empatada.

## M5 — Fácil → Médio

O Médio ficou bem menos agressivo (tabela de M1). Proxy "novato" (amostra dobrada para 300 partidas):

| | Rodada 1 | Rodada 2 |
|---|---|---|
| novato × três Fáceis — taça | 91,0% | **92,0% ± 3,1** |
| novato × três Médios — taça | 5,3% | **22,0% ± 4,7** (rodadas: 6,0% → 13,0%) |

O Médio continua sendo "para quem já joga": a etapa 3 pode dizer isso no menu de dificuldade.

## M6 — Cisco passa, não copia

`mundo.js` (`espalharCisco`): encostar em quem não tem Cisco **entrega** o azar com o tempo que falta; quem tinha fica livre e por 1 s não o pega de volta (sem pingue-pongue a cada tick). Testes: passa, não volta na hora, volta depois de 1 s; quatro jogadores encostados nunca têm mais de um com o azar. Na IA, fugindo, o Cisco deixou de ser obstáculo (um azar passageiro é melhor que se molhar — achei robôs Difíceis molhados num beco porque a saída tinha um Cisco no chão).

## M7, M8, M9 — Bancada e texto do demo

- **Recolher** (M7): botão no cabeçalho da bancada; recolhida mostra só o cabeçalho e o controle mexido por último ("Mostrar tudo" volta). Medido em `p2r2/navegador.mjs` (fração da arena coberta): 360×640 **50% → 23,8%**; 844×390 44% → 18,6%; 390×844 9% → 0%. Alvos continuam ≥ 44 px. Capturas `qa/capturas/r2-bancada-recolhida-*.png`.
- **Copiar só o que mudou** (M8): `{"bomberolhoAjuste":{"pavio":168}}`; sem mudanças, `{}` e o aviso "tudo ainda está no padrão". `criarAjuste` completa o resto com o padrão (teste).
- **Demo** (M9): campeão no piloto automático → "Que partida! Vamos de novo?" (`ui/avisos.js`). Conferido nas 4 telas (`r2-resultado-demo-*.png`).

## Ferramentas do lote

- `qa/lote/simular.mjs` ganhou `--so REGEX` (só alguns cenários), e **pedaços**: `--fatia k/n --parcial arquivo.json` grava cada pedaço; `--juntar a.json,b.json,…` monta as tabelas. Foi assim que rodei o lote completo (4 pedaços de ~15 min), à prova de reinício do contêiner.
- Tabelas novas: vitórias **por rodada** por canto (amostra 3× maior que por partida), **intervalos de 95%** nas proporções que importam, misto por rodada, e a coluna "encurralado por rival" na auto-eliminação (evento `encharcado` agora diz se a saída estava fechada por gota ou respingo de rival).
- Cenários: misto 240 → **480** partidas e novato×Médio 150 → **300**, para que as conclusões de M1 e M5 tenham folga estatística.

## Simulação em lote (rodada 2)

Comando: `cd qa && npm run lote` (ou em pedaços, como acima). Escala 1: 2 730 partidas e 10 791 rodadas, 4 trabalhadores, 3 675 s de processamento. Cópia integral em `qa/lote/resultado.md`.

#### 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) | Taça no desempate | Partida empatada |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 400 | 1555 | 78.4% | 15.7% | 5.9% | 82 s | 120 s | 120 s | 3.89 (5) | 16.0% | 3.5% |
| mesmo:medio | 400 | 1713 | 57.9% | 21.9% | 20.1% | 113 s | 120 s | 120 s | 4.28 (5) | 26.8% | 7.8% |
| mesmo:dificil | 400 | 1740 | 55.2% | 23.7% | 21.0% | 113 s | 120 s | 120 s | 4.35 (5) | 33.3% | 6.8% |
| novato×facil | 300 | 892 | 80.5% | 12.7% | 6.8% | 85 s | 120 s | 120 s | 2.97 (5) | 3.0% | 0.0% |
| novato×medio | 300 | 1271 | 61.1% | 19.2% | 19.7% | 111 s | 120 s | 120 s | 4.24 (5) | 28.0% | 7.3% |
| bom×dificil | 300 | 1327 | 54.5% | 24.7% | 20.8% | 112 s | 120 s | 120 s | 4.42 (5) | 37.3% | 3.3% |
| bom×medio | 150 | 643 | 59.7% | 19.1% | 21.2% | 112 s | 120 s | 120 s | 4.29 (5) | 28.0% | 4.0% |
| misto | 480 | 1650 | 70.4% | 15.6% | 13.9% | 103 s | 120 s | 120 s | 3.44 (5) | 9.8% | 1.0% |

#### 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 400 | 24.0% ± 4.2 | 24.0% ± 4.2 | 24.8% ± 4.2 | 23.8% ± 4.2 | 3.5% |
| medio | 400 | 24.3% ± 4.2 | 27.0% ± 4.4 | 20.3% ± 3.9 | 20.8% ± 4.0 | 7.8% |
| dificil | 400 | 25.8% ± 4.3 | 23.3% ± 4.1 | 22.3% ± 4.1 | 22.0% ± 4.1 | 6.8% |

Por rodada (amostra maior): fração das rodadas **com vencedor** que cada canto venceu. Esperado 25% ± intervalo de 95%.

| Nível | Rodadas com vencedor | Canto 0 | Canto 1 | Canto 2 | Canto 3 |
|---|---|---|---|---|---|
| facil | 1219 | 23.9% ± 2.4 | 25.9% ± 2.5 | 26.3% ± 2.5 | 23.9% ± 2.4 |
| medio | 992 | 25.9% ± 2.7 | 26.5% ± 2.7 | 23.9% ± 2.7 | 23.7% ± 2.6 |
| dificil | 961 | 26.0% ± 2.8 | 24.2% ± 2.7 | 25.5% ± 2.8 | 24.2% ± 2.7 |
| todos | 3172 | 25.2% ± 1.5 | 25.6% ± 1.5 | 25.3% ± 1.5 | 23.9% ± 1.5 |

#### 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 1013 | 62.2% | 37.8% | 104 s | 7.7% | 22.4 |
| lago | 984 | 65.2% | 34.8% | 102 s | 8.0% | 18.0 |
| caverna | 997 | 61.0% | 39.0% | 104 s | 7.1% | 20.8 |
| vale | 1016 | 63.0% | 37.0% | 104 s | 6.9% | 21.6 |
| consultorio | 998 | 65.3% | 34.7% | 102 s | 6.8% | 20.9 |

#### 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). "Encurralado" = caiu com a própria gota, mas a saída estava fechada por um rival (casa vizinha com gota dele ou molhada por respingo dele). As duas últimas colunas são taxas por competidor por rodada jogada: a primeira tira só as apostas; a segunda tira também os encurralados (erro "puro", sem rival envolvido).

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …aposta final | …encurralado por rival | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) | Erro puro por rodada (sem apostas nem encurralados) |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 12196 | 10127 | 3.2% | 0.1% | 0.8% | 4.4% | 91.6% | 0.8% | 2.5% | 1.8% |
| medio | 14244 | 10433 | 11.0% | 2.5% | 3.7% | 16.8% | 60.2% | 12.0% | 6.2% | 3.5% |
| dificil | 12591 | 8835 | 11.0% | 3.0% | 3.1% | 19.7% | 60.4% | 8.9% | 5.6% | 3.4% |
| novato | 2163 | 1218 | 23.8% | 2.0% | 4.8% | 11.1% | 54.4% | 10.7% | 12.3% | 9.6% |
| bom | 1970 | 1429 | 11.1% | 2.3% | 3.2% | 19.9% | 59.3% | 9.6% | 6.4% | 4.1% |

#### 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 300 | 92.0% ± 3.1 | 63.0% ± 3.2 | 8.4% | 8.0% | 0.0% |
| novato×medio | 300 | 22.0% ± 4.7 | 13.0% ± 1.8 | 16.9% | 70.7% | 7.3% |
| bom×dificil | 300 | 25.3% ± 4.9 | 14.3% ± 1.9 | 7.2% | 71.3% | 3.3% |
| bom×medio | 150 | 35.3% ± 7.6 | 18.5% ± 3.0 | 10.0% | 60.7% | 4.0% |

#### 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % das partidas (IC 95%) | Rodadas vencidas | % das rodadas (IC 95%) | Esperado se fossem iguais |
|---|---|---|---|---|---|
| Difícil | 317 | 66.0% ± 4.2 | 686 | 41.6% ± 2.4 | 25% |
| Médio | 156 | 32.5% ± 4.2 | 427 | 25.9% ± 2.1 | 25% |
| Fácil (cada um) | 1 | 0.2% ± 0.4 | 25 | 1.5% ± 0.6 | 25% |
| Sem campeão / empate | 5 | 1.0% | 488 | 29.6% | — |

#### 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.30 | 1.23 | 0.76 | 0.43 | 0.27 | 0.48 | 0.31 | 0.26 | 0.43 |
| medio | 1.34 | 1.27 | 0.79 | 0.44 | 0.27 | 0.13 | 0.32 | 0.27 | 0.44 |
| dificil | 1.24 | 1.18 | 0.72 | 0.41 | 0.26 | 0.15 | 0.29 | 0.24 | 0.41 |
| novato | 1.29 | 1.23 | 0.76 | 0.43 | 0.27 | 0.62 | 0.32 | 0.26 | 0.43 |
| bom | 1.23 | 1.19 | 0.73 | 0.39 | 0.24 | 0.15 | 0.30 | 0.24 | 0.39 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.027 | 0.102 | 2.389 | 0.427 | 0.192 | 0.020 | 0.003 | 0.347 | 0.479 | 0.751 |
| medio | 0.555 | 0.570 | 5.378 | 0.439 | 0.688 | 0.164 | 0.050 | 0.320 | 0.314 | 0.289 |
| dificil | 1.232 | 0.535 | 6.570 | 0.406 | 0.576 | 0.205 | 0.043 | 0.296 | 0.271 | 0.259 |
| novato | 0.080 | 0.387 | 5.438 | 0.430 | 0.429 | 0.126 | 0.007 | 0.224 | 0.497 | 0.932 |
| bom | 1.249 | 0.513 | 6.575 | 0.392 | 0.647 | 0.189 | 0.041 | 0.291 | 0.237 | 0.215 |

#### 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 2730 de 2730 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.5 s / 15.8 s |

## Leitura das tabelas (sem otimismo)

- **Túnel (B1):** a Caverna deixou de ser a arena dos empates: 39,0% das rodadas empatadas, na faixa das outras (34,7–37,8%), contra 58% na rodada 1. Ainda é a mais alta das cinco por 1,2 ponto — dentro do que a amostra (~1 000 rodadas por arena, ±3 pontos) permite dizer, não há diferença.
- **Escada (M1):** no misto, o Difícil leva 66,0% ± 4,2 das taças e o Médio 32,5% ± 4,2 — intervalos que não se tocam; por rodada, 41,6% ± 2,4 contra 25,9% ± 2,1. O Fácil quase nunca ganha deles (0,2%), como deve. O proxy "bom" acha o Difícil mais duro (25% de taças, a "parte justa" contra 3 iguais) que o Médio (35%).
- **Cantos (M2):** por rodada (3 172 com vencedor), 25,2 / 25,6 / 25,3 / 23,9%, todos a menos de 1,5 ponto de 25% (o IC é ±1,5). Por partida e por nível ainda há oscilações de até 4,7 pontos (ex.: Médio canto 2 = 20,3% ± 3,9) — compatíveis com ruído de 400 partidas e sem padrão que se repita entre níveis, ao contrário da rodada 1, em que o canto 3 era o maior nos três.
- **Iniciante (M5):** o novato vence o Fácil em 92% das partidas e o Médio em 22% (5% na rodada 1). O Médio continua sendo o "segundo degrau" (rodadas: 13%), não um Difícil disfarçado.
- **Chute (M3):** o Difícil chuta 1,23 vez por rodada (0,05 antes), o Médio 0,56, o Fácil quase nunca. A Pinça e os bichinhos continuam usados no mesmo nível de antes.
- **Auto-eliminação:** sem as apostas finais, Fácil 2,5%, Médio 6,2%, Difícil 5,6% por competidor por rodada (rodada 1: 2,4 / 6,1 / 5,3, com a mesma conta). **Não caiu** — as rodadas agora se decidem mais (menos relógio, mais duelo no aperto), e é ali que acontecem quase todas: numa amostra de 50 rodadas Difícil×4, 17 de 18 quedas "próprias" foram durante o aperto, a maioria com a saída fechada por um rival. Separando os casos em que a saída estava fechada por um rival, o erro "puro" é 3,5% no Médio e 3,4% no Difícil. O Difícil não ficou claramente mais cuidadoso que o Médio nessa conta (ver limitações).
- **Robustez:** 2 730 partidas, 10 791 rodadas, 0 NaN, 0 rodada além do limite, 0 partida sem fim. Robô parado: mediana 2,8 s, p95 3,5 s; só 5 casos acima de 7 s em 10 920 robôs-partida, o maior de 15,8 s (ver limitações).

## Testes e navegador

- `npm test`: **164/164** em ~28 s (rodada 1: 154). Novos: túnel (4), aperto completo nas 5 arenas, espiral sorteada, Cisco passa (2), quadrantes exatos, chute da IA (2), calma da largada (os 3 níveis), nota de ataque.
- `npm run e2e`: **26/26** (o teste da bancada agora confere "só o que mudou" e o Recolher nas 3 telas).
- `p2r2/navegador.mjs`: 4 telas, zero erro/aviso/404, sem rolagem.
- Scripts do verificador rodados de novo: `regras.mjs` (todas as regras como antes), `cisco.mjs` (agora passa), `tunel.mjs`, `tunel-ia.mjs`, `cedo.mjs`, `bancada.mjs`.
- Capturas (1280×720, 390×844, 844×390, 360×640) refeitas com `npm run capturas` e olhadas, mais as `r2-*`.

## Desempenho e peso

- `node navegador/desempenho.mjs` (Chromium sem cabeça, rasterização por software): desktop **60 fps** (p95 16,7 ms); "celular de entrada" (390×844, DPR 3, CPU 4× mais lenta) **42 fps** (p95 33,4 ms) — igual à rodada 1, apesar do chute e da nota de ataque mais caros.
- Peso de `bomberolho/`: **263 kB** sem compressão (41 arquivos); orçamento 600 kB. A bancada continua só baixada com `?ajuste=1`.

## Limitações conhecidas (honestas)

- **Auto-eliminação do Difícil ≈ Médio** (5,6% × 6,2% por rodada; erro puro 3,4% × 3,5%). Com a cautela no aperto, num experimento de 80 rodadas Difícil×4, ela caía de 7,2% para 3,8% — mas, aplicada em todo o fim de rodada, o Difícil empatava mais e perdia a vantagem sobre o Médio; a versão final (cautela só enquanto o aperto cai e há mais de dois de pé) fica no meio. "Quase nunca se matam sozinhos" (3.3) vale para o Difícil fora do aperto; dentro dele, ele arrisca como os outros.
- **Empates entre robôs bons** ainda são ~42–45% das rodadas (no relógio ou todos juntos). Contra o proxy de criança no Fácil isso quase não acontece (0 partida empatada em 300). Encolher o miolo ou terminar o aperto mais tarde não ajudou nos testes (ver M4).
- **Robô emparedado pelo aperto:** um único caso de robô parado 15,8 s (Lago, Difícil, semente 1942): a peça do aperto caiu ao lado de um robô num beco (bloco + pilar + peça), e a única saída seria se molhar. Ele espera, legitimamente, a próxima peça. A IA não prevê ficar emparedada por peças que ainda não caíram além das 6 próximas. Outro caso parecido (pular com o Saltinho para um buraco cercado de blocos, 16,2 s) foi corrigido nesta rodada e coberto por teste.
- **"Encurralado por rival"** é uma classificação aproximada (casa vizinha com gota ou respingo de rival no momento da queda); serve para separar casos, não é prova de quem "teve culpa".
- **Perfis-proxy não são crianças**: "novato vence o Fácil em 92%" foi medido com um robô que imita um iniciante. Não houve teste com gente.
- **O túnel mostra o personagem cortado pela moldura** por um instante ao atravessar (o centro do corpo pula de uma ponta à outra; a interpolação do desenho não cruza a arena). Um efeito de "entrar/sair do túnel" fica para a parte 3.
- **Controle de toque** (inclusive o botão do bichinho) continua sendo da parte 4; o segundo botão existe no teclado (Shift/E/K) e no gancho (`acao`).
- O lote e o fps continuam medidos em Node e em emulação; não há celular físico neste ambiente.

## Arquivos alterados

**Jogo:** `js/sim/movimento.js` (túnel como portal), `js/sim/arenas.js` (bocas nas linhas 5 e 7), `js/sim/aperto.js` (canto inicial sorteado), `js/sim/grade.js` (quadrantes com a cruz do meio neutra), `js/sim/mundo.js` (ordem em rodízio, Cisco passa, marca "encurralado" no evento), `js/sim/jogadores.js` (`imuneCisco`), `js/ia/robo.js` (níveis, chute antes de fugir, calma da largada, nota de ataque, cautela no aperto, Cisco na fuga), `js/ia/caminhos.js` (vizinhança pelo túnel, ordem das direções, `apertoDaFuga`), `js/ia/taticas.js` (chute com a gota no destino e deslize seco, `pontoDeChute`, Saltinho sem buraco), `js/ui/bancada.js` e `css/bancada.css` (Recolher, copiar só as diferenças), `js/ui/avisos.js` (texto do demo).

**Testes e ferramentas:** `qa/sim/{arenas,batalha,bichinhos,ia,itens2,ajuste}.test.mjs`, `qa/navegador/parte2.test.mjs`, `qa/lote/{simular,cenarios,partida}.mjs`, `qa/lote/.gitignore`, `qa/lote/resultado.md` (refeito), novos `qa/verificacao/p2r2/{cedo,tunel-ia,navegador}.mjs`. Capturas refeitas em `qa/capturas/` (fora do git), incluindo `r2-*`.
