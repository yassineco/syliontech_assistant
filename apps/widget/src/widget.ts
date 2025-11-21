import type { AssistantConfig, ChatMessage, ChatResponse } from './types.js'
import { VoiceManager } from './voice.js'

export class AssistantWidget {
  private config: AssistantConfig
  private isOpen = false
  private container: HTMLElement | null = null
  private chatContainer: HTMLElement | null = null
  private messages: ChatMessage[] = []
  private isStreaming = false
  private voiceManager: VoiceManager | null = null
  private isRecording = false
  private interimTranscript = ''

  constructor(config: AssistantConfig) {
    this.config = this.validateConfig(config)
    this.init()
  }

  private validateConfig(config: AssistantConfig): AssistantConfig {
    if (!config.tenantId) {
      throw new Error('SylionTech Assistant: tenantId is required')
    }

    return {
      theme: 'auto',
      lang: 'fr',
      position: 'bottom-right',
      apiUrl: 'https://api.syliontech.ai',
      primaryColor: '#3B82F6',
      accentColor: '#1D4ED8',
      borderRadius: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
      placeholder: 'Tapez votre message...',
      triggerIcon: '💬',
      width: '380px',
      height: '600px',
      zIndex: 999999,
      debug: false,
      
      // Configuration vocale
      enableVoice: true,
      voiceLanguage: 'fr-FR',
      voiceRate: 1,
      voicePitch: 1,
      voiceVolume: 1,
      autoSpeak: true,
      speechToText: true,
      ...config
    }
  }

  private init(): void {
    this.createContainer()
    this.attachEventListeners()
    this.detectTheme()
    this.initVoice()
    
    if (this.config.debug) {
      console.log('SylionTech Assistant initialized:', this.config)
    }
  }

  private initVoice(): void {
    if (this.config.enableVoice) {
      this.voiceManager = new VoiceManager({
        lang: this.config.lang || 'fr',
        rate: this.config.voiceRate,
        pitch: this.config.voicePitch,
        volume: this.config.voiceVolume,
        debug: this.config.debug
      })

      this.voiceManager.onRecognitionResult((text: string, isFinal: boolean) => {
        this.handleVoiceResult(text, isFinal)
      })

      this.voiceManager.onRecognitionError((error: string) => {
        console.error('Voice recognition error:', error)
        this.stopListening()
      })

      if (this.config.debug) {
        console.log('Voice capabilities:', {
          supported: this.voiceManager.isVoiceSupported(),
          voices: this.voiceManager.getAvailableVoices().length
        })
      }
    }
  }

  private createContainer(): void {
    // Container principal
    this.container = document.createElement('div')
    this.container.id = 'syliontech-assistant'
    this.container.innerHTML = this.getHTML()
    
    // Styles CSS
    const styles = this.getCSS()
    const styleSheet = document.createElement('style')
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
    
    // Ajouter au DOM
    document.body.appendChild(this.container)
    
    // Récupérer les éléments
    this.chatContainer = this.container.querySelector('.chat-messages')
  }

  private getHTML(): string {
    const position = this.config.position!
    const [vertical, horizontal] = position.split('-')
    
    return `
      <div class="assistant-trigger assistant-${this.config.theme}" 
           style="
             ${vertical}: 20px; 
             ${horizontal}: 20px;
             z-index: ${this.config.zIndex};
           ">
        <button class="trigger-button" type="button" aria-label="Ouvrir l'assistant">
          <span class="trigger-icon">${this.config.triggerIcon}</span>
        </button>
      </div>
      
      <div class="assistant-chat assistant-${this.config.theme}" 
           style="
             ${vertical}: 80px; 
             ${horizontal}: 20px;
             width: ${this.config.width};
             height: ${this.config.height};
             z-index: ${this.config.zIndex};
             display: none;
           ">
        <div class="chat-header">
          <div class="chat-title">
            <span class="chat-icon">${this.config.triggerIcon}</span>
            <span>Assistant SylionTech</span>
          </div>
          <button class="chat-close" type="button" aria-label="Fermer">×</button>
        </div>
        
        <div class="chat-messages">
          <div class="message assistant-message">
            <div class="message-content">${this.config.welcomeMessage}</div>
            <div class="message-time">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        
        <div class="chat-input">
          <div class="input-container">
            ${this.config.enableVoice ? `
            <button class="voice-button" type="button" aria-label="Reconnaissance vocale">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            ` : ''}
            <textarea 
              placeholder="${this.config.placeholder}" 
              rows="1"
              class="message-input"
            ></textarea>
            <button class="send-button" type="button" aria-label="Envoyer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          ${this.config.enableVoice && this.config.speechToText ? `
          <div class="voice-indicator" style="display: none;">
            <div class="voice-wave">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="voice-text">Écoute en cours...</span>
          </div>
          ` : ''}
        </div>
      </div>
    `
  }

