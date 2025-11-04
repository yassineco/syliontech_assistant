import React from 'react';
import { SimpleVoiceAssistant } from '../components/SimpleVoiceAssistant';

export function SimpleAssistantPage() {
  // Fonction pour envoyer un message à l'API
  const handleMessage = async (message: string): Promise<string> => {
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: `session-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.reply || 'Désolé, je n\'ai pas pu traiter votre demande.';
    } catch (error) {
      console.error('Erreur API:', error);
      return 'Je rencontre un problème de connexion. Veuillez réessayer.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* En-tête Sofinco */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Sofinco</h1>
            </div>
            <div className="text-sm text-gray-500">
              Assistant IA Vocal - Version Simple
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            🎤 Assistant Vocal Sans Boucles
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            <strong>Mode d'emploi :</strong> Cliquez sur le microphone 🎤, parlez, puis cliquez "Envoyer" ✅
            <br />
            <span className="text-sm text-green-600 font-medium">
              ✅ Pas de boucles • ✅ Contrôle total • ✅ Prononciation correcte
            </span>
          </p>
        </div>

        {/* Assistant vocal */}
        <div className="max-w-4xl mx-auto">
          <SimpleVoiceAssistant onMessage={handleMessage} />
        </div>

        {/* Exemples d'utilisation */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">💡 Exemples de questions :</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-blue-600">"Bonjour, je veux financer ma voiture"</p>
                <p className="text-blue-600">"Simuler 25 000 euros sur 60 mois"</p>
                <p className="text-blue-600">"Quels sont vos taux actuels ?"</p>
              </div>
              <div className="space-y-2">
                <p className="text-blue-600">"Je veux faire des travaux de cuisine"</p>
                <p className="text-blue-600">"Conditions pour un financement"</p>
                <p className="text-blue-600">"Comment racheter mes crédits ?"</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 Sofinco - Assistant IA Vocal Simple | Solution Anti-Boucles</p>
            <p className="mt-1 text-green-600 font-medium">
              🚀 Technologie : Push-to-Talk + Contrôle Manuel = Zéro Boucle !
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}