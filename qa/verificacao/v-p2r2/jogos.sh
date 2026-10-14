#!/bin/sh
# lote de partidas reais no navegador (verificador P2R2)
cd "$(dirname "$0")"
run() { timeout 800 node jogador.mjs 7233 "$@" >> jogos.out 2>&1; }
run bom desktop facil jardim 21 &
run crianca retrato facil lago 22
wait
run bom paisagem medio caverna 23 &
run crianca pequeno medio vale 24
wait
run bom desktop dificil consultorio 25 &
run bom retrato dificil caverna 26
wait
run bom pequeno facil caverna 27 &
run crianca paisagem dificil jardim 28
wait
run crianca desktop facil vale 29 &
run bom pequeno dificil lago 30
wait
run crianca desktop medio consultorio 31 &
run bom retrato medio jardim 32
wait
echo FIM >> jogos.out
