# agence-orchestrate — doctrine du chef d'orchestre (siège boss) - Design v1

Date : 2026-07-08
Statut : validé (brainstorm avec Romain)
Amont : spec caserne `erom-agence-control-plane/docs/specs/2026-07-07-agent-team-caserne-design.md` (§4-§5, contrat CLI **livré et mergé** le 2026-07-07 : siège `boss`, `send task` imprime le `task_id`, `tasks <id> --wait` exit 0/2/3, `run --detach`, bootstrap de clôture).

## 1. Contexte et objectif

Le control-plane caserne offre depuis le 2026-07-07 un siège externe `boss` : hors pane tmux (`CASERNE_ALIAS` absent), `send`/`read` signent `boss`, et la surface CLI permet de dispatcher une task à un salarié et d'attendre sa clôture. Ce chantier livre la couche doctrine côté plugin :

- **Nouveau skill `agence-orchestrate`** : le manuel du chef d'orchestre en session principale — quand déléguer au réseau, comment formuler l'objective, comment attendre, vérifier, synthétiser et rattraper.
- **Retouche `agence-network`** : le manuel du salarié affirme des choses devenues fausses depuis le merge (hors pane → refus) ; mise en cohérence.

Philosophie reconduite : **le CLI `caserne` est la source de vérité de la mécanique ; le skill enseigne le quand et le pourquoi.** Aucun code, aucun tool : deux fichiers SKILL.md.

## 2. Décisions structurantes (validées en brainstorm)

1. **Déclenchement explicite uniquement** — amende le « routage transparent » du spec caserne §4.2. Le skill ne s'active que sur intention réseau exprimée (« délègue à agy », « via l'agence », « sur le réseau », suivi d'une task réseau). Une deep research *ordinaire* ne passe pas par le réseau : elle reste aux moyens locaux de la session hôte. Prévisible, pas de spawn implicite.
2. **V1 = deep research seule.** Le volet images (génération/édition → agy) attend une vérification réelle de la capacité d'agy en pane TUI ; le jour venu, c'est une ligne de table à ajouter. (Hérite du pré-requis spec caserne §8.)
3. **Protocole générique, table de routage minimale** (approche A du brainstorm). Le protocole de dispatch est indépendant du salarié ; la table v1 n'a qu'une ligne et ne sert que quand Romain ne nomme pas le salarié. Salarié nommé explicitement → table court-circuitée, même protocole.
4. **Retouche `agence-network` dans le même chantier** (cohérence immédiate des deux manuels).
5. **Maître seul** : édition de `claude-agence-plugin/` uniquement, comme le précédent d'agence-network (d853c82). Régénération des variantes Codex/Gemini + bump de version = rituel de release séparé, hors chantier.

## 3. Skill `agence-orchestrate` (nouveau)

Emplacement : `claude-agence-plugin/skills/agence-orchestrate/SKILL.md`, ~140-160 lignes, miroir structurel d'`agence-network`.

### 3.1 Frontmatter

