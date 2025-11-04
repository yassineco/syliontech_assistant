import { AssistantWidget } from './widget.js'
import type { AssistantConfig } from './types.js'

// Auto-initialisation du widget basé sur les data-attributes du script
(function() {
  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget)
  } else {
    initWidget()
  }

  function initWidget() {
    // Chercher le script tag avec data-tenant-id
    const script = document.querySelector('script[data-tenant-id]') as HTMLScriptElement
    
    if (!script) {
      console.error('SylionTech Assistant: script tag avec data-tenant-id requis')
      return
    }

    // Extraire la configuration des data-attributes
    const config: AssistantConfig = {
      tenantId: script.dataset.tenantId!,
      apiKey: script.dataset.apiKey,
      theme: (script.dataset.theme as any) || 'auto',
      lang: (script.dataset.lang as any) || 'fr',
      position: (script.dataset.position as any) || 'bottom-right',
      apiUrl: script.dataset.apiUrl || 'https://api.syliontech.ai',
      primaryColor: script.dataset.primaryColor,
      accentColor: script.dataset.accentColor,
      borderRadius: script.dataset.borderRadius,
      fontFamily: script.dataset.fontFamily,
      welcomeMessage: script.dataset.welcomeMessage,
      placeholder: script.dataset.placeholder,
      triggerIcon: script.dataset.triggerIcon,
      width: script.dataset.width,
      height: script.dataset.height,
      zIndex: script.dataset.zIndex ? parseInt(script.dataset.zIndex) : undefined,
      debug: script.dataset.debug === 'true',
      
      // Configuration vocale
      enableVoice: script.dataset.enableVoice !== 'false', // true par défaut
      speechToText: script.dataset.speechToText !== 'false', // true par défaut
      autoSpeak: script.dataset.autoSpeak !== 'false', // true par défaut
      voiceLanguage: script.dataset.voiceLanguage,
      voiceRate: script.dataset.voiceRate ? parseFloat(script.dataset.voiceRate) : undefined,
      voicePitch: script.dataset.voicePitch ? parseFloat(script.dataset.voicePitch) : undefined,
      voiceVolume: script.dataset.voiceVolume ? parseFloat(script.dataset.voiceVolume) : undefined
    }

    // Filtrer les valeurs undefined
    Object.keys(config).forEach(key => {
      if (config[key as keyof AssistantConfig] === undefined) {
        delete config[key as keyof AssistantConfig]
      }
    })

    try {
      // Créer l'instance du widget
      const widget = new AssistantWidget(config)
      
      // Exposer l'API globale
      ;(window as any).SylionTechAssistant = {
        widget,
        open: () => widget.open(),
        close: () => widget.close(),
        toggle: () => widget.toggle(),
        setConfig: (newConfig: Partial<AssistantConfig>) => widget.setConfig(newConfig),
        destroy: () => widget.destroy(),
        
        // API vocale
        speak: (text: string) => widget.speak(text),
        stopSpeaking: () => widget.stopSpeaking(),
        startListening: () => widget.startListening(),
        stopListening: () => widget.stopListening()
      }

      if (config.debug) {
        console.log('✅ SylionTech Assistant initialisé avec succès')
      }
    } catch (error) {
      console.error('❌ Erreur initialisation SylionTech Assistant:', error)
    }
  }
})()

// Export pour utilisation programmatique
export { AssistantWidget }
export type { AssistantConfig, ChatMessage } from './types.js'