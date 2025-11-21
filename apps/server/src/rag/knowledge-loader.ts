import fs from 'fs/promises';
import path from 'path';
import type { DocumentMetadata } from './types.js';

// ==========================================
// KNOWLEDGE LOADER - CHARGEMENT DOCUMENTS
// ==========================================

/**
 * Document de connaissance chargé
 */
export interface KnowledgeDocument {
  docId: string;
  title: string;
  content: string;
  filePath: string;
  url?: string;
  metadata: DocumentMetadata;
}

/**
 * Configuration du loader
 */
const LOADER_CONFIG = {
  supportedExtensions: ['.md', '.txt'],
  encoding: 'utf8' as const,
  maxFileSize: 1024 * 1024, // 1MB
};

/**
 * Extrait le titre principal d'un document markdown
 */
function extractTitle(content: string, fallbackTitle: string): string {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      return h1Match[1]?.trim() || fallbackTitle;
    }
  }
  
  return fallbackTitle;
}

/**
 * Génère un ID de document à partir du nom de fichier
 */
function generateDocId(filePath: string): string {
  const filename = path.basename(filePath, path.extname(filePath));
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Génère une URL factice pour les références
 */
function generateDocUrl(docId: string): string {
  return `/knowledge/${docId}`;
}

/**
 * Valide qu'un fichier peut être traité
 */
async function validateFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    
    // Vérifier que c'est un fichier
    if (!stats.isFile()) {
      return false;
    }
    
    // Vérifier l'extension
    const ext = path.extname(filePath).toLowerCase();
    if (!LOADER_CONFIG.supportedExtensions.includes(ext)) {
      return false;
    }
    
    // Vérifier la taille
    if (stats.size > LOADER_CONFIG.maxFileSize) {
      console.warn(`⚠️ Fichier trop volumineux ignoré: ${filePath} (${stats.size} bytes)`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn(`⚠️ Erreur validation fichier ${filePath}:`, error);
    return false;
  }
}

/**
 * Charge un document individuel
 */
async function loadDocument(filePath: string): Promise<KnowledgeDocument | null> {
  try {
    // Valider le fichier
    if (!(await validateFile(filePath))) {
      return null;
    }
    
    // Lire le contenu
    const content = await fs.readFile(filePath, LOADER_CONFIG.encoding);
    
    if (!content.trim()) {
      console.warn(`⚠️ Fichier vide ignoré: ${filePath}`);
      return null;
    }
    
    // Générer les métadonnées
    const stats = await fs.stat(filePath);
    const docId = generateDocId(filePath);
    const fallbackTitle = path.basename(filePath, path.extname(filePath));
    const title = extractTitle(content, fallbackTitle);
    const url = generateDocUrl(docId);
    
    const metadata: DocumentMetadata = {
      docId,
      title,
      filePath,
      lastModified: stats.mtime.toISOString(),
      size: stats.size,
      chunkCount: 0, // Sera mis à jour lors du chunking
    };
    
    return {
      docId,
      title,
      content: content.trim(),
      filePath,
      url,
      metadata,
    };
    
  } catch (error) {
    console.error(`❌ Erreur chargement document ${filePath}:`, error);
    return null;
  }
}

/**
 * Trouve tous les fichiers dans un dossier (récursif)
 */
async function findFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Recherche récursive dans les sous-dossiers
        const subFiles = await findFiles(fullPath);
        files.push(...subFiles);
      } else if (item.isFile()) {
        // Ajouter le fichier s'il a une extension supportée
        const ext = path.extname(item.name).toLowerCase();
        if (LOADER_CONFIG.supportedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erreur lecture dossier ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Charge tous les documents d'un dossier
 */
export async function loadKnowledgeDocuments(knowledgeDir: string): Promise<KnowledgeDocument[]> {
  const resolvedDir = path.resolve(knowledgeDir);
  
  console.log(`📂 Chargement des documents depuis: ${resolvedDir}`);
  
  try {
    // Vérifier que le dossier existe
    await fs.access(resolvedDir);
  } catch (error) {
    throw new Error(`Dossier de connaissances introuvable: ${resolvedDir}`);
  }
  
  // Trouver tous les fichiers
  const filePaths = await findFiles(resolvedDir);
  
  if (filePaths.length === 0) {
    console.warn(`⚠️ Aucun fichier trouvé dans ${resolvedDir}`);
    return [];
  }
  
  console.log(`📄 ${filePaths.length} fichiers trouvés`);
  
  // Charger tous les documents
  const documents: KnowledgeDocument[] = [];
  
  for (const filePath of filePaths) {
    const doc = await loadDocument(filePath);
    if (doc) {
      documents.push(doc);
      console.log(`✅ Chargé: ${doc.title} (${doc.metadata.size} bytes)`);
    }
  }
  
  console.log(`📚 ${documents.length} documents chargés avec succès`);
  
  return documents;
}

/**
 * Charge un document spécifique par son ID
 */
export async function loadDocumentById(docId: string, knowledgeDir: string): Promise<KnowledgeDocument | null> {
  const documents = await loadKnowledgeDocuments(knowledgeDir);
  return documents.find(doc => doc.docId === docId) || null;
}

/**
 * Obtient la liste des documents disponibles
 */
export async function listAvailableDocuments(knowledgeDir: string): Promise<DocumentMetadata[]> {
  const documents = await loadKnowledgeDocuments(knowledgeDir);
  return documents.map(doc => doc.metadata);
}

/**
 * Vérifie si un dossier de connaissances est valide
 */
export async function validateKnowledgeDirectory(knowledgeDir: string): Promise<{ 
  isValid: boolean; 
  error?: string; 
  fileCount: number; 
}> {
  try {
    const resolvedDir = path.resolve(knowledgeDir);
    
    // Vérifier l'existence
    await fs.access(resolvedDir);
    
    // Compter les fichiers
    const filePaths = await findFiles(resolvedDir);
    
    return {
      isValid: filePaths.length > 0,
      ...(filePaths.length === 0 && { error: 'Aucun fichier markdown trouvé' }),
      fileCount: filePaths.length,
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: `Dossier inaccessible: ${error}`,
      fileCount: 0,
    };
  }
}

/**
 * Nettoie et valide le contenu d'un document
 */
export function preprocessDocumentContent(content: string): string {
  return content
    // Supprimer les séquences d'espaces multiples
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Normaliser les fins de ligne
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Supprimer les espaces en fin de ligne
    .replace(/[ \t]+$/gm, '')
    // Supprimer les lignes vides en début/fin
    .trim();
}