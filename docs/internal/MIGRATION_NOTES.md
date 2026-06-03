# Migration Notes - GitHub Export & VS Code Continuation

## Overview

This document provides guidance for continuing development of EstateMind after exporting from Spark to GitHub and opening in VS Code. The codebase is production-ready but currently uses mock data and placeholder services that need to be replaced with real backend integrations.

---

## 1. Current App Structure

### Application Architecture

EstateMind is a **Complex Application** - a multi-view SaaS platform for real estate investment intelligence with sophisticated state management, data visualization, and AI analysis capabilities.

### File Organization

```
/workspaces/spark-template/
├── src/
│   ├── components/              # React components
│   │   ├── ui/                 # 40+ shadcn v4 components (pre-built)
│   │   ├── Dashboard.tsx       # Main investor dashboard
│   │   ├── LandingPage.tsx     # Marketing landing page
│   │   ├── DealAnalyzer.tsx    # Property analysis form
│   │   ├── InvestmentReport.tsx # AI-generated reports
│   │   ├── OpportunityTracker.tsx # Advanced filtering & management
│   │   ├── InvestmentPipeline.tsx # Kanban drag-and-drop pipeline
│   │   ├── PortfolioAnalytics.tsx # Charts & performance metrics
│   │   ├── PricingPage.tsx     # SaaS pricing tiers
│   │   ├── MetricCard.tsx      # Reusable KPI cards
│   │   ├── ScoreGauge.tsx      # Circular score visualization
│   │   └── AIInsightCard.tsx   # AI insight display
│   │
│   ├── lib/
│   │   ├── types/              # TypeScript type definitions (organized by domain)
│   │   │   ├── property.ts     # Property, PropertyType, PropertyCondition
│   │   │   ├── analysis.ts     # InvestmentAnalysis, Scores, Recommendations
│   │   │   ├── opportunity.ts  # Opportunity, OpportunityStatus
│   │   │   ├── dashboard.ts    # DashboardMetrics, AIInsight
│   │   │   ├── portfolio.ts    # PortfolioMetrics, LocationIntelligence
│   │   │   └── index.ts        # Central type exports
│   │   │
│   │   ├── constants/          # Application constants
│   │   │   └── index.ts        # Statuses, pricing tiers, config
│   │   │
│   │   ├── utils/              # Utility functions
│   │   │   ├── format.ts       # Currency, dates, numbers
│   │   │   ├── calculations.ts # ROI, yields, scores
│   │   │   ├── helpers.ts      # UI colors, labels
│   │   │   └── index.ts        # Utility exports
│   │   │
│   │   ├── mockData.ts         # ⚠️ Mock data (REPLACE WITH API)
│   │   ├── analyzerEngine.ts   # ⚠️ Mock AI analysis (REPLACE WITH AI API)
│   │   └── utils.ts            # shadcn utils (cn helper)
│   │
│   ├── services/               # Service layer (ready for implementation)
│   │   ├── config.ts           # Environment config & feature flags
│   │   ├── index.ts            # Service exports
│   │   ├── supabase/           # Supabase integration stubs
│   │   │   ├── client.ts       # Supabase client setup
│   │   │   ├── auth.service.ts # Authentication service
│   │   │   ├── opportunities.service.ts # Opportunity CRUD
│   │   │   ├── portfolio.service.ts # Portfolio management
│   │   │   ├── storage.service.ts # File storage
│   │   │   └── index.ts
│   │   └── ai/                 # AI service layer
│   │       ├── analysis.service.ts # AI property analysis
│   │       ├── document.service.ts # Document AI processing
│   │       └── index.ts
│   │
│   ├── hooks/
│   │   └── use-mobile.ts       # Responsive breakpoint detection
│   │
│   ├── styles/
│   │   └── theme.css           # Theme definitions
│   │
│   ├── App.tsx                 # Main router & navigation
│   ├── index.css               # Global styles & theme variables
│   └── main.tsx                # Entry point (DON'T MODIFY)
│
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.ts              # Vite config (DON'T MODIFY)
├── tailwind.config.js          # Tailwind config
├── tsconfig.json               # TypeScript config
│
├── PRD.md                      # Product requirements document
├── README.md                   # Project documentation
├── PRODUCTION-READY.md         # Refactoring summary
├── SECURITY.md                 # Security guidelines
└── MIGRATION_NOTES.md          # This file
```

