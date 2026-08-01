# Manuel des tools caserne

> Généré depuis le code par `scripts/generate-tools-manual.ts` — ne pas éditer à la main.
> Régénération : `bun run generate:tools-manual` ; le test `tests/tools-manual.test.ts`
> échoue tant que ce fichier dérive des tools enregistrés dans `src/server.ts`.

19 tools, dans l'ordre d'enregistrement de `src/server.ts`.

## `whoami`

Identité de l'agent courant, projet courant et référentiel (statuts, labels, annuaire). À appeler en début de session.

Sans paramètre.

## `create_issue`

Crée une issue Linear sous l'identité de l'agent, dans le projet courant par défaut, et annonce dans le canal Slack projet (notify: false pour débrayer).

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `title` | string | oui |  |
| `description` | string | non |  |
| `state` | string | non | Nom de statut (défaut Backlog) |
| `labels` | array<string> | non |  |
| `delegate` | string | non | Clé d'un salarié (ex: glm) |
| `project` | string | non | Nom de projet (défaut : projet courant) |
| `workspace` | string | non | Full path du projet sur le disque (rendu en bloc '#### workspace' dans la description, cohérent avec le form template) |
| `notify` | boolean | non |  |

## `update_issue`

Met à jour une issue (statut, labels, titre, description, délégué).

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `id` | string | oui | Identifiant, ex: EAT-12 |
| `state` | string | non |  |
| `labels` | array<string> | non |  |
| `title` | string | non |  |
| `description` | string | non |  |
| `delegate` | string | non |  |

## `comment_issue`

Commente une issue sous l'identité de l'agent.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `id` | string | oui |  |
| `body` | string | oui |  |

## `get_issue`

Lit une issue et ses commentaires.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `id` | string | oui |  |

## `list_issues`

Liste les issues (projet courant par défaut). mine:true = celles qui te sont assignées ; active:true = exclut Done/Canceled/Duplicate.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `project` | string | non | Nom de projet |
| `state` | string | non |  |
| `delegate` | string | non | Clé d'un salarié (incompatible avec mine) |
| `query` | string | non |  |
| `limit` | integer | non |  |
| `mine` | boolean | non | Tes issues (delegate = toi) |
| `active` | boolean | non | Exclut Done/Canceled/Duplicate |

## `setup_project`

Composite idempotent : projet Linear + canal Slack privé + invitations + welcome + ONBOARD.md. Ne crée que le manquant.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `name` | string | non |  |
| `description` | string | non |  |

## `list_projects`

Liste les projets Linear de la team.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `query` | string | non |  |

## `post_message`

Poste dans Slack sous l'identité du bot de l'agent (canal projet par défaut, thread_ts pour répondre). Mentions par clé : @romain, @glm.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `text` | string | oui |  |
| `channel` | string | non | ID de canal |
| `thread_ts` | string | non |  |

## `read_thread`

Lit un thread Slack complet.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `channel` | string | non |  |
| `thread_ts` | string | oui |  |

## `get_inbox`

Inbox de l'agent : mentions Slack non traitées (sans ✅) + issues Linear actives déléguées + mails non lus. Canaux non membres et boîte mail indisponible sont remontés (skippedChannels / mailSkipped), jamais fatals.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `channels` | array<string> | non |  |
| `limit` | integer | non |  |

## `project_status`

Vue d'ensemble du projet courant (lecture seule) : toutes les issues actives (triées par avancement) + tes derniers messages mentionnés. Distinct de get_inbox (ta file de triage : mentions non traitées + délégations + mails non lus).

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `limit` | integer | non | Nb de mentions (défaut 5) |

## `list_mentioned`

Tes derniers messages Slack où tu es mentionné (défaut 5), canaux projet, traités inclus (handled). Fil d'attention, pas file de triage (≠ get_inbox).

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `channels` | array<string> | non | IDs de canaux (défaut : canaux projet) |
| `limit` | integer | non |  |

## `search_messages`

Cherche une chaîne dans l'historique des canaux du projet courant (insensible à la casse), du plus récent au plus ancien. Scope projet : ce n'est pas une recherche Slack globale.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `query` | string | oui |  |
| `channels` | array<string> | non | IDs de canaux (défaut : canaux projet) |
| `limit` | integer | non | Nb de résultats (défaut 20) |

## `add_reaction`

Pose une réaction (défaut ✅ = traité) sur un message Slack.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `channel` | string | non |  |
| `ts` | string | oui |  |
| `emoji` | string | non |  |

## `link_slack_thread`

Attache un thread Slack (permalink) à une issue Linear.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `issue_id` | string | oui |  |
| `channel` | string | non |  |
| `thread_ts` | string | oui |  |

## `send_mail`

Envoie un mail sous la boîte de l'agent. `to`/`cc` acceptent une clé d'annuaire (glm, romain) ou une adresse littérale. `attachments` = full paths locaux.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `to` | array<string> | oui | Clés d'annuaire ou adresses email |
| `subject` | string | oui |  |
| `body` | string | oui |  |
| `cc` | array<string> | non |  |
| `attachments` | array<string> | non | Full paths de fichiers locaux |

## `reply_mail`

Répond à un mail dans son thread (Re:, In-Reply-To conservés). Le destinataire est déduit de l'original.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `id` | string | oui | Id du mail auquel répondre (issu de get_inbox / get_mail) |
| `body` | string | oui |  |
| `attachments` | array<string> | non |  |

## `get_mail`

Lit un mail complet (en-têtes, corps, pièces jointes). Le lire le marque comme traité (il sort de get_inbox). `save_attachments_to` écrit les pièces jointes sur le disque et renvoie leurs paths.

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `id` | string | oui |  |
| `save_attachments_to` | string | non | Dossier où écrire les pièces jointes (paths renvoyés) |
