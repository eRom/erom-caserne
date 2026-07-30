---
name: orchestrate
description: "Doctrine du chef d'orchestre du réseau caserne : déléguer un travail à un salarié IA du swarm depuis la session principale (siège boss, hors pane), suivre l'exécution et synthétiser le livrable. Déclenche UNIQUEMENT sur intention réseau explicite : déléguer / dispatcher à un salarié nommé (« délègue à agy », « demande à agy de… »), lancer un travail « via l'agence » / « sur le réseau », ou suivre une task réseau déjà lancée (où en est la task, relance agy, lis la réponse). Ne se déclenche PAS sur une demande de recherche ordinaire sans intention réseau exprimée : elle reste aux moyens locaux de la session. Complément hors-pane de la skill network (le manuel du salarié dans son pane)."
user-invocable: true
---

# Agence — orchestrer le réseau depuis la session principale (siège boss)

Le swarm caserne fait tourner une équipe de salariés IA dans une session tmux (la skill `network` est leur manuel). Ce skill est l'autre bout de la lunette : **toi, la session principale, hors pane**, qui délègues un travail au réseau et récupères le livrable. Hors pane (`CASERNE_ALIAS` absent), caserne te donne automatiquement le siège externe **`boss`** : tes `send` / `read` signent `boss`, sans configuration.

Tout passe par le CLI **`caserne`** (surface exacte : `caserne` sans argument). Ce skill enseigne le *quand / pourquoi* — le protocole, pas les flags.

## Les principes non négociables

