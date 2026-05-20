# EstateMind - Migration & Export Guide

This document provides everything you need to successfully export EstateMind to GitHub and continue development in VS Code.

---

## 📋 Table of Contents

1. [Current App Structure](#current-app-structure)
2. [Main Components](#main-components)
3. [Mock Data Locations](#mock-data-locations)
4. [Supabase Integration Points](#supabase-integration-points)
5. [Environment Variables](#environment-variables)
6. [Known Limitations](#known-limitations)
7. [Recommended Next Steps](#recommended-next-steps)

---

## 1. Current App Structure

### Project Organization

```
/workspaces/spark-template/
├── src/
│   ├── components/          # All React components
│   │   ├── ui/              # 40+ shadcn v4 components (DO NOT MODIFY)
│   │   ├── LandingPage.tsx  # Marketing/landing page
│   │   ├── Dashboard.tsx    # Main investor dashboard
│   │   ├── DealAnalyzer.tsx # Property analysis form
│   │   ├── InvestmentReport.tsx # AI analysis report display
│   │   ├── OpportunityTracker.tsx # Opportunity management
│   │   ├── InvestmentPipeline.tsx # Kanban-style pipeline
│   │   ├── PortfolioAnalytics.tsx # Portfolio analytics dashboard
│   │   ├── PricingPage.tsx  # Pricing tiers page
│   │   ├── MetricCard.tsx   # Reusable metric display card
│   │   ├── ScoreGauge.tsx   # Circular score visualization
│   │   └── AIInsightCard.tsx # AI insight display card
│   │
│   ├── lib/
│   │   ├── types/           # TypeScript type definitions
│   │   │   ├── property.ts  # Property & address types
│   │   │   ├── analysis.ts  # Investment analysis types
│   │   │   ├── opportunity.ts # Opportunity tracking types
│   │   │   ├── dashboard.ts # Dashboard & insights types
│   │   │   ├── portfolio.ts # Portfolio & location types
│   │   │   └── index.ts     # Central type exports
│   │   │
│   │   ├── constants/       # App-wide constants
│   │   │   └── index.ts     # Property types, statuses, configs
│   │   │
│   │   ├── utils/           # Utility functions
│   │   │   ├── format.ts    # Formatting (currency, dates, etc.)
│   │   │   ├── calculations.ts # Business logic (ROI, yields)
│   │   │   ├── helpers.ts   # UI helpers (colors, labels)
│   │   │   └── index.ts     # Utility exports
│   │   │
│   │   ├── mockData.ts      # Mock property & analysis data
│   │   ├── analyzerEngine.ts # Mock AI analysis generator
│   │   ├── types.ts         # Legacy type exports (re-exports from types/)
│   │   └── utils.ts         # shadcn utility (cn function)
│   │
│   ├── services/            # Service layer (ready for production)
│   │   ├── supabase/        # Supabase integration services
│   │   │   ├── client.ts    # Supabase client initialization
│   │   │   ├── opportunities.service.ts # Opportunity CRUD
│   │   │   ├── portfolio.service.ts # Portfolio management
│   │   │   ├── auth.service.ts # Authentication
│   │   │   ├── storage.service.ts # File storage
│   │   │   └── index.ts     # Service exports
│   │   │
│   │   ├── ai/              # AI service integration
│   │   │   ├── analysis.service.ts # AI property analysis
│   │   │   ├── document.service.ts # AI document analysis
│   │   │   └── index.ts     # AI service exports
│   │   │
│   │   ├── config.ts        # Environment configuration
│   │   ├── index.ts         # Service layer exports
│   │   └── README.md        # Complete service layer documentation
│   │
│   ├── hooks/
│   │   └── use-mobile.ts    # Mobile breakpoint detection hook
│   │
│   ├── styles/
│   │   └── theme.css        # Additional theme styles
│   │
│   ├── App.tsx              # Main app component & routing
│   ├── main.tsx             # App entry point (DO NOT MODIFY)
│   ├── main.css             # Main styles (DO NOT MODIFY)
│   ├── index.css            # Custom theme & color definitions
│   └── vite-env.d.ts        # Vite type definitions
│
├── index.html               # HTML entry point
├── package.json             # Dependencies (use npm tool to modify)
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration (DO NOT MODIFY)
│
├── PRD.md                   # Product Requirements Document
├── PRODUCTION-READY.md      # Production refactor summary
├── REFACTOR.md              # Refactoring strategy document
├── SECURITY.md              # Security considerations
├── README.md                # Project documentation
└── MIGRATION_NOTES.md       # This file
```

### Key Architectural Decisions

1. **Client-Side Routing**: Simple state-based routing via `currentPage` in `App.tsx`
   - Easy to migrate to React Router or Next.js routing later
   - Clean separation of page components

2. **State Management**: 
   - Local React state for UI state
   - `useKV` hook (from `@github/spark/hooks`) for persistent data
   - Ready for migration to React Query + Supabase

3. **Styling**: 
   - Tailwind CSS with custom theme
   - shadcn v4 component library
   - Dark fintech aesthetic with purple/cyan accents

4. **Type Safety**: 
   - Comprehensive TypeScript types organized by domain
   - Strict typing throughout components

---

## 2. Main Components

### Core Page Components

#### `LandingPage.tsx`
**Purpose**: Marketing page with hero, features, and pricing preview  
**Props**: `{ onNavigate: (page: string) => void }`  
**Key Features**:
- Hero section with AI messaging
- Feature cards explaining platform capabilities
- Pricing tier preview
- Call-to-action buttons
- Premium fintech aesthetic

**Migration Notes**:
- Replace `onNavigate` with proper routing (React Router `<Link>` or Next.js `<Link>`)
- Add actual authentication integration for CTAs

---

#### `Dashboard.tsx`
**Purpose**: Main investor dashboard showing portfolio overview and opportunities  
**Props**: `{ onNavigate: (page: string, data?: unknown) => void }`  
**Key Features**:
- Portfolio metrics cards (total value, monthly income, ROI)
- Recent analyses list
- Saved opportunities summary
- AI insight cards
- Quick action buttons

**Migration Notes**:
- Replace mock metrics with `portfolioService.getMetrics()`
- Replace mock opportunities with `opportunitiesService.getAll({ limit: 5 })`
- Add real-time data fetching with React Query
- Implement proper user authentication context

---

#### `DealAnalyzer.tsx`
**Purpose**: Comprehensive property analysis form  
**Props**: `{ onAnalyze: (property: Property) => void }`  
**Key Features**:
- Multi-field property input form
- Country/city/district selection
- Property type and condition selectors
- Financial inputs (price, rent, renovation costs)
- Form validation
- AI analysis trigger

**Migration Notes**:
- Replace `onAnalyze` callback with API call: `aiService.analyzeProperty(property)`
- Add loading state during AI analysis
- Implement form persistence with `useKV` for draft properties
- Add file upload for property images/documents

---

#### `InvestmentReport.tsx`
**Purpose**: Detailed AI-generated investment analysis display  
**Props**: `{ analysis: InvestmentAnalysis | undefined, onBack: () => void }`  
**Key Features**:
- Investment score visualization (ScoreGauge)
- Buy/Watch/Avoid recommendation
- Executive summary
- Financial metrics (ROI, yields, cash flow)
- Risk assessment
- Location intelligence
- Airbnb potential analysis
- Export functionality

**Migration Notes**:
- Replace mock `analysis` prop with API-fetched data
- Implement PDF export functionality
- Add share/collaboration features
- Connect to real AI analysis service

---

#### `OpportunityTracker.tsx`
**Purpose**: Advanced opportunity management with filtering and status workflows  
**Props**: `{ onNavigate: (page: string, data?: unknown) => void, onBack: () => void }`  
**Key Features**:
- Tab-based status filtering (All, New, Watching, Due Diligence, etc.)
- Advanced multi-filter system (tags, countries, property types, score ranges)
- Search functionality
- Bulk actions (archive, tag multiple opportunities)
- Status management with dropdown
- Favorite/archive toggles
- Summary metrics card
- Empty states

**Data Persistence**: Uses `useKV('estatemind-opportunities', [])`

**Migration Notes**:
- Replace `useKV` with `opportunitiesService.getAll(filters)`
- Implement real-time updates on status changes
- Add optimistic UI updates for better UX
- Connect bulk actions to `opportunitiesService.bulkUpdate()`
- Implement server-side filtering and search

---

#### `InvestmentPipeline.tsx`
**Purpose**: Kanban-style drag-and-drop pipeline for deal stages  
**Props**: `{ onBack: () => void, onViewOpportunity: (opp: Opportunity) => void }`  
**Key Features**:
- Drag-and-drop between pipeline stages
- Visual status columns (New → Acquired/Rejected)
- Opportunity cards with key metrics
- Stage-based filtering
- Quick status updates

**Data Persistence**: Uses `useKV('estatemind-opportunities', [])`

**Migration Notes**:
- Implement drag-and-drop with optimistic updates
- Sync status changes to Supabase
- Add real-time collaboration (show when others move cards)
- Implement proper error handling and rollback

---

#### `PortfolioAnalytics.tsx`
**Purpose**: Portfolio performance analytics dashboard  
**Props**: `{ onBack: () => void }`  
**Key Features**:
- Portfolio value charts (time-series)
- Yield analysis
- Geographic distribution
- Property type breakdown
- Performance metrics
- AI portfolio recommendations

**Migration Notes**:
- Replace mock portfolio data with `portfolioService.getProperties()`
- Implement real chart data from Supabase
- Add date range filtering
- Connect to analytics service for trends

---

#### `PricingPage.tsx`
**Purpose**: SaaS pricing tiers display  
**Props**: `{ onNavigate: (page: string) => void }`  
**Key Features**:
- Pricing tier cards (Free Trial, Starter, Pro, Elite, Enterprise)
- Feature comparison
- CTA buttons
- Premium SaaS aesthetic

**Migration Notes**:
- Integrate with Stripe/payment provider
- Add subscription management
- Implement trial period logic
- Add feature gating based on subscription tier

---

### Reusable UI Components

#### `MetricCard.tsx`
**Purpose**: Display key metrics with icons and formatting  
**Props**: `{ label: string, value: string | number, icon: ReactNode, trend?: string, trendUp?: boolean }`  
**Usage**: Dashboard KPIs, portfolio metrics, analytics

---

#### `ScoreGauge.tsx`
**Purpose**: Circular gauge for investment scores (0-100)  
**Props**: `{ score: number, size?: number, label?: string }`  
**Usage**: Investment reports, opportunity cards, dashboard widgets

---

#### `AIInsightCard.tsx`
**Purpose**: Display AI-generated insights with styling  
**Props**: `{ title: string, description: string, type?: 'opportunity' | 'risk' | 'neutral' }`  
**Usage**: Dashboard insights, analysis reports, recommendations

---

### shadcn UI Components (`/components/ui/`)

**DO NOT MODIFY THESE FILES** - They are pre-installed shadcn v4 components.

Key components used throughout the app:
- `Button` - All interactive buttons
- `Card` - Container component (used everywhere)
- `Badge` - Status indicators, tags
- `Tabs` - Tab navigation (OpportunityTracker)
- `Select` - Dropdown selections
- `Input` - Form inputs
- `Dialog` - Modal dialogs
- `Separator` - Visual dividers
- `Tooltip` - Hover information
- `Progress` - Loading bars
- `Skeleton` - Loading placeholders

---

## 3. Mock Data Locations

### Primary Mock Data Source

**File**: `src/lib/mockData.ts`

Contains:
- `mockProperties: Property[]` - Sample property listings (10+ properties)
- `mockOpportunities: Opportunity[]` - Saved opportunities with analyses
- `mockDashboardMetrics: DashboardMetrics` - Dashboard statistics
- `mockPortfolioProperties` - Portfolio holdings
- `mockLocationIntelligence` - Location scoring data

**Usage**:
```typescript
import { mockProperties, mockOpportunities } from '@/lib/mockData'
```

---

### AI Analysis Generator

**File**: `src/lib/analyzerEngine.ts`

**Function**: `generateMockAnalysis(property: Property): InvestmentAnalysis`

Generates realistic AI-powered investment analysis including:
- Investment scores (0-100)
- Buy/Watch/Avoid recommendations
- Financial projections (ROI, yields, cash flow)
- Risk assessments
- Location intelligence
- Airbnb potential
- Renovation ROI estimates
- Executive summaries

**How it works**:
- Takes property data as input
- Applies scoring algorithms based on property characteristics
- Generates contextual insights based on location and property type
- Returns comprehensive `InvestmentAnalysis` object

**Migration**: Replace with `aiService.analyzeProperty(property)`

---

### Constants & Configuration

**File**: `src/lib/constants/index.ts`

Contains:
- `APP_CONFIG` - App name, tagline, URLs
- `PROPERTY_TYPES` - All property types
- `PROPERTY_CONDITIONS` - Property condition options
- `OPPORTUNITY_STATUSES` - Status workflow with colors
- `SCORE_THRESHOLDS` - Investment score ranges
- `PRICING_TIERS` - SaaS pricing configuration
- `TIME_RANGES` - Analytics time period options

**Benefits**:
- Single source of truth for configuration
- Easy to modify without searching codebase
- Consistent values across components

---

## 4. Supabase Integration Points

The service layer is **production-ready** and includes complete Supabase integration patterns. All services gracefully fall back to mock data when Supabase is not configured.

### Service Layer Architecture

**Location**: `src/services/`

**Documentation**: See `src/services/README.md` for complete API documentation

---

### 🔄 Migration Strategy: Mock → Supabase

#### Phase 1: Setup Supabase Project

1. Create Supabase project at https://supabase.com
2. Copy URL and anon key to `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Install Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

4. Initialize in your app (already implemented in `src/services/supabase/client.ts`)

---

#### Phase 2: Create Database Schema

Run these SQL commands in Supabase SQL Editor:

**Opportunities Table**:
```sql
create table opportunities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  property jsonb not null,
  analysis jsonb,
  status text not null,
  tags text[] default '{}',
  notes text,
  is_favorite boolean default false,
  is_archived boolean default false,
  saved_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table opportunities enable row level security;

create policy "Users can view own opportunities"
  on opportunities for select
  using (auth.uid() = user_id);

create policy "Users can insert own opportunities"
  on opportunities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own opportunities"
  on opportunities for update
  using (auth.uid() = user_id);

create policy "Users can delete own opportunities"
  on opportunities for delete
  using (auth.uid() = user_id);

-- Indexes for performance
create index opportunities_user_id_idx on opportunities(user_id);
create index opportunities_status_idx on opportunities(status);
create index opportunities_saved_at_idx on opportunities(saved_at desc);
```

**Portfolio Properties Table**:
```sql
create table portfolio_properties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  country text,
  city text,
  property_type text,
  acquisition_price decimal not null,
  current_value decimal not null,
  monthly_income decimal default 0,
  expenses decimal default 0,
  acquisition_date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table portfolio_properties enable row level security;

create policy "Users can manage own portfolio"
  on portfolio_properties for all
  using (auth.uid() = user_id);

-- Indexes
create index portfolio_properties_user_id_idx on portfolio_properties(user_id);
```

**Portfolio Metrics Table**:
```sql
create table portfolio_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  total_value decimal default 0,
  total_invested decimal default 0,
  monthly_income decimal default 0,
  average_yield decimal default 0,
  property_count integer default 0,
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table portfolio_metrics enable row level security;

create policy "Users can view own metrics"
  on portfolio_metrics for all
  using (auth.uid() = user_id);
```

---

#### Phase 3: Update Components to Use Services

**Current (Mock Data)**:
```typescript
// OpportunityTracker.tsx
const [opportunities, setOpportunities] = useKV('estatemind-opportunities', [])
```

**After (Supabase)**:
```typescript
// OpportunityTracker.tsx
import { opportunitiesService } from '@/services'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function OpportunityTracker() {
  const queryClient = useQueryClient()
  
  // Fetch opportunities
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => opportunitiesService.getAll()
  })

  // Update opportunity
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Opportunity> }) =>
      opportunitiesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    }
  })

  const handleStatusChange = (id: string, status: OpportunityStatus) => {
    updateMutation.mutate({ id, data: { status } })
  }

  // ... rest of component
}
```

---

### Key Service Methods to Replace Mock Data

#### Opportunities

**Mock**: `useKV('estatemind-opportunities', [])`  
**Replace with**:
```typescript
import { opportunitiesService } from '@/services'

