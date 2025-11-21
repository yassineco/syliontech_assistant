// Content script pour Chrome Extension MV3
// Magic Button Suite - Panel Vertical Intégré

import './content.css';

console.log('🎯 Magic Button Suite loaded - Integrated Vertical Panel');

// État de l'extension
interface ExtensionState {
  isEnabled: boolean;
  isVisible: boolean;
  activeTab: string;
  selectedText: string;
  userSettings: {
    defaultLanguage: string;
    autoTranslate: boolean;
    emailSignature: string;
  };
}

let state: ExtensionState = {
  isEnabled: true,
  isVisible: false,
  activeTab: 'actions',
  selectedText: '',
  userSettings: {
    defaultLanguage: 'fr',
    autoTranslate: false,
    emailSignature: ''
  }
};

// Éléments DOM
let floatingButton: HTMLElement | null = null;
let magicSuite: HTMLElement | null = null;
let stylesInjected = false;

// Tabs configuration
const TABS = {
  actions: { 
    icon: '✨', 
    title: 'Magic Actions', 
    description: 'Corriger, résumer, optimiser du texte' 
  },
  mail: { 
    icon: '✉️', 
    title: 'Magic Mail', 
    description: 'Rédaction et optimisation d\'emails' 
  },
  translator: { 
    icon: '🌍', 
    title: 'Magic Translator', 
    description: 'Traduction intelligente multilingue' 
  },
  rag: { 
    icon: '🤖', 
    title: 'Assistant RAG', 
    description: 'Recherche dans vos documents' 
  },
  settings: { 
    icon: '⚙️', 
    title: 'Paramètres', 
    description: 'Configuration et préférences' 
  }
};

// Initialisation
document.addEventListener('DOMContentLoaded', initializeExtension);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

function initializeExtension() {
  injectStyles();
  createFloatingButton();
  setupEventListeners();
  loadState();
}

function injectStyles() {
  if (stylesInjected) return;
  
  const style = document.createElement('style');
  style.id = 'magic-suite-styles';
  style.textContent = `
    @keyframes magicSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes magicSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes magicPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    @keyframes magicFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes magicGlow {
      0% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
      50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.8); }
      100% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

function createFloatingButton() {
  if (floatingButton) return;

  floatingButton = document.createElement('div');
  floatingButton.id = 'magic-floating-btn';
  floatingButton.innerHTML = `
    <div class="magic-btn-icon">🎯</div>
    <div class="magic-btn-status"></div>
  `;
  
  floatingButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Icône et statut
  const icon = floatingButton.querySelector('.magic-btn-icon') as HTMLElement;
  const status = floatingButton.querySelector('.magic-btn-status') as HTMLElement;
  
  icon.style.cssText = `
    font-size: 24px;
    transition: transform 0.3s ease;
  `;
  
  status.style.cssText = `
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #10b981;
    border: 2px solid white;
    transition: all 0.3s ease;
  `;

  floatingButton.addEventListener('click', toggleSuite);
  floatingButton.addEventListener('mouseenter', () => {
    if (state.isEnabled) {
      floatingButton!.style.transform = 'scale(1.1)';
      floatingButton!.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.6)';
    }
  });
  
  floatingButton.addEventListener('mouseleave', () => {
    floatingButton!.style.transform = 'scale(1)';
    floatingButton!.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
  });

  updateFloatingButtonState();
  document.body.appendChild(floatingButton);
}

function createMagicSuite() {
  if (magicSuite) return;

  magicSuite = document.createElement('div');
  magicSuite.id = 'magic-suite';
  magicSuite.innerHTML = `
    <div class="magic-suite-header">
      <div class="magic-suite-title">
        <span class="magic-icon">🎯</span>
        Magic Button Suite
      </div>
      <div class="magic-suite-controls">
        <button id="magic-toggle-btn" class="magic-control-btn" title="Activer/Désactiver">
          <span id="magic-toggle-icon">⚡</span>
        </button>
        <button id="magic-minimize-btn" class="magic-control-btn" title="Réduire">×</button>
      </div>
    </div>
    
    <div class="magic-suite-tabs">
      ${Object.entries(TABS).map(([key, tab]) => `
        <button class="magic-tab-btn ${key === state.activeTab ? 'active' : ''}" data-tab="${key}">
          <span class="magic-tab-icon">${tab.icon}</span>
          <span class="magic-tab-label">${tab.title}</span>
        </button>
      `).join('')}
    </div>
    
    <div class="magic-suite-content">
      <div class="magic-tab-content" data-tab="actions">
        ${createActionsContent()}
      </div>
      <div class="magic-tab-content" data-tab="mail" style="display: none;">
        ${createMailContent()}
      </div>
      <div class="magic-tab-content" data-tab="translator" style="display: none;">
        ${createTranslatorContent()}
      </div>
      <div class="magic-tab-content" data-tab="rag" style="display: none;">
        ${createRAGContent()}
      </div>
      <div class="magic-tab-content" data-tab="settings" style="display: none;">
        ${createSettingsContent()}
      </div>
    </div>
    
    <div class="magic-suite-status" id="magic-status">
      <span class="magic-status-indicator"></span>
      <span id="magic-status-text">Prêt</span>
    </div>
  `;

  magicSuite.style.cssText = `
    position: fixed;
    top: 20px;
    right: 90px;
    width: 380px;
    max-height: calc(100vh - 40px);
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    z-index: 999998;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(0, 0, 0, 0.1);
    animation: magicFadeIn 0.3s ease-out;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  setupSuiteStyles();
  setupSuiteEventListeners();
  document.body.appendChild(magicSuite);
}

