# Zenda - African Financial Super-App

> **One app. Your money. Your life. Your business.**

A modular super-app for financial life that handles personal finance, small business management, financial education, and AI-powered financial coaching.

## Features

### 🔐 Access Control
- Only users with **paid course enrollment** or **approved mentorship** can access the app
- Automatic access verification on login
- Real-time access status checking

### 📱 Core Modules

1. **Personal Finance**
   - Expense tracking
   - Budget management
   - Financial goals
   - Net worth tracking

2. **Business Finance (SME)**
   - Sales tracking
   - Expense management
   - Profit/Loss reports
   - Simple invoicing

3. **Education**
   - Course lessons
   - Progress tracking
   - Gamification (levels, XP, streaks)
   - Certificates

4. **AI Financial Copilot** (Coming Soon)
   - Personalized financial advice
   - Data-driven insights
   - Goal planning assistance

## Tech Stack

- **React Native** (Expo)
- **Redux Toolkit** (State Management)
- **React Navigation** (Navigation)
- **React Native Paper** (UI Components)
- **Axios** (API Client)
- **AsyncStorage** (Local Storage)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API URL in `src/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api' 
  : 'https://rubianejoaquim.com/api'
```

3. Run the app:
```bash
npm start
# or
npm run ios
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable components
│   ├── navigation/      # Navigation setup
│   ├── services/        # API services
│   ├── store/           # Redux store & slices
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── modules/         # Feature modules
│       ├── personal/    # Personal finance module
│       ├── business/    # Business finance module
│       ├── education/   # Education module
│       └── ai/          # AI copilot module
├── App.tsx              # Root component
└── package.json
```

## Backend Integration

The app integrates with the Django REST API backend. Ensure the backend is running and accessible.

### Required Backend Endpoints:
- `/api/auth/login/` - User authentication
- `/api/auth/me/` - Get current user
- `/api/course/enrollment/` - Check enrollments
- `/api/mentorship/request/` - Check mentorship requests

### Future Backend Endpoints (to be implemented):
- `/api/finance/personal/expenses/` - Personal expenses
- `/api/finance/personal/budgets/` - Budgets
- `/api/finance/personal/goals/` - Financial goals
- `/api/finance/business/sales/` - Business sales
- `/api/finance/business/expenses/` - Business expenses
- `/api/finance/business/metrics/` - Business metrics

## Development Roadmap

### Phase 1 (Current)
- ✅ Authentication & Access Control
- ✅ Basic Navigation Structure
- ✅ Home Screen
- ✅ Module Placeholders

### Phase 2 (Next)
- [ ] Personal Finance CRUD
- [ ] Business Finance CRUD
- [ ] Education Module Integration
- [ ] Offline Support

### Phase 3 (Future)
- [ ] AI Copilot Integration
- [ ] Charts & Analytics
- [ ] Multi-currency Support
- [ ] Banking Integration

## License

Private - Rubiane Joaquim Educação Financeira
