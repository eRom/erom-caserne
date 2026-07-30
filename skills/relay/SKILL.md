---
name: relay
description: "Transport d'une idée en gestation via une issue Linear (projet Handoffs) pour la reprendre sur n'importe quel harness. Déclenche quand l'utilisateur demande explicitement de déposer, lister, reprendre ou libérer un relay : 'passe le relais', 'dépose cette idée', 'relaie ça', 'sauvegarde cette idée pour plus tard', 'mes relays', 'mes idées en attente', 'reprends le relay X', 'reprends l'idée du dashboard', 'libère le relay'. Ne déclenche JAMAIS spontanément quand une idée est simplement évoquée sans demande de dépôt."
user-invocable: true
---

# /erom-caserne:relay

Un relay = **une issue Linear** dans le projet `Handoffs` qui transporte une **idée en phase gazeuse** : après l'étincelle, avant la pipeline. C'est un passage de témoin curé, pas un dump de conversation. Vise « une session fraîche, sur n'importe quel harness et n'importe quel modèle, reprend sans poser de question bête ».

Quatre verbes : **Déposer**, **Lister**, **Reprendre**, **Libérer**. Intention ambiguë → question fermée, ne devine pas.

## Frontières (ce qu'un relay n'est pas)

- L'idée a un brainstorm formel ou une spec committée ? **Le repo git est le véhicule** : libère le relay en pointant la spec. Un relay ne transporte jamais l'état d'un chantier (git, fichiers, blockers).
- La survie intra-harness (/clear, coupure quota) n'est pas du relay : TaskList et la mémoire native s'en chargent.

## Gabarit

Titre : l'idée en 3-6 mots, sans ponctuation finale.

Description markdown **agnostique** : aucun jargon propre à un harness, aucun chemin sans explication (le relay sera peut-être lu par un autre modèle, ailleurs).

    ## Idée
    (2-4 phrases : quoi, pour qui, pourquoi maintenant)

    ## Next
    (la prochaine étape d'exploration, concrète et petite)

    ## Déclencheur      ← facultatif : d'où ça vient, recharge le contexte mental
    ## Exploré          ← facultatif : pistes discutées ET écartées, avec le pourquoi
    ## Cible            ← facultatif : repo/projet pressenti, harness ou modèle conseillé

Minimum vital : `## Idée` + `## Next`. Les sections facultatives s'ajoutent quand elles portent quelque chose, jamais pour remplir. Un repo cible existe déjà sur le disque → passe son path via le paramètre `workspace` de `create_issue`, pas en prose.

## Déposer

1. Rédige le draft depuis le contexte de la conversation (ne redemande pas ce qui a déjà été dit).
2. Montre le draft complet (titre + description) et demande confirmation.
3. Confirmé :

```
create_issue({
  title: <titre>,
  description: <gabarit rempli>,
  project: "Handoffs",
  labels: ["handoff"],
  state: "Todo",
  notify: false
})
```

(`state: "Todo"` obligatoire : le défaut est Backlog, invisible du listing. `notify: false` : une idée perso ne spamme pas un canal Slack.)

4. Confirme : `Relay déposé : "<titre>" → EAT-XXX` + URL.

## Lister

```
list_issues({ project: "Handoffs", state: "Todo" })
```

« tous » → omettre `state` ; « les finis » → `state: "Done"`. Affichage compact, l'en-tête reflète le state réellement interrogé (`Todo`, `Done`, ou `tous`), toujours avec l'identifier (`list_issues` ne renvoie pas de date : n'en invente pas) :

```
=== Relays (3 Todo) ===
1. [EAT-170] Dashboard v3 temps réel
2. [EAT-165] Connecteur OAuth Stalwart
3. [EAT-158] Bug chunking E5
```

Vide : `=== Relays (0 Todo) ===` + `Rien en attente.`

## Reprendre

- Identifier fourni → `get_issue({ id: "EAT-XXX" })`.
- Sinon : `list_issues({ project: "Handoffs", query: <mots du titre>, limit: 5 })` pour résoudre l'identifier (ce résumé n'a pas de description) — match unique → l'utiliser ; plusieurs → montrer la liste (titres seuls) et demander lequel. Une fois résolu, `get_issue({ id: "EAT-XXX" })` avec l'**identifier** (le champ `identifier` du résumé, pas son `id` interne) pour charger le payload complet.
- Affiche le payload complet, puis reformule le **Next** en 2 phrases max.
- **Pont pipeline** : si le skill `superpowers:brainstorming` est disponible dans ce harness et que l'intention est d'approfondir l'idée, propose d'enchaîner dessus avec le contenu du relay comme brief.
- Ne libère jamais automatiquement à la reprise. L'utilisateur dit « c'est bon, je reprends » → propose de libérer.

## Libérer

Un véhicule a pris le relais (spec committée, repo, PR) ? Pointe-le d'abord :

```
comment_issue({ id: "EAT-XXX", body: "Repris → <spec/repo/PR>" })
```

Puis :

```
update_issue({ id: "EAT-XXX", state: "Done" })
```

Confirme : `Relay "<titre>" libéré (EAT-XXX → Done).`

## Contraintes

- Ne fixe jamais d'autre champ Linear que title/description/project/labels/state (pas de priority, milestone, cycle, assignee, delegate).
- Ne supprime jamais un relay : uniquement `Todo → Done`, l'historique reste.
- Confirme toujours avant création ; affiche toujours `EAT-XXX`.
- Côté web apps (claude.ai, chatgpt.com), ce skill n'existe pas : le connecteur caserne et le prompt de poche (`references/pocket-prompt.md` dans ce dossier de skill) couvrent le dépôt.
