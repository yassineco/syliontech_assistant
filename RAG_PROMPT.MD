# Rôle
Tu es lead dev full-stack. Tu dois équiper le projet **sofinco-assistant** d’un **RAG complet** pour l’assistant (écrit + vocal) afin de répondre aux questions clients (FAQ crédit, conditions, documents, process) et exécuter des **simulations de crédit**. 
Le pipeline doit fonctionner en:
- **LIVE** (Vertex AI Gemini + embeddings) si env OK,
- **MOCK/RAG-lite** (index local + réponses déterministes) sinon.

# Objectifs fonctionnels
1) **Ingestion & Index**: charger des fichiers de connaissance (FAQ/produits/process) depuis `apps/server/knowledge/*.md`, les découper (chunking), générer des **embeddings** (LIVE: Vertex `text-embedding-004`; MOCK: fallback TF-IDF), et produire un **index vectoriel JSON** persistant `apps/server/data/rag_index.json`.
2) **Retrieval**: endpoint `POST /api/rag/query` → retourne `topK` passages avec métadonnées et scores (cosine).
3) **Synthesis**: endpoint existant `POST /api/assistant` doit:
   - détecter l’intention (question FAQ vs simulation),
   - si FAQ: faire `retrieve → synthèse Gemini` (LIVE) ou **générateur local** (MOCK) en citant les sources,
   - si simulation: appeler `/api/simulate` puis intégrer le résultat dans la réponse.
4) **Admin**: endpoint `POST /api/rag/reindex` pour (ré)ingérer le contenu et régénérer l’index.
5) **Citations**: l’assistant renvoie des **citations** (titres fichiers + anchors) dans la réponse.
6) **Sécurité/Logs**: aucune clé en front; logs Firestore (sessions/messages/events) existent déjà.
7) **UI web**: dans `AssistantPanel`, afficher les **citations cliquables** sous chaque réponse.

# ENV requis (.env)
USE_MOCK=true
GCP_PROJECT_ID=__sofinco-assistant-demo__
GEMINI_LOCATION=us-central1
GEMINI_MODEL=gemini-1.5-flash
EMBED_MODEL=text-embedding-004
FIREBASE_PROJECT_ID=__sofinco-assistant-demo__
FIREBASE_CLIENT_EMAIL=__svc@sofinco-assistant-demo.iam.gserviceaccount.com__
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n__...__\n-----END PRIVATE KEY-----\n"

# Server – nouveaux modules (apps/server)
Créer/compléter les fichiers suivants:

- `src/rag/types.ts`
  - `DocChunk`: { id:string; docId:string; title:string; url?:string; text:string; vector?:number[]; tokens?:number; }
  - `RagQuery`: { q:string; topK?:number }
  - `RagResult`: { chunks: Array<DocChunk & { score:number }> }

- `src/rag/chunk.ts`
  - Exporter `chunkMarkdown(md: string, docId: string, title: string)` → retourne `DocChunk[]` (chunks ~500–800 tokens, overlap ~100).

- `src/rag/embed.ts`
  - Fonction `embedTexts(texts:string[]): Promise<number[][]>`:
    - **Si `USE_MOCK=true`** → TF-IDF local simple (ou renvoie vecteurs normalisés par hashing).
    - **Sinon** (LIVE) → Vertex embeddings `text-embedding-004` (batch) via project/location des ENV. 
  - Normaliser les vecteurs (L2).

- `src/rag/index.ts`
  - `buildIndexFromFolder(knowledgeDir="knowledge")`:
    - Lire tous les `.md`, chunker, embedder les chunks.
    - Sauver `apps/server/data/rag_index.json` (créer dossier `data` si absent).
  - `loadIndex()` → charge en mémoire, calcule matrice pour similarities.
  - `searchIndex(q:string, topK=5)` → embed la requête, cosine similarity, renvoie `RagResult`.

