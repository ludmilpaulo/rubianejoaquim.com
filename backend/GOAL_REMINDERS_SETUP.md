# Configuração de Lembretes Semanais para Objetivos

Este documento explica como configurar os lembretes semanais para adicionar dinheiro aos objetivos financeiros.

## Visão Geral

O sistema envia notificações semanais aos usuários lembrando-os de adicionar dinheiro aos seus objetivos ativos. As notificações são criadas automaticamente toda segunda-feira (ou outro dia configurado).

## Comando de Gerenciamento

O comando `check_goal_reminders` verifica todos os objetivos ativos e cria notificações para usuários que ainda não receberam um lembrete nos últimos 6 dias.

### Execução Manual

```bash
cd backend
python3 manage.py check_goal_reminders
```

### Execução com Dia da Semana Específico

Por padrão, o comando verifica se hoje é segunda-feira (dia 1). Para testar em outro dia:

```bash
python3 manage.py check_goal_reminders --day-of-week 1  # Segunda-feira
python3 manage.py check_goal_reminders --day-of-week 0  # Domingo
```

## Configuração Automática (Cron Job)

### Linux/macOS

Adicione ao crontab para executar toda segunda-feira às 9h:

```bash
0 9 * * 1 cd /caminho/para/backend && python3 manage.py check_goal_reminders
```

### Windows Task Scheduler

1. Abra o Agendador de Tarefas
2. Crie uma nova tarefa
3. Configure para executar semanalmente às segundas-feiras
4. Ação: `python.exe` com argumentos: `manage.py check_goal_reminders`
5. Diretório inicial: caminho do projeto backend

## Funcionalidades

### Adicionar Dinheiro a um Objetivo

No aplicativo móvel:
1. Vá para a aba "Objetivos" na tela de Finanças Pessoais
2. Clique em "Adicionar Dinheiro" em um objetivo ativo
3. Digite o valor a adicionar
4. Confirme a adição

### API Endpoint

```http
POST /api/finance/personal/goals/{goal_id}/add-money/
Authorization: Token {token}
Content-Type: application/json

{
  "amount": 100.00
}
```

Resposta:
```json
{
  "id": 1,
  "title": "Viagem para Europa",
  "current_amount": "500.00",
  "target_amount": "5000.00",
  "progress_percentage": "10.00",
  "status": "active"
}
```

## Notificações

As notificações são criadas com:
- **Tipo**: `goal_reminder`
- **Título**: "Lembrete Semanal: {título do objetivo}"
- **Mensagem**: Inclui progresso atual e valor restante
- **URL de ação**: Link para o objetivo no app

## Migração do Banco de Dados

Após adicionar o novo tipo de notificação, execute:

```bash
cd backend
python3 manage.py makemigrations tasks
python3 manage.py migrate
```

## Troubleshooting

### Notificações não estão sendo criadas

1. Verifique se há objetivos ativos:
   ```bash
   python3 manage.py shell
   >>> from finance.models import Goal
   >>> Goal.objects.filter(status='active').count()
   ```

2. Verifique se o comando está sendo executado:
   ```bash
   python3 manage.py check_goal_reminders --day-of-week 1
   ```

3. Verifique logs do Django para erros

### Objetivo não permite adicionar dinheiro

- Apenas objetivos com status `active` podem receber dinheiro
- Objetivos completados ou cancelados não podem receber dinheiro