function createActionsContent() {
  return `
    <div class="magic-text-section">
      <div class="magic-selected-text" id="magic-selected-text">
        <span class="magic-placeholder">Sélectionnez du texte sur la page...</span>
      </div>
    </div>
    
    <div class="magic-actions">
      <button class="magic-action-btn" data-action="correct">
        <span class="magic-action-icon">✏️</span>
        Corriger
      </button>
      <button class="magic-action-btn" data-action="summarize">
        <span class="magic-action-icon">📝</span>
        Résumer
      </button>
      <button class="magic-action-btn" data-action="translate">
        <span class="magic-action-icon">🌍</span>
        Traduire
      </button>
      <button class="magic-action-btn" data-action="optimize">
        <span class="magic-action-icon">🎯</span>
        Optimiser
      </button>
    </div>
    
    <div class="magic-result-zone" id="actions-result">
      <div class="magic-result-header">
        <span>Résultat</span>
        <button class="magic-result-copy" onclick="copyToClipboard('actions-result-content')">📋 Copier</button>
      </div>
      <div class="magic-result-content" id="actions-result-content"></div>
    </div>
  `;
}

function createMailContent() {
  return `
    <div class="magic-mail-section">
      <div class="magic-mail-input">
        <label>Destinataire:</label>
        <input type="email" id="mail-recipient" placeholder="nom@exemple.com">
      </div>
      <div class="magic-mail-input">
        <label>Sujet:</label>
        <input type="text" id="mail-subject" placeholder="Sujet de l'email">
      </div>
      <div class="magic-mail-input">
        <label>Ton:</label>
        <select id="mail-tone">
          <option value="professionnel">Professionnel</option>
          <option value="amical">Amical</option>
          <option value="formel">Formel</option>
          <option value="décontracté">Décontracté</option>
        </select>
      </div>
      <div class="magic-mail-content">
        <textarea id="mail-content" placeholder="Décrivez brièvement le contenu souhaité..."></textarea>
      </div>
      <div class="magic-mail-actions">
        <button class="magic-btn primary" data-action="generate-email">
          <span>✨</span> Générer Email
        </button>
        <button class="magic-btn secondary" data-action="improve-email">
          <span>🎯</span> Améliorer
        </button>
      </div>
      
      <div class="magic-result-zone" id="mail-result">
        <div class="magic-result-header">
          <span>Email généré</span>
          <button class="magic-result-copy" onclick="copyToClipboard('mail-result-content')">📋 Copier</button>
        </div>
        <div class="magic-result-content" id="mail-result-content"></div>
      </div>
    </div>
  `;
}