- `src/rag/knowledge-loader.ts`
  - Utilitaire pour lire fichiers, extraire titre (H1), générer `docId`, construire `url` factice (#ancre).

- `src/routes/rag.ts`
  - `POST /api/rag/reindex` → lance `buildIndexFromFolder`, renvoie stats (#docs, #chunks).
  - `POST /api/rag/query` body:`RagQuery` → `searchIndex`.

- `src/services/llm.ts`
  - `answerWithGemini(query:string, retrieved:DocChunk[], extra?:object)`:
    - Prompt system:
      - “Tu es l’Assistant Crédit (Prototype). Réponds brièvement, vouvoiement, cite tes sources sous forme de liste [Titre §Ancre]. Si l’info manque, dis-le honnêtement.”
    - Fournir à Gemini: question + `retrieved` (texts+titles).
    - Sortie attendue: `{ reply:string; citations:{title:string; anchor?:string}[] }`.
    - Parse/valider (Zod) pour éviter réponses libres.
  - `answerLocally(query, retrieved)` (fallback): 
    - Réponse extractive simple (concat top chunks + heuristique), 
    - Générer citations basées sur les chunks.

- `src/routes/assistant.ts` (adapter)
  - Détection d’intention:
    - Si message contient termes `mensualité`, `TAEG`, `prêt`, `simuler` → route simulation.
    - Sinon → `RAG`: `searchIndex(q)` → 
      - **LIVE**: `answerWithGemini`, 
      - **MOCK**: `answerLocally`.
  - Retour: `{ reply, citations, intent:'faq'|'simulate'|'other', slots?, offers? }`

- `src/services/finance.ts` (déjà présent)
  - S’assurer que `simulate` retourne mensuel + 2 offres.

- `src/index.ts`
  - Monter routes `rag` et mettre à jour CORS si besoin.

# Connaissances – fichiers seed (apps/server/knowledge)
Créer des fichiers `.md` d’exemple (contenu fictif) pour couvrir 80% des questions clients:
- `faq_generales.md`
  - Éligibilité, étapes d’une demande, délais, justificatifs.
- `pret_auto.md`
  - Conditions, montants/durées typiques, assurance facultative, frais.
- `simulation_et_taux.md`
  - Définition mensualité, TAEG indicatif, exemples.
- `process_contact.md`
  - Comment être rappelé, prise de RDV, horaires support.

Chaque fichier doit avoir un **H1 titre** et des **H2/H3** pour les ancres.

# Web – UX citations (apps/web)
- Dans `AssistantPanel.tsx`, sous la bulle de réponse assistant, afficher:
  - “Sources : [Titre §Ancre], …” (liens cliquables si `url` fourni).
- Ajouter une commande “/reindex” (admin) ou un bouton caché (si rôle admin) pour appeler `/api/rag/reindex` et afficher un toast “Index reconstruit (N chunks)”.

# Tests (Vitest)
- `test/rag_index.test.ts`: 
  - buildIndexFromFolder sur 2 fichiers de test,
  - searchIndex sur 3 requêtes,
  - vérifier ordre des scores & non-vides.
- `test/assistant_rag.test.ts`:
  - MOCK: injecter 2–3 chunks, `answerLocally` retourne citations & texte non vide.
- `test/embed_mock.test.ts`:
  - embedTexts en MOCK renvoie vecteurs normalisés.

# README (mise à jour)
- Section **RAG**:
  - Comment ajouter/éditer un `.md` (knowledge),
  - Rebuild index: `POST /api/rag/reindex`,
  - Mode MOCK vs LIVE (env),
  - Démo: 
    - “Qu’est-ce que le TAEG ?”
    - “Quels documents pour un prêt auto ?”
    - “Simulez 100 000 DH sur 48 mois.”
  - Citations et limites (prototype, infos fictives).

# Critères d’acceptation
- [ ] `/api/rag/reindex` construit `data/rag_index.json` et renvoie stats.
- [ ] `/api/rag/query` retourne des chunks pertinents avec scores.
- [ ] `/api/assistant` route soit vers `simulate`, soit vers `RAG` selon l’intention.
- [ ] En **MOCK** (USE_MOCK=true): RAG répond de façon plausible + citations.
- [ ] En **LIVE** (USE_MOCK=false): Gemini synthétise avec citations.
- [ ] UI: réponses affichent les **citations** sous la bulle.
- [ ] Documentation README à jour, tests Vitest passent.

# À exécuter maintenant
- Générer tout le code indiqué.
- Créer 4 fichiers `.md` dans `apps/server/knowledge/` avec contenu fictif lisible.
- Exposer endpoints RAG et brancher assistant.
- Ajouter affichage citations en front.
- Écrire tests et mettre à jour README.