### Navigation Flow

```
LandingPage
    ├─> Dashboard (main hub)
    │   ├─> OpportunityTracker
    │   ├─> InvestmentPipeline
    │   ├─> PortfolioAnalytics
    │   └─> DealAnalyzer → InvestmentReport
    └─> PricingPage
```

---

## 2. Main Components

### Core Features & Components

| Component | Purpose | Key Features | Data Source |
|-----------|---------|--------------|-------------|
| **LandingPage** | Marketing page | Hero, features, pricing preview, CTAs | Static content |
| **Dashboard** | Investor hub | KPIs, AI insights, opportunity summary | `mockDashboardMetrics`, `mockAIInsights` |
| **OpportunityTracker** | Deal management | Advanced filters, search, status tabs, bulk actions | `useKV('opportunities')` |
| **InvestmentPipeline** | Kanban pipeline | Drag-and-drop, 7 stages, visual workflow | `useKV('opportunities')` |
| **DealAnalyzer** | Property input | Multi-field form, validation, submission | Form state |
| **InvestmentReport** | AI analysis | Scores, recommendations, charts, insights | `generateMockAnalysis()` |
| **PortfolioAnalytics** | Performance dashboard | Charts, time ranges, composition, cash flow | Mock portfolio data |
| **PricingPage** | SaaS pricing | 5 tiers, feature comparison | `PRICING_TIERS` constant |

### Component Dependencies

```typescript
// Most components import from centralized modules:
import { formatCurrency, calculateROI } from '@/lib/utils'
import { OPPORTUNITY_STATUSES, SCORE_THRESHOLDS } from '@/lib/constants'
import type { Opportunity, InvestmentAnalysis } from '@/lib/types'
```

### State Management Patterns

```typescript
// Ephemeral UI state (doesn't persist)
const [selectedTab, setSelectedTab] = useState('performance')
const [isLoading, setIsLoading] = useState(false)

// Persistent application data (survives page refresh)
import { useKV } from '@github/spark/hooks'
const [opportunities, setOpportunities] = useKV('opportunities', [])

// ⚠️ CRITICAL: Always use functional updates with useKV
setOpportunities(current => [...current, newOpportunity]) // ✅ CORRECT
setOpportunities([...opportunities, newOpportunity])      // ❌ WRONG - causes data loss!
```

---

## 3. Mock Data Locations

### Primary Mock Data File

**Location**: `src/lib/mockData.ts`

Contains all mock data used throughout the application:

```typescript
// Mock data exports:
export const mockProperties: Property[]           // 4 sample properties
export const mockAnalyses: InvestmentAnalysis[]   // 2 detailed analyses
export const mockOpportunities: Opportunity[]     // 4 saved opportunities
export const mockDashboardMetrics: DashboardMetrics // Dashboard KPIs
export const mockAIInsights: AIInsight[]          // 6 AI-generated insights
```

### Mock Analysis Generation

**Location**: `src/lib/analyzerEngine.ts`

```typescript
export function generateMockAnalysis(property: Property): InvestmentAnalysis {
  // Generates realistic-looking AI analysis from property data
  // Uses randomization for scores, yields, recommendations
  // Currently CLIENT-SIDE - needs to be replaced with AI API call
}
```

### Service Layer Mock Fallbacks

**Location**: `src/services/`

Service classes have built-in mock data fallbacks:

```typescript
// Example: src/services/supabase/opportunities.service.ts
async getAll(filters?: OpportunityFilters): Promise<Opportunity[]> {
  const client = getSupabaseClient()
  
  if (!client) {
    return this.getMockOpportunities(filters) // ⚠️ Falls back to mock
  }
  
  // Real Supabase query would go here...
}
```

### Persistent Mock Data

