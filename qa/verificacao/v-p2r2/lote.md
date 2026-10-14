# Simulação em lote — 683 partidas, 2680 rodadas

Escala 1, vários pedaços trabalhadores, 1235 s de processamento. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

## 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) | Taça no desempate | Partida empatada |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 100 | 382 | 77.7% | 16.5% | 5.8% | 82 s | 120 s | 120 s | 3.82 (5) | 12.0% | 2.0% |
| mesmo:medio | 100 | 425 | 59.5% | 20.2% | 20.2% | 113 s | 120 s | 120 s | 4.25 (5) | 30.0% | 6.0% |
| mesmo:dificil | 100 | 429 | 60.4% | 23.1% | 16.6% | 112 s | 120 s | 120 s | 4.29 (5) | 28.0% | 8.0% |
| novato×facil | 75 | 225 | 81.8% | 14.2% | 4.0% | 85 s | 120 s | 120 s | 3.00 (5) | 0.0% | 2.7% |
| novato×medio | 75 | 312 | 60.6% | 17.9% | 21.5% | 111 s | 120 s | 120 s | 4.16 (5) | 21.3% | 8.0% |
| bom×dificil | 75 | 342 | 52.9% | 26.9% | 20.2% | 113 s | 120 s | 120 s | 4.56 (5) | 28.0% | 10.7% |
| bom×medio | 38 | 164 | 58.5% | 17.7% | 23.8% | 112 s | 120 s | 120 s | 4.32 (5) | 23.7% | 7.9% |
| misto | 120 | 401 | 73.3% | 13.0% | 13.7% | 102 s | 120 s | 120 s | 3.34 (5) | 6.7% | 0.0% |

## 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 100 | 22.0% ± 8.1 | 31.0% ± 9.1 | 22.0% ± 8.1 | 23.0% ± 8.2 | 2.0% |
| medio | 100 | 23.0% ± 8.2 | 20.0% ± 7.8 | 28.0% ± 8.8 | 23.0% ± 8.2 | 6.0% |
| dificil | 100 | 26.0% ± 8.6 | 23.0% ± 8.2 | 28.0% ± 8.8 | 15.0% ± 7.0 | 8.0% |

Por rodada (amostra maior): fração das rodadas **com vencedor** que cada canto venceu. Esperado 25% ± intervalo de 95%.

| Nível | Rodadas com vencedor | Canto 0 | Canto 1 | Canto 2 | Canto 3 |
|---|---|---|---|---|---|
| facil | 297 | 22.9% ± 4.8 | 30.0% ± 5.2 | 23.9% ± 4.9 | 23.2% ± 4.8 |
| medio | 253 | 23.7% ± 5.2 | 23.3% ± 5.2 | 26.9% ± 5.5 | 26.1% ± 5.4 |
| dificil | 259 | 27.4% ± 5.4 | 27.4% ± 5.4 | 26.3% ± 5.4 | 18.9% ± 4.8 |
| todos | 809 | 24.6% ± 3.0 | 27.1% ± 3.1 | 25.6% ± 3.0 | 22.7% ± 2.9 |

## 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 245 | 70.2% | 29.8% | 103 s | 9.0% | 22.4 |
| lago | 254 | 60.6% | 39.4% | 104 s | 7.2% | 18.0 |
| caverna | 256 | 66.4% | 33.6% | 102 s | 7.4% | 20.9 |
| vale | 246 | 65.0% | 35.0% | 104 s | 9.7% | 21.7 |
| consultorio | 235 | 65.1% | 34.9% | 103 s | 8.2% | 21.1 |

## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). "Encurralado" = caiu com a própria gota, mas a saída estava fechada por um rival (casa vizinha com gota dele ou molhada por respingo dele). As duas últimas colunas são taxas por competidor por rodada jogada: a primeira tira só as apostas; a segunda tira também os encurralados (erro "puro", sem rival envolvido).

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …aposta final | …encurralado por rival | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) | Erro puro por rodada (sem apostas nem encurralados) |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 3005 | 2480 | 3.3% | 0.2% | 0.7% | 4.1% | 91.6% | 1.1% | 2.5% | 1.9% |
| medio | 3529 | 2621 | 11.4% | 2.7% | 4.0% | 18.0% | 59.1% | 11.5% | 6.4% | 3.5% |
| dificil | 3143 | 2203 | 11.7% | 3.7% | 3.5% | 18.7% | 60.1% | 9.5% | 5.6% | 3.1% |
| novato | 537 | 296 | 24.7% | 1.0% | 7.1% | 8.8% | 55.4% | 11.1% | 13.0% | 9.1% |
| bom | 506 | 355 | 11.8% | 2.5% | 5.1% | 19.4% | 58.6% | 10.1% | 6.5% | 3.0% |

## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 75 | 90.7% ± 6.6 | 62.7% ± 6.3 | 7.1% | 6.7% | 2.7% |
| novato×medio | 75 | 26.7% ± 10.0 | 14.4% ± 3.9 | 18.3% | 65.3% | 8.0% |
| bom×dificil | 75 | 26.7% ± 10.0 | 16.1% ± 3.9 | 9.1% | 62.7% | 10.7% |
| bom×medio | 38 | 34.2% ± 15.1 | 20.1% ± 6.1 | 6.7% | 57.9% | 7.9% |

## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % das partidas (IC 95%) | Rodadas vencidas | % das rodadas (IC 95%) | Esperado se fossem iguais |
|---|---|---|---|---|---|
| Difícil | 80 | 66.7% ± 8.4 | 176 | 43.9% ± 4.9 | 25% |
| Médio | 40 | 33.3% ± 8.4 | 107 | 26.7% ± 4.3 | 25% |
| Fácil (cada um) | 0 | 0.0% ± 0.0 | 6 | 1.4% ± 1.1 | 25% |
| Sem campeão / empate | 0 | 0.0% | 107 | 26.7% | — |

## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.31 | 1.22 | 0.76 | 0.43 | 0.26 | 0.48 | 0.31 | 0.26 | 0.43 |
| medio | 1.35 | 1.26 | 0.79 | 0.45 | 0.27 | 0.14 | 0.31 | 0.26 | 0.43 |
| dificil | 1.23 | 1.17 | 0.73 | 0.41 | 0.26 | 0.16 | 0.30 | 0.24 | 0.41 |
| novato | 1.27 | 1.28 | 0.77 | 0.43 | 0.27 | 0.65 | 0.29 | 0.27 | 0.43 |
| bom | 1.23 | 1.21 | 0.71 | 0.39 | 0.25 | 0.13 | 0.28 | 0.24 | 0.43 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.026 | 0.117 | 2.394 | 0.427 | 0.195 | 0.017 | 0.003 | 0.338 | 0.502 | 0.734 |
| medio | 0.553 | 0.565 | 5.262 | 0.430 | 0.667 | 0.164 | 0.054 | 0.316 | 0.312 | 0.321 |
| dificil | 1.247 | 0.530 | 6.354 | 0.410 | 0.634 | 0.173 | 0.045 | 0.291 | 0.277 | 0.293 |
| novato | 0.086 | 0.356 | 5.968 | 0.430 | 0.400 | 0.101 | 0.009 | 0.212 | 0.462 | 0.926 |
| bom | 1.213 | 0.441 | 6.344 | 0.431 | 0.573 | 0.206 | 0.049 | 0.320 | 0.271 | 0.198 |

## 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 683 de 683 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.5 s / 7.7 s |
