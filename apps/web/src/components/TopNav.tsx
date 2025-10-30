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
    <nav className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Titre */}
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Assistant Crédit</h1>
              <p className="text-xs text-text-muted">Prototype de démonstration</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`font-medium transition-colors duration-200 ${
                  currentView === item.id
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-text-muted hover:text-primary'
                }`}
                title={item.description}
              >
                <item.icon className="w-4 h-4 inline mr-2" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-muted transition-colors duration-200">
              <Headphones className="w-5 h-5" />
              <span className="sr-only">Assistant vocal</span>
            </button>
            <button className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-muted transition-colors duration-200">
              <HelpCircle className="w-5 h-5" />
              <span className="sr-only">Aide</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}