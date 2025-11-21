#!/usr/bin/env node
/**
 * Script de diagnostic RAG
 * Vérifie les documents dans Firestore et teste la recherche
 */

const { Firestore } = require('@google-cloud/firestore');

async function diagnoseRAG() {
  console.log('🔍 Diagnostic RAG - Magic Button\n');

  const firestore = new Firestore({
    projectId: 'magic-button-demo',
  });

  const collection = 'rag_vectors';

  try {
    // 1. Vérifier les documents dans Firestore
    console.log('1. Vérification des documents dans Firestore...');
    const snapshot = await firestore.collection(collection).get();
    
    console.log(`   ✅ Collection: ${collection}`);
    console.log(`   📊 Nombre de documents: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('   ⚠️  Aucun document trouvé!');
      console.log('   💡 Les documents sont peut-être dans une autre collection\n');
      
      // Lister toutes les collections
      console.log('2. Liste de toutes les collections Firestore:');
      const collections = await firestore.listCollections();
      collections.forEach((coll) => {
        console.log(`   - ${coll.id}`);
      });
      
      return;
    }

    // 2. Afficher les détails des documents
    console.log('\n2. Détails des documents trouvés:');
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n   Document ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - Document ID: ${data.documentId || 'N/A'}`);
      console.log(`   - Content preview: ${(data.content || '').substring(0, 100)}...`);
      console.log(`   - Embedding dimension: ${data.embedding ? data.embedding.length : 'N/A'}`);
      console.log(`   - Metadata: ${JSON.stringify(data.metadata || {}, null, 2)}`);
      console.log(`   - Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
    });

    // 3. Test de recherche simple
    console.log('\n3. Test de recherche simple (tous les documents):');
    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`   ✅ ${allDocs.length} documents récupérés`);

    // 4. Vérifier la structure des embeddings
    console.log('\n4. Vérification des embeddings:');
    const firstDoc = allDocs[0];
    if (firstDoc && firstDoc.embedding) {
      console.log(`   ✅ Embedding présent`);
      console.log(`   - Dimension: ${firstDoc.embedding.length}`);
      console.log(`   - Type: ${typeof firstDoc.embedding}`);
      console.log(`   - Premier élément: ${firstDoc.embedding[0]}`);
      console.log(`   - Est un Array: ${Array.isArray(firstDoc.embedding)}`);
    } else {
      console.log(`   ❌ Pas d'embedding trouvé`);
    }

    console.log('\n✅ Diagnostic terminé!\n');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error(error);
  }
}

// Exécution
diagnoseRAG().catch(console.error);