1. **Déclenchement explicite seulement.** Tu ne dispatches au réseau que sur intention exprimée (« délègue à agy », « via l'agence », un salarié nommé). Une recherche ordinaire reste aux moyens locaux de la session hôte. Pas de spawn implicite.
2. **Hors pane, tu es `boss`.** Jamais une incarnation : `boss` est refusé au spawn mais toujours joignable en messagerie. `-s agence` est obligatoire sur chaque commande (hors serveur tmux, la session n'est pas déductible). Session standing par convention : **`agence`**.
3. **Aucun artefact dans la messagerie.** Les livrables vont dans un dossier de sortie ; la response ne porte que résumé + chemins. L'injection chez toi est tronquée (~500 caractères), le ledger reste léger.
4. **N'utilise JAMAIS tmux directement.** `team`, `send`, `tasks`, `fire` : caserne fait tout.
5. **Jamais de bascule silencieuse coûteuse.** Un échec du réseau se rattrape **une fois** (table plus bas) ; ensuite tu préviens et proposes le fallback local. Tu ne relances pas en boucle.

## Table de routage v1

Utilisée seulement quand le salarié n'est pas nommé :

| Signal | Salarié | Pourquoi |
|---|---|---|
| Deep research, veille, état de l'art | `agy` | Grounding Google natif, quota Antigravity |
| Actualité chaude : social, politique, santé, événements en cours | `grok` | 2e moteur deep, ancrage temps réel sur X ; hors quota Google |

Salarié nommé explicitement (« délègue à glm ») → la table est court-circuitée, même protocole. **Exception : la génération d'images reste hors v1 même pour un salarié nommé** (capacité d'agy en pane non vérifiée, cf. « Ce que ce skill ne couvre pas »).

## Le protocole de dispatch (5 temps)

### 1. Ensure up

```
caserne team -s agence
caserne run agy -s agence --detach     # seulement si absent ou dead
```

`--detach` : spawn silencieux, sans attach (ton terminal n'est pas volé). **Aucune attente de readiness** : le send est valide dès la réservation au roster (`spawning` accepté), l'injection idle-aware part quand le TUI du salarié est prêt.

### 2. Formule l'objective (gabarit)

Un objective structuré, gardé **sur une seule ligne** de préférence (l'injection dans le pane aplatit de toute façon les retours à la ligne en ` ⏎ `, mais un objective mono-ligne reste plus lisible) :

```
<mission en une phrase>. Contexte : <ce qu'il faut savoir>. Écris tes livrables dans <ABS>/.claude/agence/out/<ton task_id>/ (crée le dossier). Quand c'est fini, réponds par : caserne send boss response <task_id> success|failure <résumé + chemins des fichiers>.
```

- `<ABS>` = chemin **absolu** du projet courant. Le cwd du salarié n'est pas le tien (la session `agence` est cross-projets) : tout chemin passé est absolu.
- Le salarié connaît son `task_id` (il est dans le message reçu) : il crée le sous-dossier lui-même ; toi tu reconstruis le chemin exact dès le send.
- La consigne de clôture est redondante avec le bootstrap caserne : ceinture et bretelles.

### 3. Send — capture le `task_id`

```
caserne send agy task "<objective>" -s agence
```

Imprime le **`task_id` seul sur stdout** (contrat parsable). Capture-le : c'est ta clé de suivi. S'il sort `message livré, mais tâche non enregistrée au ledger (ne PAS re-send)` : n'envoie **pas** une deuxième fois, le message est déjà chez le salarié — suis à la main (`caserne read -s agence`).

### 4. Attends en arrière-plan

```
caserne tasks <task_id> --wait -s agence
```

Lance ce wait **en tâche de fond** de ton harness et continue ton travail : tu es réveillé à la clôture.

| Exit | Sens | Et ensuite |
|---|---|---|
| 0 | task close (success **ou** failure) — la fiche est imprimée | lis le result |
| 2 | destinataire dead (tâche orpheline) | rattrapage ci-dessous |
| 3 | timeout (défaut 30 min ; `--timeout <min>`) | rattrapage ci-dessous |

### 5. Au réveil : vérifie, puis synthétise

- Lis le result (résumé + chemins). Une **failure est une clôture** : lis-la, elle dit pourquoi.
- **Vérifie l'existence réelle des fichiers livrés** (`ls` du dossier de sortie) avant d'affirmer quoi que ce soit.
- Synthétise à l'utilisateur ; remonte le fichier si le livrable le mérite.

## Rattrapages

| Symptôme | Rattrapage (une fois) | Si ça échoue encore |
|---|---|---|
| wait exit 2 (orpheline) | `caserne run <agent> -s agence --detach` puis re-dispatch d'une **task neuve** | préviens et propose le fallback local |
| wait exit 3 (timeout) | `caserne send <alias> chat "où en es-tu sur <task_id> ?" -s agence` + re-wait | préviens et propose le fallback local |
| réponse mal formée (chat au lieu de response, task jamais close) | même traitement que le timeout ; `caserne read --unread -s agence` + `caserne tasks -s agence` pour voir ce qui s'est réellement dit | idem |
| tmux absent ou cassé (`caserne doctor`) | — | fallback local d'emblée |

« Fallback local » = les moyens de recherche de la session hôte (subagents, workflows) — leur choix est la configuration de la session, hors périmètre de ce skill.

## Erreurs fréquentes

| Erreur | Cause | Correction |
|---|---|---|
| `Aucune session : lance depuis un pane swarm, ou précise -s <session>.` | `-s` oublié (hors tmux, session non déductible) | ajoute `-s agence` |
| `Agent inconnu dans « agence » : <alias>` | salarié jamais recruté dans la session | `caserne run <agent> -s agence --detach` |
| `Agent inactif : <alias>` | incarnation dead | idem (respawn), puis re-dispatch |
| `Alias réservé : "boss" …` | tentative de spawner une incarnation nommée boss | `boss` n'est pas une incarnation ; choisis un autre alias |

## Cycle typique

```
caserne team -s agence                          # agy actif ?
caserne run agy -s agence --detach              # sinon : spawn silencieux
caserne send agy task "État de l'art X. Contexte : Y. Écris tes livrables dans /abs/du/projet/.claude/agence/out/<ton task_id>/ (crée le dossier). Quand c'est fini, réponds par : caserne send boss response <task_id> success|failure <résumé + chemins>." -s agence
# → task-ab12
caserne tasks task-ab12 --wait -s agence        # en tâche de fond
# … tu continues ton travail ; réveil à la clôture …
ls /abs/du/projet/.claude/agence/out/task-ab12/ # vérifie le livrable, puis synthétise
```

## Ce que ce skill ne couvre pas

- **Le salarié dans son pane** (recruter, répondre à une task, `team` / `fire` / `clean`) → `/erom-caserne:network`.
- **L'identité et le travail dans l'agence** (Linear, Slack, mail) → `/erom-caserne:control`.
- **Le choix des moyens locaux de fallback** : configuration de la session hôte, hors plugin.
- **Le volet images** (génération / édition → agy) : hors v1 **y compris sur demande nommée**, tant que la capacité d'agy à générer des images dans son pane n'est pas vérifiée sur un cas réel. Le jour venu, c'est une ligne de plus à la table de routage.
