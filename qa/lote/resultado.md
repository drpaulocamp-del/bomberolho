# Simulação em lote — 2340 partidas, 9468 rodadas

Escala 1, 4 trabalhadores, 2611 s. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

## 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) |
|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 400 | 1430 | 87.1% | 6.8% | 6.1% | 71 s | 106 s | 120 s | 3.58 (5) |
| mesmo:medio | 400 | 1760 | 53.8% | 29.8% | 16.4% | 109 s | 120 s | 120 s | 4.40 (5) |
| mesmo:dificil | 400 | 1830 | 43.4% | 38.1% | 18.5% | 114 s | 120 s | 120 s | 4.58 (5) |
| novato×facil | 300 | 881 | 84.1% | 12.0% | 3.9% | 81 s | 120 s | 120 s | 2.94 (5) |
| novato×medio | 150 | 624 | 59.3% | 27.1% | 13.6% | 108 s | 120 s | 120 s | 4.16 (5) |
| bom×dificil | 300 | 1367 | 44.8% | 35.1% | 20.1% | 113 s | 120 s | 120 s | 4.56 (5) |
| bom×medio | 150 | 665 | 49.2% | 32.0% | 18.8% | 110 s | 120 s | 120 s | 4.43 (5) |
| misto | 240 | 911 | 54.8% | 33.7% | 11.5% | 105 s | 120 s | 120 s | 3.80 (5) |

## 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas no limite de rodadas).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 400 | 19.3% | 21.5% | 24.0% | 27.8% | 7.5% |
| medio | 400 | 12.0% | 17.3% | 15.0% | 16.8% | 39.0% |
| dificil | 400 | 14.8% | 14.5% | 11.0% | 15.0% | 44.8% |

## 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 977 | 66.0% | 34.0% | 98 s | 7.8% | 20.3 |
| lago | 989 | 60.4% | 39.6% | 99 s | 10.3% | 16.0 |
| caverna | 1079 | 42.5% | 57.5% | 104 s | 6.9% | 17.8 |
| vale | 995 | 64.1% | 35.9% | 98 s | 8.6% | 19.9 |
| consultorio | 980 | 66.0% | 34.0% | 98 s | 8.6% | 18.8 |

## 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). A última coluna exclui essas apostas.

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …dessas, aposta final | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) |
|---|---|---|---|---|---|---|---|---|
| facil | 10185 | 8368 | 3.0% | 0.1% | 5.0% | 91.5% | 0.4% | 2.4% |
| medio | 11818 | 7907 | 11.0% | 1.7% | 20.0% | 55.9% | 13.2% | 6.2% |
| dificil | 12332 | 8083 | 9.9% | 2.0% | 22.5% | 55.9% | 11.7% | 5.2% |
| novato | 1505 | 742 | 15.2% | 1.1% | 14.6% | 63.1% | 7.1% | 7.0% |
| bom | 2032 | 1433 | 10.5% | 1.5% | 22.6% | 53.9% | 13.0% | 6.4% |

## 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 300 | 91.7% | 64.1% | 6.6% | 6.7% | 1.7% |
| novato×medio | 150 | 6.0% | 8.2% | 8.8% | 60.0% | 34.0% |
| bom×dificil | 300 | 14.0% | 11.2% | 7.4% | 44.0% | 42.0% |
| bom×medio | 150 | 11.3% | 9.3% | 7.5% | 55.3% | 33.3% |

## 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % | Esperado se fossem iguais |
|---|---|---|---|
| Difícil | 70 | 29.2% | 25% |
| Médio | 122 | 50.8% | 25% |
| Fácil (cada um) | 2 | 0.8% | 25% |
| Sem campeão | 44 | 18.3% | — |

## 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.29 | 1.20 | 0.76 | 0.41 | 0.26 | 0.46 | 0.30 | 0.26 | 0.42 |
| medio | 1.23 | 1.16 | 0.72 | 0.40 | 0.26 | 0.00 | 0.28 | 0.25 | 0.41 |
| dificil | 1.06 | 1.02 | 0.61 | 0.35 | 0.23 | 0.00 | 0.24 | 0.22 | 0.36 |
| novato | 1.25 | 1.24 | 0.72 | 0.44 | 0.26 | 0.51 | 0.30 | 0.27 | 0.43 |
| bom | 1.07 | 0.98 | 0.59 | 0.34 | 0.22 | 0.00 | 0.25 | 0.22 | 0.35 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.002 | 0.082 | 2.520 | 0.418 | 0.171 | 0.019 | 0.003 | 0.339 | 0.240 | 0.870 |
| medio | 0.006 | 0.745 | 7.265 | 0.412 | 0.521 | 0.169 | 0.043 | 0.268 | 0.059 | 0.046 |
| dificil | 0.009 | 0.669 | 9.124 | 0.361 | 0.393 | 0.178 | 0.045 | 0.246 | 0.024 | 0.011 |
| novato | 0.001 | 0.174 | 4.930 | 0.435 | 0.316 | 0.091 | 0.010 | 0.198 | 0.195 | 0.894 |
| bom | 0.002 | 0.641 | 9.057 | 0.354 | 0.431 | 0.183 | 0.043 | 0.248 | 0.001 | 0.006 |

## 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 2340 de 2340 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.7 s / 17.0 s |
