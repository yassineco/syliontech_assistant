#!/bin/bash

# Script de développement local Magic Button
# Lance tous les services nécessaires pour le développement

set -e

echo "🪄 Magic Button - Development Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Vérifier version Node.js
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ required, found: $(node -v)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Installer les dépendances
install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ ! -f ".env" ]; then
        log_warning ".env file not found, copying from .env.example"
        cp .env.example .env
        log_warning "Please update .env with your actual values"
    fi
    
    # Root dependencies
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Backend dependencies
    if [ ! -d "backend/node_modules" ]; then
        cd backend && npm install && cd ..
    fi
    
    # Extension dependencies
    if [ ! -d "extension/node_modules" ]; then
        cd extension && npm install && cd ..
    fi
    
    log_success "Dependencies installed"
}

# Build du projet
build_project() {
    log_info "Building project..."
    
    # Build backend
    cd backend
    npm run build
    cd ..
    
    # Build extension
    cd extension
    npm run build:dev
    cd ..
    
    log_success "Project built successfully"
}

# Lancer les services de développement
start_dev_services() {
    log_info "Starting development services..."
    
    # Créer des fichiers PID pour tracking
    mkdir -p .dev
    
    # Lancer le backend en arrière-plan
    log_info "Starting backend API..."
    cd backend
    npm run dev > ../.dev/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../.dev/backend.pid
    cd ..
    
    # Attendre que le backend démarre
    sleep 3
    
    # Vérifier que le backend fonctionne
    if curl -s http://localhost:8080/health > /dev/null; then
        log_success "Backend API started (PID: $BACKEND_PID)"
    else
        log_error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Lancer le build watch de l'extension
    log_info "Starting extension build watch..."
    cd extension
    npm run dev > ../.dev/extension.log 2>&1 &
    EXTENSION_PID=$!
    echo $EXTENSION_PID > ../.dev/extension.pid
    cd ..
    
    log_success "Extension build watch started (PID: $EXTENSION_PID)"
    
    # Sauvegarder les PIDs
    echo "BACKEND_PID=$BACKEND_PID" > .dev/services.env
    echo "EXTENSION_PID=$EXTENSION_PID" >> .dev/services.env
}

# Afficher les informations utiles
show_info() {
    echo ""
    log_success "Development environment is ready!"
    echo "======================================"
    echo ""
    echo "📊 Services:"
    echo "  • Backend API: http://localhost:8080"
    echo "  • Health check: http://localhost:8080/health"
    echo "  • Extension: extension/dist (load in Chrome)"
    echo ""
    echo "📁 Logs:"
    echo "  • Backend: .dev/backend.log"
    echo "  • Extension: .dev/extension.log"
    echo ""
    echo "🔧 Commands:"
    echo "  • Stop services: ./scripts/dev-stop.sh"
    echo "  • View logs: tail -f .dev/backend.log"
    echo "  • Restart: ./scripts/dev-restart.sh"
    echo ""
    echo "🌐 Chrome Extension:"
    echo "  1. Open chrome://extensions/"
    echo "  2. Enable 'Developer mode'"
    echo "  3. Click 'Load unpacked'"
    echo "  4. Select the 'extension/dist' folder"
    echo ""
    echo "Press Ctrl+C to stop all services"
}

# Gestion des signaux pour arrêter proprement
cleanup() {
    echo ""
    log_info "Stopping development services..."
    
    if [ -f ".dev/services.env" ]; then
        source .dev/services.env
        kill $BACKEND_PID 2>/dev/null && log_success "Backend stopped" || true
        kill $EXTENSION_PID 2>/dev/null && log_success "Extension watch stopped" || true
    fi
    
    # Nettoyer les fichiers temporaires
    rm -rf .dev/
    
    log_success "Development environment stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Exécution principale
main() {
    check_prerequisites
    install_dependencies
    build_project
    start_dev_services
    show_info
    
    # Garder le script en vie
    while true; do
        sleep 1
    done
}

# Lancer si exécuté directement
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi