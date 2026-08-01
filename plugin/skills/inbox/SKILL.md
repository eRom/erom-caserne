---
name: inbox
description: "Vue « boîte de réception » du projet eRom courant via le MCP Caserne : les issues Linear actives du projet + tes derniers messages Slack mentionnés. Un seul tool (`project_status`) fait tout : résolution du projet courant, tri, mentions, garde-fous. Déclenche dès que l'utilisateur veut faire le point : 'inbox', 'ma boîte', 'quoi de neuf sur le projet', 'qu'est-ce qui m'attend', 'les issues en cours', 'où on en est', 'check le projet', 'messages en attente'."
user-invocable: true
---

# /erom-caserne:inbox

Vue d'ensemble du **projet courant**, en **lecture seule** : les issues actives côté Linear et tes derniers messages mentionnés côté Slack. On consulte, on ne modifie rien.

Tout est fait par un seul tool du MCP Caserne : **`project_status`**. Il résout le projet courant (`_memory_/ONBOARD.md`), trie les issues, récupère tes mentions et gère les garde-fous. Cette skill ne fait qu'appeler et présenter.

> `project_status` = vue projet. À ne pas confondre avec `get_inbox` = ta file de triage perso (issues déléguées à toi + mentions non traitées). Ici on veut l'**état du projet**.

## 1. Appeler le tool

```
project_status({ limit? })        // limit = nb de mentions à remonter (défaut 5)
→ { project, issues, mentions, skippedChannels }
```

- `issues` : toutes les issues actives du projet (hors `Done/Canceled/Duplicate`), **déjà triées** par avancement (`Implementation` → `Specification` → `Todo` → `Backlog`). Chaque item : `{ identifier, title, state, url }`.
- `mentions` : tes derniers messages te mentionnant, du plus récent au plus ancien. Chaque item : `{ author, text, ts, handled }` (`handled: true` = déjà réagi ✅).
- `skippedChannels` : canaux Slack où ton bot n'est pas membre (non fatals).

**Garde-fou** : si le tool renvoie une erreur « aucun projet courant », relaie-la telle quelle et arrête-toi :
```
Pas d'identité projet - inbox indisponible.
Lance /onboarding (setup_project) pour générer _memory_/ONBOARD.md.
```

## 2. Présenter

Un bloc unique, Linear puis Slack.

```
=== Inbox <project> ===

📋 Issues actives (<n>)
| ID      | Title                      | Status         |
|---------|----------------------------|----------------|
| EAT-142 | Refacto pipeline ingestion | Implementation |
| EAT-138 | Spec connecteur OAuth      | Specification  |
| EAT-151 | Bug dédup chunks           | Todo           |

💬 Mentions (<n>)
- Romain : « @toi tu peux regarder EAT-151 ? »   ✅ traité
- Romain : « ping sur le déploiement »
```

- Garde l'ordre renvoyé par le tool (ne re-trie pas) ; le reste du rendu suit le gabarit.
- Volet vide → une ligne explicite (`Aucune issue active sur ce projet.` / `Aucune mention récente.`).
- `skippedChannels` non vide → une ligne : `Canaux non lus (bot non invité) : <ids> - /invite pour les voir.`

## Contraintes

- **Lecture seule.** Ne crée, ne modifie et ne ferme rien (ni issue, ni message, ni réaction).
- Ne devine jamais le projet : sans projet courant, on s'arrête (le tool le signale).