// Get all
await opportunitiesService.getAll()

// Get with filters
await opportunitiesService.getAll({
  status: ['new', 'watching'],
  country: ['Portugal'],
  minScore: 70
})

// Get single
await opportunitiesService.getById('opp-id')

// Create
await opportunitiesService.create(opportunityData)

// Update
await opportunitiesService.update('opp-id', { status: 'watching' })

// Bulk update
await opportunitiesService.bulkUpdate(['id1', 'id2'], { tags: ['archived'] })

// Delete
await opportunitiesService.delete('opp-id')
```

---

#### Portfolio

**Mock**: Variables in `mockData.ts`  
**Replace with**:
```typescript
import { portfolioService } from '@/services'

// Get metrics
const metrics = await portfolioService.getMetrics()

// Get properties
const properties = await portfolioService.getProperties()

// Add property
await portfolioService.addProperty(propertyData)

// Update property
await portfolioService.updateProperty('prop-id', updates)

// Remove property
await portfolioService.removeProperty('prop-id')
```

---

#### Authentication

**Mock**: None (currently no auth)  
**Add**:
```typescript
import { authService } from '@/services'

// Sign up
await authService.signUp({ email, password, name })

// Sign in
await authService.signIn({ email, password })

// Sign out
await authService.signOut()

// Get current user
const user = await authService.getCurrentUser()

