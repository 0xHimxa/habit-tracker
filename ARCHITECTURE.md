# Habit Tracker - System Architecture

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Express.js    │    │   MongoDB       │
│   Frontend      │◄──►│   Backend API   │◄──►│   Database      │
│   (App Router)  │    │   (REST API)    │    │   (Mongoose)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   React Query   │    │   JWT Auth      │
│   (Data Fetch)  │    │   (Refresh +    │
│                 │    │   Access)       │
└─────────────────┘    └─────────────────┘
```

## Project Structure

```
habit-tracker/
├── frontend/                 # Next.js App Router
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   └── habits/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   └── layout.tsx
│   │   ├── components/      # Reusable components
│   │   │   ├── ui/         # Base UI components
│   │   │   ├── habits/     # Habit-specific components
│   │   │   └── charts/     # Chart components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities and configs
│   │   │   ├── api.ts      # API client
│   │   │   ├── auth.ts     # Auth utilities
│   │   │   └── utils.ts    # Helper functions
│   │   ├── types/          # TypeScript definitions
│   │   └── styles/         # Global styles
│   ├── public/             # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   │   ├── auth.ts
│   │   │   ├── habits.ts
│   │   │   └── completions.ts
│   │   ├── models/         # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Habit.ts
│   │   │   └── HabitCompletion.ts
│   │   ├── routes/         # API routes
│   │   │   ├── auth.ts
│   │   │   ├── habits.ts
│   │   │   └── completions.ts
│   │   ├── middleware/     # Auth, validation, error handling
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/       # Business logic
│   │   │   ├── streakService.ts
│   │   │   ├── authService.ts
│   │   │   └── habitService.ts
│   │   ├── utils/          # Helper functions
│   │   │   ├── dateUtils.ts
│   │   │   └── validators.ts
│   │   ├── types/          # TypeScript interfaces
│   │   └── config/         # Database and app config
│   ├── package.json
│   └── tsconfig.json
├── shared/                  # Shared types and utilities
│   ├── types/
│   │   ├── habit.ts
│   │   ├── user.ts
│   │   └── api.ts
│   └── utils/
│       └── dateUtils.ts
├── docs/                   # Documentation
└── docker-compose.yml      # Local development setup
```

## Technology Choices

### Frontend: Next.js (App Router)
- **Why**: Server-side rendering for better SEO and performance
- **App Router**: Latest React features, better route organization
- **TypeScript**: Type safety at all levels
- **Tailwind CSS**: Utility-first, rapid UI development

### Backend: Express.js + TypeScript
- **Why**: Lightweight, flexible, well-established ecosystem
- **TypeScript**: Consistent typing across full stack
- **JWT**: Stateless authentication, scalable

### Database: MongoDB + Mongoose
- **Why**: Document-based, flexible schema for evolving features
- **Mongoose**: Schema validation, middleware, relationships

### State Management: React Query
- **Why**: Server state management, caching, background updates
- **Better than Redux**: Simpler for API-heavy applications

### Validation: Zod
- **Why**: Runtime validation, TypeScript inference, schema-first

### Date Handling: date-fns
- **Why**: Tree-shakable, immutable, better performance than moment.js

### Charts: Recharts
- **Why**: React-native, composable, good TypeScript support

## Data Flow

```
1. User Action → Frontend Component
2. Component → React Query Mutation
3. React Query → API Call (Express)
4. Express → Authentication Middleware
5. Express → Validation Middleware  
6. Express → Controller → Service Layer
7. Service Layer → MongoDB (Mongoose)
8. MongoDB → Response → Service → Controller
9. Controller → API Response → React Query
10. React Query → Component Update
```

## Authentication Flow

```
1. User Login → POST /api/auth/login
2. Backend validates credentials
3. Backend generates JWT (access + refresh)
4. Frontend stores tokens securely
5. Subsequent requests include access token
6. Access token expires → use refresh token
7. Refresh token expires → redirect to login
```

## Performance Considerations

### Database Indexes
- User ID on all user-scoped collections
- Date indexes for calendar queries
- Compound indexes for habit + date queries

### Caching Strategy
- React Query for API responses
- Optional Redis for session storage
- Next.js static generation for public pages

### Bundle Optimization
- Dynamic imports for charts
- Tree-shaking with date-fns
- Image optimization with Next.js

## Security Measures

1. **Authentication**: JWT with refresh tokens
2. **Password Security**: bcrypt hashing
3. **API Security**: Rate limiting, CORS
4. **Input Validation**: Zod schemas
5. **HTTPS**: Required in production
6. **Environment Variables**: Secure secret management

## Deployment Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CDN       │    │   Frontend  │    │   Backend   │
│   (Vercel)  │    │   (Vercel)  │    │   (Railway) │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           └───────┬───────────┘
                                   ▼
                         ┌─────────────────┐
                         │   MongoDB Atlas │
                         │   (Database)    │
                         └─────────────────┘
```

This architecture provides:
- **Scalability**: Separate frontend/backend services
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized data flow and caching
- **Security**: Multi-layered security approach
- **Developer Experience**: Type safety and modern tooling