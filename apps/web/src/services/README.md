# EstateMind Services Layer

This directory contains the complete service layer architecture for integrating with **Supabase** (backend/database) and **AI APIs** (GPT-4/OpenAI).

## 📁 Architecture

```
services/
├── config.ts                    # Environment configuration
├── supabase/                    # Supabase integration services
│   ├── client.ts                # Supabase client initialization
│   ├── opportunities.service.ts  # Opportunity CRUD operations
│   ├── portfolio.service.ts     # Portfolio management
│   ├── auth.service.ts          # Authentication
│   ├── storage.service.ts       # File storage
│   └── index.ts                 # Barrel export
├── ai/                          # AI service integration
│   ├── analysis.service.ts      # Property analysis AI
│   ├── document.service.ts      # Document analysis AI
│   └── index.ts                 # Barrel export
└── index.ts                     # Main barrel export
```

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Supabase Configuration (for production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Configuration (for production AI features)
VITE_OPENAI_API_KEY=sk-your-openai-key
VITE_AI_MODEL_NAME=gpt-4o  # or gpt-4o-mini

# API Configuration (optional)
VITE_API_BASE_URL=https://your-api.com
```

**Note:** Without these environment variables, the services will automatically use mock data.

### 2. Install Supabase Client (When Ready for Production)

```bash
npm install @supabase/supabase-js
```

Then initialize the client in your app:

```typescript
import { createClient } from '@supabase/supabase-js'
import { initSupabase } from '@/services'

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

initSupabase(supabase)
```

---

## 📚 Service Layer Usage

## Supabase Services

### Opportunities Service

Manage investment opportunities with full CRUD operations.

```typescript
import { opportunitiesService } from '@/services'

// Get all opportunities (with optional filters)
const opportunities = await opportunitiesService.getAll({
  status: ['new', 'watching'],
  country: ['Portugal', 'Spain'],
  minScore: 70,
  maxScore: 95,
  search: 'downtown'
})

// Get single opportunity
const opportunity = await opportunitiesService.getById('opp-123')

// Create new opportunity
const newOpp = await opportunitiesService.create({
  property: propertyData,
  analysis: analysisData,
  status: 'new',
  tags: ['high-potential', 'downtown'],
  notes: 'Great location, needs renovation',
  savedAt: new Date().toISOString()
})

// Update opportunity
await opportunitiesService.update('opp-123', {
  status: 'due-diligence',
  notes: 'Inspection scheduled for next week'
})

// Bulk update multiple opportunities
await opportunitiesService.bulkUpdate(
  ['opp-1', 'opp-2', 'opp-3'],
  { tags: ['archived'] }
)

// Delete opportunity
await opportunitiesService.delete('opp-123')
```

### Portfolio Service

Manage portfolio properties and metrics.

```typescript
import { portfolioService } from '@/services'

// Get portfolio metrics (overview)
const metrics = await portfolioService.getMetrics()
console.log(metrics.totalValue, metrics.averageYield)

// Get all portfolio properties
const properties = await portfolioService.getProperties()

// Add property to portfolio
await portfolioService.addProperty({
  title: 'Downtown Apartment',
  acquisitionPrice: 250000,
  currentValue: 280000,
  monthlyIncome: 1800,
  expenses: 400,
  acquisitionDate: '2023-01-15'
})

// Update property
await portfolioService.updateProperty('prop-123', {
  currentValue: 290000,
  monthlyIncome: 1900
})

// Remove property
await portfolioService.removeProperty('prop-123')
```

### Authentication Service

Handle user authentication.

```typescript
import { authService } from '@/services'

// Sign up
const { user, error } = await authService.signUp({
  email: 'investor@example.com',
  password: 'secure-password',
  name: 'Jane Investor'
})

// Sign in
const { user, error } = await authService.signIn({
  email: 'investor@example.com',
  password: 'secure-password'
})

// Sign out
await authService.signOut()

// Get current user
const currentUser = await authService.getCurrentUser()

// Listen to auth state changes
const { unsubscribe } = authService.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session)
})
```

### Storage Service

Upload and manage files.

```typescript
import { storageService } from '@/services'

// Upload document
const { data, error } = await storageService.uploadDocument(
  file,
  'documents' // or 'images' or 'reports'
)

if (data) {
  console.log('File uploaded:', data.publicUrl)
}

// Download document
const { data: blob } = await storageService.downloadDocument('path/to/file.pdf')

// Delete document
await storageService.deleteDocument('path/to/file.pdf')

// Get public URL
const publicUrl = storageService.getPublicUrl('path/to/file.pdf')
```

---

## AI Services

### AI Analysis Service

Generate AI-powered property investment analysis.

```typescript
import { aiService } from '@/services'

