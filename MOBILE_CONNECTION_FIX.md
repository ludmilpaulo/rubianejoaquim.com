# 🔧 GUIA RÁPIDO: Corrigir Conexão Mobile App

## Problema
O mobile app não consegue conectar ao backend porque o servidor não está escutando em `0.0.0.0:8000`.

## Solução

### 1. Pare o backend atual (se estiver rodando)
Pressione `Ctrl+C` no terminal onde o backend está rodando.

### 2. Inicie o backend corretamente
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

**IMPORTANTE:** Use `0.0.0.0:8000` e não `localhost:8000` ou `127.0.0.1:8000`

### 3. Verifique se está funcionando
Você deve ver algo como:
```
Starting development server at http://0.0.0.0:8000/
```

### 4. Teste a conexão
Execute o script de diagnóstico:
```bash
./check_mobile_connection.sh
```

### 5. Para Android Emulator
Se estiver usando Android Emulator, o código já está configurado para usar `10.0.2.2:8000` automaticamente.

### 6. Para iOS Simulator
Se estiver usando iOS Simulator, o código usa `localhost:8000` automaticamente.

### 7. Para Dispositivos Físicos
Certifique-se de que:
- ✅ Backend está rodando em `0.0.0.0:8000`
- ✅ Mobile e computador estão na mesma rede WiFi
- ✅ Firewall não está bloqueando a porta 8000
- ✅ IP está correto no código (`192.168.1.139`)

## Verificar IP do Computador
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Se o IP mudar, atualize em `mobile/src/services/api.ts`

## Troubleshooting

### Erro: "Connection refused"
- Backend não está rodando
- Backend não está escutando em `0.0.0.0:8000`
- Firewall está bloqueando

### Erro: "Network timeout"
- Dispositivos não estão na mesma rede WiFi
- IP está incorreto
- Backend está muito lento

### Erro: "CORS error"
- Verifique `CORS_ALLOW_ALL_ORIGINS = True` no settings.py quando DEBUG=True
