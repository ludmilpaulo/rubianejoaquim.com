# Guia de Setup - Rubiane Joaquim Educação Financeira

## Pré-requisitos

- Python 3.10+
- Node.js 18+
- npm ou yarn

## Backend (Django)

### 1. Criar ambiente virtual

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

Criar arquivo `.env` na pasta `backend/`:

```env
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 4. Executar migrações

```bash
python manage.py migrate
```

### 5. Criar superusuário

```bash
python manage.py createsuperuser
```

### 6. Executar servidor

```bash
python manage.py runserver
```

O backend estará disponível em `http://localhost:8000`

## Frontend (Next.js)

### 1. Instalar dependências

```bash
cd frontend
npm install
```

### 2. Configurar variáveis de ambiente

Criar arquivo `.env.local` na pasta `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Executar servidor de desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## Primeiros Passos

1. Aceder ao admin Django: `http://localhost:8000/admin`
2. Criar cursos, aulas e pacotes de mentoria
3. Marcar algumas aulas como gratuitas (`is_free=True`)
4. Testar o fluxo completo:
   - Registar utilizador
   - Ver cursos
   - Inscrever-se num curso
   - Fazer upload de comprovativo
   - Aprovar no admin
   - Aceder às aulas

## Estrutura de Dados

### Criar um Curso

1. Ir ao admin: `/admin/courses/course/add/`
2. Preencher:
   - Título
   - Slug (gerado automaticamente)
   - Descrição
   - Preço
   - Imagem (opcional)
   - Marcar como ativo

### Criar Aulas

1. Ir ao admin: `/admin/courses/lesson/add/`
2. Preencher:
   - Curso
   - Título
   - Video URL (YouTube não listado ou Google Drive)
   - Duração (minutos)
   - Conteúdo (texto/HTML)
   - Marcar como gratuita (se aplicável)

### Criar Pacotes de Mentoria

1. Ir ao admin: `/admin/mentorship/mentorshippackage/add/`
2. Preencher:
   - Título
   - Descrição
   - Duração (minutos)
   - Número de sessões
   - Preço

## Instruções de Pagamento

**IMPORTANTE:** Atualizar o IBAN nas seguintes páginas:
- `frontend/app/area-do-aluno/page.tsx` (linha ~200 e ~350)
- Substituir `PT50 0000 0000 0000 0000 0000 0` pelo IBAN real

## Notas

- Os vídeos devem ser hospedados no YouTube (não listado) ou Google Drive
- Os comprovativos são guardados em `backend/media/payment_proofs/`
- O admin pode aprovar/rejeitar comprovativos diretamente no Django Admin
