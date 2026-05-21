# EstateMind - AI Investment Intelligence Platform

A premium AI-powered real estate investment intelligence platform that helps investors analyze opportunities, estimate ROI, evaluate risk, and make data-driven investment decisions with institutional-grade insights.

## Project Structure

This codebase has been organized for production readiness, scalability, and maintainability.

```
src/
├── components/               # React components
│   ├── ui/                  # shadcn v4 components (40+ pre-built)
│   ├── Dashboard.tsx        # Main dashboard view
│   ├── LandingPage.tsx      # Marketing landing page
│   ├── DealAnalyzer.tsx     # Property analysis form
│   ├── InvestmentReport.tsx # AI-generated investment report
│   ├── OpportunityTracker.tsx # Opportunity management with filters
│   ├── InvestmentPipeline.tsx # Kanban-style pipeline view
│   ├── PortfolioAnalytics.tsx # Portfolio analytics dashboard
│   ├── PricingPage.tsx      # SaaS pricing tiers
│   ├── MetricCard.tsx       # Reusable metric display
│   ├── ScoreGauge.tsx       # Circular score visualization
│   └── AIInsightCard.tsx    # AI insight display card
│
├── lib/
│   ├── types/               # TypeScript type definitions (organized)
│   │   ├── property.ts      # Property-related types
│   │   ├── analysis.ts      # Investment analysis types
│   │   ├── opportunity.ts   # Opportunity management types
│   │   ├── dashboard.ts     # Dashboard & AI insight types
│   │   ├── portfolio.ts     # Portfolio & location types
│   │   └── index.ts         # Central type exports
│   │
│   ├── constants/           # Application constants
│   │   └── index.ts         # App config, status options, pricing tiers
│   │
│   ├── utils/               # Utility functions
│   │   ├── format.ts        # Formatting helpers (currency, dates, numbers)
│   │   ├── calculations.ts  # Investment calculations (ROI, yield, etc.)
│   │   ├── helpers.ts       # UI helpers (colors, labels)
│   │   └── index.ts         # Utility exports
│   │
│   ├── mockData.ts          # Mock data (ready for API replacement)
│   ├── analyzerEngine.ts    # AI analysis generation logic
│   └── utils.ts             # shadcn utils (cn helper)
│
├── hooks/
│   └── use-mobile.ts        # Responsive breakpoint hook
│
├── styles/
│   └── theme.css            # Theme definitions
│
├── App.tsx                  # Main application router
├── index.css                # Global styles & theme
└── main.tsx                 # Application entry point
```

## Key Features

### 1. **Landing Page**
- Premium fintech SaaS aesthetic
- AI investment intelligence messaging
- Feature explanations & benefits
- Pricing preview & CTAs

### 2. **AI Deal Analyzer**
- Comprehensive property input form
- Multi-currency support
- Property type selection
- Condition assessment
- Renovation & legal notes
- Mock AI analysis generation

### 3. **Investment Reports**
- AI-generated analysis with scores
- Buy/Watch/Avoid recommendations
- Rental yield estimates
- Airbnb potential analysis
- Renovation ROI calculations
- Appreciation projections
- Risk & opportunity identification
- Visual scoring with gauges & charts

### 4. **Investor Dashboard**
- Portfolio overview metrics
- AI insight cards
- Saved opportunities summary
- Quick navigation to key features
- Real-time KPIs

### 5. **Opportunity Tracker**
- Advanced filtering (tags, countries, types)
- Multi-tab status navigation
- Search & sort functionality
- Status management dropdown
- Bulk actions (archive, export, tag)
- Persistent storage with `useKV`

### 6. **Investment Pipeline**
- Kanban-style drag-and-drop interface
- 7-stage investment workflow
- Visual deal flow management
- Status-based organization

### 7. **Portfolio Analytics**
- Performance charts (value, yield, appreciation)
- Cash flow analysis
- Portfolio composition visualization
- Time range filtering
- Bloomberg Terminal aesthetic

### 8. **Pricing Page**
- 5 SaaS tiers (Trial → Enterprise)
- Feature comparison
- Value-focused messaging
- Premium positioning

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn v4
- **Icons**: Phosphor Icons
- **Charts**: Recharts
- **State Management**: React hooks + useKV (persistent)
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Toast Notifications**: Sonner

## Type Safety

The project uses comprehensive TypeScript types organized by domain:

```typescript
// Property types
Property, PropertyType, PropertyCondition

// Analysis types  
InvestmentAnalysis, InvestmentScore, InvestmentRecommendation
RentalYieldEstimate, AirbnbPotential, RenovationROI, AppreciationPotential

// Opportunity types
Opportunity, OpportunityStatus

// Dashboard types
DashboardMetrics, AIInsight

// Portfolio types
PortfolioMetrics, LocationIntelligence, Document
```

## Constants

All hardcoded values are centralized in `/lib/constants`:

- App configuration (name, tagline)
- Property types & conditions
- Opportunity statuses with colors
- Score thresholds (buy/watch/avoid)
- Badge variants
- Time ranges
- Pricing tiers

