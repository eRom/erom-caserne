# Patterns — erom-caserne

> Mise à jour : 2026-08-01

## Versions

Les **5 manifestes sont toujours ISO**. `plugin/.claude-plugin/plugin.json` fait foi, les 4 autres
s'alignent, jamais l'inverse. Toute modif de contenu se commit **avant** la release ; le commit de
release ne porte que le bump (`chore(release): caserne vX.Y.Z`) et rien d'autre.

Côté `erom-marketplace` : `metadata.version` ne bouge **que** si la release touche aussi la `source`
d'une entrée (patch). Un simple bump de version de plugin n'y touche pas. La `version` racine du
marketplace Codex ne se bumpe pas du tout.

## Distribution

Le dossier `plugin/` est la racine du plugin, consommée en `git-subdir`. C'est la convention de
tous les plugins eRom (`erom-devil`, `erom-image`, `erom-research`) : racine = outillage et
conception, `plugin/` = ce qui s'installe. Aucun asset de release (pas de zip) : tous les canaux
passent par git, le tag ne sert qu'à pinner.

## Anonymisation de `docs/`

`docs/` est public. Les plans et specs citent naturellement les IDs réels de l'installation, donc
tout identifiant y est remplacé par un placeholder **stable**, le libellé adjacent portant le sens
(`| Claude | U0CLAUDE000 |`, `// Handoffs`) :

| Type | Placeholder |
|---|---|
| Slack user/channel | `U0CLAUDE000`, `U0CODEX0000`, `U0GEMINI000`, `U0HUMAN0000`, `C0CASERNE00` |
| UUID Linear | `00000000-0000-4000-8000-0000000000NN`, numérotation stable |
| email | `*@example.com` |
| chemin | `/Users/x` |

Gardés tels quels car déjà factices ou publics : `noreply@anthropic.com`, `claude@x.io`,
`codex@x.io`, `550e8400-e29b-41d4-a716-446655440000` (exemple RFC 4122), `linear.app/erom`.

Le garde-fou de `/release-plugin` scanne **4 patterns génériques** (ID Slack, UUID, email, chemin)
plutôt qu'une liste d'IDs à maintenir : une liste nominative rate le prochain ID inventé.

## Git

Commits conventionnels en français (`refactor(structure):`, `docs:`, `chore(release):`).
Le déplacement de fichiers passe par `git mv` pour que le renommage reste lisible dans l'historique.
