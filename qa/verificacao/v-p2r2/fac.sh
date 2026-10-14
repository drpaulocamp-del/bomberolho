#!/bin/sh
cd "$(dirname "$0")"
for sd in 51 52 53 54; do DPR=1 timeout 800 node jogador.mjs 7233 bom desktop facil jardim $sd 2 >> fac.out 2>&1; done
for sd in 61 62; do DPR=1 timeout 800 node jogador.mjs 7233 crianca desktop facil lago $sd 2 >> fac.out 2>&1; done
echo FIM >> fac.out
