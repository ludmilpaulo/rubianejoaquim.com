# 📱 Guia de Conexão Mobile App

## ✅ Correções Aplicadas

1. **Android HTTP Permitido**: Adicionado `usesCleartextTraffic: true` no `app.json`
2. **Backend Configurado**: Servidor rodando em `0.0.0.0:8000` (todas as interfaces)
3. **ALLOWED_HOSTS**: Configurado para aceitar todos os hosts em DEBUG
4. **CORS**: Habilitado para desenvolvimento

## 🔧 Como Verificar

### 1. Verificar Backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Verificar IP do Computador
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Se o IP mudar, atualize em `mobile/src/services/api.ts` (variável `DEV_IP`)

### 3. Testar Conexão
```bash
curl http://192.168.1.139:8000/api/
```
Deve retornar HTML (404 é normal, significa que está funcionando)

## 📱 Configuração por Plataforma

### iOS Simulator
- Usa: `http://192.168.1.139:8000/api`
- Funciona automaticamente

### Android Emulator
- Se não conectar, tente: `http://10.0.2.2:8000/api`
- Edite `mobile/src/services/api.ts` e mude para `10.0.2.2`

### Dispositivos Físicos
- Ambos iOS e Android: `http://192.168.1.139:8000/api`
- **IMPORTANTE**: Dispositivo e computador devem estar na mesma rede WiFi

## 🐛 Troubleshooting

### Erro: "Network Error" ou "ERR_NETWORK"

1. **Backend não está rodando?**
   ```bash
   ps aux | grep "python.*manage.py runserver"
   ```
   Se não aparecer nada, inicie o backend.

2. **IP incorreto?**
   - Verifique o IP do computador: `ifconfig`
   - Atualize `DEV_IP` em `mobile/src/services/api.ts`
   - Recompile o app: `npm run android` ou `npm run ios`

3. **Firewall bloqueando?**
   - macOS: System Settings > Network > Firewall
   - Desative temporariamente ou permita Python

4. **Rede diferente?**
   - Dispositivo e computador devem estar na mesma WiFi
   - Não use dados móveis no dispositivo

5. **Android ainda não conecta?**
   - Limpe o cache: `npx expo start -c`
   - Reinstale o app no dispositivo
   - Verifique se `usesCleartextTraffic: true` está no `app.json`

## 🔄 Após Mudanças

Sempre que mudar o IP ou configurações:
1. Pare o app completamente
2. Recompile: `npm run android` ou `npm run ios`
3. Teste novamente

## 📞 Teste Rápido

No terminal do computador:
```bash
# 1. Verificar servidor
curl http://192.168.1.139:8000/api/

# 2. Testar endpoint de login
curl -X POST http://192.168.1.139:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

Se ambos funcionarem, o problema está no app mobile.
