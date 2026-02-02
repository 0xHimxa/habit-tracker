# Habit Tracker - Complete Application Guide

## 🎯 Overview

This is a production-ready habit tracking web application built with modern technologies and best practices. It helps users build and maintain positive habits through streak tracking, calendar-based completion tracking, and comprehensive analytics.

## ✨ Key Features

### 🏠 Core Features
- **User Authentication**: Secure JWT-based auth with refresh tokens
- **Habit Management**: Create, update, delete, and archive habits
- **Goal Types**: Support for daily, weekly, and monthly goals
- **Calendar Tracking**: Visual calendar with completion status
- **Streak System**: Smart streak calculation for all goal types
- **Progress Analytics**: Comprehensive charts and insights

### 🎨 User Experience
- **Dark Mode**: Full dark/light theme support with system detection
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Instant feedback on habit completions
- **Interactive Calendar**: Click to complete habits, hover for details
- **Progress Visualization**: Beautiful charts and progress bars

### 🔧 Technical Features
- **TypeScript**: Full type safety across frontend and backend
- **API Design**: RESTful API with comprehensive validation
- **Database Optimization**: Indexed MongoDB with efficient queries
- **Error Handling**: Comprehensive error handling and user feedback
- **Security**: Best practices for authentication and data protection

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with access/refresh tokens
- **State Management**: React Query (TanStack Query)
- **Validation**: Zod schemas
- **Charts**: Recharts
- **Date Handling**: date-fns with timezone support

### System Architecture
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
│   (Data Fetch)  │    │   (Tokens)      │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- MongoDB (if not using Docker)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd habit-tracker
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start with Docker (recommended):**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: mongodb://localhost:27017

## 📱 Application Features

### Dashboard
- Overview of habit progress
- Current streaks and statistics
- Quick habit completion
- At-risk habit warnings

### Calendar View
- Monthly calendar with habit completion status
- Click on any date to manage completions
- Color-coded completion indicators
- Hover tooltips for detailed information

### Habit Management
- Create habits with custom goals
- Daily, weekly, or monthly target frequencies
- Edit and archive habits
- Bulk operations support

### Analytics
- Weekly and monthly progress charts
- Habit performance metrics
- Goal type distribution
- Streak analytics and insights

### User Features
- Secure authentication and authorization
- Profile management
- Timezone support
- Dark/light theme toggle

## 🎯 Streak Logic

### Daily Habits
- **Definition**: Consecutive days where target is met
- **Example**: "Exercise 1x/day" - complete every day to maintain streak
- **Grace Period**: Yesterday's completion maintains streak until tomorrow

### Weekly Habits  
- **Definition**: Consecutive weeks where weekly target is met
- **Example**: "Read 3 books/week" - complete 3+ times per week
- **Boundaries**: Monday-Sunday weeks (configurable)

### Monthly Habits
- **Definition**: Consecutive months where monthly target is met
- **Example**: "Save $500/month" - meet savings goal each month
- **Boundaries**: Calendar month boundaries

### Timezone Handling
- All calculations use user's local timezone
- Prevents streak breaks due to timezone differences
- Handles daylight saving time automatically

## 🔒 Security Features

### Authentication
- JWT access tokens (15-minute expiry)
- Refresh tokens (7-day expiry)  
- Secure password hashing (bcrypt)
- Rate limiting on auth endpoints

### Data Protection
- Input validation with Zod schemas
- SQL injection prevention
- XSS protection
- CSRF protection

### API Security
- CORS configuration
- Helmet.js security headers
- Request validation middleware
- Error sanitization

## 📊 Performance Optimizations

### Database
- Optimized indexes for all query patterns
- Efficient aggregation pipelines
- Connection pooling
- Query result caching

### Frontend
- Code splitting and lazy loading
- Image optimization with Next.js
- React Query caching
- Bundle size optimization

### Backend
- Response caching strategies
- Compression middleware
- Pagination support
- Optimized aggregation queries

## 🌙 Dark Mode Support

- System theme detection
- Manual theme override
- Persistent theme preference
- Smooth transitions
- CSS custom properties for consistency

## 📱 Responsive Design

- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interactions
- Optimized navigation patterns
- Progressive enhancement

## 🛠️ Development Workflow

### Local Development
```bash
# Frontend development
cd frontend && npm run dev

# Backend development  
cd backend && npm run dev

# Full stack with Docker
docker-compose -f docker-compose.dev.yml up
```

### Code Quality
- TypeScript for type safety
- ESLint for code standards
- Prettier for formatting
- Git hooks for pre-commit checks

### Testing
- Unit tests with Jest
- Integration tests for API
- E2E tests with Cypress
- Visual regression testing

## 🚀 Deployment Options

### Production Docker Deployment
```bash
# Build and start production services
docker-compose --profile production up -d
```

### Cloud Platforms
- **Vercel**: Frontend hosting
- **Railway**: Backend and database
- **DigitalOcean**: Full-stack deployment
- **AWS**: Scalable infrastructure

### Environment Configuration
- Development: Local development setup
- Staging: Production-like testing environment  
- Production: Live deployment with optimizations

## 📈 Monitoring & Analytics

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- User analytics
- Custom metrics

### Database Monitoring
- Query performance analysis
- Index usage statistics
- Connection monitoring
- Backup automation

## 🔄 Continuous Integration

### GitHub Actions
- Automated testing on PRs
- Security vulnerability scanning
- Docker image building
- Deployment pipelines

### Quality Gates
- Code coverage requirements
- Performance budgets
- Security scanning
- Accessibility testing

## 🎨 UI/UX Features

### Design System
- Component library with reusable patterns
- Consistent spacing and typography
- Accessible color palette
- Animation and micro-interactions

### User Feedback
- Loading states and skeletons
- Success/error notifications
- Progress indicators
- Confirmation dialogs

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## 🔧 Configuration

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/habit_tracker

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Application
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### Customization
- Brand colors and themes
- Habit categories
- Notification preferences
- Data retention policies

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - User profile

### Habit Endpoints
- `GET /api/habits` - List habits
- `POST /api/habits` - Create habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit

### Completion Endpoints
- `GET /api/completions/calendar` - Calendar data
- `POST /api/completions` - Create completion
- `DELETE /api/completions/:id` - Delete completion

### Analytics Endpoints
- `GET /api/analytics` - User analytics
- `GET /api/analytics/habits/:id` - Habit analytics
- `GET /api/analytics/export` - Export data

## 🌍 Internationalization

### Supported Languages
- English (default)
- Additional languages easily added
- RTL language support
- Date/time localization

### Timezone Support
- Automatic timezone detection
- Manual timezone selection
- Consistent date calculations
- Daylight saving handling

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- Follow TypeScript best practices
- Use conventional commits
- Maintain test coverage
- Update documentation

## 📋 Future Enhancements

### Planned Features
- [ ] Habit reminders and notifications
- [ ] Social features and sharing
- [ ] Advanced analytics and insights
- [ ] Mobile applications (iOS/Android)
- [ ] Integration with fitness trackers
- [ ] Habit templates and suggestions

### Technical Improvements
- [ ] Real-time collaboration
- [ ] Offline support with PWA
- [ ] Advanced caching strategies
- [ ] Machine learning recommendations
- [ ] Multi-tenant support

## 📞 Support

### Documentation
- [API Documentation](./API_DOCS.md)
- [Database Design](./DATABASE_DESIGN.md)
- [Streak Logic](./STREAK_LOGIC.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Getting Help
1. Check existing documentation
2. Search GitHub issues
3. Create detailed bug report
4. Join community discussions

---

**Built with ❤️ for habit tracking and personal growth**