Uses Spark's `useKV` hook for browser-based persistence:

```typescript
// OpportunityTracker.tsx
const [opportunities, setOpportunities] = useKV('opportunities', mockOpportunities)

// This persists data in browser storage
// After GitHub export, migrate to real database
```

---

## 4. Where Real Supabase Calls Should Replace Mock Data

### Database Schema Design

Based on the TypeScript types, create these Supabase tables:

#### Table: `properties`

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  property_type TEXT NOT NULL, -- apartment, villa, house, etc.
  asking_price DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  size_sqm DECIMAL(8, 2) NOT NULL,
  bedrooms INTEGER,
  condition TEXT, -- excellent, good, needs-renovation, new
  description TEXT,
  expected_rent DECIMAL(10, 2),
  airbnb_assumptions TEXT,
  renovation_notes TEXT,
  legal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_properties_country ON properties(country);
CREATE INDEX idx_properties_city ON properties(city);
```

#### Table: `analyses`

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Scores
  score_overall INTEGER,
  score_rental_yield INTEGER,
  score_airbnb_potential INTEGER,
  score_appreciation INTEGER,
  score_renovation INTEGER,
  score_legal INTEGER,
  score_liquidity INTEGER,
  score_energy INTEGER,
  
  -- Recommendation
  recommendation TEXT, -- buy, watch, avoid
  executive_summary TEXT,
  
  -- Financial estimates (stored as JSONB for flexibility)
  rental_yield_estimate JSONB,
  airbnb_potential JSONB,
  renovation_roi JSONB,
  appreciation_potential JSONB,
  
  -- Arrays
  risks TEXT[],
  opportunities TEXT[],
  assumptions TEXT[],
  missing_data TEXT[],
  
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_property_id ON analyses(property_id);
```

#### Table: `opportunities`

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'new-opportunity', -- new-opportunity, watching, due-diligence, negotiation, offer-made, closing, archived
  tags TEXT[],
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_is_archived ON opportunities(is_archived);
```

#### Table: `ai_insights`

```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- opportunity, market, risk, info
  priority TEXT NOT NULL, -- high, medium, low
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actionable BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_property_id ON ai_insights(property_id);
```

### Row Level Security (RLS) Policies

**CRITICAL**: Enable RLS on all tables and ensure users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Policies for properties
CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- Repeat similar policies for analyses, opportunities, ai_insights
```

### Service Layer Integration Points

Replace mock data in these service files:

#### 1. **Opportunities Service** (`src/services/supabase/opportunities.service.ts`)

```typescript
// CURRENT: Falls back to mock data
async getAll(filters?: OpportunityFilters): Promise<Opportunity[]> {
  const client = getSupabaseClient()
  if (!client) {
    return this.getMockOpportunities(filters) // ⚠️ REMOVE THIS
  }
  // Supabase query implementation exists but needs Supabase client initialized
}

// ACTION REQUIRED:
// 1. Install @supabase/supabase-js: npm install @supabase/supabase-js
// 2. Initialize Supabase client with environment variables
// 3. Remove mock fallback methods
```

#### 2. **Portfolio Service** (`src/services/supabase/portfolio.service.ts`)

```typescript
// Stub service ready for implementation
// Needs methods:
// - getPortfolioMetrics()
// - getPortfolioProperties()
// - calculatePerformance()
```

#### 3. **Auth Service** (`src/services/supabase/auth.service.ts`)

```typescript
// Stub service ready for implementation
// Needs methods:
// - signUp(), signIn(), signOut()
// - getUser(), getSession()
// - onAuthStateChange()
```

#### 4. **AI Analysis Service** (`src/services/ai/analysis.service.ts`)

```typescript
// CURRENT: Falls back to generateMockAnalysis()
async analyzeProperty(request: AIAnalysisRequest): Promise<InvestmentAnalysis> {
  if (!hasAIConfig()) {
    return this.getMockAnalysis(request.property) // ⚠️ REMOVE THIS
  }
  
  // Real AI implementation exists but needs API key
  const prompt = this.buildAnalysisPrompt(request)
  const response = await spark.llm(spark.llmPrompt`${prompt}`, ...)
}

// ACTION REQUIRED:
// 1. After GitHub export, spark.llm() won't be available
// 2. Replace with OpenAI API or Anthropic API
// 3. Set VITE_OPENAI_API_KEY environment variable
```

