import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { MultipartFile } from '@fastify/multipart';

// ==========================================
// SERVICE DE STOCKAGE DE FICHIERS
// ==========================================

export interface FileUploadResult {
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
}

/**
 * Configuration du stockage
 */
const STORAGE_CONFIG = {
  // Répertoire de stockage local
  localStorageDir: process.env.RAG_STORAGE_DIR || '/tmp/rag-files',
  
  // Types MIME autorisés
  allowedMimeTypes: [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/csv',
  ],
  
  // Extensions de fichier autorisées
  allowedExtensions: ['.txt', '.md', '.pdf', '.docx', '.doc', '.csv'],
  
  // Taille maximale de fichier (10MB)
  maxFileSize: 10 * 1024 * 1024,
};

/**
 * Service de gestion des fichiers
 */
export class FileStorageService {
  private static instance: FileStorageService | null = null;
  
  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  constructor() {
    // Créer le répertoire de stockage si nécessaire
    this.ensureStorageDirectory();
  }

  /**
   * Assure que le répertoire de stockage existe
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(STORAGE_CONFIG.localStorageDir, { recursive: true });
      console.log(`✅ Répertoire de stockage configuré: ${STORAGE_CONFIG.localStorageDir}`);
    } catch (error) {
      console.error('❌ Erreur création répertoire stockage:', error);
    }
  }

  /**
   * Valide un fichier avant upload
   */
  private validateFile(file: MultipartFile): { valid: boolean; error?: string } {
    // Vérifier la taille
    if (file.file.readableLength && file.file.readableLength > STORAGE_CONFIG.maxFileSize) {
      return { valid: false, error: `Fichier trop volumineux. Maximum: ${STORAGE_CONFIG.maxFileSize / (1024 * 1024)}MB` };
    }

    // Vérifier le type MIME
    if (file.mimetype && !STORAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: `Type de fichier non autorisé: ${file.mimetype}` };
    }

    // Vérifier l'extension
    if (file.filename) {
      const ext = path.extname(file.filename).toLowerCase();
      if (!STORAGE_CONFIG.allowedExtensions.includes(ext)) {
        return { valid: false, error: `Extension non autorisée: ${ext}` };
      }
    }

    return { valid: true };
  }

  /**
   * Génère un nom de fichier unique
   */
  private generateFileName(originalFileName: string): string {
    const ext = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, ext);
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    return `${baseName}-${timestamp}-${hash}${ext}`;
  }

  /**
   * Upload un fichier depuis une requête multipart
   */
  async uploadFile(file: MultipartFile, tenantId: string): Promise<FileUploadResult> {
    console.log(`📤 Upload fichier: ${file.filename} pour tenant: ${tenantId}`);

    // Validation
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(`Validation échouée: ${validation.error}`);
    }

    try {
      // Assurer que le répertoire existe
      await this.ensureStorageDirectory();

      // Créer le sous-répertoire pour le tenant
      const tenantDir = path.join(STORAGE_CONFIG.localStorageDir, tenantId);
      await fs.mkdir(tenantDir, { recursive: true });

      // Générer le nom de fichier unique
      const fileName = this.generateFileName(file.filename || 'unknown');
      const filePath = path.join(tenantDir, fileName);

      // Lire et écrire le fichier
      const buffer = await file.toBuffer();
      await fs.writeFile(filePath, buffer);

      // Obtenir les informations du fichier
      const stats = await fs.stat(filePath);

      const result: FileUploadResult = {
        fileName,
        originalFileName: file.filename || 'unknown',
        filePath,
        fileSize: stats.size,
        fileType: path.extname(fileName).slice(1).toLowerCase(),
        mimeType: file.mimetype || 'application/octet-stream',
      };

      console.log(`✅ Fichier uploadé: ${fileName} (${stats.size} bytes)`);
      return result;

    } catch (error) {
      console.error('❌ Erreur upload fichier:', error);
      throw new Error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Lit le contenu textuel d'un fichier
   */
  async readFileContent(filePath: string): Promise<string> {
    try {
      const ext = path.extname(filePath).toLowerCase();

      switch (ext) {
        case '.txt':
        case '.md':
        case '.csv':
          // Lecture directe pour les fichiers texte
          return await fs.readFile(filePath, 'utf-8');

        case '.pdf':
          // Pour PDF, il faudrait utiliser une bibliothèque comme pdf-parse
          // Pour l'instant, retourner un placeholder
          console.warn('⚠️ Lecture PDF non implémentée, utilisation placeholder');
          return `Contenu du fichier PDF: ${path.basename(filePath)}\n[Extraction PDF à implémenter]`;

        case '.docx':
        case '.doc':
          // Pour Word, il faudrait utiliser une bibliothèque comme mammoth
          console.warn('⚠️ Lecture Word non implémentée, utilisation placeholder');
          return `Contenu du fichier Word: ${path.basename(filePath)}\n[Extraction Word à implémenter]`;

        default:
          throw new Error(`Type de fichier non supporté pour la lecture: ${ext}`);
      }
    } catch (error) {
      console.error('❌ Erreur lecture fichier:', error);
      throw new Error(`Impossible de lire le fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`✅ Fichier supprimé: ${filePath}`);
    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
      throw new Error(`Impossible de supprimer le fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtient les informations d'un fichier
   */
  async getFileInfo(filePath: string): Promise<{ size: number; created: Date; modified: Date } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch {
      return null;
    }
  }
}

// Export de l'instance singleton
export const fileStorageService = FileStorageService.getInstance();