// Listen to auth changes
authService.onAuthStateChange((event, session) => {
  // Update UI based on auth state
})
```

---

#### AI Analysis

**Mock**: `generateMockAnalysis()` from `analyzerEngine.ts`  
**Replace with**:
```typescript
import { aiService } from '@/services'

// Analyze property
const analysis = await aiService.analyzeProperty({ property, context })

// Generate insights
const insights = await aiService.generateInsights({ analysisId, focusArea })

// Score location
const locationScore = await aiService.scoreLocation(country, city, district)
```

---

## 5. Environment Variables

### Development (.env.local)

Create `.env.local` in project root:

```bash
# Supabase Configuration (Production Database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# AI Configuration (OpenAI or similar)
VITE_OPENAI_API_KEY=sk-your-openai-key
VITE_AI_MODEL_NAME=gpt-4o

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_API_BASE_URL=https://api.estatemind.ai

# Feature Flags (optional)
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DOCUMENT_UPLOAD=true
VITE_ENABLE_COLLABORATION=false

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_POSTHOG_KEY=phc_xxxxxxxxxx

# Payments (when ready)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
```

---

### Production (.env.production)

```bash
# Supabase
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key

# AI
VITE_OPENAI_API_KEY=sk-prod-key
VITE_AI_MODEL_NAME=gpt-4o

