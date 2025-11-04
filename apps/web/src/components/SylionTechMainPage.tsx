import React from 'react';
import { MessageCircle, Calculator, ArrowRight, Phone, Mail, MapPin, Bot, Zap, Shield, Globe } from 'lucide-react';
import { SylionTechLogo, SylionTechTextLogo } from './SylionTechLogo';

interface SylionTechMainPageProps {
  onNavigateToAssistant?: () => void;
  onNavigateToSimpleAssistant?: () => void;
  onNavigateToSimulator?: () => void;
}

export function SylionTechMainPage({ onNavigateToAssistant, onNavigateToSimpleAssistant, onNavigateToSimulator }: SylionTechMainPageProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header Navigation */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Top bar avec message */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '8px 0',
          fontSize: '12px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          Solutions IA innovantes pour transformer votre entreprise. Découvrez nos assistants intelligents.
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
            <span style={{ fontSize: '14px', color: '#64748b' }}>📞 Support & Contact</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>🔍 Documentation</span>
            </div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>♿ Accessibilité</span>
          </div>

          {/* Logo central */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <SylionTechLogo size={40} />
            <SylionTechTextLogo className="text-2xl" />
          </div>

          {/* Navigation droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>📱 Nos solutions</span>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              Se connecter
            </button>
          </div>
        </div>

        {/* Menu navigation */}
        <nav style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 20px 0',
          display: 'flex',
          gap: '32px'
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              Solutions IA ▼
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              Assistants Vocaux ▼
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              Widgets Intégrables ▼
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              API & Services ▼
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              Nos technologies ▼
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
              Devenir partenaire ▼
            </span>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '80px 20px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'center'
        }}>
          {/* Contenu gauche */}
          <div>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: 'bold',
              lineHeight: '1.1',
              marginBottom: '24px',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Et si on créait
              <br />
              <span style={{ color: '#a78bfa' }}>l'intelligence</span>
              <br />
              de demain ?
            </h1>
            
            <p style={{
              fontSize: '1.2rem',
              opacity: 0.9,
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              Transformez votre entreprise avec nos solutions d'intelligence artificielle. 
              Assistants vocaux, widgets intégrables, et APIs puissantes pour révolutionner 
              l'expérience utilisateur.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={onNavigateToSimpleAssistant}
                style={{
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
              >
                <Bot size={20} />
                Tester l'Assistant IA
              </button>
              
              <button
                onClick={onNavigateToSimulator}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                }}
              >
                <Calculator size={20} />
                Découvrir nos Solutions
              </button>
            </div>
          </div>

          {/* Contenu droite - Demo Widget */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <MessageCircle size={24} />
              Assistant IA Intégrable
            </h3>
            
            <p style={{
              opacity: 0.9,
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              <strong>Widget en 1 ligne de code</strong> avec reconnaissance vocale, 
              thèmes personnalisables et architecture multi-tenant. Parfait pour 
              intégrer l'IA dans votre site web.
            </p>

            <div style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '12px',
              marginBottom: '20px',
              overflowX: 'auto'
            }}>
              <code style={{ color: '#a78bfa' }}>
                {`<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="your-id"></script>`}
              </code>
            </div>

            <button
              onClick={onNavigateToSimpleAssistant}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <Zap size={16} />
              Tester le Widget
            </button>
          </div>
        </div>

        {/* Éléments décoratifs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          opacity: 0.1,
          fontSize: '200px'
        }}>
          🤖
        </div>
      </section>

      {/* Services Section */}
      <section style={{
        padding: '80px 20px',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '16px'
          }}>
            Solutions IA pour tous vos projets
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#64748b',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Découvrez notre gamme complète de solutions d'intelligence artificielle
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Assistant Vocal */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#dbeafe',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Bot size={30} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
              Assistant Vocal
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
              Interface conversationnelle avec reconnaissance vocale et synthèse vocale. 
              RAG intelligent pour des réponses contextuelles.
            </p>
            <button
              onClick={onNavigateToSimpleAssistant}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Découvrir
            </button>
          </div>

          {/* Widget Intégrable */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#dcfce7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <MessageCircle size={30} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
              Widget Intégrable
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
              Script CDN en une ligne pour ajouter un assistant IA à votre site. 
              Thèmes personnalisables et architecture multi-tenant.
            </p>
            <button style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Découvrir
            </button>
          </div>

          {/* API Services */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Zap size={30} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
              API & Services
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
              APIs REST puissantes pour intégrer l'IA dans vos applications. 
              Documentation complète et SDKs multi-langages.
            </p>
            <button style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Découvrir
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        padding: '60px 20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            Prêt à transformer votre entreprise ?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            Rejoignez des centaines d'entreprises qui utilisent déjà nos solutions IA pour 
            améliorer leur expérience client et optimiser leurs processus.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onNavigateToSimpleAssistant}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Bot size={20} />
              Tester Gratuitement
            </button>
            <button style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              padding: '14px 28px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Phone size={20} />
              Nous Contacter
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '40px 20px 20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px',
          marginBottom: '30px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <SylionTechLogo size={32} />
              <SylionTechTextLogo />
            </div>
            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
              Solutions d'intelligence artificielle innovantes pour transformer 
              votre expérience client et optimiser vos processus métier.
            </p>
          </div>
          
          <div>
            <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Solutions</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Assistant Vocal</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Widget Intégrable</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>API Services</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin Console</a></li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Support</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Documentation</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>API Reference</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Status</a></li>
              <li style={{ marginBottom: '8px' }}><a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div style={{
          borderTop: '1px solid #334155',
          paddingTop: '20px',
          textAlign: 'center',
          opacity: 0.8
        }}>
          <p>Made with ❤️ by SylionTech • <a href="https://syliontech.ai" style={{ color: '#3b82f6' }}>syliontech.ai</a></p>
        </div>
      </footer>
    </div>
  );
}