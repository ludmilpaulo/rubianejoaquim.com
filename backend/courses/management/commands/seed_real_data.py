"""
Comando para inserir dados reais de cursos e aulas de educação financeira
"""
from django.core.management.base import BaseCommand
from courses.models import Course, Lesson
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Insere dados reais de cursos e aulas de educação financeira'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Inserindo dados reais de cursos e aulas...'))

        # Curso 1: Finanças Pessoais Básicas
        course1, created = Course.objects.get_or_create(
            slug='financas-pessoais-basicas',
            defaults={
                'title': 'Finanças Pessoais Básicas',
                'description': '''Aprenda os fundamentos essenciais para gerir o seu dinheiro de forma inteligente. Este curso abrange desde a criação de um orçamento pessoal até estratégias de poupança e investimento básico.

O que vai aprender:
- Como criar e manter um orçamento pessoal eficaz
- Técnicas de poupança e redução de despesas
- Gestão de dívidas e crédito
- Introdução aos investimentos
- Planeamento financeiro para o futuro

Este curso é ideal para quem está a começar a sua jornada de educação financeira e quer construir uma base sólida para o futuro.'''
                ,
                'short_description': 'Aprenda os fundamentos essenciais para gerir o seu dinheiro de forma inteligente.',
                'price': 97.00,
                'is_active': True,
                'order': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Curso criado: {course1.title}'))

        # Aulas do Curso 1
        lessons_course1 = [
            {
                'title': 'Introdução às Finanças Pessoais',
                'slug': 'introducao-financas-pessoais',
                'description': 'Uma visão geral sobre a importância da educação financeira e como começar a gerir o seu dinheiro.',
                'content': '''<h2>Bem-vindo ao mundo das Finanças Pessoais!</h2>
<p>As finanças pessoais são a base para uma vida financeira saudável e próspera. Nesta primeira aula, vamos explorar:</p>

<h3>O que são Finanças Pessoais?</h3>
<p>As finanças pessoais referem-se à gestão do dinheiro de um indivíduo ou família. Inclui:</p>
<ul>
<li>Orçamentação e planeamento</li>
<li>Poupança e investimento</li>
<li>Gestão de dívidas</li>
<li>Planeamento para a reforma</li>
<li>Proteção financeira (seguros)</li>
</ul>

<h3>Por que é importante?</h3>
<p>Uma boa gestão financeira permite:</p>
<ul>
<li>Alcançar objetivos de vida</li>
<li>Reduzir stress financeiro</li>
<li>Construir riqueza ao longo do tempo</li>
<li>Preparar-se para imprevistos</li>
<li>Viver com mais liberdade e escolhas</li>
</ul>

<h3>Princípios Fundamentais</h3>
<ol>
<li><strong>Gaste menos do que ganha</strong> - A regra de ouro das finanças pessoais</li>
<li><strong>Construa um fundo de emergência</strong> - Para imprevistos</li>
<li><strong>Invista para o futuro</strong> - Faça o seu dinheiro trabalhar para si</li>
<li><strong>Eduque-se continuamente</strong> - O conhecimento é o melhor investimento</li>
</ol>

<p>Nas próximas aulas, vamos aprofundar cada um destes conceitos e dar-lhe ferramentas práticas para aplicar na sua vida.</p>''',
                'duration': 25,
                'order': 1,
                'is_free': True
            },
            {
                'title': 'Como Criar um Orçamento Pessoal',
                'slug': 'criar-orcamento-pessoal',
                'description': 'Aprenda a criar e manter um orçamento que funcione para o seu estilo de vida.',
                'content': '''<h2>Criando o Seu Orçamento Pessoal</h2>
<p>Um orçamento é o seu mapa financeiro. Sem ele, é fácil perder-se e gastar mais do que deveria.</p>

<h3>Passo 1: Calcule os Seus Rendimentos</h3>
<p>Anote todos os seus rendimentos mensais:</p>
<ul>
<li>Salário líquido</li>
<li>Rendimentos de aluguer (se aplicável)</li>
<li>Outros rendimentos regulares</li>
</ul>

<h3>Passo 2: Liste Todas as Despesas</h3>
<p>Categorize as suas despesas:</p>
<ul>
<li><strong>Despesas Fixas:</strong> Rendas, empréstimos, seguros, subscrições</li>
<li><strong>Despesas Variáveis:</strong> Alimentação, transportes, entretenimento</li>
<li><strong>Despesas Ocasionais:</strong> Férias, presentes, reparações</li>
</ul>

<h3>Passo 3: Aplique a Regra 50/30/20</h3>
<p>Uma forma simples de distribuir o seu orçamento:</p>
<ul>
<li><strong>50%</strong> - Necessidades essenciais (casa, alimentação, transportes)</li>
<li><strong>30%</strong> - Desejos (entretenimento, hobbies, jantares fora)</li>
<li><strong>20%</strong> - Poupança e investimento</li>
</ul>

<h3>Ferramentas Úteis</h3>
<p>Pode usar:</p>
<ul>
<li>Folhas de cálculo (Excel, Google Sheets)</li>
<li>Apps de orçamento (Mint, YNAB, Toshl)</li>
<li>Caderno simples - o importante é começar!</li>
</ul>

<h3>Dicas Práticas</h3>
<ul>
<li>Revise o seu orçamento mensalmente</li>
<li>Seja realista, não demasiado restritivo</li>
<li>Ajuste conforme necessário</li>
<li>Celebre pequenas vitórias</li>
</ul>''',
                'duration': 30,
                'order': 2,
                'is_free': False
            },
            {
                'title': 'Estratégias de Poupança Eficazes',
                'slug': 'estrategias-poupanca',
                'description': 'Descubra técnicas comprovadas para poupar mais dinheiro sem sacrificar a qualidade de vida.',
                'content': '''<h2>Estratégias de Poupança que Funcionam</h2>
<p>Poupar dinheiro não significa viver com privações. Significa fazer escolhas inteligentes.</p>

<h3>1. Automatize a Poupança</h3>
<p>Configure transferências automáticas para uma conta de poupança no dia do salário. Assim, poupa antes de gastar.</p>

<h3>2. Regra dos 24 Horas</h3>
<p>Antes de fazer uma compra não essencial, espere 24 horas. Muitas vezes, perceberá que não precisa realmente do item.</p>

<h3>3. Desafio da Poupança</h3>
<p>Comece pequeno e aumente gradualmente:</p>
<ul>
<li>Semana 1: Poupe 5€</li>
<li>Semana 2: Poupe 10€</li>
<li>Semana 3: Poupe 15€</li>
<li>E assim por diante...</li>
</ul>

<h3>4. Reduza Despesas Recorrentes</h3>
<p>Revise regularmente:</p>
<ul>
<li>Subscrições que não usa</li>
<li>Planos de telemóvel/internet</li>
<li>Seguros (compare preços)</li>
<li>Gastos com takeaway</li>
</ul>

<h3>5. Fundo de Emergência</h3>
<p>Objetivo: 3-6 meses de despesas essenciais guardadas. Este fundo protege-o de:</p>
<ul>
<li>Desemprego inesperado</li>
<li>Despesas médicas</li>
<li>Reparações urgentes</li>
<li>Outros imprevistos</li>
</ul>

<h3>6. Poupe os Aumentos</h3>
<p>Quando receber um aumento de salário, poupe pelo menos 50% do valor adicional. Já viveu sem ele antes!</p>''',
                'duration': 35,
                'order': 3,
                'is_free': False
            },
            {
                'title': 'Gestão de Dívidas e Crédito',
                'slug': 'gestao-dividas-credito',
                'description': 'Aprenda a gerir dívidas de forma eficaz e a usar o crédito de forma inteligente.',
                'content': '''<h2>Gerindo Dívidas e Crédito</h2>
<p>As dívidas não são sempre más, mas precisam de ser geridas com sabedoria.</p>

<h3>Tipos de Dívida</h3>
<ul>
<li><strong>Dívida Boa:</strong> Investimentos que aumentam de valor (casa, educação)</li>
<li><strong>Dívida Má:</strong> Consumo que perde valor rapidamente (cartões de crédito, empréstimos pessoais)</li>
</ul>

<h3>Estratégias para Pagar Dívidas</h3>

<h4>Método da Bola de Neve</h4>
<ol>
<li>Liste todas as dívidas do menor para o maior valor</li>
<li>Pague o mínimo em todas</li>
<li>Use dinheiro extra para pagar a menor dívida</li>
<li>Quando uma dívida for paga, use esse pagamento para a próxima</li>
</ol>

<h4>Método da Avalanche</h4>
<ol>
<li>Liste dívidas por taxa de juro (maior primeiro)</li>
<li>Pague o mínimo em todas</li>
<li>Use dinheiro extra para a dívida com maior juro</li>
<li>Economiza mais em juros a longo prazo</li>
</ol>

<h3>Usando Crédito de Forma Inteligente</h3>
<ul>
<li>Pague sempre o total do cartão de crédito</li>
<li>Use crédito apenas para compras planeadas</li>
<li>Mantenha a taxa de utilização abaixo de 30%</li>
<li>Verifique o seu relatório de crédito regularmente</li>
</ul>

<h3>Negociando com Credores</h3>
<p>Se estiver com dificuldades:</p>
<ul>
<li>Contacte os credores antes de ficar em atraso</li>
<li>Explique a sua situação</li>
<li>Peça planos de pagamento alternativos</li>
<li>Considere consolidar dívidas</li>
</ul>''',
                'duration': 40,
                'order': 4,
                'is_free': False
            }
        ]

        for lesson_data in lessons_course1:
            lesson, created = Lesson.objects.get_or_create(
                course=course1,
                slug=lesson_data['slug'],
                defaults=lesson_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Aula criada: {lesson.title}'))

        # Curso 2: Investimentos para Iniciantes
        course2, created = Course.objects.get_or_create(
            slug='investimentos-para-iniciantes',
            defaults={
                'title': 'Investimentos para Iniciantes',
                'description': '''Aprenda a investir o seu dinheiro de forma segura e inteligente. Este curso ensina os conceitos fundamentais de investimento, desde ações e obrigações até fundos de investimento e ETFs.

O que vai aprender:
- Conceitos básicos de investimento
- Tipos de investimentos disponíveis
- Como construir uma carteira diversificada
- Gestão de risco
- Planeamento de investimento a longo prazo

Ideal para quem quer começar a investir mas não sabe por onde começar.'''
                ,
                'short_description': 'Aprenda a investir o seu dinheiro de forma segura e inteligente.',
                'price': 147.00,
                'is_active': True,
                'order': 2
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Curso criado: {course2.title}'))

        # Aulas do Curso 2
        lessons_course2 = [
            {
                'title': 'Introdução aos Investimentos',
                'slug': 'introducao-investimentos',
                'description': 'Conceitos fundamentais sobre investimentos e como fazer o seu dinheiro crescer.',
                'content': '''<h2>Bem-vindo ao Mundo dos Investimentos</h2>
<p>Investir é fazer o seu dinheiro trabalhar para si, em vez de trabalhar apenas para ganhar dinheiro.</p>

<h3>Por que Investir?</h3>
<ul>
<li><strong>Combate à Inflação:</strong> O dinheiro parado perde valor ao longo do tempo</li>
<li><strong>Crescimento:</strong> O seu dinheiro pode crescer mais rápido do que na poupança</li>
<li><strong>Objetivos de Longo Prazo:</strong> Reforma, compra de casa, educação dos filhos</li>
<li><strong>Liberdade Financeira:</strong> Construir riqueza para ter mais opções</li>
</ul>

<h3>Conceitos Fundamentais</h3>

<h4>Rendimento vs. Crescimento</h4>
<ul>
<li><strong>Rendimento:</strong> Receber pagamentos regulares (juros, dividendos)</li>
<li><strong>Crescimento:</strong> O valor do investimento aumenta ao longo do tempo</li>
</ul>

<h4>Risco vs. Retorno</h4>
<p>Geralmente, maior risco = maior potencial de retorno. Mas também maior potencial de perda.</p>

<h3>Tipos Principais de Investimentos</h3>
<ol>
<li><strong>Ações:</strong> Parte de propriedade de uma empresa</li>
<li><strong>Obrigações:</strong> Empréstimos a empresas/governos</li>
<li><strong>Fundos:</strong> Carteira diversificada gerida profissionalmente</li>
<li><strong>ETFs:</strong> Fundos que seguem índices de mercado</li>
<li><strong>Imobiliário:</strong> Propriedades físicas</li>
</ul>

<h3>Princípios de Ouro</h3>
<ul>
<li>Comece cedo - o tempo é o seu maior aliado</li>
<li>Diversifique - não ponha todos os ovos no mesmo cesto</li>
<li>Invista regularmente - média de custo</li>
<li>Pense a longo prazo - evite decisões emocionais</li>
<li>Eduque-se continuamente</li>
</ul>''',
                'duration': 30,
                'order': 1,
                'is_free': True
            },
            {
                'title': 'Construindo a Sua Primeira Carteira',
                'slug': 'construir-carteira-investimento',
                'description': 'Aprenda a construir uma carteira de investimentos diversificada e adequada ao seu perfil.',
                'content': '''<h2>Construindo a Sua Carteira de Investimentos</h2>
<p>Uma carteira bem construída é a base para o sucesso nos investimentos.</p>

<h3>1. Defina os Seus Objetivos</h3>
<ul>
<li>Curto prazo (1-3 anos): Férias, carro, fundo de emergência</li>
<li>Médio prazo (3-10 anos): Entrada para casa, educação</li>
<li>Longo prazo (10+ anos): Reforma, independência financeira</li>
</ul>

<h3>2. Avalie o Seu Perfil de Risco</h3>
<p>Questione-se:</p>
<ul>
<li>Quanto tempo tem até precisar do dinheiro?</li>
<li>Como reagiria a uma queda de 20% no valor dos investimentos?</li>
<li>Qual é o seu conhecimento sobre investimentos?</li>
</ul>

<h3>3. Alocação de Ativos</h3>
<p>Distribua o seu dinheiro entre diferentes tipos de investimentos:</p>

<h4>Perfil Conservador</h4>
<ul>
<li>70% Obrigações/Fundos de obrigações</li>
<li>30% Ações/Fundos de ações</li>
</ul>

<h4>Perfil Moderado</h4>
<ul>
<li>50% Obrigações</li>
<li>50% Ações</li>
</ul>

<h4>Perfil Agressivo</h4>
<ul>
<li>30% Obrigações</li>
<li>70% Ações</li>
</ul>

<h3>4. Diversificação</h3>
<p>Não ponha tudo num só lugar:</p>
<ul>
<li>Diversifique por tipo de ativo</li>
<li>Diversifique por setor</li>
<li>Diversifique geograficamente</li>
<li>Diversifique por empresa (se investir em ações individuais)</li>
</ul>

<h3>5. Rebalanceamento</h3>
<p>Revise a sua carteira regularmente (trimestral ou semestralmente) e ajuste para manter a alocação desejada.</p>''',
                'duration': 35,
                'order': 2,
                'is_free': False
            }
        ]

        for lesson_data in lessons_course2:
            lesson, created = Lesson.objects.get_or_create(
                course=course2,
                slug=lesson_data['slug'],
                defaults=lesson_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Aula criada: {lesson.title}'))

        self.stdout.write(self.style.SUCCESS('\n✓ Dados reais inseridos com sucesso!'))
        self.stdout.write(self.style.SUCCESS(f'Total: {Course.objects.count()} cursos, {Lesson.objects.count()} aulas'))
