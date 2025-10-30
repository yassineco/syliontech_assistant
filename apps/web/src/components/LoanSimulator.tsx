import React, { useState, useCallback } from 'react';
import { Calculator, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '../lib/finance';
import type { SimulationRequest } from '../lib/api';

interface LoanSimulatorProps {
  onSimulate?: (params: SimulationRequest) => void;
  loading?: boolean;
}

const AMOUNT_STEPS = [1000, 5000, 10000, 15000, 20000, 30000, 50000];
const DURATION_STEPS = [12, 24, 36, 48, 60, 72, 84];

export function LoanSimulator({ onSimulate, loading }: LoanSimulatorProps) {
  const [amount, setAmount] = useState(15000);
  const [duration, setDuration] = useState(48);
  const [project, setProject] = useState('auto');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onSimulate) return;
    
    onSimulate({
      amount,
      duration,
      project,
    });
  }, [amount, duration, project, onSimulate]);

  const handleAmountChange = (value: number) => {
    setAmount(Math.max(1000, Math.min(75000, value)));
  };

  const handleDurationChange = (value: number) => {
    setDuration(Math.max(12, Math.min(84, value)));
  };

  const estimatedMonthly = Math.round((amount * 1.035) / duration);

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">
          Simulateur de crédit personnel
        </h2>
        <p className="text-text-muted">
          Obtenez une estimation de votre crédit en quelques clics
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Montant du crédit */}
        <div>
          <label className="block text-sm font-semibold text-text mb-3">
            <DollarSign className="w-4 h-4 inline mr-2" />
            Montant du crédit
          </label>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(parseInt(e.target.value) || 0)}
                min="1000"
                max="75000"
                step="100"
                className="input-primary w-full text-center text-xl font-bold pr-8"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted">
                €
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {AMOUNT_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setAmount(step)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    amount === step
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                  }`}
                >
                  {formatCurrency(step)}
                </button>
              ))}
            </div>
            
            <input
              type="range"
              value={amount}
              onChange={(e) => handleAmountChange(parseInt(e.target.value))}
              min="1000"
              max="75000"
              step="500"
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Durée du crédit */}
        <div>
          <label className="block text-sm font-semibold text-text mb-3">
            <Calendar className="w-4 h-4 inline mr-2" />
            Durée de remboursement
          </label>
          
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-xl font-bold text-primary">
                {duration} mois
              </span>
              <span className="text-sm text-text-muted ml-2">
                ({Math.round(duration / 12 * 10) / 10} ans)
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {DURATION_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setDuration(step)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    duration === step
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                  }`}
                >
                  {step}m
                </button>
              ))}
            </div>
            
            <input
              type="range"
              value={duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value))}
              min="12"
              max="84"
              step="6"
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Projet de financement */}
        <div>
          <label className="block text-sm font-semibold text-text mb-3">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Votre projet
          </label>
          
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="input-primary w-full"
          >
            <option value="auto">Véhicule</option>
            <option value="home">Travaux / Maison</option>
            <option value="travel">Voyage</option>
            <option value="wedding">Mariage</option>
            <option value="studies">Études</option>
            <option value="health">Santé</option>
            <option value="equipment">Équipement</option>
            <option value="other">Autre projet</option>
          </select>
        </div>

        {/* Estimation */}
        <div className="bg-primary/5 rounded-lg p-6 text-center">
          <p className="text-sm text-text-muted mb-2">Estimation mensuelle</p>
          <p className="text-3xl font-bold text-primary mb-1">
            {formatCurrency(estimatedMonthly)}
          </p>
          <p className="text-xs text-text-light">
            TAEG fixe de 3,5% - Simulation indicative
          </p>
        </div>

        {/* CTA */}
        <button 
          type="submit"
          disabled={loading || amount < 1000 || duration < 12}
          className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Calcul en cours...</span>
            </span>
          ) : (
            'Obtenir mes offres personnalisées'
          )}
        </button>
      </form>
      
      {/* Note légale */}
      <p className="text-xs text-text-light text-center mt-4">
        Simulation non contractuelle. Votre offre finale dépendra de l'étude de votre dossier.
      </p>
    </div>
  );
}