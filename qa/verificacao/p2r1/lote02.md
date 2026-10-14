# Simulação em lote — 468 partidas, 1906 rodadas

Escala 0.2, 4 trabalhadores, 494 s. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

## 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) | Taça no desempate | Partida empatada |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 80 | 286 | 86.0% | 8.0% | 5.9% | 70 s | 111 s | 120 s | 3.58 (5) | 10.0% | 0.0% |
| mesmo:medio | 80 | 352 | 46.9% | 36.6% | 16.5% | 112 s | 120 s | 120 s | 4.40 (5) | 38.8% | 5.0% |
| mesmo:dificil | 80 | 363 | 42.1% | 35.8% | 22.0% | 114 s | 120 s | 120 s | 4.54 (5) | 32.5% | 12.5% |
| novato×facil | 60 | 185 | 76.2% | 15.7% | 8.1% | 83 s | 120 s | 120 s | 3.08 (5) | 5.0% | 1.7% |
| novato×medio | 30 | 132 | 57.6% | 27.3% | 15.2% | 106 s | 120 s | 120 s | 4.40 (5) | 26.7% | 10.0% |
| bom×dificil | 60 | 267 | 47.2% | 33.0% | 19.9% | 113 s | 120 s | 120 s | 4.45 (5) | 30.0% | 5.0% |
| bom×medio | 30 | 133 | 49.6% | 33.1% | 17.3% | 110 s | 120 s | 120 s | 4.43 (5) | 43.3% | 6.7% |
| misto | 48 | 188 | 53.2% | 37.2% | 9.6% | 106 s | 120 s | 120 s | 3.92 (5) | 12.5% | 0.0% |

## 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 80 | 20.0% | 25.0% | 27.5% | 27.5% | 0.0% |
| medio | 80 | 21.3% | 25.0% | 26.3% | 22.5% | 5.0% |
| dificil | 80 | 13.8% | 22.5% | 22.5% | 28.8% | 12.5% |

## 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 181 | 70.7% | 29.3% | 96 s | 9.8% | 20.3 |
| lago | 204 | 59.8% | 40.2% | 99 s | 9.8% | 16.2 |
| caverna | 219 | 35.2% | 64.8% | 106 s | 7.2% | 17.9 |
| vale | 198 | 61.1% | 38.9% | 101 s | 6.8% | 19.6 |
| consultorio | 199 | 58.3% | 41.7% | 100 s | 8.8% | 18.8 |

## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). A última coluna exclui essas apostas.

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …dessas, aposta final | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) |
|---|---|---|---|---|---|---|---|---|
| facil | 2075 | 1690 | 2.8% | 0.2% | 5.2% | 91.1% | 0.9% | 2.1% |
| medio | 2391 | 1560 | 10.2% | 2.1% | 20.0% | 57.0% | 12.8% | 5.3% |
| dificil | 2441 | 1628 | 10.1% | 2.0% | 23.8% | 53.1% | 13.0% | 5.4% |
| novato | 317 | 168 | 16.1% | 1.2% | 14.3% | 63.7% | 6.0% | 7.9% |
| bom | 400 | 266 | 11.7% | 3.0% | 20.3% | 58.6% | 9.4% | 5.8% |

## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 60 | 83.3% | 56.8% | 8.6% | 15.0% | 1.7% |
| novato×medio | 30 | 10.0% | 9.1% | 8.3% | 80.0% | 10.0% |
| bom×dificil | 60 | 20.0% | 11.2% | 9.0% | 75.0% | 5.0% |
| bom×medio | 30 | 16.7% | 12.8% | 5.3% | 76.7% | 6.7% |

## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % | Esperado se fossem iguais |
|---|---|---|---|
| Difícil | 14 | 29.2% | 25% |
| Médio | 33 | 68.8% | 25% |
| Fácil (cada um) | 1 | 1.0% | 25% |
| Sem campeão | 0 | 0.0% | — |

## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.30 | 1.19 | 0.76 | 0.41 | 0.25 | 0.45 | 0.30 | 0.26 | 0.42 |
| medio | 1.22 | 1.14 | 0.72 | 0.41 | 0.25 | 0.00 | 0.29 | 0.25 | 0.41 |
| dificil | 1.07 | 1.00 | 0.61 | 0.35 | 0.23 | 0.00 | 0.24 | 0.21 | 0.36 |
| novato | 1.23 | 1.24 | 0.76 | 0.43 | 0.26 | 0.55 | 0.31 | 0.25 | 0.37 |
| bom | 0.98 | 0.96 | 0.57 | 0.33 | 0.26 | 0.00 | 0.22 | 0.19 | 0.32 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.024 | 0.075 | 2.552 | 0.419 | 0.197 | 0.022 | 0.004 | 0.334 | 0.248 | 0.882 |
| medio | 0.091 | 0.835 | 7.617 | 0.413 | 0.560 | 0.199 | 0.030 | 0.272 | 0.050 | 0.039 |
| dificil | 0.051 | 0.693 | 9.159 | 0.365 | 0.345 | 0.181 | 0.054 | 0.247 | 0.021 | 0.007 |
| novato | 0.063 | 0.224 | 4.650 | 0.369 | 0.290 | 0.136 | 0.003 | 0.192 | 0.158 | 1.107 |
| bom | 0.087 | 0.685 | 7.535 | 0.318 | 0.297 | 0.182 | 0.043 | 0.230 | 0.003 | 0.000 |

## 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 468 de 468 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.8 s / 17.6 s |