### Component Updates Required

#### Dashboard.tsx

```typescript
// CURRENT:
import { mockDashboardMetrics, mockAIInsights } from '@/lib/mockData'

// REPLACE WITH:
import { dashboardService } from '@/services/supabase/dashboard.service'

// Then in component:
const [metrics, setMetrics] = useState<DashboardMetrics>()
const [insights, setInsights] = useState<AIInsight[]>([])

useEffect(() => {
  async function loadData() {
    const [metricsData, insightsData] = await Promise.all([
      dashboardService.getMetrics(),
      dashboardService.getInsights()
    ])
    setMetrics(metricsData)
    setInsights(insightsData)
  }
  loadData()
}, [])
```

#### OpportunityTracker.tsx

```typescript
// CURRENT: Uses useKV (browser storage)
const [opportunities, setOpportunities] = useKV('opportunities', mockOpportunities)

// REPLACE WITH: Supabase queries
import { opportunitiesService } from '@/services/supabase/opportunities.service'

const [opportunities, setOpportunities] = useState<Opportunity[]>([])

useEffect(() => {
  async function loadOpportunities() {
    const data = await opportunitiesService.getAll(filters)
    setOpportunities(data)
  }
  loadOpportunities()
}, [filters])
```

#### DealAnalyzer.tsx

```typescript
// CURRENT: Calls generateMockAnalysis directly
import { generateMockAnalysis } from '@/lib/analyzerEngine'

const handleSubmit = (property: Property) => {
  const analysis = generateMockAnalysis(property) // ⚠️ CLIENT-SIDE ONLY
  onAnalyze(analysis)
}

// REPLACE WITH: AI service API call
import { aiService } from '@/services/ai/analysis.service'

const handleSubmit = async (property: Property) => {
  setIsAnalyzing(true)
  try {
    const analysis = await aiService.analyzeProperty({ property })
    onAnalyze(analysis)
  } catch (error) {
    toast.error('Analysis failed. Please try again.')
  } finally {
    setIsAnalyzing(false)
  }
}
```

---

## 5. Suggested Environment Variables

Create a `.env.local` file in the project root after GitHub export:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# AI Configuration (choose one)
VITE_OPENAI_API_KEY=sk-...
# OR
VITE_ANTHROPIC_API_KEY=sk-ant-...

# AI Model Configuration
VITE_AI_MODEL_NAME=gpt-4o  # or gpt-4o-mini, claude-3-5-sonnet-20241022

# Application Configuration
VITE_APP_ENV=development  # or production
VITE_API_BASE_URL=http://localhost:5173  # Your app URL

# Optional: Analytics
VITE_ANALYTICS_ID=
VITE_SENTRY_DSN=

# Optional: Payment Processing
VITE_STRIPE_PUBLIC_KEY=
```

### Environment Variable Usage

The app checks for environment variables via `src/services/config.ts`:

```typescript
export const API_CONFIG = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  ai: {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    modelName: import.meta.env.VITE_AI_MODEL_NAME || 'gpt-4o',
  },
}