- `name: agence-orchestrate`, `user-invocable: true`.
- Description : déclencheurs **explicites** — déléguer/dispatcher au réseau ou à un salarié nommé (« délègue à agy », « demande au réseau », « lance via l'agence »), et le suivi des tasks réseau (« où en est la task », « relance agy », « lis la réponse »). Contre-déclencheur écrit : une demande de recherche ordinaire, sans intention réseau exprimée, ne déclenche pas ce skill.

### 3.2 Corps

1. **Intro** : la session principale est le siège externe `boss` — hors pane, `send`/`read` signent `boss` automatiquement ; `-s agence` explicite (hors serveur tmux, la session n'est pas déductible) ; session standing par convention : `agence`. Jamais tmux directement. Distinction : `agence-network` = le salarié dans son pane ; ce skill = le chef dehors.
2. **Table de routage v1** (utilisée seulement si le salarié n'est pas nommé) :

   | Signal | Salarié | Pourquoi |
   |---|---|---|
   | Deep research, veille, état de l'art | agy | Grounding Google natif, quota Antigravity |

3. **Protocole de dispatch en 5 temps** :
   1. *Ensure up* : `caserne team -s agence` ; salarié absent ou `dead` → `caserne run <agent> -s agence --detach`. Aucune attente de readiness : le send est valide dès la réservation au roster (`spawning` accepté), l'injection idle-aware part quand le TUI est prêt.
   2. *Objective structuré* (gabarit dans le skill) : mission, contexte utile, dossier de sortie, consigne de clôture explicite « réponds par `caserne send boss response <task_id> success|failure <résumé + chemins>` » (ceinture-bretelles avec le bootstrap caserne).
   3. *Send* : `caserne send <alias> task "<objective>" -s agence` → imprime le `task_id` seul sur stdout, à capturer.
   4. *Wait en fond* : `caserne tasks <task_id> --wait -s agence` en Bash background ; la session principale continue son travail et se fait réveiller à la clôture. Exit : 0 close (success **ou** failure), 2 orpheline, 3 timeout (défaut 30 min, `--timeout <min>`).
   5. *Au réveil* : lire la fiche (le `--wait` l'imprime), **vérifier l'existence réelle des fichiers livrés** avant de rien affirmer, synthétiser à Romain, remonter le fichier si le livrable le mérite.
4. **Convention de livrables** : aucun artefact dans la messagerie ; rapport/fichiers dans `.claude/agence/out/<task-id>/` sous le projet courant. Résolution de l'œuf-et-la-poule (le `task_id` n'existe pas avant le send) : l'objective donne le **chemin absolu de la base** (`<projet>/.claude/agence/out/`) et instruit le salarié d'y créer le sous-dossier `<son task_id>` (il le connaît : il doit le citer dans sa response). Boss reconstruit le chemin exact dès le send. La response ne porte que résumé + chemins.
5. **Rattrapages** (table exit code → action, reprise du spec caserne §5) :
   - exit **2** (orpheline) : respawn une fois (`run --detach`) + re-dispatch d'une task neuve ; deuxième échec → prévenir Romain et proposer le fallback local. Jamais de bascule silencieuse coûteuse.
   - exit **3** (timeout) : `caserne send <alias> chat "où en es-tu sur <task_id> ?" -s agence` + re-wait une fois ; ensuite remonter à Romain.
   - réponse mal formée (chat au lieu de response, task jamais close) : même symptôme que timeout, même rattrapage ; `caserne read --unread -s agence` + `caserne tasks -s agence` pour voir ce qui s'est réellement dit.
   - tmux absent/cassé (`caserne doctor`) : prévenir et proposer le fallback local d'emblée.
   - Le fallback est nommé **génériquement** (« les moyens de recherche locaux de la session hôte ») — le plugin est distribué publiquement, aucun nom de subagent personnel en dur (règle CLAUDE.md du repo : aucune donnée propre à l'installation).
6. **Ce que ce skill ne couvre pas** : le travail du salarié dans son pane (`agence-network`) ; l'identité et les tools MCP (`agence-control`) ; le choix des moyens locaux de fallback (configuration de la session hôte, hors plugin).

## 4. Retouche `agence-network` (mise en cohérence post-merge)

Quatre points chirurgicaux, rien d'autre ne bouge :

1. **Principe 1** : « Hors pane swarm (terminal nu), pas de `CASERNE_ALIAS` → `send` refuse : la messagerie est agent-à-agent » → remplacé : hors pane, l'expéditeur devient le siège externe **`boss`** (la session principale) ; doctrine dans `agence-orchestrate`.
2. **Tableau « Erreurs fréquentes »** : suppression de la ligne `Expéditeur inconnu : CASERNE_ALIAS absent` (cette erreur n'existe plus dans le CLI).
3. **Section `send`** : une phrase côté salarié — une task peut venir de `boss` ; elle se clôt exactement pareil (`caserne send boss response <task_id> …`) ; `boss` est toujours joignable même s'il n'apparaît pas dans `team`.
4. **« Ce que cette skill ne couvre pas »** : renvoi vers `agence-orchestrate` (l'orchestration depuis la session principale).

## 5. Vérification

Pas de suite de tests pour les skills dans ce repo. Porte de sortie : **relecture croisée des deux SKILL.md contre la surface CLI réelle** — chaque commande, flag, exit code et message d'erreur cité doit exister dans le `caserne` mergé (`erom-agence-control-plane` main, commits `12a627c`..`8a3d94b`). Une passe devil-spec ou une vérification par sous-agent fera foi au moment du plan.

## 6. Périmètre git

- Deux commits sur `main` du monorepo plugin (maître seul) :
  - `feat(skills): agence-orchestrate — doctrine du chef d'orchestre (siège boss)`
  - `fix(skills): agence-network — siège boss hors pane (post-merge control-plane)`
- Le fichier dirty pré-existant `agence-control/SKILL.md` (renommage onboarding) n'est **pas** touché ni commité.
- Régénération variantes + version : hors chantier (rituel de release).

## 7. Hors scope v1 (explicite)

Volet images (attend la vérif agy en pane) ; routage GLM ou autres salariés en table (une ligne à ajouter le jour venu) ; multi-incarnations (`--alias agy-2`) ; tools MCP de dispatch ; notification push (la session synthétise en conversation) ; régénération Codex/Gemini.

## 8. Risques et limites assumées (hérités du spec caserne §8)

- **Discipline de clôture du salarié non garantie** : enseignée (bootstrap + objective), pas imposée. Mitigation : rattrapages exit 3 ; ledger et inbox gardent la trace.
- **Inbox `boss` partagée** entre sessions principales simultanées sur la même session swarm : lecture croisée possible en `read` ; le suivi par `task_id` reste sans ambiguïté. Assumé v1.
- **cwd d'agy ≠ projet courant** (session « agence » cross-projets) : neutralisé par les chemins absolus dans l'objective.
- **Latence de poll** (~2 s wait, ~1,5 s injection) : négligeable devant des tâches de plusieurs minutes.