// Analyze property
const analysis = await aiService.analyzeProperty({
  property: {
    type: 'apartment',
    country: 'Portugal',
    city: 'Lisbon',
    district: 'Chiado',
    price: 350000,
    currency: 'EUR',
    size: 85,
    bedrooms: 2,
    condition: 'renovated'
  },
  context: {
    // Optional additional context
    marketData: {...},
    comparableProperties: [...],
    userPreferences: {...}
  }
})

console.log(analysis.investmentScore)
console.log(analysis.recommendation) // 'buy' | 'watch' | 'avoid'

// Generate AI insights
const insights = await aiService.generateInsights({
  analysisId: 'analysis-123',
  focusArea: 'risks' // or 'opportunities', 'renovation', 'location', 'financials'
})

insights.forEach(insight => {
  console.log(insight.title)
  console.log(insight.description)
  console.log(insight.suggestedActions)
})

// Score location
const locationScore = await aiService.scoreLocation(
  'Portugal',
  'Lisbon',
  'Chiado'
)

console.log(locationScore.overall)         // 78
console.log(locationScore.appreciation)    // 82
console.log(locationScore.rentalDemand)    // 75
console.log(locationScore.summary)         // AI-generated summary

// Generate market summary
const summary = await aiService.generateMarketSummary(
  'Portugal',
  'apartment'
)
console.log(summary)
```

### Document AI Service

AI-powered document analysis.

```typescript
import { documentAIService } from '@/services'

// Analyze document
const result = await documentAIService.analyzeDocument(
  'title',  // or 'permit', 'contract', 'appraisal', 'inspection'
  documentText
)

console.log(result.summary)
console.log(result.detectedRisks)
console.log(result.missingItems)
console.log(result.recommendations)
console.log(result.confidence)

// Extract property details from document
const details = await documentAIService.extractPropertyDetails(documentText)
console.log(details.address, details.price, details.size)

// Generate due diligence checklist
const checklist = await documentAIService.generateDueDiligenceChecklist(
  'apartment',
  'Portugal'
)

checklist.items.forEach(item => {
  console.log(`[${item.priority}] ${item.category}: ${item.task}`)
  console.log(item.description)
})
```

---

## 🔄 Mock Mode vs Production Mode

### Mock Mode (Default)

When environment variables are not configured, all services automatically fall back to mock data:

- ✅ Perfect for development and prototyping
- ✅ No external dependencies required
- ✅ Realistic data for testing UI/UX
- ✅ Fast and reliable

### Production Mode

When environment variables are set, services use real backends:

```typescript
// Check configuration status
import { hasSupabaseConfig, hasAIConfig } from '@/services'

if (hasSupabaseConfig()) {
  console.log('Supabase is configured')
}

if (hasAIConfig()) {
  console.log('AI services are configured')
}
```

---

## 🗄️ Supabase Schema (Future Implementation)

When you're ready to deploy to production, create these tables in Supabase:

### `opportunities` table

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
```

### `portfolio_properties` table

```sql
create table portfolio_properties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  acquisition_price decimal not null,
  current_value decimal not null,
  monthly_income decimal default 0,
  expenses decimal default 0,
  acquisition_date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### `portfolio_metrics` table

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
```

---

## 🎯 Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  const opportunities = await opportunitiesService.getAll()
  if (opportunities.length === 0) {
    console.log('No opportunities found')
  }
} catch (error) {
  console.error('Failed to fetch opportunities:', error)
  // Show user-friendly error message
}
```

### 2. Loading States

Show loading indicators while fetching data:

```typescript
const [loading, setLoading] = useState(false)
const [opportunities, setOpportunities] = useState([])

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await opportunitiesService.getAll()
      setOpportunities(data)
    } finally {
      setLoading(false)
    }
  }
  
  fetchData()
}, [])
```

### 3. Optimistic Updates

Update UI immediately for better UX:

```typescript
const handleArchive = async (id: string) => {
  // Update UI optimistically
  setOpportunities(opps => 
    opps.map(o => o.id === id ? { ...o, isArchived: true } : o)
  )
  
  try {
    await opportunitiesService.update(id, { isArchived: true })
  } catch (error) {
    // Rollback on error
    setOpportunities(opps => 
      opps.map(o => o.id === id ? { ...o, isArchived: false } : o)
    )
    toast.error('Failed to archive opportunity')
  }
}
```

---

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [EstateMind PRD](../PRD.md)
- [Production Readiness Guide](../PRODUCTION-READY.md)

---

## 🤝 Contributing

When extending the service layer:

1. **Maintain mock fallbacks** - Always provide mock data for offline development
2. **Follow existing patterns** - Use the same error handling and response structures
3. **Type safety** - Ensure all responses are properly typed
4. **Documentation** - Update this README with new services

---

**Note:** This service layer is production-ready and designed for seamless migration from prototype to live application. All services gracefully degrade to mock mode when backends are unavailable.
