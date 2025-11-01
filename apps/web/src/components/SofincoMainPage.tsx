import React from 'react';
import { MessageCircle, Calculator, ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { SofincoLogo } from './SofincoLogo';

interface SofincoMainPageProps {
  onNavigateToAssistant?: () => void;
  onNavigateToSimulator?: () => void;
}

export function SofincoMainPage({ onNavigateToAssistant, onNavigateToSimulator }: SofincoMainPageProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header Navigation */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 0'
      }}>
        {/* Top bar avec message légal */}
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '8px 0',
          fontSize: '12px',
          textAlign: 'center',
          color: '#666'
        }}>
          Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.
        </div>
        
        {/* Navigation principale */}
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Navigation gauche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>📞 Aide & Contact</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>🔍 Recherche</span>
            </div>
            <span style={{ fontSize: '14px', color: '#666' }}>♿ Accessibilité</span>
          </div>

          {/* Logo central */}
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#007bc4',
            letterSpacing: '-0.5px'
          }}>
            Sofinco
          </div>

          {/* Navigation droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Suivi de dossier</span>
            <span style={{ fontSize: '14px', color: '#007bc4' }}>👤 Se connecter</span>
          </div>
        </div>

        {/* Menu navigation */}
        <nav style={{
          maxWidth: '1200px',
          margin: '16px auto 0',
          padding: '0 20px',
          display: 'flex',
          gap: '32px'
        }}>
          {[
            'Prêt personnel',
            'Crédit renouvelable', 
            'Rachat de crédits',
            'Assurances',
            'Cartes Sofinco',
            'Nous découvrir',
            'Devenir partenaire'
          ].map((item, index) => (
            <button
              key={index}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#333',
                cursor: 'pointer',
                padding: '8px 0',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#007bc4'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#333'}
            >
              {item} ▼
            </button>
          ))}
        </nav>
      </header>

      {/* Section Hero principale */}
      <section style={{
        background: 'linear-gradient(135deg, #2d5f3f 0%, #1a4a32 50%, #0d3d28 100%)',
        minHeight: '600px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Image de fond avec couple */}
        <div style={{
          position: 'absolute',
          right: '0',
          top: '0',
          width: '60%',
          height: '100%',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 800 600\'%3E%3Crect fill=\'%23f0f0f0\' width=\'800\' height=\'600\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'central\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'24\'%3E👫 Couple dans magasin%3C/text%3E%3C/svg%3E")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.9
        }} />

        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 20px',
          display: 'flex',
          alignItems: 'center',
          minHeight: '600px'
        }}>
          {/* Contenu principal gauche */}
          <div style={{ 
            flex: '1', 
            maxWidth: '500px',
            color: 'white'
          }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              lineHeight: '1.1',
              margin: '0 0 40px 0'
            }}>
              Et si on en profitait<br />
              pour réaliser notre<br />
              projet ?
            </h1>

            {/* Encadré Prêt Perso */}
            <div style={{
              backgroundColor: '#00bcd4',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '40px',
              textAlign: 'center',
              maxWidth: '280px'
            }}>
              <div style={{
                fontSize: '12px',
                marginBottom: '16px',
                fontWeight: '600'
              }}>
                Prêt Perso<br />
                jusqu'au 07 janvier
              </div>
              
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                lineHeight: '1'
              }}>
                4<span style={{ fontSize: '24px' }}>,50%</span>
              </div>
              <div style={{
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                TAEG fixe<br />
                Pour 15 000€
              </div>

              <button style={{
                backgroundColor: '#e91e63',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                width: '100%'
              }}>
                Je profite de cette offre
              </button>

              <div style={{
                fontSize: '11px',
                lineHeight: '1.3',
                opacity: 0.9
              }}>
                Pour 15 000€ sur 48 mois, une mensualité de<br />
                341,44€ et un montant total de 16 389,12€.<br />
                <u>Mensualités flexibles de 13 à 48 mois</u>*
              </div>
            </div>
          </div>

          {/* Formulaire de simulation à droite */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#333',
              margin: '0 0 8px 0'
            }}>
              Financez vos projets avec le crédit conso Sofinco !
            </h2>
            
            <p style={{
              fontSize: '14px',
              color: '#007bc4',
              margin: '0 0 24px 0'
            }}>
              Simulez, faites votre demande en <strong>5 minutes</strong> et obtenez une{' '}
              <strong style={{ color: '#e91e63' }}>réponse immédiate !</strong>
            </p>

            {/* Formulaire */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <select style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}>
                <option>Votre projet</option>
                <option>Automobile</option>
                <option>Travaux</option>
                <option>Équipement</option>
              </select>

              <input
                type="text"
                placeholder="Votre montant"
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />

              <button
                onClick={onNavigateToSimulator}
                style={{
                  backgroundColor: '#e91e63',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Simuler un projet
              </button>
            </div>
          </div>
        </div>

        {/* Bouton Assistant Modern - Style Sofinco */}
        <div
          onClick={onNavigateToAssistant}
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
              <SofincoLogo size={32} />
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
      </section>

      {/* Section "Un crédit pour tous vos projets" */}
      <section style={{
        padding: '80px 0',
        backgroundColor: '#fafafa'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#007bc4',
            margin: '0 0 16px 0'
          }}>
            Un crédit pour tous vos projets
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#666',
            margin: '0 0 60px 0'
          }}>
            Simulez votre projet en quelques clics
          </p>

          {/* Grille des projets */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginTop: '40px'
          }}>
            {[
              { title: 'Automobile', color: '#00bcd4', emoji: '🚗' },
              { title: 'Travaux', color: '#e91e63', emoji: '🏠' },
              { title: 'Équipement', color: '#4caf50', emoji: '📱' }
            ].map((projet, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {projet.emoji}
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: projet.color,
                  margin: '0 0 16px 0'
                }}>
                  {projet.title}
                </h3>
                <button style={{
                  backgroundColor: projet.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  Découvrir
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
}