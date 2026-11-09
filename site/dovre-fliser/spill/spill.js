'use strict';
// Spillmoduler (se docs/plan-funksjoner.md). Lastes ETTER hovedskriptet i index.html, så alle globale navn derfra finnes
// (kam, ENHETER, INFRA, lagVindu, logg, tegnHud, skitten …). Moduler kobler seg på med krokene:
//   KROKER.tegn.push((ctx, vx0, vy1) => { ... })   tegnes i 2D etter infrastrukturen, før lagene (kart -> infra -> dette -> lag)
//   KROKER.sim.push(dt => { ... })                  hvert simuleringssteg (dt i spillminutter; 1× er sanntid, 1 spilltime = TIME = 60)
//   KROKER.trykk.push((X, Y, cx, cy) => true/false) trykk på kartet (meter + skjermpunkt); true = håndtert, resten hoppes over
// Regler uten DOM legges i egne filer (som terreng.js) og testes i Node.
