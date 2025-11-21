// ===========================================
// DEMO SCRIPTS - SYLIONTECH ASSISTANT
// ===========================================

class SylionTechDemo {
    constructor() {
        this.logOutput = document.getElementById('log-output');
        this.init();
    }

    init() {
        this.log('🚀 Initialisation de la démo SylionTech Assistant');
        this.setupEventListeners();
        this.checkWidgetStatus();
    }

    setupEventListeners() {
        // Bouton d'ouverture de l'assistant
        document.getElementById('trigger-assistant').addEventListener('click', () => {
            this.triggerAssistant();
        });

        // Bouton de test vocal
        document.getElementById('test-voice').addEventListener('click', () => {
            this.testVoice();
        });

        // Bouton de test API direct
        document.getElementById('test-api').addEventListener('click', () => {
            this.testApiDirect();
        });

        // Bouton d'effacement des logs
        document.getElementById('clear-logs').addEventListener('click', () => {
            this.clearLogs();
        });

        // Sélecteurs de configuration
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.updateConfig('language', e.target.value);
        });

        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.updateConfig('theme', e.target.value);
        });
    }

    triggerAssistant() {
        this.log('🎯 Ouverture de l\'assistant...');
        
        if (window.SylionTechAssistant) {
            try {
                window.SylionTechAssistant.open();
                this.log('✅ Assistant ouvert avec succès');
                this.updateStatus('Assistant ouvert', 'success');
            } catch (error) {
                this.log(`❌ Erreur lors de l'ouverture: ${error.message}`, 'error');
                this.updateStatus('Erreur', 'error');
            }
        } else {
            this.log('❌ Widget SylionTech non disponible', 'error');
            this.updateStatus('Widget indisponible', 'error');
        }
    }

    testVoice() {
        this.log('🎤 Test des capacités vocales...');
        
        if (window.SylionTechAssistant && window.SylionTechAssistant.voice) {
            try {
                window.SylionTechAssistant.voice.startListening();
                this.log('✅ Reconnaissance vocale activée');
                this.updateStatus('Écoute active', 'listening');
            } catch (error) {
                this.log(`❌ Erreur vocale: ${error.message}`, 'error');
                this.updateStatus('Erreur vocale', 'error');
            }
        } else {
            // Test manuel de l'API Web Speech
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                this.log('🎤 Test direct de Web Speech API...');
                const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                recognition.lang = 'fr-FR';
                recognition.onstart = () => {
                    this.log('✅ Web Speech API démarrée');
                    this.updateStatus('Test vocal actif', 'listening');
                };
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    this.log(`🎯 Transcription: "${transcript}"`);
                    this.updateStatus('Transcription reçue', 'success');
                };
                recognition.onerror = (event) => {
                    this.log(`❌ Erreur Speech API: ${event.error}`, 'error');
                    this.updateStatus('Erreur Speech API', 'error');
                };
                recognition.start();
            } else {
                this.log('❌ Web Speech API non supportée par ce navigateur', 'error');
                this.updateStatus('Speech API indisponible', 'error');
            }
        }
    }

    async testApiDirect() {
        this.log('🔗 Test direct de l\'API /v1/chat...');
        this.updateStatus('Test API...', 'loading');

        const apiUrl = document.getElementById('api-endpoint').value;
        const tenantId = document.getElementById('tenant-id').value;

        const payload = {
            messages: [
                {
                    role: "user",
                    content: "Bonjour, pouvez-vous me présenter SylionTech ?"
                }
            ],
            session: {
                userId: `demo-user-${Date.now()}`,
                lang: document.getElementById('language-select').value,
                channel: "web-demo"
            }
        };

        try {
            this.log(`📡 Envoi vers: ${apiUrl}/v1/chat`);
            this.log(`📋 Payload: ${JSON.stringify(payload, null, 2)}`);

            const response = await fetch(`${apiUrl}/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'demo-key-123'
                },
                body: JSON.stringify(payload)
            });

            this.log(`📈 Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.log(`✅ Réponse reçue:`);
            this.log(JSON.stringify(data, null, 2));
            this.updateStatus('API fonctionnelle', 'success');

        } catch (error) {
            this.log(`❌ Erreur API: ${error.message}`, 'error');
            this.updateStatus('Erreur API', 'error');
        }
    }

    updateConfig(key, value) {
        this.log(`⚙️ Configuration mise à jour: ${key} = ${value}`);
        
        if (window.SylionTechConfig) {
            window.SylionTechConfig[key] = value;
            this.log(`✅ Configuration appliquée`);
        }
    }

    checkWidgetStatus() {
        setTimeout(() => {
            if (window.SylionTechAssistant) {
                this.log('✅ Widget SylionTech chargé et prêt');
                this.updateStatus('Widget prêt', 'success');
                
                // Vérification des fonctionnalités
                if (window.SylionTechAssistant.voice) {
                    this.log('🎤 Fonctionnalités vocales disponibles');
                }
                
                if (window.SylionTechAssistant.config) {
                    this.log(`🔧 Configuration: ${JSON.stringify(window.SylionTechAssistant.config, null, 2)}`);
                }
            } else {
                this.log('⚠️ Widget SylionTech non détecté - vérifiez le chargement', 'warning');
                this.updateStatus('Widget indisponible', 'warning');
            }
        }, 2000);
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.querySelector('.status span:last-child');
        const statusDot = document.querySelector('.status-dot');
        
        if (statusElement) {
            statusElement.textContent = message;
        }

        if (statusDot) {
            statusDot.className = 'status-dot';
            switch (type) {
                case 'success':
                    statusDot.style.background = '#10b981';
                    break;
                case 'warning':
                    statusDot.style.background = '#f59e0b';
                    break;
                case 'error':
                    statusDot.style.background = '#ef4444';
                    break;
                case 'listening':
                    statusDot.style.background = '#8b5cf6';
                    break;
                case 'loading':
                    statusDot.style.background = '#6b7280';
                    break;
                default:
                    statusDot.style.background = '#3b82f6';
            }
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        const prefix = this.getLogPrefix(type);
        const logLine = `[${timestamp}] ${prefix} ${message}\n`;
        
        this.logOutput.textContent += logLine;
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
        
        // Log également dans la console du navigateur
        console.log(`[SylionTech Demo] ${message}`);
    }

    getLogPrefix(type) {
        switch (type) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'success': return '✅';
            default: return 'ℹ️';
        }
    }

    clearLogs() {
        this.logOutput.textContent = 'Logs effacés...\n';
        this.updateStatus('Prêt', 'info');
        this.log('🧹 Logs effacés');
    }
}

// Initialisation de la démo au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    window.sylionTechDemo = new SylionTechDemo();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    if (window.sylionTechDemo) {
        window.sylionTechDemo.log(`💥 Erreur globale: ${event.error?.message || event.message}`, 'error');
    }
});

// Gestion des promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
    if (window.sylionTechDemo) {
        window.sylionTechDemo.log(`💥 Promise rejetée: ${event.reason}`, 'error');
    }
});