// Feature flags based on config
export const hasSupabaseConfig = () => Boolean(API_CONFIG.supabase.url && API_CONFIG.supabase.anonKey)
export const hasAIConfig = () => Boolean(API_CONFIG.ai.openaiApiKey)
```

**How it works**:
- If environment variables are missing, services fall back to mock data
- Set variables to activate real backend integrations
- No code changes needed to switch between mock and real data

### Gitignore Configuration

Ensure `.env.local` is in `.gitignore`:

```bash
# Environment variables
.env.local
.env.*.local
```

---

## 6. Known Limitations

### Current Limitations

1. **No Real Backend**
   - All data is mock or stored in browser (useKV)
   - No server-side validation
   - Data not shared across devices/browsers
   - No user authentication

2. **Mock AI Analysis**
   - `generateMockAnalysis()` uses randomization, not real AI
   - Recommendations are based on simple heuristics
   - No real market data integration
   - No learning or improvement over time

3. **No Data Persistence Across Devices**
   - `useKV` stores data in browser localStorage
   - Clearing browser data = losing all opportunities
   - No sync between devices

4. **No User Management**
   - No login/signup
   - No user profiles
   - No role-based access control
   - All data visible to anyone with access to the browser

5. **No Payment Integration**
   - Pricing tiers are static UI
   - No subscription management
   - No usage tracking
   - No billing system

6. **Limited Error Handling**
   - Basic error handling in services
   - No retry logic
   - No offline support
   - No error tracking (Sentry, etc.)

7. **No Testing**
   - No unit tests
   - No integration tests
   - No E2E tests
   - No CI/CD pipeline

8. **Performance Limitations**
   - All data loaded into memory
   - No pagination
   - No virtualization for large lists
   - No lazy loading

9. **Spark SDK Dependencies**
   - Uses `spark.llm()` for AI calls (won't work after export)
   - Uses `useKV` from `@github/spark/hooks` (won't work after export)
   - Needs replacement with standard libraries

### Browser Storage Limitations

Using `useKV` (localStorage) has limits:
- **Storage limit**: ~5-10MB depending on browser
- **Not secure**: Data visible in browser DevTools
- **Not searchable**: Can't query efficiently
- **No relationships**: Can't join data
- **Single-user**: No multi-user support

**Migration path**: Replace `useKV` with Supabase database queries.

---

## 7. Recommended Next Steps After GitHub Export

### Phase 1: Environment Setup (Week 1)

#### 1.1 Clone Repository & Install Dependencies

```bash
# Clone from GitHub
git clone https://github.com/your-username/estatemind.git
cd estatemind

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 1.2 Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for database provisioning (~2 minutes)
3. Get your project URL and anon key from Settings > API
4. Create `.env.local` file with credentials

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

#### 1.3 Install Supabase Client

```bash
npm install @supabase/supabase-js
```

#### 1.4 Initialize Supabase Client

Update `src/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { API_CONFIG } from '../config'

const supabase = createClient(
  API_CONFIG.supabase.url,
  API_CONFIG.supabase.anonKey
)

export { supabase }
export const getSupabaseClient = () => supabase
```

### Phase 2: Database Setup (Week 1)

#### 2.1 Create Tables

In Supabase SQL Editor, run the SQL from section 4 above to create:
- `properties` table
- `analyses` table  
- `opportunities` table
- `ai_insights` table

#### 2.2 Enable Row Level Security

Run RLS policies from section 4 to secure tables.

#### 2.3 Set Up Authentication

Enable email authentication in Supabase:
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates

### Phase 3: Replace Spark SDK (Week 1-2)

#### 3.1 Replace `useKV` Hook

**Current (Spark SDK)**:
```typescript
import { useKV } from '@github/spark/hooks'
const [data, setData] = useKV('key', defaultValue)
```

**Option A: Create Custom Hook Using localStorage**
```typescript
// src/hooks/use-local-storage.ts
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  const deleteValue = () => {
    localStorage.removeItem(key)
    setValue(defaultValue)
  }

  return [value, setValue, deleteValue] as const
}
```

**Option B: Migrate to Supabase Directly** (Recommended)

Remove `useKV` entirely and use React state + Supabase:

```typescript
// Before
const [opportunities, setOpportunities] = useKV('opportunities', [])

// After
const [opportunities, setOpportunities] = useState<Opportunity[]>([])

useEffect(() => {
  opportunitiesService.getAll().then(setOpportunities)
}, [])
```

#### 3.2 Replace `spark.llm()` Calls

**Current (Spark SDK)**:
```typescript
const prompt = spark.llmPrompt`Analyze this property: ${data}`
const result = await spark.llm(prompt, 'gpt-4o', true)
```

**After Export - Use OpenAI SDK**:

Install OpenAI SDK:
```bash
npm install openai
```