function createTranslatorContent() {
  return `
    <div class="magic-translator-section">
      <div class="magic-lang-selector">
        <div class="magic-lang-input">
          <label>De:</label>
          <select id="lang-from">
            <option value="auto">Détection automatique</option>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
            <option value="es">Espagnol</option>
            <option value="de">Allemand</option>
            <option value="it">Italien</option>
          </select>
        </div>
        <button class="magic-lang-swap" data-action="swap-languages">⇄</button>
        <div class="magic-lang-input">
          <label>Vers:</label>
          <select id="lang-to">
            <option value="en">Anglais</option>
            <option value="fr">Français</option>
            <option value="es">Espagnol</option>
            <option value="de">Allemand</option>
            <option value="it">Italien</option>
          </select>
        </div>
      </div>
      <div class="magic-translator-content">
        <div class="magic-text-input">
          <textarea id="text-to-translate" placeholder="Texte à traduire..."></textarea>
        </div>
        <div class="magic-text-output">
          <div id="translated-text" class="magic-result-box">
            Traduction apparaîtra ici...
          </div>
        </div>
      </div>
      <div class="magic-translator-actions">
        <button class="magic-btn primary" data-action="translate-text">
          <span>🌍</span> Traduire
        </button>
        <button class="magic-btn secondary" data-action="copy-translation">
          <span>📋</span> Copier
        </button>
      </div>
    </div>
  `;
}

