#!/bin/bash

echo "🔍 DIAGNÓSTICO DE CONEXÃO MOBILE APP"
echo "======================================"
echo ""

# Check if backend is running
echo "1. Verificando se o backend está rodando..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ Backend está rodando na porta 8000"
else
    echo "   ❌ Backend NÃO está rodando na porta 8000"
    echo "   💡 Execute: cd backend && python manage.py runserver 0.0.0.0:8000"
    exit 1
fi

# Check IP address
echo ""
echo "2. Verificando IP do computador..."
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "   IP encontrado: $IP"
echo "   IP configurado no app: 192.168.1.139"

if [ "$IP" != "192.168.1.139" ]; then
    echo "   ⚠️  IPs não coincidem! Atualize o IP no mobile/src/services/api.ts"
fi

# Check if backend is listening on 0.0.0.0
echo ""
echo "3. Verificando se o backend está escutando em 0.0.0.0..."
if lsof -Pi :8000 -sTCP:LISTEN | grep -q "0.0.0.0:8000" ; then
    echo "   ✅ Backend está escutando em 0.0.0.0:8000 (aceita conexões externas)"
else
    echo "   ⚠️  Backend pode não estar escutando em 0.0.0.0"
    echo "   💡 Certifique-se de executar: python manage.py runserver 0.0.0.0:8000"
fi

# Test connection
echo ""
echo "4. Testando conexão..."
if curl -s -o /dev/null -w "%{http_code}" http://192.168.1.139:8000/api/auth/me/ | grep -q "401\|200\|403" ; then
    echo "   ✅ Conexão funcionando! (401/403 é esperado sem autenticação)"
else
    echo "   ❌ Não foi possível conectar"
    echo "   💡 Verifique firewall e rede WiFi"
fi

echo ""
echo "======================================"
echo "✅ Diagnóstico completo!"
echo ""
echo "📱 Para o mobile app:"
echo "   • Certifique-se de estar na mesma rede WiFi"
echo "   • Verifique se o IP está correto no código"
echo "   • Para Android Emulator, use: http://10.0.2.2:8000/api"
echo "   • Para iOS Simulator, use: http://localhost:8000/api"
echo "   • Para dispositivos físicos, use: http://192.168.1.139:8000/api"
