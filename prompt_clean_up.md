Contexte projet

Je travaille sur un monorepo TypeScript/Node/React appelé SylionTech Assistant.

Ce projet est aujourd’hui la base d’un SaaS multi-tenant avec widget assistant.js, backend Fastify, RAG, intégration GCP/Firebase/Vercel.

Le code vient historiquement de deux projets différents :

Magic Button (extension Chrome + backend IA)

Sofinco Assistant (prototype crédit)

Je veux maintenant un projet propre, centré uniquement sur SylionTech, sans aucune référence à “Magic Button” ou “Sofinco”, ni dans le code, ni dans les docs, ni dans les noms de fichiers.

Ton rôle
Tu es un lead dev refactoring.
Ta mission :

Identifier toutes les références résiduelles à Magic Button, magic-button, MB, Sofinco, sofinco-assistant dans le repo.

Proposer une stratégie de nettoyage qui ne casse pas l’application :

Renommer les éléments qui doivent vivre (ex : anciens services Magic Button ou Sofinco qui sont maintenant la base technique de SylionTech).

Supprimer uniquement les fichiers vraiment morts / obsolètes (ex : docs spécifiques à Sofinco ou à l’extension Magic Button qui ne sont plus utilisés du tout par le runtime).

Ne pas changer l’architecture ni introduire de nouvelles features.

Appliquer le nettoyage progressivement, en petites PR internes :

Toujours commencer par montrer la liste des fichiers impactés et les changements prévus avant de modifier.

Après chaque série de modifications, s’assurer que :

le projet compile (pnpm build ou pnpm type-check),

les tests passent (pnpm test),

les scripts de dev (pnpm dev, pnpm dev:server, pnpm dev:web) fonctionnent encore.

Règles de refactoring importantes

Ne change pas le comportement métier :

Les endpoints existants doivent continuer à répondre de la même façon.

Les noms de routes HTTP, les schémas JSON, les payloads API ne doivent pas être modifiés pour l’instant.

Focalise-toi sur :

noms de dossiers / fichiers,

namespaces, variables, classes, commentaires, logs, messages UI,

fichiers markdown (README, rapports, docs),

vieux scripts de déploiement portant encore des noms magic-button ou sofinco.

Ne supprime pas un fichier de code tant que tu n’as pas vérifié qu’il n’est plus importé nulle part. Si tu veux supprimer, commence par :

chercher toutes les références (Find All References / ripgrep),

me montrer la liste,

confirmer qu’aucun import runtime ne l’utilise,

sinon, proposer plutôt un renommage et une adaptation.

Préserve les configs et scripts utiles (Dockerfile, cloudbuild, infra GCP, Firebase, Vercel) en les renommant au besoin, mais sans casser les pipelines.

Cible de renommage

Tout ce qui est Magic Button, magic-button, MB doit devenir :

soit SylionTech Assistant (branding global),

soit syliontech-assistant ou syliontech pour les noms techniques (packages, images Docker, services Cloud Run, etc.).

Tout ce qui est Sofinco, sofinco-assistant doit devenir :

soit SylionTech,

soit demo-credit / credit-demo si on parle d’un cas d’usage spécifique crédit dans les exemples.

Dans les textes marketing ou rapports, remplace les exemples “client Sofinco” par des termes génériques : client bancaire, banque partenaire, ou client démo.

Plan de travail demandé

Étape 1 – Scan & inventaire

Fais un scan global du repo (docs + code) et liste tous les fichiers qui contiennent :

Magic Button / magic-button / MB

Sofinco / sofinco-assistant

Classe les fichiers trouvés en 3 catégories :

Code runtime (utilisé par l’appli aujourd’hui)

Infra / scripts / config (Docker, Cloud Run, Firebase, Vercel…)

Docs / rapports / README / tests de démo

Ne modifie rien tant que cet inventaire n’est pas clair.

Étape 2 – Renommage “safe”

Pour la catégorie 1 (code), propose des renommages “safe” :

ex : MagicButtonService → AssistantService ou SylionAssistantService

ex : sofincoMockFSM → creditDemoMockFSM

Applique ces renommages avec refactoring automatique (rename symbol / rename file), en s’assurant que :

tous les imports sont mis à jour,

la compilation TypeScript continue de passer.

Ne touche pas aux noms de routes HTTP tant que le front / widget les utilise.

Étape 3 – Nettoyage docs / commentaires

Met à jour les README, rapports, docs pour refléter SylionTech Assistant comme projet principal.

Remplace les anciens passages de contexte Magic Button / Sofinco par des formulations génériques :

“prototype précédent” → “version précédente interne”

“Magic Button” → “ancienne extension interne”

S’il existe des docs purement spécifiques à Sofinco qui ne servent plus, mets-les dans un dossier docs/legacy/ au lieu de les supprimer brutalement.

Étape 4 – Nettoyage infra

Repère les fichiers d’infra (Docker, Cloud Run, Cloud Build, Firebase, Vercel) qui mentionnent encore magic-button ou sofinco.

Propose des renommages cohérents vers syliontech-assistant sans casser les pipelines :

images Docker,

noms de services Cloud Run,

labels,

scripts de déploiement.

Pour chaque changement, indique clairement :

ce qui change,

la commande de déploiement mise à jour à utiliser.

Étape 5 – Vérifications

Après chaque vague de refactoring, exécute ou indique clairement les commandes à lancer :

pnpm install (si nécessaire)

pnpm type-check

pnpm test

pnpm dev (backend + web) pour vérifier que le widget et l’interface se lancent encore.

Si tu détectes un risque de casse, propose un rollback partiel ou une autre stratégie.

Style de travail

Toujours expliquer avant de modifier en profondeur.

Préférer plusieurs petites étapes de refactoring à un gros changement global.

Ne pas inventer de nouvelle architecture ni de nouveaux concepts métier : on fait du cleanup, pas un redesign complet.