Create AI utility:
```typescript
// src/lib/ai-client.ts
import OpenAI from 'openai'
import { API_CONFIG } from '@/services/config'

const openai = new OpenAI({
  apiKey: API_CONFIG.ai.openaiApiKey,
  dangerouslyAllowBrowser: true // Only for demo! Move to backend for production
})

export async function callLLM(prompt: string, jsonMode = false) {
  const response = await openai.chat.completions.create({
    model: API_CONFIG.ai.modelName,
    messages: [{ role: 'user', content: prompt }],
    response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
  })
  
  return response.choices[0].message.content || ''
}
```

Update `src/services/ai/analysis.service.ts`:
```typescript
// Before
const response = await spark.llm(spark.llmPrompt`${prompt}`, modelName, true)

// After
import { callLLM } from '@/lib/ai-client'
const response = await callLLM(prompt, true)
```

### Phase 4: Implement Authentication (Week 2)

#### 4.1 Create Auth Context

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/services/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

#### 4.2 Create Login/Signup Components

```typescript
// src/components/AuthPage.tsx
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isSignUp) {
        await signUp(email, password)
        toast.success('Account created! Check your email to verify.')
      } else {
        await signIn(email, password)
        toast.success('Welcome back!')
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
        <Input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Button>
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-muted-foreground"
        >
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </button>
      </form>
    </div>
  )
}
```

#### 4.3 Protect Routes in App.tsx

```typescript
// src/App.tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AuthPage } from '@/components/AuthPage'

function AppContent() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <AuthPage />
  
  // Existing app content...
  return (
    <>
      {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      {/* ... rest of app */}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
```

### Phase 5: Migrate Data Layer (Week 2-3)

#### 5.1 Update Opportunity Service

Remove mock fallbacks from `src/services/supabase/opportunities.service.ts`:

```typescript
async getAll(filters?: OpportunityFilters): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      property:properties(*),
      analysis:analyses(*)
    `)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return data
}
```

#### 5.2 Update Components to Use Service Layer

Replace direct `useKV` usage with service calls:

```typescript
// OpportunityTracker.tsx - Before
const [opportunities, setOpportunities] = useKV('opportunities', [])

// OpportunityTracker.tsx - After
const [opportunities, setOpportunities] = useState<Opportunity[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function loadOpportunities() {
    try {
      const data = await opportunitiesService.getAll(filters)
      setOpportunities(data)
    } catch (error) {
      toast.error('Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }
  loadOpportunities()
}, [filters])
```

### Phase 6: Implement Real AI Analysis (Week 3)

⚠️ **SECURITY WARNING**: Never expose API keys in client-side code for production!

#### 6.1 Option A: Backend API Route (Recommended for Production)

Create a backend API:

```typescript
// Backend (e.g., Next.js API route, Express server, Cloudflare Worker)
import OpenAI from 'openai'

export async function POST(request: Request) {
  const { property } = await request.json()
  
  // Verify user is authenticated
  const user = await authenticateUser(request)
  if (!user) return new Response('Unauthorized', { status: 401 })
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) // Server-side only!
  
  const prompt = buildAnalysisPrompt(property)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })
  
  const analysis = JSON.parse(response.choices[0].message.content)
  
  // Save to database
  await saveAnalysis(user.id, property.id, analysis)
  
  return Response.json(analysis)
}
```

Then call from frontend:
```typescript
const response = await fetch('/api/analyze-property', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ property })
})
const analysis = await response.json()
```

#### 6.2 Option B: Client-Side (Development Only)

Update `src/services/ai/analysis.service.ts` as shown in Phase 3.2.

**Important**: This exposes your API key! Only use for demos/development.

### Phase 7: Add Payments (Week 4+)

Install Stripe:
```bash
npm install @stripe/stripe-js
```

Set up Stripe in Supabase:
- Follow [Supabase + Stripe guide](https://supabase.com/docs/guides/integrations/stripe)
- Create pricing tables
- Add subscription management

### Phase 8: Testing & QA (Week 4+)

Install testing libraries:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Write tests for utilities:
```typescript
// src/lib/utils/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateROI, calculateRentalYield } from './calculations'

