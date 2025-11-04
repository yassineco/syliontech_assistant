# SilyonTech Assistant — Roadmap (for VS Code + Copilot)

> **Objectif** : Développer un assistant IA (widget + API) intégrable en 1 ligne de code sur le futur site **SilyonTech** et chez les clients (multi‑tenant, RAG, voix, analytics).  
> **Cible** : Firebase/GCP (Firestore, Auth, Storage), Cloud Run/Functions, Vertex AI (Gemini 1.5 Flash/Pro).  
> **Livrables clés** : `assistant.js` (widget), `@silyontech/assistant` (React SDK), `api/v1` (chat, rag, events, webhooks), Admin Console, Docs Dev.

---

## 0) Structure de repo (monorepo conseillé)

```
silyontech-assistant/
├─ apps/
│  ├─ web/                 # Site vitrine + page /docs + intégration widget demo
│  ├─ admin/               # Admin Console (multi-tenant, analytics, keys)
│  └─ api/                 # Backend Cloud Run (Node/Fastify ou Python/FastAPI)
├─ packages/
│  ├─ widget/              # CDN bundle: assistant.js + web components
│  ├─ react-sdk/           # @silyontech/assistant (npm)
│  └─ prompts/             # Prompt templates (system, tools, guardrails)
├─ infra/
│  ├─ firebase/            # hosting, firestore.rules, storage.rules
│  ├─ cloudrun/            # Dockerfiles, cloudbuild.yaml
│  └─ terraform/           # (optionnel) projets/roles/secrets
├─ docs/                   # Guide d'intégration & API
└─ tests/                  # e2e (Playwright), API (Vitest/Pytest), load test (k6)
```

**Copilot Prompt (create repos & scaffolds)**
```
Create a Turborepo monorepo with apps (web, admin, api), packages (widget, react-sdk, prompts). 
Use Next.js + TypeScript + Tailwind + shadcn/ui for web & admin. 
Setup ESLint, Prettier, Husky, lint-staged, commitlint (conventional commits). 
Add GitHub Actions: lint, test, build, deploy (Cloud Run + Firebase Hosting). 
Add .tool-versions and .nvmrc, use pnpm workspaces.
```

---

## 1) Milestones & jalons

### M1 — MVP Intégrable (Semaine 1–2)
- [ ] **Widget CDN** `assistant.js` (bouton flottant + panel chat, thème custom via data-attributes).
- [ ] **Endpoint** `POST /v1/chat` (streaming SSE), modèles Vertex: Gemini 1.5 Flash par défaut.
- [ ] **RAG minimal**: upload PDF/URL → embeddings + recherche.
- [ ] **Multi-tenant** (tenantId + API Key), quotas basiques.
- [ ] **Demo page** dans `apps/web` avec snippet d'intégration.

**Critères d'acceptation**
- [ ] Intégration en 1 `<script>` sur une page statique.
- [ ] Réponse en < 2.5 s pour FAQ simple (Gemini Flash).
- [ ] RAG: citations cliquables + fallback poli si source absente.

### M2 — Admin Console & Docs (Semaine 3–4)
- [ ] **Admin Console**: CRUD tenants, clés API, thèmes widget, quotas.
- [ ] **Docs Dev** (/docs): Widget, Web Component, React SDK, API, Webhooks.
- [ ] **Events** `POST /v1/events` (page, utm, clicks), **Analytics minimal** (conv, intents).
- [ ] **Sécurité**: HMAC webhooks, CORS whitelist, Firestore rules par tenant.

**Critères d'acceptation**
- [ ] Génération/rotation de clés API.
- [ ] Tutoriels WordPress/Shopify/Webflow (copier/coller).
- [ ] Dashboard: courbes conv/jour, top intents, taux auto‑résolution.

### M3 — Intégrations Business (Semaine 5–6)
- [ ] **CRM** (HubSpot/Pipedrive) : création Lead + transcript URL.
- [ ] **Calendrier** (Google/Outlook) : prise de RDV.
- [ ] **WhatsApp Business** (Cloud API) : canal additionnel.
- [ ] **Paiement** (CMI/Stripe) : lien de paiement depuis l'assistant.

**Critères d'acceptation**
- [ ] Lead qualifié → webhook signé appelé chez le client.
- [ ] RDV créé avec lien calendrier + email de confirmation.
- [ ] Journalisation sécurisée (PII redaction).

### M4 — Qualité, Scale & SLA (Semaine 7–8)
- [ ] **Tests**: unit (SDK), e2e (Playwright), charge (k6), sécurité (ZAP).
- [ ] **Cache** (MemoryStore/Redis) : prompts & réponses fréquentes.
- [ ] **Observabilité** (Cloud Monitoring, Error Reporting, Uptime).
- [ ] **SLA** Bronze/Silver/Gold + PRA/PCA (runbooks).

