import React, { useState, useCallback } from 'react';
import { Banner } from '../components/Banner';
import { TopNav } from '../components/TopNav';
import { SofincoHeader } from '../components/SofincoHeader';
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <TopNav onNavigate={setCurrentView} currentView={currentView} />
      <SofincoHeader />
      
      <main style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '32px 16px' 
      }}>
        <Banner />
        
        {/* Mode Simulateur */}
        {currentView === 'simulator' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <LoanSimulator onSimulate={handleSimulate} loading={loading} />
          </div>
        )}

        {/* Mode Offres */}
        {currentView === 'offers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Résumé de la simulation */}
            {lastSimulation && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#007bc4',
                  margin: '0 0 16px 0'
                }}>
                  Vos offres personnalisées
                </h2>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  fontSize: '14px',
                  color: '#757575'
                }}>
                  <span>Montant: <strong style={{ color: '#333' }}>{lastSimulation.amount.toLocaleString()} €</strong></span>
                  <span>Durée: <strong style={{ color: '#333' }}>{lastSimulation.duration} mois</strong></span>
                  <span>Projet: <strong style={{ color: '#333' }}>{lastSimulation.project}</strong></span>
                </div>
              </div>
            )}

            {/* Grille des offres */}
            {offers.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
              }}>
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
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: '#757575', marginBottom: '16px' }}>
                  Utilisez le simulateur pour obtenir vos offres personnalisées.
                </p>
                <button
                  onClick={() => setCurrentView('simulator')}
                  className="btn-primary"
                >
                  Faire une simulation
                </button>
              </div>
            )}

            {/* Offre recommandée mise en avant */}
            {offers.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 123, 196, 0.1) 0%, rgba(0, 188, 212, 0.1) 100%)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(0, 123, 196, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#007bc4',
                  margin: '0 0 16px 0'
                }}>
                  💡 Notre recommandation
                </h3>
                <div style={{ maxWidth: '400px' }}>
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