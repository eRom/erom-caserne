---
name: network
description: "Manuel opératoire du swarm caserne : faire tourner une équipe de salariés IA dans une session tmux et les faire collaborer via le CLI `caserne`. Déclenche dès qu'il faut recruter / incarner un agent dans une session, monter une équipe, déléguer une tâche à un coéquipier, répondre à une tâche (succès/échec/blocage), discuter avec un agent, faire le point sur l'équipe (team) ou les tâches (ledger), relancer / virer un agent, ou purger les sessions mortes. Couvre les commandes swarm run -s / send / read / tasks / team / fire / clean. Complément CLI de la skill control (identité Linear / Slack / mail via le MCP)."
user-invocable: true
---

# Agence — le swarm caserne (une équipe dans une session tmux)

Le control plane sait lancer **un** salarié seul (`caserne run`, avant-plan). Le **swarm** fait tourner une **flotte** dans une session tmux : chaque pane est une **incarnation** d'un salarié — son identité complète (Linear / Slack / mail) plus la supervision tmux. Les agents sont **égaux** : pas de lead, pas de hiérarchie. Ils se parlent par une messagerie fichier avec injection « ghost typist » (le message est tapé dans le pane du destinataire quand il est au repos).

Tout passe par le CLI **`caserne`** — aucun MCP requis, donc ça marche pour n'importe quel harness (`claude`, `codex`, `opencode`, `agy`). La **source de vérité** de la surface exacte : `caserne` sans argument affiche l'usage. Ce skill enseigne le *quand / pourquoi* et les pièges ; les flags précis vivent dans le CLI.

## Les 4 principes non négociables

1. **Ton adressage vient de l'env de ton pane, jamais d'un argument.** `CASERNE_ALIAS` (ton surnom dans la session) et `CASERNE_SESSION` sont posés par caserne quand il t'incarne. `send` / `read` s'en servent pour savoir qui tu es et où tu es. Hors pane swarm (pas de `CASERNE_ALIAS` : session principale, terminal nu), l'expéditeur devient le siège externe **`boss`** — le poste de commandement hors swarm ; sa doctrine vit dans la skill `orchestrate`. Ton identité durable Linear / Slack / mail reste `CASERNE_AGENT_ID` (voir la skill `control`) — le surnom, lui, est jetable et local à la session.

2. **Agents égaux, pas de lead.** Tout agent peut recruter, assigner, virer. Le rappel (nudge) d'une tâche en retard revient à **celui qui l'a assignée**. Aucune hiérarchie à respecter ni à annoncer.

3. **La session est explicite.** `-s <nom>` en **create-or-join idempotent** : la 1re invocation crée la session, les suivantes la rejoignent (nouveau pane). Dans un pane, la session est déjà connue (env) — tu ne repasses `-s` que pour piloter une session **depuis l'extérieur** (terminal nu).

4. **N'utilise JAMAIS tmux directement.** Split, kill, layout, capture d'écran : c'est le travail de caserne. Tu parles à l'équipe par `send`, tu la vois par `team`. Un `tmux` tapé à la main casse le state du swarm.

## Référence rapide

