import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Bannière légale obligatoire pour le prototype
 */
export function Banner() {
  return (
    <div className="bg-warning-50 border-l-4 border-warning-400 p-4 mb-6 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-warning-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-warning-800 font-medium">
            <strong>Prototype — Non contractuel</strong>
          </p>
          <p className="text-xs text-warning-700 mt-1">
            Simulation à des fins de démonstration uniquement. Données fictives. 
            Aucun engagement contractuel. Pour une offre réelle, consultez un conseiller Sofinco.
          </p>
        </div>
      </div>
    </div>
  );
}