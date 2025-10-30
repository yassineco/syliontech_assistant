import React from 'react';
import { Check, Shield, ArrowRight } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../lib/finance';
import type { Offer } from '../lib/api';

interface OfferCardProps {
  offer: Offer;
  isRecommended?: boolean;
  onSelect?: () => void;
}

export function OfferCard({ offer, isRecommended = false, onSelect }: OfferCardProps) {
  return (
    <div 
      className={`
        card p-6 relative transition-all duration-300 hover:scale-[1.02] cursor-pointer
        ${isRecommended ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'}
      `}
      onClick={onSelect}
    >
      {/* Badge recommandé */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recommandée
          </span>
        </div>
      )}

      {/* En-tête */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-text mb-1">{offer.label}</h3>
        {offer.description && (
          <p className="text-sm text-text-muted">{offer.description}</p>
        )}
      </div>

      {/* Mensualité principale */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-primary mb-1">
          {formatCurrency(offer.monthly)}
        </div>
        <div className="text-sm text-text-muted">par mois</div>
      </div>

      {/* Détails */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-sm text-text-muted">TAEG</span>
          <span className="font-semibold text-text">{formatPercentage(offer.apr)}</span>
        </div>
        
        {offer.totalCost && (
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-text-muted">Coût total du crédit</span>
            <span className="font-semibold text-text">{formatCurrency(offer.totalCost)}</span>
          </div>
        )}

        {/* Assurance */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-text-muted">Assurance</span>
          <div className="flex items-center space-x-2">
            {offer.withInsurance ? (
              <>
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Incluse</span>
              </>
            ) : (
              <span className="text-sm text-text-muted">Optionnelle</span>
            )}
          </div>
        </div>
      </div>

      {/* Avantages */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-text mb-3">Avantages inclus :</h4>
        <ul className="space-y-2">
          <li className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-sm text-text-muted">Remboursement anticipé gratuit</span>
          </li>
          <li className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-sm text-text-muted">Gestion en ligne 24h/24</span>
          </li>
          {offer.withInsurance && (
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-text-muted">Protection décès-invalidité</span>
            </li>
          )}
        </ul>
      </div>

      {/* CTA */}
      <button 
        className="btn-primary w-full flex items-center justify-center space-x-2 group"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <span>Choisir cette offre</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
      </button>

      {/* Note légale */}
      <p className="text-xs text-text-light mt-3 text-center">
        Simulation non contractuelle. Offre soumise à l'étude de votre dossier.
      </p>
    </div>
  );
}