  private getCSS(): string {
    return `
      #syliontech-assistant * {
        box-sizing: border-box;
        font-family: ${this.config.fontFamily};
      }
      
      .assistant-trigger {
        position: fixed;
        z-index: ${this.config.zIndex};
      }
      
      .trigger-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .trigger-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      .assistant-chat {
        position: fixed;
        background: white;
        border-radius: ${this.config.borderRadius};
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        transform: scale(0.8);
        opacity: 0;
      }
      
      .assistant-chat.open {
        transform: scale(1);
        opacity: 1;
      }
      
      .chat-header {
        padding: 16px 20px;
        background: ${this.config.primaryColor};
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chat-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      
      .chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .message {
        max-width: 80%;
        animation: messageSlideIn 0.3s ease;
      }
      
      .user-message {
        align-self: flex-end;
      }
      
      .assistant-message {
        align-self: flex-start;
      }
      
      .message-content {
        padding: 12px 16px;
        border-radius: ${this.config.borderRadius};
        word-wrap: break-word;
      }
      
      .user-message .message-content {
        background: ${this.config.primaryColor};
        color: white;
      }
      
      .assistant-message .message-content {
        background: #F3F4F6;
        color: #374151;
      }
      
      .message-time {
        font-size: 11px;
        color: #9CA3AF;
        margin-top: 4px;
        text-align: right;
      }
      
      .user-message .message-time {
        text-align: right;
      }
      
      .assistant-message .message-time {
        text-align: left;
      }
      
      .chat-input {
        padding: 16px;
        border-top: 1px solid #E5E7EB;
      }
      
      .input-container {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      
      .message-input {
        flex: 1;
        border: 1px solid #D1D5DB;
        border-radius: ${this.config.borderRadius};
        padding: 12px 16px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
        max-height: 120px;
        transition: border-color 0.2s ease;
      }
      
      .message-input:focus {
        outline: none;
        border-color: ${this.config.primaryColor};
        box-shadow: 0 0 0 3px ${this.config.primaryColor}20;
      }
      
      .send-button {
        width: 44px;
        height: 44px;
        border: none;
        background: ${this.config.primaryColor};
        color: white;
        border-radius: ${this.config.borderRadius};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      
      .send-button:hover:not(:disabled) {
        background: ${this.config.accentColor};
      }
      
      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .voice-button {
        width: 44px;
        height: 44px;
        border: 1px solid #D1D5DB;
        background: white;
        color: #6B7280;
        border-radius: ${this.config.borderRadius};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .voice-button:hover {
        background: #F9FAFB;
        border-color: ${this.config.primaryColor};
        color: ${this.config.primaryColor};
      }
      
      .voice-button.recording {
        background: #EF4444;
        border-color: #EF4444;
        color: white;
        animation: pulse 1.5s infinite;
      }
      
      .voice-indicator {
        padding: 8px 16px;
        background: #FEF3C7;
        border: 1px solid #F59E0B;
        border-radius: ${this.config.borderRadius};
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #92400E;
      }
      
      .voice-wave {
        display: flex;
        gap: 2px;
      }
      
      .voice-wave span {
        width: 3px;
        height: 16px;
        background: #F59E0B;
        border-radius: 2px;
        animation: voiceWave 1.2s infinite ease-in-out;
      }
      
      .voice-wave span:nth-child(1) { animation-delay: -0.4s; }
      .voice-wave span:nth-child(2) { animation-delay: -0.2s; }
      .voice-wave span:nth-child(3) { animation-delay: 0s; }
      
      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
      }
      
      .typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9CA3AF;
        animation: typingBounce 1.4s infinite ease-in-out;
      }
      
      .typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .typing-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes messageSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes typingBounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }
      
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
      }
      
      @keyframes voiceWave {
        0%, 40%, 100% {
          transform: scaleY(0.4);
        }
        20% {
          transform: scaleY(1);
        }
      }
      
      /* Dark theme */
      .assistant-dark .assistant-chat {
        background: #1F2937;
        color: white;
      }
      
      .assistant-dark .assistant-message .message-content {
        background: #374151;
        color: #F9FAFB;
      }
      
      .assistant-dark .chat-input {
        border-top-color: #374151;
      }
      
      .assistant-dark .message-input {
        background: #374151;
        border-color: #4B5563;
        color: white;
      }
      
      .assistant-dark .message-input::placeholder {
        color: #9CA3AF;
      }
      
      /* Responsive */
      @media (max-width: 480px) {
        .assistant-chat {
          width: calc(100vw - 40px) !important;
          height: calc(100vh - 100px) !important;
        }
      }
    `
  }

