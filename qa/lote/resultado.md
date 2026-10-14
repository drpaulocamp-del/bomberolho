# Simulação em lote — 2340 partidas, 9470 rodadas

Escala 1, 4 trabalhadores, 2592 s. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

## 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) | Taça no desempate | Partida empatada |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 400 | 1433 | 87.0% | 7.0% | 5.9% | 71 s | 106 s | 120 s | 3.58 (5) | 5.3% | 3.0% |
| mesmo:medio | 400 | 1752 | 51.8% | 31.8% | 16.4% | 110 s | 120 s | 120 s | 4.38 (5) | 30.8% | 8.5% |
| mesmo:dificil | 400 | 1821 | 44.0% | 37.4% | 18.6% | 114 s | 120 s | 120 s | 4.55 (5) | 34.3% | 7.8% |
| novato×facil | 300 | 882 | 83.4% | 12.2% | 4.3% | 82 s | 120 s | 120 s | 2.94 (5) | 0.7% | 0.7% |
| novato×medio | 150 | 632 | 55.5% | 29.4% | 15.0% | 109 s | 120 s | 120 s | 4.21 (5) | 24.7% | 6.0% |
| bom×dificil | 300 | 1373 | 44.4% | 35.9% | 19.7% | 114 s | 120 s | 120 s | 4.58 (5) | 35.0% | 9.0% |
| bom×medio | 150 | 663 | 50.2% | 33.0% | 16.7% | 110 s | 120 s | 120 s | 4.42 (5) | 30.0% | 5.3% |
| misto | 240 | 914 | 55.4% | 33.8% | 10.8% | 106 s | 120 s | 120 s | 3.81 (5) | 17.5% | 2.1% |

## 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 400 | 20.8% | 21.8% | 25.0% | 29.5% | 3.0% |
| medio | 400 | 14.3% | 25.3% | 23.0% | 29.0% | 8.5% |
| dificil | 400 | 19.8% | 24.8% | 20.3% | 27.5% | 7.8% |

## 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 981 | 64.7% | 35.3% | 99 s | 7.7% | 20.3 |
| lago | 976 | 61.3% | 38.7% | 99 s | 10.2% | 16.1 |
| caverna | 1079 | 41.9% | 58.1% | 105 s | 6.7% | 17.9 |
| vale | 996 | 62.9% | 37.1% | 98 s | 8.0% | 19.8 |
| consultorio | 974 | 66.1% | 33.9% | 99 s | 7.9% | 18.8 |

## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). A última coluna exclui essas apostas.

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …dessas, aposta final | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) |
|---|---|---|---|---|---|---|---|---|
| facil | 10206 | 8383 | 3.0% | 0.1% | 5.1% | 91.5% | 0.5% | 2.4% |
| medio | 11807 | 7835 | 11.2% | 2.0% | 20.3% | 56.2% | 12.3% | 6.1% |
| dificil | 12317 | 8057 | 10.2% | 2.0% | 22.9% | 55.7% | 11.1% | 5.3% |
| novato | 1514 | 755 | 16.6% | 0.9% | 14.2% | 63.6% | 5.7% | 7.8% |
| bom | 2036 | 1425 | 10.5% | 1.3% | 22.9% | 53.8% | 12.9% | 6.4% |

## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 300 | 91.0% | 63.7% | 7.0% | 8.3% | 0.7% |
| novato×medio | 150 | 5.3% | 6.0% | 10.0% | 88.7% | 6.0% |
| bom×dificil | 300 | 21.0% | 10.8% | 7.4% | 70.0% | 9.0% |
| bom×medio | 150 | 18.7% | 8.7% | 7.2% | 76.0% | 5.3% |

## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % | Esperado se fossem iguais |
|---|---|---|---|
| Difícil | 87 | 36.3% | 25% |
| Médio | 144 | 60.0% | 25% |
| Fácil (cada um) | 2 | 0.8% | 25% |
| Sem campeão | 5 | 2.1% | — |

## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.29 | 1.20 | 0.76 | 0.42 | 0.26 | 0.46 | 0.30 | 0.26 | 0.42 |
| medio | 1.23 | 1.16 | 0.72 | 0.40 | 0.26 | 0.00 | 0.28 | 0.25 | 0.41 |
| dificil | 1.06 | 1.02 | 0.61 | 0.35 | 0.23 | 0.00 | 0.24 | 0.21 | 0.36 |
| novato | 1.25 | 1.25 | 0.73 | 0.44 | 0.26 | 0.52 | 0.30 | 0.27 | 0.43 |
| bom | 1.06 | 0.97 | 0.59 | 0.33 | 0.23 | 0.00 | 0.25 | 0.22 | 0.35 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.020 | 0.084 | 2.531 | 0.418 | 0.168 | 0.019 | 0.002 | 0.340 | 0.243 | 0.870 |
| medio | 0.087 | 0.787 | 7.383 | 0.414 | 0.524 | 0.176 | 0.041 | 0.276 | 0.060 | 0.047 |
| dificil | 0.054 | 0.667 | 9.039 | 0.361 | 0.390 | 0.180 | 0.044 | 0.247 | 0.025 | 0.012 |
| novato | 0.053 | 0.194 | 5.063 | 0.433 | 0.320 | 0.098 | 0.007 | 0.201 | 0.195 | 0.898 |
| bom | 0.064 | 0.657 | 9.157 | 0.353 | 0.430 | 0.180 | 0.043 | 0.247 | 0.001 | 0.006 |

## 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 2340 de 2340 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.7 s / 17.0 s |
