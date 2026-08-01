# Gotchas — erom-caserne

> Mise à jour : 2026-08-01

## Le scan anti-fuite a des faux positifs légitimes

`docs/plans/2026-07-08-agence-orchestrate.md` cite `/Users/` et un motif d'ID Slack **en tant que
patterns à interdire** (c'est un plan qui parle d'anonymisation). Le scan les remonte à chaque
release. Lire chaque hit avant de conclure à une fuite : ne jamais « corriger » ces lignes.
Le présent fichier est dans le même cas : décrire le faux positif le reproduit. 2 hits attendus
sur le pattern `/Users/`, aucun n'est un chemin réel.

## `package.json` a un double rôle

Il est à la fois le manifeste OpenCode/Pi et le porteur des scripts bun du repo. Il reste donc à la
racine alors que les 4 autres manifestes vivent dans `plugin/`. Ses champs `main` et `pi.*` doivent
pointer explicitement dans `plugin/`. Le déplacer casserait `bun run check:tools-manual`.

## `git archive` d'un sous-arbre

`git archive HEAD:plugin` produit une archive qui s'ouvre directement sur `.claude-plugin/`, pas sur
`plugin/`. Utile si un canal « sans git » réapparaît (le zip a été retiré du workflow le 2026-08-01).

## Une substitution d'anonymisation doit être idempotente

Un script qui remplace les UUID par des placeholders au format UUID va **rematcher ses propres
placeholders** à la passe suivante et tout renuméroter. Exclure explicitement le motif de
placeholder avant d'allouer un nouveau numéro. Vérifié : deuxième passe = 0 fichier modifié.

## Avant de supprimer une branche, inventorier ce qu'elle porte seule

`dev-archive` semblait ne contenir que l'historique de `docs/` ; elle portait en réalité 48 commits
et ~180 fichiers absents de `main` (transpileur Gemini, condenseur de transcript, design system,
4 agents). Réflexe : `git log --oneline main..<branche>` et `comm -23` des `ls-tree` avant tout
`branch -D`. Archivée en `~/archives/erom-caserne-dev-archive.bundle` (restauration testée par
clone réel, pas seulement `git bundle verify`), puis supprimée.

## Les IDs n'ont jamais atteint `origin/main`

Vérifié au moment de publier `docs/` : les commits historiques contenant les identifiants réels
vivaient tous sur `dev-archive`, jamais poussée. Aucune réécriture d'historique n'a été nécessaire.

## Le changement de structure ne casse pas que Claude

`plugin/` en `git-subdir` a été validé côté Claude (contenu du dossier vérifié via `gh api` sur
`main`). Les 4 autres canaux n'ont pas été testés. Points de doute connus :
`agy plugin install <repo>` attend `plugin.json` à la racine du clone, et un install OpenCode/Pi en
`git+https://…` ne prend pas de sous-chemin. [candidat 1x - lecture des docs de migration et du
README, non reproduit]
