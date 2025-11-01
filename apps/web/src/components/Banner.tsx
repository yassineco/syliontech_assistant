import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Bannière légale obligatoire pour le prototype - Style Sofinco
 */
export function Banner() {
  return (
    <div style={{
      backgroundColor: '#fff3cd',
      borderLeft: '4px solid #ff9800',
      padding: '16px',
      marginBottom: '24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
    }}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle style={{ 
            height: '20px', 
            width: '20px', 
            color: '#ff9800' 
          }} aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p style={{
            fontSize: '14px',
            color: '#8a4700',
            fontWeight: '600',
            margin: '0'
          }}>
            <strong>Prototype — Non contractuel</strong>
          </p>
          <p style={{
            fontSize: '12px',
            color: '#8a4700',
            marginTop: '4px',
            margin: '4px 0 0 0',
            lineHeight: '1.4'
          }}>
            Simulation à des fins de démonstration uniquement. Données fictives. 
            Aucun engagement contractuel. Pour une offre réelle, consultez un conseiller Sofinco.
          </p>
        </div>
      </div>
    </div>
  );
}