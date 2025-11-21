import React, { useState, useCallback } from 'react';
import { SylionTechMainPage } from '../components/SylionTechMainPage';
import { Banner } from '../components/Banner';
import { LoanSimulator } from '../components/LoanSimulator';
import { OfferCard } from '../components/OfferCard';
import { AssistantPanel } from '../components/AssistantPanel';
import { SimpleVoiceAssistant } from '../components/SimpleVoiceAssistant';
import { SylionTechLogo } from '../components/SylionTechLogo';
import { simulateLoan, sendMessage } from '../lib/api';
import type { Offer } from '../lib/api';

type ViewMode = 'homepage' | 'simulator' | 'offers' | 'assistant' | 'simple-assistant';

export function SylionTechHomePage() {
  const [currentView, setCurrentView] = useState<ViewMode>('homepage');
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
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOfferSelect = useCallback((offer: Offer) => {
    console.log('Offre sélectionnée:', offer);
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

  // Navigation depuis la page d'accueil
  const handleNavigateToAssistant = () => {
    setCurrentView('assistant');
  };

  const handleNavigateToSimpleAssistant = () => {
    setCurrentView('simple-assistant');
  };

  const handleNavigateToSimulator = () => {
    setCurrentView('simulator');
  };

  const handleBackToHome = () => {
    setCurrentView('homepage');
  };

  // Page d'accueil SylionTech
  if (currentView === 'homepage') {
    return (
      <SylionTechMainPage 
        onNavigateToAssistant={handleNavigateToAssistant}
        onNavigateToSimpleAssistant={handleNavigateToSimpleAssistant}
        onNavigateToSimulator={handleNavigateToSimulator}
      />
    );
  }

  // Vues spécialisées avec navigation de retour
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Header simple avec retour */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleBackToHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '16px',
              color: '#007bc4',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Retour à l'accueil
          </button>

          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#007bc4'
          }}>
            Sofinco
          </div>

          <div style={{
            fontSize: '14px',
            color: '#666',
            fontWeight: '500'
          }}>
            {currentView === 'simulator' && 'Simulateur de crédit'}
            {currentView === 'offers' && 'Vos offres'}
            {currentView === 'assistant' && 'Assistant IA'}
            {currentView === 'simple-assistant' && 'Assistant Vocal Simple'}
          </div>
        </div>
      </header>
      
      <main style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '32px 16px' 
      }}>
        <Banner />
        
        {/* Mode Simulateur */}
        {currentView === 'simulator' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
              marginBottom: '24px'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#007bc4',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
                Simulateur de crédit
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#666',
                textAlign: 'center',
                margin: '0 0 32px 0'
              }}>
                Calculez votre crédit en quelques clics
              </p>
              <LoanSimulator onSimulate={handleSimulate} loading={loading} />
            </div>
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
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#007bc4',
                  margin: '0 0 16px 0'
                }}>
                  Vos offres personnalisées
                </h1>
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
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
              marginBottom: '24px'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#007bc4',
                margin: '0 0 8px 0',
                textAlign: 'center'
              }}>
                Assistant Sofinco
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#666',
                textAlign: 'center',
                margin: '0 0 24px 0'
              }}>
                Posez toutes vos questions sur nos crédits et services
              </p>
            </div>
            <AssistantPanel onMessage={handleAssistantMessage} />
          </div>
        )}

        {/* Mode Assistant Simple */}
        {currentView === 'simple-assistant' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
              marginBottom: '24px'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#28a745',
                margin: '0 0 8px 0',
                textAlign: 'center'
              }}>
                Assistant Vocal Simple 🎙️
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#666',
                textAlign: 'center',
                margin: '0 0 8px 0'
              }}>
                Solution stable avec contrôle manuel - Push-to-Talk
              </p>
              <div style={{
                fontSize: '14px',
                color: '#28a745',
                textAlign: 'center',
                margin: '0 0 24px 0',
                fontWeight: '500'
              }}>
                ✅ Pas de boucles infinies • ✅ Contrôle total • ✅ Solution fiable
              </div>
            </div>
            <SimpleVoiceAssistant />
          </div>
        )}
      </main>

      {/* Bouton Assistant Modern - Style Sofinco */}
      {currentView !== 'assistant' && currentView !== 'simple-assistant' && (
        <div
          onClick={handleNavigateToAssistant}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '0',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            border: '1px solid #e5e5e5',
            overflow: 'hidden',
            minWidth: '280px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
          }}
        >
          {/* Header avec logo et question */}
          <div style={{
            padding: '16px 20px 12px 20px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '32px',
              backgroundColor: 'white',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '4px'
            }}>
              <SylionTechLogo size={32} />
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: '500',
              color: '#333',
              lineHeight: '1.3'
            }}>
              Besoin d'aide pour votre prêt ?
            </div>
          </div>
          
          {/* Bouton d'action */}
          <div style={{
            padding: '12px 20px 16px 20px'
          }}>
            <button style={{
              width: '100%',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000';
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 6.98V16C22 20 20 22 16 22H8C4 22 2 20 2 16V8C2 4 4 2 8 2H14.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 6.98H18.98C16 6.98 14.98 5.96 14.98 2.98V2C14.98 1.45 15.43 1 15.98 1C16.53 1 16.98 1.45 16.98 2V4.98H19.96C20.51 4.98 20.96 5.43 20.96 5.98C20.96 6.53 20.51 6.98 19.96 6.98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 16H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Contactez votre assistant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}