## Utility Functions

### Formatting
- `formatCurrency()` - Currency formatting with locale support
- `formatPercentage()` - Percentage formatting
- `formatNumber()` - Number formatting with commas
- `formatDate()` - Date formatting
- `formatRelativeTime()` - Relative time (e.g., "3 days ago")
- `formatPricePerSqm()` - Price per square meter
- `formatCompactNumber()` - Compact format (e.g., "1.2M")

### Calculations
- `calculateRentalYield()` - Annual rent / purchase price
- `calculateAirbnbYield()` - Airbnb revenue / purchase price
- `calculateROI()` - Return on investment
- `calculateOverallScore()` - Weighted investment score
- `calculatePricePerSqm()` - Price per square meter
- `calculateMonthlyMortgage()` - Mortgage calculator
- `calculateNetCashFlow()` - Monthly cash flow
- `calculateCapRate()` - Capitalization rate
- `estimateClosingCosts()` - Country-specific closing costs

### Helpers
- `getStatusColor()` - Status-based colors
- `getStatusLabel()` - Status display labels
- `getScoreColor()` - Score-based colors
- `getScoreLabel()` - Score categories (Excellent/Good/Fair/Poor)
- `getRecommendationColor()` - Recommendation colors
- `getPriorityColor()` - Priority-based colors

## Data Persistence

Uses `useKV` hook from Spark SDK for persistent storage:

```typescript
import { useKV } from '@github/spark/hooks'

// Persist opportunities between sessions
const [opportunities, setOpportunities] = useKV('opportunities', [])

// CRITICAL: Always use functional updates
setOpportunities(current => [...current, newOpportunity])
```

## Mock Data

Mock data is centralized in `/lib/mockData.ts` for easy replacement:

- `mockProperties` - Sample property listings
- `mockAnalyses` - Sample AI analyses
- `mockOpportunities` - Sample opportunities
- `mockDashboardMetrics` - Dashboard KPIs
- `mockAIInsights` - AI-generated insights

## Future Backend Integration

The architecture is prepared for:

### Supabase Integration
1. Replace `/lib/mockData.ts` with Supabase queries
2. Use types to generate Supabase schema
3. Service layer ready for async operations

### AI Integration
1. Replace `generateMockAnalysis()` with real AI API
2. AI service boundaries clearly defined
3. Mock responses isolated for easy swapping

### Authentication
1. Add auth context provider
2. Protect routes in `App.tsx`
3. User-specific data fetching

## Design Principles

1. **Premium Fintech Aesthetic** - Bloomberg Terminal meets modern SaaS
2. **Investor-Grade UX** - Institutional software quality
3. **AI-Native Experience** - Proactive insights & recommendations
4. **Global Scalability** - Multi-currency, multi-country support
5. **Data-Driven** - Visual emphasis on metrics & analytics
6. **Mobile-First** - Responsive design with progressive enhancement

## Color Scheme

Dark-mode-first with sophisticated color palette:

- **Background**: `oklch(0.12 0.02 260)` - Deep indigo-tinted dark
- **Primary**: `oklch(0.35 0.15 270)` - Intelligence & trust
- **Accent**: `oklch(0.75 0.15 195)` - AI & technology (cyan)
- **Success**: `oklch(0.65 0.18 145)` - Positive ROI (green)
- **Warning**: `oklch(0.75 0.15 75)` - Caution (amber)
- **Destructive**: `oklch(0.60 0.22 25)` - Risk (red)

## Typography

- **Display Font**: Space Grotesk (headlines, titles)
- **Body Font**: Inter (content, UI)
- Professional hierarchy with clear visual distinction

## Development Guidelines

### Adding New Features
1. Create types in `/lib/types/`
2. Add constants in `/lib/constants/`
3. Create reusable utilities in `/lib/utils/`
4. Build components in `/components/`
5. Use `useKV` for persistent data
6. Import from centralized exports

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Prefer functional components with hooks
- Use Tailwind utility classes
- Leverage shadcn components
- Keep components focused & small

### State Management
- Use `useState` for ephemeral UI state
- Use `useKV` for persistent application data
- Use functional updates with `useKV`

## Next Steps for Production

1. **Backend Integration**
   - Set up Supabase project
   - Create database schema from types
   - Replace mock data with real queries
   - Add authentication

2. **AI Integration**
   - Integrate OpenAI/Anthropic API
   - Replace mock analysis with real AI
   - Add streaming responses
   - Implement rate limiting

3. **Payments**
   - Integrate Stripe
   - Implement subscription logic
   - Add usage tracking
   - Create customer portal

4. **Testing**
   - Add unit tests for utilities
   - Add integration tests for features
   - Add E2E tests for critical flows

5. **Deployment**
   - Set up CI/CD pipeline
   - Configure environment variables
   - Add monitoring & analytics
   - Set up error tracking

## License

Proprietary - All rights reserved

## Contact

For questions or support, contact the development team.

---

**Built with premium investor-grade quality for real estate investment intelligence.**