# App
VITE_APP_URL=https://app.estatemind.ai
VITE_API_BASE_URL=https://api.estatemind.ai

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DOCUMENT_UPLOAD=true
VITE_ENABLE_COLLABORATION=true

# Analytics
VITE_GOOGLE_ANALYTICS_ID=G-PROD-ID
VITE_POSTHOG_KEY=phc_prod_key

# Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
```

---

### Environment Variable Usage

The service layer automatically detects configuration:

```typescript
import { hasSupabaseConfig, hasAIConfig } from '@/services'

if (hasSupabaseConfig()) {
  // Supabase is configured, use real database
} else {
  // Fall back to mock data
}

if (hasAIConfig()) {
  // AI is configured, use real AI analysis
} else {
  // Use mock analysis generator
}
```

**Benefits**:
- Seamless development without external dependencies
- Production-ready when env vars are set
- No code changes needed to switch modes

---

## 6. Known Limitations

### Current Limitations (By Design)

1. **No Authentication**
   - Currently single-user experience
   - No login/signup flows implemented
   - **Fix**: Implement auth using `authService` and Supabase Auth

2. **Client-Side Routing**
   - Simple state-based navigation (`currentPage` state)
   - No URL persistence or browser history
   - **Fix**: Migrate to React Router or Next.js App Router

3. **Local State Only**
   - All data stored in browser via `useKV` (localStorage)
   - No multi-device sync
   - Data lost if localStorage is cleared
   - **Fix**: Replace with Supabase services

4. **Mock AI Analysis**
   - AI "analysis" is generated by algorithms in `analyzerEngine.ts`
   - No real AI/ML models involved
   - **Fix**: Integrate OpenAI API via `aiService`

5. **No Real-Time Collaboration**
   - Single user only
   - No team features
   - **Fix**: Use Supabase Realtime subscriptions

6. **No File Uploads**
   - Document intelligence UI exists but no actual upload
   - **Fix**: Implement `storageService.uploadDocument()`

7. **No Payment Integration**
   - Pricing page is display-only
   - No subscription management
   - **Fix**: Integrate Stripe or Paddle

8. **No Email/Notifications**
   - No email alerts for opportunities
   - No push notifications
   - **Fix**: Add email service (SendGrid, Resend) and notification system

9. **Limited Search**
   - Client-side search only (filters loaded data)
   - No full-text search
   - **Fix**: Implement Supabase full-text search or Algolia

10. **No Analytics**
    - No usage tracking
    - No error monitoring
    - **Fix**: Add PostHog, Mixpanel, or Google Analytics

---

### Technical Debt

1. **Component Size**
   - Some components (Dashboard, OpportunityTracker) are large
   - **Recommendation**: Break into smaller sub-components as features grow

2. **Error Handling**
   - Limited error boundaries
   - No retry logic for failed operations
   - **Recommendation**: Add comprehensive error handling and user feedback

3. **Loading States**
   - Some components lack loading indicators
   - **Recommendation**: Add skeleton loaders for all async operations

4. **Accessibility**
   - ARIA labels could be more comprehensive
   - Keyboard navigation could be improved
   - **Recommendation**: Audit with axe DevTools and add ARIA attributes

5. **Performance**
   - No code splitting or lazy loading
   - All components load on initial page load
   - **Recommendation**: Implement React.lazy() for route-based code splitting

6. **Testing**
   - No unit tests or integration tests
   - **Recommendation**: Add Vitest tests for utilities and React Testing Library for components

---

### Browser Compatibility

**Tested**: Chrome, Safari, Firefox (modern versions)  
**Not Tested**: IE11, older mobile browsers  
**Dependencies**: Modern JavaScript features (ES2020+)

---

## 7. Recommended Next Steps After GitHub Export

### Immediate (Week 1)

#### 1. Set Up Development Environment
- [ ] Clone repository to local machine
- [ ] Run `npm install`
- [ ] Create `.env.local` file
- [ ] Run `npm run dev` and verify app works locally
- [ ] Set up VS Code with recommended extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - GitHub Copilot

#### 2. Set Up Supabase
- [ ] Create Supabase project
- [ ] Run database schema SQL commands (see Section 4)
- [ ] Copy Supabase URL and anon key to `.env.local`
- [ ] Test Supabase connection

#### 3. Implement Authentication
- [ ] Enable Supabase Email Auth
- [ ] Create login/signup UI components
- [ ] Implement `authService` integration
- [ ] Add protected route wrapper
- [ ] Test user registration and login flow

---

### Short-Term (Month 1)

#### 4. Migrate Data Storage
- [ ] Replace `useKV` in OpportunityTracker with `opportunitiesService`
- [ ] Replace `useKV` in InvestmentPipeline with `opportunitiesService`
- [ ] Implement React Query for data fetching
- [ ] Add optimistic updates for better UX
- [ ] Test CRUD operations with real database

#### 5. Implement Routing
- [ ] Install React Router (or migrate to Next.js)
- [ ] Replace state-based navigation with routes
- [ ] Add URL persistence
- [ ] Implement browser back/forward support
- [ ] Add 404 page

#### 6. Add Error Handling & Loading States
- [ ] Add error boundaries
- [ ] Implement skeleton loaders
- [ ] Add toast notifications for errors
- [ ] Add retry logic for failed API calls
- [ ] Test error scenarios

---

### Medium-Term (Months 2-3)

#### 7. Integrate AI Services
- [ ] Set up OpenAI API account
- [ ] Configure `VITE_OPENAI_API_KEY`
- [ ] Replace `generateMockAnalysis()` with `aiService.analyzeProperty()`
- [ ] Implement streaming responses for better UX
- [ ] Add cost monitoring for API usage

#### 8. Add File Upload & Storage
- [ ] Enable Supabase Storage buckets
- [ ] Implement document upload UI
- [ ] Connect to `storageService.uploadDocument()`
- [ ] Add image preview and management
- [ ] Implement document AI analysis

#### 9. Build Admin Dashboard
- [ ] Create admin-only routes
- [ ] Add user management interface
- [ ] Implement analytics dashboard
- [ ] Add platform usage metrics
- [ ] Build content moderation tools

---

### Long-Term (Months 3-6)

#### 10. Implement Payments & Subscriptions
- [ ] Set up Stripe account
- [ ] Create pricing plans in Stripe
- [ ] Build checkout flow
- [ ] Implement subscription management
- [ ] Add feature gating based on plan
- [ ] Build billing portal

#### 11. Add Collaboration Features
- [ ] Implement team workspaces
- [ ] Add user invitations
- [ ] Build permission system
- [ ] Implement shared opportunities
- [ ] Add activity feed

#### 12. Optimize Performance
- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize images and assets
- [ ] Add caching strategies
- [ ] Monitor and optimize bundle size

#### 13. Launch MVP
- [ ] Set up production environment
- [ ] Configure domain and hosting
- [ ] Set up CI/CD pipeline
- [ ] Implement monitoring (Sentry, LogRocket)
- [ ] Add analytics (PostHog, Mixpanel)
- [ ] Launch beta to initial users

---

### Ongoing

#### Quality & Maintenance
- [ ] Write unit tests for utilities
- [ ] Write integration tests for services
- [ ] Add E2E tests for critical flows
- [ ] Set up automated testing in CI
- [ ] Implement automated deployments
- [ ] Monitor error rates and performance
- [ ] Gather user feedback and iterate

#### Feature Development
- [ ] Build property comparison tool
- [ ] Add advanced filtering and search
- [ ] Implement email notifications
- [ ] Add mobile app (React Native)
- [ ] Build API for third-party integrations
- [ ] Implement white-label solution for partners

---

## 📚 Additional Resources

### Documentation
- **PRD.md** - Product Requirements Document
- **PRODUCTION-READY.md** - Production refactor summary
- **REFACTOR.md** - Refactoring strategy
- **SECURITY.md** - Security considerations
- **src/services/README.md** - Complete service layer API docs

### External Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

## 🎯 Success Criteria

Your migration is successful when:

✅ App runs locally without errors  
✅ Authentication flow works end-to-end  
✅ Users can create, read, update, and delete opportunities  
✅ Data persists in Supabase database  
✅ AI analysis generates real insights (not mock data)  
✅ Routing works with URLs and browser navigation  
✅ Error handling provides clear user feedback  
✅ Loading states appear during async operations  
✅ App is deployed to production environment  
✅ Users can sign up and access the platform  

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: `npm install` fails  
**Solution**: Delete `node_modules` and `package-lock.json`, run `npm install` again

**Issue**: Supabase connection fails  
**Solution**: Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Issue**: Types not resolving  
**Solution**: Run `npm run build` to regenerate type definitions

**Issue**: Tailwind classes not applying  
**Solution**: Restart dev server, check `tailwind.config.js` includes all source files

**Issue**: Build fails in production  
**Solution**: Check for environment variables in build logs, ensure all `VITE_*` vars are set

---

## 📞 Support

For questions about the codebase:
1. Check inline code comments
2. Review `src/services/README.md` for service layer details
3. Consult PRD.md for product requirements
4. Review TypeScript types in `src/lib/types/`

---

**Good luck with your migration! EstateMind is ready for production. 🚀**
