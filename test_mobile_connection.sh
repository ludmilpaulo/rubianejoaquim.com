#!/bin/bash

echo "🔍 DIAGNÓSTICO DE CONEXÃO MOBILE APP"
echo "===================================="
echo ""

# 1. Verificar IP do computador
echo "1️⃣ IP do Computador:"
IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1)
echo "   IP encontrado: $IP"
echo ""

# 2. Verificar se backend está rodando
echo "2️⃣ Status do Backend:"
if ps aux | grep -q "[p]ython.*manage.py runserver"; then
    echo "   ✅ Backend está rodando"
    PID=$(ps aux | grep "[p]ython.*manage.py runserver" | awk '{print $2}' | head -1)
    echo "   PID: $PID"
else
    echo "   ❌ Backend NÃO está rodando"
    echo "   Execute: cd backend && python manage.py runserver 0.0.0.0:8000"
fi
echo ""

# 3. Verificar porta 8000
echo "3️⃣ Porta 8000:"
if netstat -an | grep -q "\.8000.*LISTEN"; then
    echo "   ✅ Porta 8000 está escutando"
    netstat -an | grep "\.8000.*LISTEN" | head -1
else
    echo "   ❌ Porta 8000 NÃO está escutando"
fi
echo ""

# 4. Testar conexão HTTP
echo "4️⃣ Teste de Conexão HTTP:"
if [ ! -z "$IP" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://$IP:8000/api/" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
        echo "   ✅ Backend está acessível em http://$IP:8000"
        echo "   HTTP Status: $HTTP_CODE"
    else
        echo "   ❌ Backend NÃO está acessível em http://$IP:8000"
        echo "   HTTP Status: $HTTP_CODE"
    fi
else
    echo "   ⚠️  Não foi possível determinar o IP"
fi
echo ""

# 5. Verificar configuração do mobile app
echo "5️⃣ Configuração do Mobile App:"
if [ -f "mobile/src/services/api.ts" ]; then
    if grep -q "DEV_IP.*=.*'$IP'" mobile/src/services/api.ts 2>/dev/null; then
        echo "   ✅ IP configurado corretamente no mobile app"
    else
        echo "   ⚠️  IP no mobile app pode estar diferente"
        echo "   IP no código: $(grep "DEV_IP.*=" mobile/src/services/api.ts | head -1 | sed 's/.*DEV_IP.*=.*\([0-9.]*\).*/\1/')"
        echo "   IP atual: $IP"
    fi
else
    echo "   ⚠️  Arquivo mobile/src/services/api.ts não encontrado"
fi
echo ""

# 6. Verificar usesCleartextTraffic no Android
echo "6️⃣ Configuração Android (usesCleartextTraffic):"
if [ -f "mobile/app.json" ]; then
    if grep -q "usesCleartextTraffic.*true" mobile/app.json; then
        echo "   ✅ HTTP permitido no Android"
    else
        echo "   ❌ HTTP NÃO está permitido no Android"
        echo "   Adicione 'usesCleartextTraffic: true' no app.json"
    fi
else
    echo "   ⚠️  Arquivo mobile/app.json não encontrado"
fi
echo ""

# Resumo
echo "===================================="
echo "📋 RESUMO:"
echo ""
if ps aux | grep -q "[p]ython.*manage.py runserver" && [ ! -z "$IP" ]; then
    echo "✅ Backend está rodando"
    echo "✅ IP: $IP"
    echo ""
    echo "📱 Para conectar o mobile app:"
    echo "   1. Certifique-se que o dispositivo está na mesma WiFi"
    echo "   2. Recompile o app: cd mobile && npm run android"
    echo "   3. Se o IP mudou, atualize mobile/src/services/api.ts"
else
    echo "❌ Backend precisa ser iniciado"
    echo "   Execute: cd backend && python manage.py runserver 0.0.0.0:8000"
fi
echo ""
