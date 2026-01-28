from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer, ConversationListSerializer,
    MessageSerializer, ChatRequestSerializer
)
from django.conf import settings
import json

# Try to import OpenAI - if not available, will use fallback responses
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='chat')
    def chat(self, request):
        """Enviar mensagem e receber resposta do AI"""
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')

        # Obter ou criar conversa
        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    id=conversation_id,
                    user=request.user
                )
            except Conversation.DoesNotExist:
                return Response(
                    {'error': 'Conversa não encontrada.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Criar nova conversa
            conversation = Conversation.objects.create(
                user=request.user,
                title=user_message[:50] if len(user_message) > 50 else user_message
            )

        # Salvar mensagem do usuário
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )

        # Obter contexto financeiro do usuário (se disponível)
        financial_context = self._get_financial_context(request.user)

        # Preparar mensagens para o AI
        messages = self._prepare_messages(conversation, financial_context)

        try:
            # Chamar OpenAI API
            ai_response = self._call_openai(messages)
            
            # Salvar resposta do AI
            assistant_msg = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=ai_response
            )

            return Response({
                'conversation_id': conversation.id,
                'conversation_title': conversation.title,
                'user_message': MessageSerializer(user_msg).data,
                'assistant_message': MessageSerializer(assistant_msg).data,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Se OpenAI falhar, retornar resposta padrão
            error_message = f"Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente."
            if settings.DEBUG:
                error_message += f" Erro: {str(e)}"
            
            assistant_msg = Message.objects.create(
                conversation=conversation,
                role='assistant',
                content=error_message
            )

            return Response({
                'conversation_id': conversation.id,
                'conversation_title': conversation.title,
                'user_message': MessageSerializer(user_msg).data,
                'assistant_message': MessageSerializer(assistant_msg).data,
                'error': str(e) if settings.DEBUG else None,
            }, status=status.HTTP_200_OK)

    def _get_financial_context(self, user):
        """Obter contexto financeiro do usuário para o AI"""
        context = {
            'user_name': user.get_full_name() or user.first_name or user.email.split('@')[0],
        }

        try:
            from finance.models import PersonalExpense, Budget, Goal, Debt
            from finance.views import PersonalExpenseViewSet
            
            # Obter resumo financeiro pessoal
            from django.db.models import Sum
            from django.utils import timezone
            from datetime import datetime

            current_month = timezone.now().month
            current_year = timezone.now().year

            expenses = PersonalExpense.objects.filter(
                user=user,
                date__month=current_month,
                date__year=current_year
            ).aggregate(total=Sum('amount'))['total'] or 0

            budgets = Budget.objects.filter(
                user=user,
                month=current_month,
                year=current_year
            ).aggregate(total=Sum('amount'))['total'] or 0

            goals = Goal.objects.filter(user=user, status='active').count()
            # Calculate total remaining debt (total_amount - paid_amount for active/overdue debts)
            debts_queryset = Debt.objects.filter(user=user, status__in=['active', 'overdue'])
            debts = 0
            for debt in debts_queryset:
                remaining = float(debt.total_amount) - float(debt.paid_amount)
                debts += max(remaining, 0)

            context.update({
                'monthly_expenses': float(expenses),
                'monthly_budgets': float(budgets),
                'active_goals': goals,
                'active_debts': float(debts),
            })
        except Exception as e:
            # Se houver erro ao obter dados financeiros, continuar sem contexto
            pass

        return context

    def _prepare_messages(self, conversation, financial_context):
        """Preparar mensagens para o AI incluindo contexto financeiro"""
        messages = [
            {
                'role': 'system',
                'content': f"""Você é um assistente financeiro especializado chamado AI Financial Copilot. 
Você ajuda usuários com educação financeira, planejamento, orçamento e gestão de dinheiro.

Contexto do usuário:
- Nome: {financial_context.get('user_name', 'Usuário')}
- Despesas do mês atual: {financial_context.get('monthly_expenses', 0):.2f} AOA
- Orçamentos do mês: {financial_context.get('monthly_budgets', 0):.2f} AOA
- Metas ativas: {financial_context.get('active_goals', 0)}
- Dívidas ativas: {financial_context.get('active_debts', 0):.2f} AOA

Sua função é:
1. Fornecer conselhos financeiros práticos e personalizados
2. Ajudar com planejamento de orçamento
3. Explicar conceitos financeiros de forma clara
4. Sugerir estratégias de poupança e investimento
5. Ajudar a definir e alcançar metas financeiras

Seja sempre positivo, encorajador e prático. Responda em português."""
            }
        ]

        # Adicionar histórico da conversa
        previous_messages = conversation.messages.all()[:10]  # Últimas 10 mensagens
        for msg in previous_messages:
            messages.append({
                'role': msg.role,
                'content': msg.content
            })

        return messages

    def _call_openai(self, messages):
        """Chamar OpenAI API"""
        # Verificar se API key está configurada e OpenAI está disponível
        api_key = getattr(settings, 'OPENAI_API_KEY', None)
        if not api_key or not OPENAI_AVAILABLE:
            # Se não houver API key, retornar resposta padrão inteligente baseada na mensagem
            user_message = messages[-1]['content'].lower() if messages else ""
            
            # Respostas contextuais básicas
            if any(word in user_message for word in ['orçamento', 'budget', 'gastos', 'despesas']):
                return """Ótima pergunta sobre orçamento! Aqui estão algumas dicas práticas:

1. **Regra 50/30/20**: 
   - 50% para necessidades (aluguel, comida, transporte)
   - 30% para desejos (entretenimento, hobbies)
   - 20% para poupança e investimentos

2. **Rastreie seus gastos**: Use a seção de Finanças Pessoais do app para registrar todas as despesas.

3. **Revise mensalmente**: Analise onde está gastando mais e identifique oportunidades de economia.

Para respostas mais personalizadas com IA, configure a OPENAI_API_KEY nas configurações do servidor."""

            elif any(word in user_message for word in ['poupança', 'economizar', 'guardar', 'investir']):
                return """Excelente foco em poupança! Aqui estão estratégias eficazes:

1. **Poupança Automática**: Configure transferências automáticas assim que receber seu salário.

2. **Meta de Poupança**: Use a seção de Metas no app para definir objetivos claros e acompanhar o progresso.

3. **Fundo de Emergência**: Procure ter pelo menos 3-6 meses de despesas guardadas.

4. **Comece Pequeno**: Mesmo pequenas quantias fazem diferença ao longo do tempo.

Para conselhos mais detalhados e personalizados, configure a OPENAI_API_KEY."""

            elif any(word in user_message for word in ['dívida', 'débito', 'emprestimo', 'cartão']):
                return """Gestão de dívidas é crucial! Aqui estão algumas estratégias:

1. **Método da Bola de Neve**: Pague primeiro a menor dívida, depois a próxima.

2. **Priorize Juros Altos**: Foque em dívidas com maiores taxas de juros primeiro.

3. **Negocie**: Entre em contato com credores para renegociar condições.

4. **Use o App**: Registre suas dívidas na seção de Finanças Pessoais para acompanhar o progresso.

Para análise mais detalhada, configure a OPENAI_API_KEY."""

            else:
                return """Olá! Sou o AI Financial Copilot. Estou aqui para ajudá-lo com suas finanças.

Posso ajudá-lo com:
- Planejamento de orçamento
- Estratégias de poupança
- Gestão de dívidas
- Definição de metas financeiras
- Educação financeira

Como posso ajudá-lo hoje? Para respostas completas com IA, configure a OPENAI_API_KEY nas configurações do servidor."""

        try:
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
                messages=messages,
                max_tokens=800,
                temperature=0.7,
            )
            ai_content = response.choices[0].message.content.strip()
            if not ai_content:
                raise ValueError("Empty response from OpenAI")
            return ai_content
        except Exception as e:
            # Log error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"OpenAI API error: {str(e)}")
            
            # Se houver erro, retornar resposta padrão contextual
            user_message = messages[-1]['content'].lower() if messages else ""
            
            if any(word in user_message for word in ['orçamento', 'budget', 'gastos', 'despesas']):
                return """Ótima pergunta sobre orçamento! Aqui estão algumas dicas práticas:

1. **Regra 50/30/20**: 
   - 50% para necessidades (aluguel, comida, transporte)
   - 30% para desejos (entretenimento, hobbies)
   - 20% para poupança e investimentos

2. **Rastreie seus gastos**: Use a seção de Finanças Pessoais do app para registrar todas as despesas.

3. **Revise mensalmente**: Analise onde está gastando mais e identifique oportunidades de economia.

Nota: O serviço de IA pode estar temporariamente indisponível. Tente novamente em alguns instantes."""
            
            elif any(word in user_message for word in ['poupança', 'economizar', 'guardar', 'investir']):
                return """Excelente foco em poupança! Aqui estão estratégias eficazes:

1. **Poupança Automática**: Configure transferências automáticas assim que receber seu salário.

2. **Meta de Poupança**: Use a seção de Metas no app para definir objetivos claros e acompanhar o progresso.

3. **Fundo de Emergência**: Procure ter pelo menos 3-6 meses de despesas guardadas.

4. **Comece Pequeno**: Mesmo pequenas quantias fazem diferença ao longo do tempo.

Nota: O serviço de IA pode estar temporariamente indisponível. Tente novamente em alguns instantes."""
            
            elif any(word in user_message for word in ['dívida', 'débito', 'emprestimo', 'cartão']):
                return """Gestão de dívidas é crucial! Aqui estão algumas estratégias:

1. **Método da Bola de Neve**: Pague primeiro a menor dívida, depois a próxima.

2. **Priorize Juros Altos**: Foque em dívidas com maiores taxas de juros primeiro.

3. **Negocie**: Entre em contato com credores para renegociar condições.

4. **Use o App**: Registre suas dívidas na seção de Finanças Pessoais para acompanhar o progresso.

Nota: O serviço de IA pode estar temporariamente indisponível. Tente novamente em alguns instantes."""
            
            else:
                return """Olá! Sou o AI Financial Copilot. Estou aqui para ajudá-lo com suas finanças.

Posso ajudá-lo com:
- Planejamento de orçamento
- Estratégias de poupança
- Gestão de dívidas
- Definição de metas financeiras
- Educação financeira

Como posso ajudá-lo hoje? 

Nota: O serviço de IA pode estar temporariamente indisponível. Tente novamente em alguns instantes."""