| Commande | À quoi ça sert |
|---|---|
| `caserne run <agent> -s <session>` | Recrute / incarne un salarié dans la session (pane dédié) |
| `caserne send <alias> <verbe> …` | Livre un message dans l'inbox d'un coéquipier |
| `caserne read [--unread]` | Lit ta propre inbox (historique / rattrapage) |
| `caserne tasks [<task_id>]` | Ledger des tâches (pending d'abord, ou fiche détail) |
| `caserne team [-s <session>]` | État de l'équipe réconcilié avec tmux |
| `caserne fire <alias…> [-s <session>]` | Retire une incarnation (kill pane, **réversible**) |
| `caserne clean [--force]` | Purge le state des sessions tmux disparues |

Surface exacte : `caserne` (sans argument). Défauts, limites et pièges : sections ci-dessous.

## Recruter — `run … -s`

```
caserne run <agent> -s <session> [--alias <a>] [--model <m>] [-r <runtime>] [-- <args harness>]
```
- `<agent>` : clé d'un salarié du registre (`caserne agent list`). Il s'incarne avec son **identité complète**.
- `-s <session>` : create-or-join. Nom sanitizé (`[^A-Za-z0-9_-]` → `-`). **Sans `-s`, `run` reste l'avant-plan classique** (pas de swarm, pas d'enregistrement).
- `--alias <a>` : surnom dans la session (`A-Za-z0-9_-`, `caserne` réservé). Sans, un alias auto `<agent>-xxxx` est généré. Collision avec un agent **vivant** → erreur ; alias d'un **mort** → réincarnation. `--alias` sans `-s` → erreur.
- `--model <m>` : modèle du harness. Validé contre le menu `models:` du runtime s'il en a un (sinon libre).
- `cwd du pane` = **cwd de l'appelant** : deux projets différents dans une même session, c'est voulu (session « audit » cross-projets).
- **Attach** : hors tmux, ton terminal s'attache à la session après le spawn. Déjà dans la session : le pane apparaît, rien d'autre. Autre session : **pas de switch automatique** (un agent qui recrute ne vole pas ton écran) — un hint `tmux switch-client` s'affiche.

