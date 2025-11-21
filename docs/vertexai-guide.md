# 🧠 Guide Vertex AI - Magic Button

## Vue d'ensemble

Ce guide détaille l'utilisation de Vertex AI dans le projet Magic Button, couvrant l'API Gemini pour la génération de texte et l'API Text Embeddings pour la recherche sémantique (RAG).

## Configuration et authentification

### Service Account et permissions

```bash
# Service Account avec les rôles nécessaires
gcloud iam service-accounts create magic-button-api \
    --display-name="Magic Button API"

# Permissions Vertex AI
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:magic-button-api@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

### SDK et initialisation

```typescript
import { VertexAI } from '@google-cloud/vertexai';

// Initialisation du client Vertex AI
const vertexAI = new VertexAI({
  project: process.env.PROJECT_ID,
  location: process.env.VERTEX_LOCATION, // us-central1
});

// Modèles disponibles
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
});

const embeddingModel = vertexAI.getGenerativeModel({
  model: 'text-embedding-004',
});
```

## API Gemini - Génération de texte

### Configuration des paramètres

```typescript
interface GenerationConfig {
  temperature: number;        // 0.0-2.0, créativité
  topP: number;              // 0.0-1.0, diversité tokens
  topK: number;              // Nombre top tokens
  maxOutputTokens: number;   // Limite réponse
  candidateCount: number;    // Nombre alternatives
}

const generationConfig: GenerationConfig = {
  temperature: 0.2,          // Faible pour cohérence
  topP: 0.8,                 // Bon équilibre
  topK: 40,                  // Standard
  maxOutputTokens: 1024,     // Réponses courtes
  candidateCount: 1,         // Une seule réponse
};
```

### Filtres de sécurité

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];
```

### Actions IA - Exemples concrets

#### 1. Correction de texte

```typescript
async function correctText(text: string): Promise<string> {
  const prompt = `
Corrige les erreurs d'orthographe, de grammaire et de syntaxe dans le texte suivant.
Préserve le style et le ton original.
Ne modifie que les erreurs évidentes.

Texte à corriger :
"${text}"

Texte corrigé :`;

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // Très faible pour cohérence
      maxOutputTokens: Math.max(text.length * 2, 256),
    },
    safetySettings,
  });

  return result.response.candidates[0].content.parts[0].text;
}
```

#### 2. Résumé intelligent

```typescript
async function summarizeText(text: string, maxLength: number = 200): Promise<string> {
  const prompt = `
Résume le texte suivant en maximum ${maxLength} mots.
Conserve les points clés et les informations essentielles.
Utilise un style clair et concis.

Texte à résumer :
"${text}"

Résumé (max ${maxLength} mots) :`;

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: Math.min(maxLength * 2, 512),
    },
    safetySettings,
  });

  return result.response.candidates[0].content.parts[0].text;
}
```

#### 3. Traduction contextuelle

```typescript
async function translateText(text: string, targetLanguage: string): Promise<string> {
  const prompt = `
Traduis le texte suivant vers ${targetLanguage}.
Préserve le style, le ton et les nuances.
Adapte les expressions idiomatiques si nécessaire.

Texte à traduire :
"${text}"

Traduction en ${targetLanguage} :`;

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: text.length * 2,
    },
    safetySettings,
  });

  return result.response.candidates[0].content.parts[0].text;
}
```

#### 4. Optimisation de contenu

```typescript
async function optimizeContent(text: string, purpose: string): Promise<string> {
  const prompt = `
Optimise le texte suivant pour ${purpose}.
Améliore la clarté, l'impact et la lisibilité.
Conserve le message principal tout en améliorant la forme.

Objectif : ${purpose}
Texte original :
"${text}"

Texte optimisé :`;

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4, // Plus créatif pour optimisation
      maxOutputTokens: text.length * 2,
    },
    safetySettings,
  });

  return result.response.candidates[0].content.parts[0].text;
}
```

### Gestion d'erreurs

```typescript
async function callGeminiWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = error.status === 429 || // Rate limit
                         error.status === 503 || // Service unavailable
                         error.status >= 500;    // Server errors

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Backoff exponentiel
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## API Text Embeddings - Recherche sémantique

### Génération d'embeddings

```typescript
import { TextEmbeddingInput } from '@google-cloud/vertexai';

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = vertexAI.getGenerativeModel({
    model: 'text-embedding-004',
  });

  const requests: TextEmbeddingInput[] = texts.map(text => ({
    content: text,
    task_type: 'RETRIEVAL_DOCUMENT', // ou RETRIEVAL_QUERY pour questions
  }));

  const result = await model.batchEmbedContents({
    requests,
  });

  return result.embeddings.map(embedding => embedding.values);
}
```

### Chunking intelligent de documents

```typescript
function chunkDocument(text: string, maxChunkSize: number = 500): string[] {
  // Nettoyage du texte
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Division par paragraphes
  const paragraphs = cleanText.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // Si le paragraphe est trop long, le diviser par phrases
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length <= maxChunkSize) {
            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence.trim();
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk + '.');
            }
            sentenceChunk = sentence.trim();
          }
        }
        
        if (sentenceChunk) {
          chunks.push(sentenceChunk + '.');
        }
        currentChunk = '';
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

