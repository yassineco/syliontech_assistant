import React, { useState, useCallback } from 'react';
import { Banner } from '../components/Banner';
import { TopNav } from '../components/TopNav';
import { LoanSimulator } from '../components/LoanSimulator';
import { OfferCard } from '../components/OfferCard';
import { AssistantPanel } from '../components/AssistantPanel';
import { simulateLoan, sendMessage } from '../lib/api';
import type { Offer } from '../lib/api';

type ViewMode = 'simulator' | 'offers' | 'assistant';

export function DemoPage() {
  const [currentView, setCurrentView] = useState<ViewMode>('simulator');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSimulation, setLastSimulation] = useState<any>(null);

  const handleSimulate = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const result = await simulateLoan(params);
      setOffers(result.offers || []);
      setLastSimulation(params);
      setCurrentView('offers');
    } catch (error) {
      console.error('Erreur simulation:', error);
      // TODO: Gérer l'erreur avec un toast
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOfferSelect = useCallback((offer: Offer) => {
    console.log('Offre sélectionnée:', offer);
    // TODO: Gérer la sélection d'offre
  }, []);

  const handleAssistantMessage = useCallback(async (
    message: string, 
    conversationHistory?: Array<{role: 'user' | 'assistant', message: string, timestamp: string}>
  ): Promise<string> => {
    try {
      const response = await sendMessage(message, lastSimulation, undefined, conversationHistory);
      return response.reply || 'Désolé, je n\'ai pas pu traiter votre demande.';
    } catch (error) {
      console.error('Erreur assistant:', error);
      return 'Désolé, je rencontre un problème technique. Pouvez-vous reformuler votre question ?';
    }
  }, [lastSimulation]);

  const getRecommendedOffer = (): Offer | undefined => {
    return offers.find(offer => offer.recommended) || offers[0];
  };

  return (
    <div className="min-h-screen bg-background">
      <Banner />
      <TopNav onNavigate={setCurrentView} currentView={currentView} />

      <main className="container mx-auto px-4 py-8">
        {/* Mode Simulateur */}
        {currentView === 'simulator' && (
          <div className="max-w-2xl mx-auto">
            <LoanSimulator onSimulate={handleSimulate} loading={loading} />
          </div>
        )}

        {/* Mode Offres */}
        {currentView === 'offers' && (
          <div className="space-y-8">
            {/* Résumé de la simulation */}
            {lastSimulation && (
              <div className="bg-white rounded-lg p-6 border border-border">
                <h2 className="text-xl font-bold text-text mb-4">
                  Vos offres personnalisées
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                  <span>Montant: <strong className="text-text">{lastSimulation.amount.toLocaleString()} €</strong></span>
                  <span>Durée: <strong className="text-text">{lastSimulation.duration} mois</strong></span>
                  <span>Projet: <strong className="text-text">{lastSimulation.project}</strong></span>
                </div>
              </div>
            )}

            {/* Grille des offres */}
            {offers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map((offer, index) => (
                  <OfferCard
                    key={index}
                    offer={offer}
                    isRecommended={offer.recommended}
                    onSelect={() => handleOfferSelect(offer)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-text-muted">
                  Utilisez le simulateur pour obtenir vos offres personnalisées.
                </p>
                <button
                  onClick={() => setCurrentView('simulator')}
                  className="btn-primary mt-4"
                >
                  Faire une simulation
                </button>
              </div>
            )}

            {/* Offre recommandée mise en avant */}
            {offers.length > 0 && (
              <div className="bg-gradient-to-r from-primary/5 to-success/5 rounded-lg p-6">
                <h3 className="text-lg font-bold text-text mb-4">
                  💡 Notre recommandation
                </h3>
                <div className="max-w-md">
                  <OfferCard
                    offer={getRecommendedOffer()!}
                    isRecommended={true}
                    onSelect={() => handleOfferSelect(getRecommendedOffer()!)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode Assistant */}
        {currentView === 'assistant' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
              {/* Panel principal de l'assistant */}
              <div className="lg:col-span-2">
                <AssistantPanel onMessage={handleAssistantMessage} />
              </div>

              {/* Sidebar avec infos contextuelles */}
              <div className="space-y-6">
                {/* Résumé simulation */}
                {lastSimulation && (
                  <div className="card p-6">
                    <h3 className="font-semibold text-text mb-4">Dernière simulation</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Montant</span>
                        <span className="text-text font-medium">
                          {lastSimulation.amount.toLocaleString()} €
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Durée</span>
                        <span className="text-text font-medium">
                          {lastSimulation.duration} mois
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Projet</span>
                        <span className="text-text font-medium">
                          {lastSimulation.project}
                        </span>
                      </div>
                    </div>
                    
                    {offers.length > 0 && (
                      <button
                        onClick={() => setCurrentView('offers')}
                        className="btn-outline w-full mt-4 text-sm"
                      >
                        Voir les offres ({offers.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Aide */}
                <div className="card p-6">
                  <h3 className="font-semibold text-text mb-4">Questions fréquentes</h3>
                  <div className="space-y-3">
                    {[
                      'Quels sont les documents nécessaires ?',
                      'Comment fonctionne le TAEG ?',
                      'Puis-je rembourser par anticipation ?',
                      'Quelles sont les conditions d\'éligibilité ?'
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleAssistantMessage(question)}
                        className="text-left w-full p-3 text-sm text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Raccourcis */}
                <div className="card p-6">
                  <h3 className="font-semibold text-text mb-4">Actions rapides</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCurrentView('simulator')}
                      className="btn-outline w-full text-sm"
                    >
                      Nouvelle simulation
                    </button>
                    {offers.length > 0 && (
                      <button
                        onClick={() => setCurrentView('offers')}
                        className="btn-primary w-full text-sm"
                      >
                        Mes offres
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}