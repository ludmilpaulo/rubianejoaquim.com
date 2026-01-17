# Rubiane Joaquim Educação Financeira - MVP

Plataforma de cursos e mentoria em educação financeira.

## Estrutura do Projeto

```
.
├── frontend/          # Next.js (React)
├── backend/           # Django (Python)
└── README.md
```

## Stack Tecnológica

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Hook Form**
- **Zustand** (state management)

### Backend
- **Django 5.0+**
- **Django REST Framework**
- **PostgreSQL** (ou SQLite para desenvolvimento)
- **Django CORS Headers**
- **Pillow** (upload de imagens/comprovativos)

## Funcionalidades MVP

### 1. Site Público
- ✅ Home (quem é + promessa + CTAs)
- ✅ Cursos (lista + detalhes + botão "Comprar")
- ✅ Mentoria (pacotes + "Pedir vaga")
- ✅ Conteúdos Grátis (3-10 aulas abertas)
- ✅ Login / Registro

### 2. Área do Aluno
- ✅ Ver cursos comprados
- ✅ Ver aulas (vídeo + texto + anexos PDF)
- ✅ Marcar "concluído"
- ⏳ Certificado (fase 2)

### 3. Pagamento Manual
- ✅ Aluno clica "Comprar"
- ✅ Sistema mostra instruções de pagamento
- ✅ Upload de comprovativo
- ✅ Admin aprova → aluno ganha acesso

### 4. Mentoria
- ✅ Formulário (objetivo, disponibilidade, contacto)
- ✅ Admin aprova e combina por WhatsApp/Google Meet
- ✅ Pagamento manual igual

## Vídeos

**Início:** YouTube "Não listado" ou Google Drive
**Futuro:** Vimeo / Cloudflare Stream / storage próprio

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Design

- **Estilo:** Clean + Profissional
- **Cores:** Preto/Branco + Azul
- **Tipografia:** Moderna e legível

## Próximos Passos (Fase 2)

- App React Native
- Certificados
- Notificações
- Pagamento automatizado (Stripe/PayPal)
- Dashboard admin completo
