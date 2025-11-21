#!/bin/bash

# ===========================================
# TESTS DE VALIDATION - INFRASTRUCTURE DEV
# ===========================================

# Configuration
PROJECT_ID="sylion-tech-assistant"
API_SERVICE="syliontech-api-dev"
REGION="europe-west1"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_test() {
    echo -e "${BLUE}🧪 Test: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_fail() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔍 Tests de Validation - Infrastructure DEV"
echo "==========================================="
echo

# Variables pour stocker les résultats
API_URL=""
TESTS_PASSED=0
TESTS_FAILED=0

# ===========================================
# TEST 1: RÉCUPÉRATION DE L'URL API
# ===========================================

log_test "Récupération de l'URL du service Cloud Run"

if API_URL=$(gcloud run services describe $API_SERVICE --region $REGION --format 'value(status.url)' 2>/dev/null); then
    if [ ! -z "$API_URL" ]; then
        log_pass "URL API récupérée: $API_URL"
        ((TESTS_PASSED++))
    else
        log_fail "URL API vide"
        ((TESTS_FAILED++))
        exit 1
    fi
else
    log_fail "Impossible de récupérer l'URL API - service non déployé?"
    ((TESTS_FAILED++))
    exit 1
fi

echo

# ===========================================
# TEST 2: HEALTH CHECK API
# ===========================================

log_test "Health Check de l'API"

if response=$(curl -s -f "$API_URL/health" 2>/dev/null); then
    log_pass "API accessible et en bonne santé"
    echo "   Response: $response"
    ((TESTS_PASSED++))
else
    log_fail "API non accessible ou erreur health check"
    ((TESTS_FAILED++))
fi

echo

# ===========================================
# TEST 3: ENDPOINT /V1/CHAT
# ===========================================

log_test "Test de l'endpoint /v1/chat"

chat_payload='{
    "messages": [
        {
            "role": "user",
            "content": "Test de validation automatique"
        }
    ],
    "session": {
        "userId": "validation-test",
        "lang": "fr",
        "channel": "validation"
    }
}'

chat_response=$(curl -s -X POST "$API_URL/v1/chat" \
    -H "Content-Type: application/json" \
    -H "x-api-key: demo-key-123" \
    -d "$chat_payload" \
    -w "HTTP_STATUS:%{http_code}" 2>/dev/null)

http_status=$(echo "$chat_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$chat_response" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$http_status" = "200" ]; then
    log_pass "Endpoint /v1/chat fonctionnel (HTTP 200)"
    echo "   Response preview: $(echo "$response_body" | cut -c1-100)..."
    ((TESTS_PASSED++))
else
    log_fail "Endpoint /v1/chat en erreur (HTTP $http_status)"
    echo "   Response: $response_body"
    ((TESTS_FAILED++))
fi

echo

# ===========================================
# TEST 4: VÉRIFICATION ADMIN CONSOLE
# ===========================================

log_test "Vérification Admin Console Firebase"

admin_url="https://syliontech-admin-dev.web.app"
if admin_response=$(curl -s -I "$admin_url" -w "HTTP_STATUS:%{http_code}" 2>/dev/null); then
    admin_status=$(echo "$admin_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    if [ "$admin_status" = "200" ]; then
        log_pass "Admin Console accessible: $admin_url"
        ((TESTS_PASSED++))
    else
        log_fail "Admin Console inaccessible (HTTP $admin_status)"
        ((TESTS_FAILED++))
    fi
else
    log_fail "Impossible de contacter l'Admin Console"
    ((TESTS_FAILED++))
fi

echo

# ===========================================
# TEST 5: VÉRIFICATION DÉMO
# ===========================================

log_test "Vérification Page Démo"

demo_url="https://syliontech-demo-dev.web.app"
if demo_response=$(curl -s -I "$demo_url" -w "HTTP_STATUS:%{http_code}" 2>/dev/null); then
    demo_status=$(echo "$demo_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    if [ "$demo_status" = "200" ]; then
        log_pass "Page Démo accessible: $demo_url"
        ((TESTS_PASSED++))
    else
        log_fail "Page Démo inaccessible (HTTP $demo_status)"
        ((TESTS_FAILED++))
    fi
else
    log_fail "Impossible de contacter la Page Démo"
    ((TESTS_FAILED++))
fi

echo

# ===========================================
# TEST 6: VÉRIFICATION DES LOGS
# ===========================================

log_test "Vérification des logs Cloud Run"

if logs=$(gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$API_SERVICE" --limit=5 --format="value(textPayload)" 2>/dev/null); then
    if [ ! -z "$logs" ]; then
        log_pass "Logs Cloud Run disponibles"
        echo "   Derniers logs:"
        echo "$logs" | head -3 | sed 's/^/   /'
        ((TESTS_PASSED++))
    else
        log_warning "Aucun log trouvé (service récemment déployé?)"
        ((TESTS_PASSED++))
    fi
else
    log_fail "Impossible de récupérer les logs"
    ((TESTS_FAILED++))
fi

echo

# ===========================================
# RÉSUMÉ DES TESTS
# ===========================================

echo "📊 Résumé des Tests"
echo "==================="
echo "   ✅ Tests réussis: $TESTS_PASSED"
echo "   ❌ Tests échoués: $TESTS_FAILED"
echo "   📈 Total: $((TESTS_PASSED + TESTS_FAILED))"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${NC}"
    echo
    echo "🔗 Infrastructure prête :"
    echo "   📡 API:   $API_URL"
    echo "   🏛️ Admin: https://syliontech-admin-dev.web.app"
    echo "   🎭 Démo:  https://syliontech-demo-dev.web.app"
    echo
    exit 0
else
    echo -e "${RED}💥 $TESTS_FAILED test(s) ont échoué${NC}"
    echo
    echo "🔧 Actions recommandées :"
    echo "   1. Vérifier les logs: gcloud logging read 'resource.type=cloud_run_revision'"
    echo "   2. Redéployer si nécessaire: ./scripts/deploy-dev.sh"
    echo "   3. Vérifier la configuration Firebase"
    echo
    exit 1
fi