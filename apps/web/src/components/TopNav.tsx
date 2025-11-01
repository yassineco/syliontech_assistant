import { Calculator, CreditCard, MessageCircle, Menu, X, Headphones, HelpCircle } from 'lucide-react';
import { useState } from 'react';

type ViewMode = 'simulator' | 'offers' | 'assistant';

interface TopNavProps {
  onNavigate?: (view: ViewMode) => void;
  currentView?: ViewMode;
}

export function TopNav({ onNavigate, currentView = 'simulator' }: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'simulator' as ViewMode,
      label: 'Simulateur',
      icon: Calculator,
      description: 'Calculer votre crédit'
    },
    {
      id: 'offers' as ViewMode,
      label: 'Mes offres',
      icon: CreditCard,
      description: 'Vos propositions personnalisées'
    },
    {
      id: 'assistant' as ViewMode,
      label: 'Assistant',
      icon: MessageCircle,
      description: 'Poser vos questions'
    }
  ];

  const handleNavClick = (viewId: ViewMode) => {
    onNavigate?.(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e0e0e0',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
    }}>
      <div style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '0 16px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: '64px' 
        }}>
          {/* Logo / Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#007bc4',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calculator style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#007bc4',
                margin: 0,
                lineHeight: 1
              }}>
                Assistant Crédit Sofinco
              </h1>
              <p style={{
                fontSize: '11px',
                color: '#757575',
                margin: 0,
                lineHeight: 1
              }}>
                Prototype de démonstration
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '32px'
          }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  color: currentView === item.id ? '#007bc4' : '#757575',
                  borderBottom: currentView === item.id ? '2px solid #007bc4' : 'none',
                  paddingBottom: currentView === item.id ? '4px' : '0',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title={item.description}
                onMouseEnter={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.color = '#007bc4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.color = '#757575';
                  }
                }}
              >
                <item.icon style={{ width: '16px', height: '16px' }} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              color: '#757575',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.color = '#007bc4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#757575';
            }}>
              <Headphones style={{ width: '20px', height: '20px' }} />
            </button>
            <button style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              color: '#757575',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.color = '#007bc4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#757575';
            }}>
              <HelpCircle style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}