function createRAGContent() {
  return `
    <div class="magic-rag-section">
      <div class="magic-rag-upload">
        <button class="magic-btn primary" data-action="upload-document">
          <span>📄</span> Ajouter Document
        </button>
        <div class="magic-doc-count">
          <span id="doc-count">0 document(s)</span>
        </div>
      </div>
      <div class="magic-rag-search">
        <div class="magic-search-input">
          <input type="text" id="rag-query" placeholder="Posez votre question...">
          <button class="magic-search-btn" data-action="search-rag">🔍</button>
        </div>
      </div>
      <div class="magic-rag-results">
        <div id="rag-results" class="magic-results-container">
          <div class="magic-empty-state">
            <span>🤖</span>
            <p>Ajoutez des documents et posez vos questions</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createSettingsContent() {
  return `
    <div class="magic-settings-section">
      <div class="magic-setting-group">
        <h4>Général</h4>
        <div class="magic-setting-item">
          <label>Langue par défaut:</label>
          <select id="default-language">
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
            <option value="es">Espagnol</option>
          </select>
        </div>
        <div class="magic-setting-item">
          <label>
            <input type="checkbox" id="auto-translate"> 
            Traduction automatique
          </label>
        </div>
      </div>
      
      <div class="magic-setting-group">
        <h4>Email</h4>
        <div class="magic-setting-item">
          <label>Signature par défaut:</label>
          <textarea id="email-signature" placeholder="Votre signature..."></textarea>
        </div>
      </div>
      
      <div class="magic-setting-group">
        <h4>Interface</h4>
        <div class="magic-setting-item">
          <label>
            <input type="checkbox" id="stay-open"> 
            Garder ouvert après action
          </label>
        </div>
      </div>
      
      <div class="magic-settings-actions">
        <button class="magic-btn primary" data-action="save-settings">
          <span>💾</span> Sauvegarder
        </button>
        <button class="magic-btn secondary" data-action="reset-settings">
          <span>🔄</span> Réinitialiser
        </button>
      </div>
    </div>
  `;
}

function setupSuiteStyles() {
  if (!magicSuite) return;

  // Style pour l'en-tête
  const header = magicSuite.querySelector('.magic-suite-header') as HTMLElement;
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 16px 16px 0 0;
    flex-shrink: 0;
  `;

  // Style pour les onglets
  const tabs = magicSuite.querySelector('.magic-suite-tabs') as HTMLElement;
  tabs.style.cssText = `
    display: flex;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    overflow-x: auto;
    flex-shrink: 0;
  `;

  // Style pour le contenu
  const content = magicSuite.querySelector('.magic-suite-content') as HTMLElement;
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    min-height: 0;
  `;

  // Style pour le statut
  const status = magicSuite.querySelector('.magic-suite-status') as HTMLElement;
  status.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0 0 16px 16px;
    font-size: 12px;
    color: #15803d;
    flex-shrink: 0;
  `;

  // Styles pour les boutons d'onglets
  const tabBtns = magicSuite.querySelectorAll('.magic-tab-btn');
  tabBtns.forEach(btn => {
    (btn as HTMLElement).style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
      min-width: 70px;
      transition: all 0.2s ease;
      border-bottom: 3px solid transparent;
    `;
  });

  // Style pour l'onglet actif
  const activeTab = magicSuite.querySelector('.magic-tab-btn.active') as HTMLElement;
  if (activeTab) {
    activeTab.style.color = '#667eea';
    activeTab.style.borderBottomColor = '#667eea';
    activeTab.style.background = 'white';
  }
}

function setupSuiteEventListeners() {
  if (!magicSuite) return;

  // Bouton de réduction
  const minimizeBtn = magicSuite.querySelector('#magic-minimize-btn');
  minimizeBtn?.addEventListener('click', () => {
    state.isVisible = false;
    hideSuite();
    saveState();
  });

  // Bouton toggle enable/disable
  const toggleBtn = magicSuite.querySelector('#magic-toggle-btn');
  toggleBtn?.addEventListener('click', () => {
    state.isEnabled = !state.isEnabled;
    updateFloatingButtonState();
    updateSuiteState();
    saveState();
  });

  // Gestion des onglets
  const tabBtns = magicSuite.querySelectorAll('.magic-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const tabName = target.getAttribute('data-tab');
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // Boutons d'action (selon l'onglet actif)
  setupTabEventListeners();
}

function switchTab(tabName: string) {
  state.activeTab = tabName;
  
  // Mettre à jour les boutons d'onglet
  const tabBtns = magicSuite?.querySelectorAll('.magic-tab-btn');
  tabBtns?.forEach(btn => {
    const btnEl = btn as HTMLElement;
    if (btnEl.getAttribute('data-tab') === tabName) {
      btnEl.classList.add('active');
      btnEl.style.color = '#667eea';
      btnEl.style.borderBottomColor = '#667eea';
      btnEl.style.background = 'white';
    } else {
      btnEl.classList.remove('active');
      btnEl.style.color = '#64748b';
      btnEl.style.borderBottomColor = 'transparent';
      btnEl.style.background = 'transparent';
    }
  });

  // Mettre à jour le contenu
  const contents = magicSuite?.querySelectorAll('.magic-tab-content');
  contents?.forEach(content => {
    const contentEl = content as HTMLElement;
    if (contentEl.getAttribute('data-tab') === tabName) {
      contentEl.style.display = 'block';
    } else {
      contentEl.style.display = 'none';
    }
  });

  // Mettre à jour le texte sélectionné si on est sur actions
  if (tabName === 'actions') {
    updateSelectedText();
  }

  saveState();
}

function setupTabEventListeners() {
  if (!magicSuite) return;

  // Actions tab
  const actionBtns = magicSuite.querySelectorAll('.magic-action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', handleAction);
  });

  // Mail tab
  const generateEmailBtn = magicSuite.querySelector('[data-action="generate-email"]');
  generateEmailBtn?.addEventListener('click', handleGenerateEmail);

  // Translator tab
  const translateBtn = magicSuite.querySelector('[data-action="translate-text"]');
  translateBtn?.addEventListener('click', handleTranslateText);

  // RAG tab
  const ragSearchBtn = magicSuite.querySelector('[data-action="search-rag"]');
  ragSearchBtn?.addEventListener('click', handleRAGSearch);
  
  const uploadDocBtn = magicSuite.querySelector('[data-action="upload-document"]');
  uploadDocBtn?.addEventListener('click', handleUploadDocument);

  // Settings tab
  const saveSettingsBtn = magicSuite.querySelector('[data-action="save-settings"]');
  saveSettingsBtn?.addEventListener('click', handleSaveSettings);
}

function setupEventListeners() {
  // Détection de sélection de texte
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Échapper pour fermer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isVisible) {
      state.isVisible = false;
      hideSuite();
      saveState();
    }
  });
}

function handleTextSelection() {
  if (!state.isEnabled) return;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || '';

  if (selectedText && selectedText.length > 3) {
    state.selectedText = selectedText;
    updateSelectedText();
    
    // Animation du bouton flottant
    if (floatingButton) {
      floatingButton.style.animation = 'magicPulse 0.6s ease-in-out';
      setTimeout(() => {
        if (floatingButton) {
          floatingButton.style.animation = '';
        }
      }, 600);
    }
  } else {
    state.selectedText = '';
    updateSelectedText();
  }
}

function toggleSuite() {
  if (!state.isEnabled) return;

  state.isVisible = !state.isVisible;
  
  if (state.isVisible) {
    showSuite();
  } else {
    hideSuite();
  }
  
  saveState();
}

function showSuite() {
  if (!magicSuite) {
    createMagicSuite();
  }
  
  if (magicSuite) {
    magicSuite.style.display = 'flex';
    magicSuite.style.animation = 'magicFadeIn 0.3s ease-out';
    updateSelectedText();
    updateSuiteState();
  }
}

function hideSuite() {
  if (magicSuite) {
    magicSuite.style.animation = 'magicSlideOut 0.3s ease-in';
    setTimeout(() => {
      if (magicSuite) {
        magicSuite.style.display = 'none';
      }
    }, 300);
  }
}

function updateFloatingButtonState() {
  if (!floatingButton) return;

  const icon = floatingButton.querySelector('.magic-btn-icon') as HTMLElement;
  const status = floatingButton.querySelector('.magic-btn-status') as HTMLElement;

  if (state.isEnabled) {
    floatingButton.style.opacity = '1';
    floatingButton.style.cursor = 'pointer';
    icon.textContent = '🎯';
    status.style.background = '#10b981';
    floatingButton.title = 'Magic Button Suite (Activé) - Cliquez pour ouvrir';
  } else {
    floatingButton.style.opacity = '0.5';
    floatingButton.style.cursor = 'default';
    icon.textContent = '😴';
    status.style.background = '#ef4444';
    floatingButton.title = 'Magic Button Suite (Désactivé) - Cliquez pour ouvrir';
  }
}

function updateSelectedText() {
  if (!magicSuite || state.activeTab !== 'actions') return;

  const selectedTextEl = magicSuite.querySelector('#magic-selected-text') as HTMLElement;
  if (!selectedTextEl) return;

  if (state.selectedText) {
    selectedTextEl.innerHTML = state.selectedText;
    selectedTextEl.style.background = '#ecfdf5';
    selectedTextEl.style.borderColor = '#10b981';
    selectedTextEl.style.color = '#064e3b';
  } else {
    selectedTextEl.innerHTML = '<span class="magic-placeholder">Sélectionnez du texte sur la page...</span>';
    selectedTextEl.style.background = '#f8fafc';
    selectedTextEl.style.borderColor = '#e2e8f0';
    selectedTextEl.style.color = '#64748b';
  }
}

function updateSuiteState() {
  if (!magicSuite) return;

  const toggleBtn = magicSuite.querySelector('#magic-toggle-btn') as HTMLElement;
  const toggleIcon = magicSuite.querySelector('#magic-toggle-icon') as HTMLElement;
  const statusText = magicSuite.querySelector('#magic-status-text') as HTMLElement;

  if (state.isEnabled) {
    toggleIcon.textContent = '⚡';
    toggleBtn.title = 'Désactiver Magic Button Suite';
    statusText.textContent = 'Activé';
  } else {
    toggleIcon.textContent = '💤';
    toggleBtn.title = 'Activer Magic Button Suite';
    statusText.textContent = 'Désactivé';
  }
}

// Handlers pour les actions
function handleAction(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const action = target.getAttribute('data-action');
  
  if (!action || !state.selectedText || !state.isEnabled) return;

  updateStatus('Traitement...', 'loading');
  showResult('actions-result', 'Traitement en cours...', 'loading');

  chrome.runtime.sendMessage({
    type: 'PROCESS_TEXT',
    action: action,
    text: state.selectedText
  }, (response) => {
    if (response && response.success) {
      updateStatus('Terminé', 'success');
      showResult('actions-result', response.result, 'success');
      
      // Copier aussi dans le presse-papiers
      navigator.clipboard.writeText(response.result).then(() => {
        updateStatus('Résultat affiché et copié', 'success');
        setTimeout(() => updateStatus('Prêt', 'ready'), 2000);
      });
    } else {
      updateStatus('Erreur', 'error');
      showResult('actions-result', 'Erreur lors du traitement', 'error');
      setTimeout(() => updateStatus('Prêt', 'ready'), 3000);
    }
  });
}

function handleGenerateEmail() {
  const recipient = (magicSuite?.querySelector('#mail-recipient') as HTMLInputElement)?.value;
  const subject = (magicSuite?.querySelector('#mail-subject') as HTMLInputElement)?.value;
  const tone = (magicSuite?.querySelector('#mail-tone') as HTMLSelectElement)?.value;
  const content = (magicSuite?.querySelector('#mail-content') as HTMLTextAreaElement)?.value;

  if (!content) {
    updateStatus('Veuillez décrire le contenu de l\'email', 'error');
    return;
  }

  updateStatus('Génération de l\'email...', 'loading');
  showResult('mail-result', 'Génération en cours...', 'loading');

  const prompt = `Rédigez un email ${tone} avec le sujet "${subject}" pour ${recipient}. Contenu: ${content}`;
  
  chrome.runtime.sendMessage({
    type: 'PROCESS_TEXT',
    action: 'optimize',
    text: prompt
  }, (response) => {
    if (response && response.success) {
      updateStatus('Email généré', 'success');
      showResult('mail-result', response.result, 'success');
    } else {
      updateStatus('Erreur lors de la génération', 'error');
      showResult('mail-result', 'Erreur lors de la génération', 'error');
    }
  });
}

function handleTranslateText() {
  const textToTranslate = (magicSuite?.querySelector('#text-to-translate') as HTMLTextAreaElement)?.value;
  const langTo = (magicSuite?.querySelector('#lang-to') as HTMLSelectElement)?.value;

  if (!textToTranslate) {
    updateStatus('Veuillez saisir du texte à traduire', 'error');
    return;
  }

  updateStatus('Traduction en cours...', 'loading');

  chrome.runtime.sendMessage({
    type: 'PROCESS_TEXT',
    action: 'translate',
    text: textToTranslate,
    options: { targetLanguage: langTo }
  }, (response) => {
    if (response && response.success) {
      const resultBox = magicSuite?.querySelector('#translated-text') as HTMLElement;
      if (resultBox) {
        resultBox.textContent = response.result;
        resultBox.style.background = '#ecfdf5';
        resultBox.style.color = '#064e3b';
      }
      updateStatus('Traduction terminée', 'success');
    } else {
      updateStatus('Erreur lors de la traduction', 'error');
    }
  });
}

function handleRAGSearch() {
  const query = (magicSuite?.querySelector('#rag-query') as HTMLInputElement)?.value;

  if (!query) {
    updateStatus('Veuillez saisir une question', 'error');
    return;
  }

  updateStatus('Recherche en cours...', 'loading');
  const startTime = Date.now(); // Mesurer le temps de traitement

  // Timeout de 10 secondes pour éviter les blocages
  const timeoutId = setTimeout(() => {
    updateStatus('Timeout - Recherche trop longue', 'error');
  }, 10000);

  // Envoyer message au background script pour recherche RAG
  chrome.runtime.sendMessage({
    type: 'RAG_SEARCH',
    query: query,
    limit: 5
  }, (response) => {
    clearTimeout(timeoutId); // Annuler le timeout
    const processingTime = Date.now() - startTime; // Calculer le temps total
    
    if (chrome.runtime.lastError) {
      console.error('Chrome runtime error:', chrome.runtime.lastError);
      updateStatus('Erreur de connexion', 'error');
      return;
    }

    if (!response) {
      updateStatus('Pas de réponse du service', 'error');
      return;
    }

    if (response.success && response.results) {
      displayRAGResults(response.results);
      updateStatus(`${response.results.length} résultat(s) trouvé(s) (${processingTime}ms)`, 'success');
    } else {
      console.error('RAG Search error:', response.error);
      updateStatus(response.error || 'Aucun résultat trouvé', 'error');
    }
  });
}

function displayRAGResults(results: any[]) {
  const resultsContainer = magicSuite?.querySelector('#rag-results');
  if (!resultsContainer) return;

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        <Database class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Aucun document trouvé</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = results.map((result, index) => {
    // Adapter la structure selon la réponse API réelle
    const document = result.document || result;
    const content = document.content || result.content || '';
    const similarity = result.similarity || 0;
    const fileName = document.metadata?.fileName || document.fileName || `Document ${index + 1}`;
    
    return `
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-600">${fileName}</span>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            ${Math.round(similarity * 100)}% pertinence
          </span>
        </div>
        <p class="text-sm text-gray-700 line-clamp-3">${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</p>
      </div>
    `;
  }).join('');
}

function handleUploadDocument() {
  // Créer un input file invisible
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.txt,.doc,.docx,.md';
  fileInput.style.display = 'none';
  
  fileInput.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    updateStatus('Upload du document en cours...', 'loading');
    
    // Lire le fichier
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Envoyer le document au backend pour traitement RAG
      chrome.runtime.sendMessage({
        type: 'UPLOAD_DOCUMENT',
        filename: file.name,
        content: content,
        fileType: file.type
      }, (response) => {
        if (response && response.success) {
          updateStatus('Document ajouté avec succès', 'success');
          
          // Mettre à jour le compteur de documents
          const docCountElement = magicSuite?.querySelector('#doc-count');
          if (docCountElement) {
            const currentCount = parseInt(docCountElement.textContent?.match(/\d+/)?.[0] || '0');
            docCountElement.textContent = `${currentCount + 1} document(s)`;
          }
          
          // Afficher un message de succès dans la zone RAG
          showResult('rag-results', `Document "${file.name}" ajouté avec succès !`, 'success');
          
          setTimeout(() => updateStatus('Prêt', 'ready'), 2000);
        } else {
          updateStatus('Erreur lors de l\'upload', 'error');
          showResult('rag-results', `Erreur lors de l'ajout du document: ${response?.error || 'Erreur inconnue'}`, 'error');
          setTimeout(() => updateStatus('Prêt', 'ready'), 3000);
        }
      });
    };
    
    reader.onerror = () => {
      updateStatus('Erreur lors de la lecture du fichier', 'error');
      setTimeout(() => updateStatus('Prêt', 'ready'), 3000);
    };
    
    // Lire le fichier selon son type
    if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      // Pour les autres types de fichiers, on lit en base64 pour l'instant
      reader.readAsDataURL(file);
    }
    
    // Nettoyer l'input
    document.body.removeChild(fileInput);
  };
  
  // Ajouter l'input au DOM et déclencher le clic
  document.body.appendChild(fileInput);
  fileInput.click();
}