**Critères d'acceptation**
- [ ] p95 latence < 1.7 s (Q&A Flash).
- [ ] 0 P1 sur 7 jours de monitoring.
- [ ] Document SLA/DPA prêt à signer.

---

## 2) Backlog priorisé (technique)

### A. Widget & SDK
- [ ] Bouton flottant, panel, thèmes (auto/system/light/dark), positionnement.
- [ ] `data-*` attributes: `data-tenant-id`, `data-lang`, `data-theme`, `data-primary`, `data-position`, `data-voice`.
- [ ] Web Component `<silyon-assistant>` + React SDK `<SilyonAssistant />`.
- [ ] Events internes (`assistant:open`, `assistant:message`, `assistant:lead`).

**Copilot Prompt (widget)**
```
In packages/widget, implement a vanilla TS widget injected by <script src=...>. 
Expose window.SilyonAssistant.init(options). 
Add a floating button and a modal chat panel with accessible markup. 
Support data-attributes for tenantId/theme/position/primary/lang/voice. 
Emit CustomEvents for open/close/message. 
Bundle via tsup/rollup and publish to /cdn.
```

### B. API & RAG
- [ ] `POST /v1/chat` (SSE), outils: `rag.search`, `calendar.create`, `lead.create`.
- [ ] `POST /v1/rag/documents` (upload PDF/URL/Sitemap), `GET /v1/rag/search?q=`.
- [ ] Indexation: embeddings (Vertex `text-embedding-004`), chunking 512–1024 tokens.
- [ ] Citations: offsets + URLs, affichage dans UI.

**Copilot Prompt (API)**
```
Create a Fastify server in apps/api with routes: POST /v1/chat (SSE), 
POST /v1/rag/documents (multipart), GET /v1/rag/search, POST /v1/events, 
and POST /v1/webhooks/test. 
Add middleware for API key auth (x-api-key), tenant scoping, HMAC verification for outgoing webhooks, and CORS whitelist.
```

### C. Multi-tenant & Sécurité
- [ ] Firestore: collections `tenants`, `keys`, `users`, `conversations`, `documents`.
- [ ] Rules: chaque doc scellé par `tenantId`, validations strictes.
- [ ] Logs sécurisés (PII masking), rotation des clés, quotas (per‑tenant).

**Copilot Prompt (rules)**
```
Write Firestore security rules for a multi-tenant app. 
Ensure each document includes tenantId and only service accounts or admin users with the same tenantId can read/write. 
Deny cross-tenant access. Add composite indexes for conversations by tenantId and createdAt.
```

### D. Analytics & A/B tests
- [ ] Event bus simple → Firestore/BigQuery export.
- [ ] KPI: #conversations, intents top‑10, auto‑résolution, escalade, leads, CA influencé.
- [ ] A/B: prompts & workflows, flags par tenant.

**Copilot Prompt (analytics)**
```
Instrument the widget and API to emit events (page, open, message, intent, lead, error). 
Stream to BigQuery via Cloud Functions. 
Build a minimal dashboard in apps/admin with charts (recharts) per tenant and time range.
```

### E. Intégrations externes
- [ ] CRM: HubSpot/Pipedrive (leads, notes, owner).
- [ ] Calendriers: Google/Outlook (OAuth, free-busy, create event).
- [ ] WhatsApp/Messenger: passerelle initiale (templates, session).

---

## 3) Qualité, sécurité, CI/CD

- **Code quality**: ESLint + Prettier + type‑safe SDK, Zod pour valider payloads.
- **Tests**: Vitest/Jest (unit), Playwright (e2e widget), k6 (charge), OWASP ZAP (DAST).
- **CI**: GitHub Actions (lint → test → build → deploy). Review Apps par PR.
- **Secrets**: GCP Secret Manager, jamais en clair. 
- **Monitoring**: Healthchecks, budgets GCP, alertes latence/erreur.

**Copilot Prompt (CI)**
```
Add GitHub Actions workflows: 
1) lint-test.yml (pnpm install, lint, test), 
2) build-deploy.yml (build monorepo, dockerize apps/api, deploy to Cloud Run, deploy Firebase Hosting for apps/web and admin).
```

---

## 4) Spécifications d'API (extraits)

### `POST /v1/chat` (SSE)
- Auth: `x-api-key: <TENANT_KEY>`
- Body: `{ "messages":[...], "session":{ "userId":"...", "lang":"fr" } }`
- Tools: `"rag.search"`, `"lead.create"`, `"calendar.create"`
- Response: `text/event-stream` (chunks), meta: citations, intent, score.

