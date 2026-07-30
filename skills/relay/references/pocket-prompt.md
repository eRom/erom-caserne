# Prompt de poche — déposer un relay depuis les web apps

À coller dans les custom instructions (claude.ai) ou les instructions d'un projet ChatGPT, sur un compte où le connecteur caserne (MCP Streamable HTTP) est branché :

> Quand je te demande de déposer/relayer une idée : crée une issue Linear via le connecteur caserne avec `create_issue({ project: "Handoffs", labels: ["handoff"], state: "Todo", notify: false })`. Titre 3-6 mots. Description markdown : `## Idée` (2-4 phrases) et `## Next` (prochaine étape concrète) obligatoires ; `## Déclencheur`, `## Exploré`, `## Cible` seulement s'ils portent quelque chose. Montre-moi le draft avant de créer.

La reprise se fait de préférence sur un harness équipé du skill `relay` (« reprends le relay X »). Sans connecteur, le fallback reste l'app Linear (mobile/web) : le réceptacle est une simple issue du projet Handoffs.
