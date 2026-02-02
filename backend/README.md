# Habit Tracker Backend API

## Overview
RESTful API for the Habit Tracker web application with authentication, habit management, and completion tracking.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Installation

1. Clone and navigate to backend directory:
```bash
cd habit-tracker/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

5. API will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Habits
- `GET /api/habits` - Get user's habits (paginated)
- `POST /api/habits` - Create new habit
- `GET /api/habits/:habitId` - Get specific habit
- `PUT /api/habits/:habitId` - Update habit
- `DELETE /api/habits/:habitId` - Delete habit

### Completions
- `POST /api/completions` - Mark habit as complete
- `GET /api/completions/calendar` - Get calendar data
- `GET /api/completions/range` - Get completions by date range
- `GET /api/completions/:habitId` - Get habit completions
- `DELETE /api/completions/:completionId` - Delete completion

## Authentication Flow

1. **Login**: POST `/api/auth/login`
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Response**: 
   ```json
   {
     "success": true,
     "data": {
       "user": { "id": "...", "email": "...", "name": "..." },
       "accessToken": "jwt-access-token",
       "refreshToken": "jwt-refresh-token"
     }
   }
   ```

3. **Use access token** in Authorization header:
   ```
   Authorization: Bearer <access-token>
   ```

4. **Refresh tokens** when access token expires:
   ```json
   {
     "refreshToken": "jwt-refresh-token"
   }
   ```

## Example Requests

### Create a Habit
```bash
POST /api/habits
Authorization: Bearer <token>

{
  "name": "Morning Exercise",
  "description": "30 minutes of cardio",
  "goalType": "daily",
  "targetCount": 1,
  "startDate": "2024-01-01T00:00:00Z"
}
```

### Mark Habit Complete
```bash
POST /api/completions
Authorization: Bearer <token>

{
  "habitId": "habit-id-here",
  "date": "2024-01-15T00:00:00Z"
}
```

### Get Calendar Data
```bash
GET /api/completions/calendar?year=2024&month=1
Authorization: Bearer <token>
```

## Data Models

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
}
```

### Habit
```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  goalType: 'daily' | 'weekly' | 'monthly';
  targetCount: number;
  startDate: Date;
  active: boolean;
  currentStreak?: number;
  longestStreak?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Completion
```typescript
{
  id: string;
  habitId: string;
  userId: string;
  date: Date;
  completedAt: Date;
  createdAt: Date;
}
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // For paginated endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [...] // For validation errors
}
```

## Rate Limiting
- 100 requests per 15 minutes per IP
- Authenticated endpoints have higher limits

## Security Features
- JWT authentication with access/refresh tokens
- Password hashing with bcrypt
- Input validation with Zod schemas
- CORS protection
- Helmet.js security headers
- Request rate limiting

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Testing
```bash
npm test                    # Run all tests
npm run test:watch        # Watch mode
```

### Database Operations
```bash
# Connect to MongoDB
mongosh habit-tracker

# View collections
show collections

# Query users
db.users.find().pretty()

# Query habits
db.habits.find().pretty()
```

## Error Codes

| Code | Description |
|------|-------------|
| `EMAIL_EXISTS` | Email already registered |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `INVALID_TOKEN` | JWT token is invalid |
| `TOKEN_EXPIRED` | JWT token has expired |
| `DUPLICATE_COMPLETION` | Completion already exists for this date |
| `FUTURE_DATE` | Cannot create completions for future dates |
| `VALIDATION_FAILED` | Input validation failed |

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=prod-secret-key
JWT_REFRESH_SECRET=prod-refresh-key
FRONTEND_URL=https://yourapp.com
```

### Health Check
```bash
GET /health
```

### Security Headers
The API includes security headers via Helmet.js:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

## Monitoring & Logs

- Structured error logging
- Request/response logging in development
- Production-ready for APM integration (New Relic, DataDog)

## Performance

### Database Indexes
- Users: `{ email: 1 }`
- Habits: `{ userId: 1, active: 1 }`
- Completions: `{ userId: 1, habitId: 1, date: 1 }`

### Response Times
- <50ms for simple queries
- <200ms for complex analytics
- Optimized for 10,000+ completions per user

### Caching Strategy
- JWT tokens cached in memory
- Optional Redis support for session storage
- Database query result caching

This backend provides a robust, secure, and scalable foundation for the habit tracker application.