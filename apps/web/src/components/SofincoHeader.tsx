import React from 'react';

/**
 * Header principal inspiré du design Sofinco.fr
 */
export function SofincoHeader() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #007bc4 0%, #00bcd4 100%)',
      color: 'white',
      padding: '40px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Pattern décoratif */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        height: '100%',
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
        opacity: 0.3
      }} />
      
      <div style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '0 16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '32px'
        }}>
          {/* Contenu principal */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 16px 0',
              lineHeight: 1.2
            }}>
              Financez vos projets avec le crédit conso Sofinco !
            </h1>
            <p style={{
              fontSize: '18px',
              margin: '0 0 24px 0',
              opacity: 0.9,
              fontWeight: '400',
              lineHeight: 1.4
            }}>
              Simulez, faites votre demande en <strong>5 minutes</strong> et obtenez une réponse immédiate !
            </p>
            
            {/* CTA */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{
                backgroundColor: '#e91e63',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(233, 30, 99, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 30, 99, 0.3)';
              }}>
                Simuler un projet
              </button>
              
              <button style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '12px 28px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#007bc4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'white';
              }}>
                Parler à l'assistant
              </button>
            </div>
          </div>
          
          {/* Bloc offre mise en avant */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            minWidth: '280px',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#00bcd4',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              EXEMPLE SIMULÉ
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                fontSize: '36px',
                fontWeight: '700',
                lineHeight: 1
              }}>
                4,50%
              </span>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                marginTop: '4px'
              }}>
                TAEG fixe
              </div>
            </div>
            
            <div style={{
              fontSize: '14px',
              opacity: 0.9,
              marginBottom: '16px'
            }}>
              Pour 15 000€ sur 48 mois
            </div>
            
            <div style={{
              fontSize: '12px',
              opacity: 0.7,
              lineHeight: 1.3
            }}>
              Mensualités flexibles de 341,44€ et un montant total de 16 389,12€
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}