Le nouvel agent boote puis reçoit un **bootstrap** injecté (qui il est, comment joindre l'équipe). Il n'a **pas** à s'annoncer : il est joignable dès que `caserne team` le montre `active`.

## Messagerie — `send`

```
caserne send <alias> <task|response|context|chat> <args…> [--timeout <min>]
```
Expéditeur = **toi** (`CASERNE_ALIAS`). Destinataire **inconnu** ou **mort** → erreur ; en cours de spawn (`spawning`) → **accepté** (le message attend son readiness). Une task peut venir de **`boss`** (la session principale, hors pane) : tu la clos exactement pareil — `caserne send boss response <task_id> …`. `boss` est toujours joignable même s'il n'apparaît jamais dans `team`.

**Les 4 verbes — et surtout `task` vs `chat`, la distinction qui compte :**

| Verbe | Tracé au ledger ? | Relance (nudge) ? | Pour |
|---|---|---|---|
| `task <objectif…>` | oui (task_id auto) | oui (`--timeout <min>`, défaut 10) | déléguer un travail **avec livrable** |
| `response <task_id> <success\|failure\|blocked> <résultat…>` | **clôt** la tâche | — | rendre le résultat d'une task reçue |
| `chat <message…>` | non | non | question, coordination, point léger |
| `context <contenu…>` | non | non | pousser du contexte, sans attendre de réponse |

- **`task`** quand tu attends un livrable : c'est tracé (`caserne tasks`) et **relancé une fois** si sans réponse. Réponds toujours par `response` en reprenant le `task_id` reçu.
- **`chat`** pour tout le reste : zéro entrée parasite au registre, zéro relance.
- **Livrable volumineux** : écris-le dans un fichier du projet et donne son **chemin** dans le `response`. L'injection chez le destinataire est tronquée à ~500 caractères avec un pointeur `caserne tasks <task_id>` (le ledger garde le résultat complet).
- **Corps du message** : évite les mots commençant par `--` (`--timeout` est repéré où qu'il soit sur la ligne).

Exemples :
```
caserne send graphiste task "génère un favicon 512x512, rends-moi le chemin du fichier"
caserne send raymond response task-ab12 success "favicon dans ./assets/favicon.png"
caserne send raymond chat "il me faut le schéma d'API avant de continuer"
```

## Lire son agence inbox — `read`

```
caserne read [--unread]
```
Les entrants s'injectent **déjà automatiquement** dans ton pane dès que tu es au repos. `read` est l'**historique / le rattrapage** ; `--unread` ne montre que les messages pas encore injectés. Tu lis **ta propre** inbox (alias depuis l'env).

## Ledger — `tasks`

```
caserne tasks [<task_id>] [-s <session>]
```
Sans argument : bloc `PENDING` d'abord (les plus anciennes — donc les plus urgentes — en tête, avec leur âge ; `⏰` = déjà relancée), puis `CLOSED` (outcome success / failure / blocked). Avec `<task_id>` : **fiche complète**, `result` intégral avec ses vrais sauts de ligne — c'est la vue détail pointée par les injections tronquées (`… [tronqué : caserne tasks task-xxx]`).

## Voir l'équipe — `team`

```
caserne team [-s <session>]
```
Roster **réconcilié** avec tmux (tout pane disparu → `dead`) : alias, salarié, runtime / modèle, pane, statut. Vérifie qui est `active` **avant** d'assigner. Hors tmux (humain dans un terminal nu), précise `-s`.

## Virer — `fire`

```
caserne fire <alias> [<alias>…] [-s <session>]
```
Kill le(s) pane(s) puis relayout. **Réversible** : ça n'arrête que la **session tmux** de l'agent (son pane). Son identité persistante — app OAuth Linear, bot Slack, BAL — reste **intacte**, et tu peux le relancer par `caserne run <agent>` plus tard. Ça ne touche **pas** au registre. Courtoisie : préviens l'agent par un `chat` s'il a une tâche en cours.

## Nettoyer — `clean`

```
caserne clean [--force]
```
Purge le state des sessions tmux disparues. **Dry-run par défaut** (liste ce qui serait supprimé) ; `--force` supprime. Fail-safe : tmux injoignable → **rien** n'est supprimé (sinon tout paraîtrait mort).

## Mécanique de livraison (à connaître, rien à piloter)

- **Idle-aware** : un message attend que le TUI du destinataire soit au repos avant d'être tapé (2 min d'attente max, puis best-effort). Pas de réaction immédiate ≠ message perdu.
- **At-least-once** : un message n'est marqué lu qu'**après** injection réussie. Doublon possible sur crash, **jamais** de perte.
- **Une injection = une ligne** : les sauts de ligne deviennent ` ⏎ ` (chaque Enter soumettrait un fragment au TUI).
- **Nudge one-shot** : une task `pending` sans réponse au-delà de son délai → **un** rappel `[caserne] (chat) ⏰ …` à l'assigneur. À toi de relancer, réassigner ou abandonner.

## Cycle typique

```
caserne run agy -s audit --alias graphiste   // recrute agy dans la session "audit"
caserne team -s audit                          // graphiste est-il active ?
caserne send graphiste task "…"                // délègue (tracé au ledger)
# la réponse de graphiste s'injecte dans ton pane ; la task passe CLOSED
caserne tasks                                  // état des tâches
caserne fire graphiste                         // libère le pane (réversible)
```

## Erreurs fréquentes

| Erreur | Cause | Correction |
|---|---|---|
| `Agent inconnu dans « <session> » : <alias>` | alias faux ou mauvaise session | `caserne team` pour les alias vivants ; précise `-s` |
| `Agent inactif : <alias>` | destinataire `dead` | recrute-le à nouveau (`caserne run`) ou vise un autre |
| `--timeout n'a de sens que pour une task` | `--timeout` sur chat / response / context | garde `--timeout` pour `task` uniquement |
| `Alias "<a>" déjà pris` | alias explicite d'un agent vivant | choisis-en un autre, ou laisse l'alias auto |
| `Aucune session …` (team / tasks / fire hors tmux) | session non déductible | précise `-s <session>` |

## Ce que cette skill ne couvre pas

- **L'orchestration depuis la session principale** (siège `boss` : dispatch, wait, synthèse) → `/erom-caserne:orchestrate`.
- **L'identité et le travail dans l'agence** (issues Linear, Slack, mail sous ton nom) → `/erom-caserne:control`. Le swarm te fait *tourner en équipe* ; `control` te fait *agir dans l'agence*.
- **L'embauche** (`caserne agent add`) et l'**onboarding projet** (`setup_project`) → hors swarm.
- **Phase 2** (recouvrement messagerie fichier ↔ Slack / Linear) : décision produit à l'usage, hors périmètre v1.