### `POST /v1/rag/documents`
- multipart/form-data (`file` | `url` | `sitemap`), options: `namespace`, `parser`.
- Response: `{ documentId, chunks, tokens, embedCost }`

### `POST /v1/events`
- Body: `{ type, at, sessionId, page, utm, payload }`

### Webhooks sortants (signés HMAC)
- Header: `x-silyon-signature`
- Body (ex lead): `{ tenantId, event:"lead.qualified", user, intent, score, transcriptUrl }`

---

## 5) Intégration côté client (snippets)

### Script (CDN)
```html
<script
  src="https://cdn.silyon.tech/assistant.js"
  data-tenant-id="TENANT_ID"
  data-lang="fr"
  data-theme="auto"
  data-primary="#10b981"
  data-position="bottom-right"
  defer
></script>
```

### Web Component
```html
<script src="https://cdn.silyon.tech/webcomponents/silyon-assistant.js" defer></script>
<silyon-assistant tenant="TENANT_ID" lang="fr" theme="light" voice="on"></silyon-assistant>
```

### React SDK
```tsx
import { SilyonAssistant } from "@silyontech/assistant";
<SilyonAssistant tenantId={process.env.NEXT_PUBLIC_TENANT!} lang="fr" voice theme="system" />
```

---

## 6) Prompts & garde‑fous

- **System**: rôle, ton, limites, RGPD/CNDP, refus si hors périmètre.
- **Tools**: schémas JSON stricts (Zod) pour `rag.search`, `lead.create`, `calendar.create`.
- **Policies**: sécurité (pas de données sensibles), disclaimers juridiques adaptés.
- **Eval**: test sets par tenant (FAQ → réponse attendue).

**Copilot Prompt (prompts)**
```
Create a 'prompts' package with system, developer and function-call templates. 
Add a guardrail to refuse answers without sources when RAG is required. 
Provide unit tests asserting the prompt contains tenant-specific constraints.
```

---

## 7) Déploiement GCP & Firebase

- **Cloud Run**: `apps/api` (min instances = 0), Cloud Build triggers, IAM restreint.
- **Firebase Hosting**: `apps/web` + `apps/admin` + `/cdn` (widget).
- **Firestore**: TTL sur conversations (ex 30 jours), indexes composés.
- **Storage**: bucket dédié par environnement (dev/stage/prod).
- **Budgets**: alertes dépenses, quotas API Vertex.

**Copilot Prompt (deploy)**
```
Create Dockerfile for apps/api (Node 22, pnpm). 
Add cloudbuild.yaml to build and deploy to Cloud Run with service account. 
Configure Firebase Hosting for apps/web and apps/admin with rewrites and cache headers for /cdn/*.
```

---

## 8) Roadmap produit (12 semaines)

1. **S1–2** : MVP (Widget + /v1/chat + RAG minimal + demo page).
2. **S3–4** : Admin Console + Docs Dev + Analytics v1.
3. **S5–6** : Intégrations CRM/Calendrier + Webhooks + Paiement lien.
4. **S7–8** : Tests e2e/charge + Observabilité + SLA/DPA.
5. **S9–10** : WhatsApp/Messenger + Templates sectoriels.
6. **S11–12** : Pack « White Label » + déploiements privés (on‑prem Docker).

---

## 9) Checklists

**Avant Go‑Live**
- [ ] Snippet fonctionne sur site statique/WordPress.
- [ ] RAG + citations OK sur 3 PDFs différents.
- [ ] Admin: création clés, quota & thème OK.
- [ ] Alertes budgets et uptime activées.
- [ ] Page confidentialité + consentement micro.

**Après Go‑Live (2 semaines)**
- [ ] Taux d'auto-résolution > 55 %.
- [ ] p95 latence < 2 s.
- [ ] 0 incident P1/P2.
- [ ] 3 études de cas clients.

---

## 10) Annexes (modèles & utilitaires)

- **Fichiers modèles**: `tenant-config.json`, `theme.json`, `webhook-examples/*.json`.
- **CLI interne** (optionnel): `silyon-cli` (create-tenant, rotate-key, import-faq).
- **Jeux de données démo**: FAQ génériques + Intent templates (devis, prix, rdv).

---

> **Note** : Cette roadmap est optimisée pour **VS Code + Copilot**. Utilise les prompts inclus pour générer les squelettes, policies, tests et CI/CD rapidement. Met à jour les jalons selon tes retours terrain et les priorités clients.