### Recherche par similarité cosinus

```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
}

async function findSimilarChunks(
  query: string,
  documentEmbeddings: Array<{ text: string; embedding: number[] }>,
  topK: number = 5
): Promise<Array<{ text: string; similarity: number }>> {
  // Générer embedding de la requête
  const queryEmbedding = await generateEmbeddings([query]);
  const queryVector = queryEmbedding[0];

  // Calculer similarités
  const similarities = documentEmbeddings.map(doc => ({
    text: doc.text,
    similarity: cosineSimilarity(queryVector, doc.embedding),
  }));

  // Trier et retourner top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
```

## Pipeline RAG complet

### Indexation de documents

```typescript
async function indexDocument(
  documentId: string,
  content: string,
  firestore: FirebaseFirestore.Firestore
): Promise<void> {
  // 1. Chunking
  const chunks = chunkDocument(content);
  
  // 2. Génération embeddings
  const embeddings = await generateEmbeddings(chunks);
  
  // 3. Stockage Firestore
  const batch = firestore.batch();
  
  chunks.forEach((chunk, index) => {
    const chunkRef = firestore
      .collection('embeddings')
      .doc(`${documentId}_chunk_${index}`);
    
    batch.set(chunkRef, {
      documentId,
      chunkIndex: index,
      text: chunk,
      embedding: embeddings[index],
      createdAt: new Date(),
    });
  });
  
  await batch.commit();
}
```

### Réponse contextualisée

```typescript
async function answerWithContext(
  question: string,
  firestore: FirebaseFirestore.Firestore
): Promise<string> {
  // 1. Recherche chunks pertinents
  const queryEmbedding = await generateEmbeddings([question]);
  
  // 2. Récupération de tous les embeddings (en production, utiliser une vraie vector DB)
  const embeddingsSnapshot = await firestore.collection('embeddings').get();
  const documentEmbeddings = embeddingsSnapshot.docs.map(doc => ({
    text: doc.data().text,
    embedding: doc.data().embedding,
  }));
  
  const relevantChunks = await findSimilarChunks(
    question,
    documentEmbeddings,
    3 // Top 3 chunks
  );
  
  // 3. Construction du contexte
  const context = relevantChunks
    .map(chunk => chunk.text)
    .join('\n\n');
  
  // 4. Prompt contextualisé
  const prompt = `
Réponds à la question suivante en te basant uniquement sur le contexte fourni.
Si l'information n'est pas dans le contexte, dis "Je ne trouve pas cette information dans les documents fournis."

Contexte :
${context}

Question : ${question}

Réponse :`;

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // Très factuel
      maxOutputTokens: 512,
    },
    safetySettings,
  });

  return result.response.candidates[0].content.parts[0].text;
}
```

## Optimisations et bonnes pratiques

### 1. Cache et performances

```typescript
// Cache en mémoire pour embeddings fréquents
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const embedding = await generateEmbeddings([text]);
  embeddingCache.set(text, embedding[0]);
  
  // Limite du cache
  if (embeddingCache.size > 1000) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  
  return embedding[0];
}
```

### 2. Monitoring et métriques

```typescript
import { performance } from 'perf_hooks';

async function monitoredVertexAICall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log({
      operation,
      duration: `${duration.toFixed(2)}ms`,
      status: 'success',
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    console.error({
      operation,
      duration: `${duration.toFixed(2)}ms`,
      status: 'error',
      error: error.message,
    });
    
    throw error;
  }
}
```

### 3. Gestion des quotas

```typescript
class VertexAIRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerMinute = 60;

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Nettoyer les requêtes anciennes
    this.requests = this.requests.filter(time => now - time < 60000);
    
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}
```

## Exemples d'utilisation avancée

### Prompt Engineering pour différents styles

```typescript
const STYLE_PROMPTS = {
  formal: "Utilise un langage soutenu et professionnel",
  casual: "Utilise un ton décontracté et accessible", 
  technical: "Utilise un vocabulaire technique précis",
  creative: "Sois créatif et original dans l'expression",
};

async function styleText(text: string, style: keyof typeof STYLE_PROMPTS): Promise<string> {
  const styleInstruction = STYLE_PROMPTS[style];
  
  const prompt = `
${styleInstruction}.
Réécris le texte suivant en conservant le sens mais en adaptant le style :

"${text}"

Texte réécrit :`;

  return await callGemini(prompt, { temperature: 0.6 });
}
```

### Analyse de sentiment avec contexte

```typescript
async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  explanation: string;
}> {
  const prompt = `
Analyse le sentiment du texte suivant et réponds au format JSON :
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "explanation": "Explication courte"
}

Texte à analyser :
"${text}"

Analyse JSON :`;

  const result = await callGemini(prompt, { temperature: 0.1 });
  return JSON.parse(result);
}
```

Ce guide couvre les aspects essentiels de Vertex AI pour Magic Button. Pour des cas d'usage plus spécifiques, consultez la documentation officielle Vertex AI et adaptez les exemples à vos besoins.