function handleSaveSettings() {
  const defaultLang = (magicSuite?.querySelector('#default-language') as HTMLSelectElement)?.value;
  const autoTranslate = (magicSuite?.querySelector('#auto-translate') as HTMLInputElement)?.checked;
  const emailSignature = (magicSuite?.querySelector('#email-signature') as HTMLTextAreaElement)?.value;

  state.userSettings = {
    defaultLanguage: defaultLang || 'fr',
    autoTranslate: autoTranslate || false,
    emailSignature: emailSignature || ''
  };

  saveState();
  updateStatus('Paramètres sauvegardés', 'success');
  setTimeout(() => updateStatus('Prêt', 'ready'), 2000);
}

// Fonction pour afficher les résultats dans l'interface
function showResult(containerId: string, content: string, type: 'loading' | 'success' | 'error') {
  const container = magicSuite?.querySelector(`#${containerId}`) as HTMLElement;
  const contentDiv = magicSuite?.querySelector(`#${containerId}-content`) as HTMLElement;
  
  if (!container || !contentDiv) return;
  
  // Afficher le conteneur
  container.classList.add('show');
  container.classList.remove('loading', 'success', 'error');
  container.classList.add(type);
  
  // Mettre à jour le contenu
  contentDiv.textContent = content;
  
  // Scroll vers le résultat
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Fonction pour copier dans le presse-papiers
function copyToClipboard(contentId: string) {
  const content = magicSuite?.querySelector(`#${contentId}`)?.textContent;
  if (content) {
    navigator.clipboard.writeText(content).then(() => {
      updateStatus('Copié dans le presse-papiers', 'success');
      setTimeout(() => updateStatus('Prêt', 'ready'), 1500);
    });
  }
}

// Rendre la fonction accessible globalement
(window as any).copyToClipboard = copyToClipboard;

function updateStatus(text: string, type: 'ready' | 'loading' | 'success' | 'error') {
  if (!magicSuite) return;

  const statusText = magicSuite.querySelector('#magic-status-text') as HTMLElement;
  const statusIndicator = magicSuite.querySelector('.magic-status-indicator') as HTMLElement;
  const status = magicSuite.querySelector('.magic-suite-status') as HTMLElement;

  statusText.textContent = text;

  switch (type) {
    case 'loading':
      statusIndicator.style.background = '#f59e0b';
      status.style.background = '#fffbeb';
      status.style.borderColor = '#fed7aa';
      status.style.color = '#92400e';
      break;
    case 'success':
      statusIndicator.style.background = '#10b981';
      status.style.background = '#ecfdf5';
      status.style.borderColor = '#a7f3d0';
      status.style.color = '#047857';
      break;
    case 'error':
      statusIndicator.style.background = '#ef4444';
      status.style.background = '#fef2f2';
      status.style.borderColor = '#fecaca';
      status.style.color = '#dc2626';
      break;
    default: // ready
      statusIndicator.style.background = '#22c55e';
      status.style.background = '#f0fdf4';
      status.style.borderColor = '#bbf7d0';
      status.style.color = '#15803d';
  }
}

// Sauvegarde et chargement de l'état
function saveState() {
  chrome.storage.local.set({ magicButtonState: state });
}

function loadState() {
  chrome.storage.local.get(['magicButtonState'], (result) => {
    if (result.magicButtonState) {
      state = { ...state, ...result.magicButtonState };
      updateFloatingButtonState();
      
      if (state.isVisible) {
        showSuite();
      }
    }
  });
}

// Nettoyage
window.addEventListener('beforeunload', () => {
  if (floatingButton) {
    floatingButton.remove();
  }
  if (magicSuite) {
    magicSuite.remove();
  }
});