  private attachEventListeners(): void {
    if (!this.container) return

    // Bouton trigger
    const triggerBtn = this.container.querySelector('.trigger-button')
    triggerBtn?.addEventListener('click', () => this.toggle())

    // Bouton fermer
    const closeBtn = this.container.querySelector('.chat-close')
    closeBtn?.addEventListener('click', () => this.close())

    // Input message
    const messageInput = this.container.querySelector('.message-input') as HTMLTextAreaElement
    const sendBtn = this.container.querySelector('.send-button')

    messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.handleSendMessage()
      }
    })

    messageInput?.addEventListener('input', () => {
      this.autoResizeTextarea(messageInput)
    })

    sendBtn?.addEventListener('click', () => this.handleSendMessage())

    // Bouton vocal
    const voiceBtn = this.container.querySelector('.voice-button')
    voiceBtn?.addEventListener('click', () => this.toggleVoiceRecording())

    // Fermer en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container?.contains(e.target as Node)) {
        this.close()
      }
    })
  }

  private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  private detectTheme(): void {
    if (this.config.theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.setTheme(isDark ? 'dark' : 'light')
      
      // Écouter les changements de thème
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.setTheme(e.matches ? 'dark' : 'light')
      })
    }
  }

  private setTheme(theme: 'light' | 'dark'): void {
    if (!this.container) return
    
    const elements = this.container.querySelectorAll('.assistant-trigger, .assistant-chat')
    elements.forEach(el => {
      el.classList.remove('assistant-light', 'assistant-dark')
      el.classList.add(`assistant-${theme}`)
    })
  }

  private async handleSendMessage(): Promise<void> {
    const input = this.container?.querySelector('.message-input') as HTMLTextAreaElement
    if (!input || !input.value.trim() || this.isStreaming) return

    const content = input.value.trim()
    input.value = ''
    input.style.height = 'auto'

    // Ajouter le message utilisateur
    this.addMessage({
      id: this.generateId(),
      content,
      role: 'user',
      timestamp: Date.now()
    })

    try {
      await this.sendMessage(content)
    } catch (error) {
      console.error('Erreur envoi message:', error)
      this.addMessage({
        id: this.generateId(),
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        role: 'assistant',
        timestamp: Date.now()
      })
    }
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message)
    this.renderMessage(message)
    this.scrollToBottom()
  }

  private renderMessage(message: ChatMessage): void {
    if (!this.chatContainer) return

    const messageEl = document.createElement('div')
    messageEl.className = `message ${message.role}-message`
    messageEl.innerHTML = `
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      <div class="message-time">${new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    `

    this.chatContainer.appendChild(messageEl)
  }

  private showTypingIndicator(): void {
    if (!this.chatContainer) return

    const typingEl = document.createElement('div')
    typingEl.className = 'message assistant-message typing-indicator'
    typingEl.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `

    this.chatContainer.appendChild(typingEl)
    this.scrollToBottom()
  }

  private hideTypingIndicator(): void {
    const typingEl = this.chatContainer?.querySelector('.typing-indicator')
    typingEl?.remove()
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight
    }
  }

  private async sendMessage(content: string): Promise<void> {
    this.isStreaming = true
    this.setSendButtonState(false)
    this.showTypingIndicator()

    try {
      const response = await fetch(`${this.config.apiUrl}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        },
        body: JSON.stringify({
          messages: this.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      
      this.hideTypingIndicator()
      this.addMessage({
        id: data.id,
        content: data.content,
        role: 'assistant',
        timestamp: data.timestamp
      })

      // Auto-speak si activé
      if (this.config.autoSpeak && this.voiceManager) {
        try {
          await this.voiceManager.speak(data.content)
        } catch (error) {
          console.warn('Speech synthesis error:', error)
        }
      }

    } catch (error) {
      this.hideTypingIndicator()
      throw error
    } finally {
      this.isStreaming = false
      this.setSendButtonState(true)
    }
  }

  private setSendButtonState(enabled: boolean): void {
    const sendBtn = this.container?.querySelector('.send-button') as HTMLButtonElement
    if (sendBtn) {
      sendBtn.disabled = !enabled
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Méthodes vocales
  private async toggleVoiceRecording(): Promise<void> {
    if (!this.voiceManager || !this.config.speechToText) {
      console.warn('Voice recording not available')
      return
    }

    if (this.isRecording) {
      this.stopListening()
    } else {
      await this.startVoiceRecording()
    }
  }

  private async startVoiceRecording(): Promise<void> {
    if (!this.voiceManager || this.isRecording) return

    try {
      this.isRecording = true
      this.updateVoiceButton()
      this.showVoiceIndicator()
      
      await this.voiceManager.startListening()
      
      if (this.config.debug) {
        console.log('Voice recording started')
      }
    } catch (error) {
      console.error('Failed to start voice recording:', error)
      this.stopListening()
    }
  }

  public stopListening(): void {
    if (!this.voiceManager || !this.isRecording) return

    this.voiceManager.stopListening()
    this.isRecording = false
    this.updateVoiceButton()
    this.hideVoiceIndicator()

    if (this.config.debug) {
      console.log('Voice recording stopped')
    }
  }

  private handleVoiceResult(text: string, isFinal: boolean): void {
    const messageInput = this.container?.querySelector('.message-input') as HTMLTextAreaElement
    if (!messageInput) return

    if (isFinal) {
      // Résultat final - traiter le message
      this.interimTranscript = ''
      messageInput.value = text
      this.autoResizeTextarea(messageInput)
      this.stopListening()
      
      // Envoyer automatiquement si le texte n'est pas vide
      if (text.trim()) {
        setTimeout(() => this.handleSendMessage(), 500)
      }
    } else {
      // Résultat intermédiaire - afficher en temps réel
      this.interimTranscript = text
      messageInput.value = text
      this.autoResizeTextarea(messageInput)
    }
  }

  private updateVoiceButton(): void {
    const voiceBtn = this.container?.querySelector('.voice-button')
    if (voiceBtn) {
      if (this.isRecording) {
        voiceBtn.classList.add('recording')
        voiceBtn.setAttribute('aria-label', 'Arrêter l\'enregistrement')
      } else {
        voiceBtn.classList.remove('recording')
        voiceBtn.setAttribute('aria-label', 'Reconnaissance vocale')
      }
    }
  }

  private showVoiceIndicator(): void {
    const indicator = this.container?.querySelector('.voice-indicator') as HTMLElement
    if (indicator) {
      indicator.style.display = 'flex'
    }
  }

  private hideVoiceIndicator(): void {
    const indicator = this.container?.querySelector('.voice-indicator') as HTMLElement
    if (indicator) {
      indicator.style.display = 'none'
    }
  }

  public async speak(text: string): Promise<void> {
    if (!this.voiceManager) {
      throw new Error('Voice synthesis not available')
    }
    return this.voiceManager.speak(text)
  }

  public stopSpeaking(): void {
    this.voiceManager?.stopSpeaking()
  }

  public async startListening(): Promise<void> {
    if (!this.voiceManager || this.isRecording) return

    try {
      this.isRecording = true
      this.updateVoiceButton()
      this.showVoiceIndicator()
      
      await this.voiceManager.startListening()
      
      if (this.config.debug) {
        console.log('Voice recording started')
      }
    } catch (error) {
      console.error('Failed to start voice recording:', error)
      this.stopListening()
    }
  }

  // API publique
  public open(): void {
    if (!this.container) return
    
    const chatEl = this.container.querySelector('.assistant-chat') as HTMLElement
    if (chatEl) {
      chatEl.style.display = 'flex'
      setTimeout(() => chatEl.classList.add('open'), 10)
      this.isOpen = true
    }
  }

  public close(): void {
    if (!this.container) return
    
    const chatEl = this.container.querySelector('.assistant-chat') as HTMLElement
    if (chatEl) {
      chatEl.classList.remove('open')
      setTimeout(() => {
        chatEl.style.display = 'none'
        this.isOpen = false
      }, 300)
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  public setConfig(newConfig: Partial<AssistantConfig>): void {
    this.config = { ...this.config, ...newConfig }
    // Recréer le widget avec la nouvelle config
    this.destroy()
    this.init()
  }

  public destroy(): void {
    // Nettoyer les ressources vocales
    this.stopListening()
    this.stopSpeaking()
    this.voiceManager?.destroy()
    this.voiceManager = null
    
    // Nettoyer le DOM
    if (this.container) {
      this.container.remove()
      this.container = null
      this.chatContainer = null
    }
    
    // Réinitialiser l'état
    this.messages = []
    this.isOpen = false
    this.isRecording = false
    this.interimTranscript = ''
  }
}