describe('calculateROI', () => {
  it('calculates ROI correctly', () => {
    expect(calculateROI(100000, 120000)).toBe(20)
  })
})
```

### Phase 9: Deploy (Week 5+)

#### 9.1 Deploy to Vercel/Netlify

```bash
# Build the app
npm run build

# Deploy to Vercel
npx vercel

# Or deploy to Netlify
npx netlify deploy --prod
```

#### 9.2 Set Environment Variables

In your hosting platform (Vercel/Netlify):
1. Go to project settings
2. Add environment variables from `.env.local`
3. Redeploy

#### 9.3 Configure Custom Domain

1. Add custom domain in hosting settings
2. Update Supabase allowed domains
3. Update CORS settings

---

## Additional Resources

### Documentation Links

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

### Helpful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Type checking
npx tsc --noEmit         # Check types without building

# Linting
npm run lint             # Run ESLint

# Database
npx supabase init        # Initialize Supabase locally
npx supabase start       # Start local Supabase
npx supabase db reset    # Reset local database
```

### Code Generation

Generate TypeScript types from Supabase:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/types/database.ts
```

### VS Code Extensions (Recommended)

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**
- **ESLint**
- **Error Lens**
- **Auto Rename Tag**

---

## Support & Troubleshooting

### Common Issues After Export

#### Issue: `spark` is not defined
**Cause**: Spark SDK only works in Spark environment  
**Fix**: Replace `spark.llm()` and `useKV` as described in Phase 3

#### Issue: Supabase client returns null
**Cause**: Environment variables not set  
**Fix**: Create `.env.local` with Supabase credentials

#### Issue: CORS errors when calling APIs
**Cause**: API not configured for your domain  
**Fix**: Update CORS settings in API/Supabase configuration

#### Issue: Build fails with TypeScript errors
**Cause**: Missing type definitions after removing Spark SDK  
**Fix**: Install replacement types or create custom declarations

#### Issue: Data not persisting
**Cause**: Still using `useKV` which doesn't work outside Spark  
**Fix**: Replace with Supabase or localStorage hook

### Getting Help

1. Check [Supabase Discord](https://discord.supabase.com)
2. Check [Spark Template GitHub Issues](https://github.com/yourusername/estatemind/issues)
3. Review PRD.md and README.md for architecture details
4. Search Stack Overflow for common React/TypeScript issues

---

## Summary Checklist

After GitHub export, complete these tasks in order:

### ✅ Week 1: Foundation
- [ ] Clone repository and install dependencies
- [ ] Create Supabase project and get credentials
- [ ] Create `.env.local` with environment variables
- [ ] Install `@supabase/supabase-js`
- [ ] Initialize Supabase client
- [ ] Create database tables with SQL from this guide
- [ ] Enable Row Level Security

### ✅ Week 2: Core Functionality
- [ ] Replace `useKV` with localStorage hook or Supabase
- [ ] Replace `spark.llm()` with OpenAI SDK
- [ ] Implement authentication (signup, login, logout)
- [ ] Protect routes with authentication
- [ ] Update OpportunityTracker to use Supabase
- [ ] Update Dashboard to use Supabase

### ✅ Week 3: AI & Data
- [ ] Implement real AI analysis (backend API recommended)
- [ ] Migrate all mock data to Supabase
- [ ] Remove mock data fallbacks from services
- [ ] Test create/read/update/delete operations
- [ ] Add error handling and loading states

### ✅ Week 4: Polish & Testing
- [ ] Add payment integration (Stripe)
- [ ] Write unit tests for utilities
- [ ] Write integration tests for services
- [ ] Add E2E tests for critical flows
- [ ] Set up CI/CD pipeline

### ✅ Week 5: Deploy
- [ ] Build production bundle
- [ ] Deploy to Vercel/Netlify
- [ ] Set environment variables in hosting
- [ ] Configure custom domain
- [ ] Enable analytics and monitoring

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Status**: Production-ready architecture with mock data
