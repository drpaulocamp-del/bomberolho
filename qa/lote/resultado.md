# Simulação em lote — 2730 partidas, 10791 rodadas

Escala 1, vários pedaços trabalhadores, 3675 s de processamento. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

## 1. Visão geral por cenário

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

## 2. Vitórias de partida por canto (todos do mesmo nível)

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

## 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 1013 | 62.2% | 37.8% | 104 s | 7.7% | 22.4 |
| lago | 984 | 65.2% | 34.8% | 102 s | 8.0% | 18.0 |
| caverna | 997 | 61.0% | 39.0% | 104 s | 7.1% | 20.8 |
| vale | 1016 | 63.0% | 37.0% | 104 s | 6.9% | 21.6 |
| consultorio | 998 | 65.3% | 34.7% | 102 s | 6.8% | 20.9 |

## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). "Encurralado" = caiu com a própria gota, mas a saída estava fechada por um rival (casa vizinha com gota dele ou molhada por respingo dele). As duas últimas colunas são taxas por competidor por rodada jogada: a primeira tira só as apostas; a segunda tira também os encurralados (erro "puro", sem rival envolvido).

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …aposta final | …encurralado por rival | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) | Erro puro por rodada (sem apostas nem encurralados) |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 12196 | 10127 | 3.2% | 0.1% | 0.8% | 4.4% | 91.6% | 0.8% | 2.5% | 1.8% |
| medio | 14244 | 10433 | 11.0% | 2.5% | 3.7% | 16.8% | 60.2% | 12.0% | 6.2% | 3.5% |
| dificil | 12591 | 8835 | 11.0% | 3.0% | 3.1% | 19.7% | 60.4% | 8.9% | 5.6% | 3.4% |
| novato | 2163 | 1218 | 23.8% | 2.0% | 4.8% | 11.1% | 54.4% | 10.7% | 12.3% | 9.6% |
| bom | 1970 | 1429 | 11.1% | 2.3% | 3.2% | 19.9% | 59.3% | 9.6% | 6.4% | 4.1% |

## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 300 | 92.0% ± 3.1 | 63.0% ± 3.2 | 8.4% | 8.0% | 0.0% |
| novato×medio | 300 | 22.0% ± 4.7 | 13.0% ± 1.8 | 16.9% | 70.7% | 7.3% |
| bom×dificil | 300 | 25.3% ± 4.9 | 14.3% ± 1.9 | 7.2% | 71.3% | 3.3% |
| bom×medio | 150 | 35.3% ± 7.6 | 18.5% ± 3.0 | 10.0% | 60.7% | 4.0% |

## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % das partidas (IC 95%) | Rodadas vencidas | % das rodadas (IC 95%) | Esperado se fossem iguais |
|---|---|---|---|---|---|
| Difícil | 317 | 66.0% ± 4.2 | 686 | 41.6% ± 2.4 | 25% |
| Médio | 156 | 32.5% ± 4.2 | 427 | 25.9% ± 2.1 | 25% |
| Fácil (cada um) | 1 | 0.2% ± 0.4 | 25 | 1.5% ± 0.6 | 25% |
| Sem campeão / empate | 5 | 1.0% | 488 | 29.6% | — |

## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

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

## 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 2730 de 2730 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.5 s / 15.8 s |
