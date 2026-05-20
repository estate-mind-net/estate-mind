# Planning Guide

EstateMind is an AI-powered real estate investment intelligence platform that helps investors analyze opportunities, estimate ROI, evaluate risk, and make data-driven investment decisions with institutional-grade insights.

**Experience Qualities**: 
1. **Premium** - The platform should feel like high-end fintech software worth millions, with polished interfaces and refined interactions that communicate trustworthiness and sophistication.
2. **Intelligent** - Every feature should emphasize AI-driven insights, automated analysis, and smart recommendations that make investors feel they have an unfair advantage.
3. **Data-driven** - Visual emphasis on metrics, charts, scores, and quantitative analysis that help investors make objective decisions based on hard data rather than intuition.

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a multi-featured investment intelligence platform with distinct sections (landing page, dashboard, deal analyzer, reports, opportunity tracker, comparison tools, pricing) requiring sophisticated state management, data visualization, and interconnected workflows across different views.

## Essential Features

### 1. Premium Landing Page
- **Functionality**: Marketing page that communicates platform value proposition and drives user engagement
- **Purpose**: Convert visitors into users by clearly communicating how EstateMind helps investors make smarter property investment decisions with AI
- **Trigger**: User visits the application root URL
- **Progression**: Hero section → AI capabilities overview → Feature explanations → Pricing preview → Testimonials → CTA
- **Success criteria**: Clear value proposition, compelling CTAs, professional fintech aesthetic that positions platform as institutional-grade

### 2. AI Deal Analyzer
- **Functionality**: Comprehensive form for submitting property investment opportunities for AI analysis
- **Purpose**: Capture detailed property data to generate intelligent investment reports and recommendations
- **Trigger**: User clicks "Analyze a Property" CTA or navigates to analyzer
- **Progression**: Form display → User enters property details → Submit → AI processing simulation → Investment report generated
- **Success criteria**: Intuitive multi-field form, smooth submission flow, convincing AI processing experience

### 3. AI Investment Report
- **Functionality**: Detailed AI-generated investment analysis with scores, recommendations, and risk/opportunity assessment
- **Purpose**: Provide investors with comprehensive data-driven insights to inform investment decisions
- **Trigger**: Completion of deal analyzer form submission
- **Progression**: Report loading → Investment score reveal → Executive summary → Detailed metrics → Risk/opportunity analysis → Action recommendations
- **Success criteria**: Professional report layout, clear scoring visualization, actionable insights, premium card-based design

### 4. Investor Dashboard
- **Functionality**: Central command center showing portfolio overview, saved opportunities, and key investment metrics
- **Purpose**: Give investors a comprehensive view of their investment pipeline and performance at a glance
- **Trigger**: User logs in or navigates to dashboard
- **Progression**: Dashboard load → KPI cards display → Charts render → Opportunity list → AI insights → Watchlist overview
- **Success criteria**: Information-dense but readable layout, key metrics immediately visible, Bloomberg Terminal aesthetic

### 5. Opportunity Tracker
- **Functionality**: Saved property pipeline with status management, filtering, and organization
- **Purpose**: Help investors organize and track multiple investment opportunities through different stages
- **Trigger**: User navigates to opportunities section or saves a property from analyzer
- **Progression**: Opportunity list display → Filter/sort → Status update → Add notes → Tag management → Opportunity detail view
- **Success criteria**: Clean table/card layout, intuitive status workflow, easy filtering and organization

### 6. Property Comparison
- **Functionality**: Side-by-side comparison of multiple investment opportunities across key metrics
- **Purpose**: Enable investors to objectively evaluate multiple properties against each other
- **Trigger**: User selects multiple properties to compare from opportunity tracker
- **Progression**: Property selection → Comparison table display → Metric-by-metric analysis → Score visualization → Winner determination
- **Success criteria**: Clear visual comparison, all key metrics aligned, easy to identify best opportunity

### 7. Pricing Page
- **Functionality**: SaaS pricing tiers with feature comparison
- **Purpose**: Convert free users to paid subscribers by clearly communicating value at each tier
- **Trigger**: User navigates to pricing from landing page or dashboard
- **Progression**: Pricing tiers display → Feature comparison → Tier selection → CTA to upgrade
- **Success criteria**: Clear tier differentiation, value-focused messaging, premium positioning

### 8. Portfolio Analytics Dashboard
- **Functionality**: Comprehensive portfolio performance analytics with interactive charts and metrics
- **Purpose**: Provide investors with deep insights into portfolio performance, trends, and composition
- **Trigger**: User clicks "Portfolio Analytics" button from dashboard
- **Progression**: Analytics load → Time range selection → Tab navigation (Performance/Cash Flow/Composition/Yields) → Chart interaction → Metric exploration
- **Success criteria**: Clear data visualization, Bloomberg Terminal aesthetic, actionable insights, interactive time range filtering, multiple chart types for comprehensive analysis

### 9. Navigation System
- **Functionality**: Global navigation between all platform sections
- **Purpose**: Enable seamless movement throughout the application
- **Trigger**: User clicks navigation elements
- **Progression**: Navigation open → Section selection → View transition → Content load
- **Success criteria**: Always accessible, clear section labels, smooth transitions

## Edge Case Handling

- **Empty States**: Display elegant empty state designs with clear CTAs when user has no saved opportunities, no analyses, or no data
- **Form Validation**: Real-time validation with helpful error messages for required fields and format requirements in deal analyzer
- **Missing Data**: Investment reports acknowledge missing data points and explain impact on analysis confidence
- **Loading States**: Premium skeleton loaders and progress indicators during AI processing simulations
- **Responsive Behavior**: Graceful degradation of complex layouts on mobile devices while maintaining functionality
- **International Input**: Support for multiple currencies, number formats, and property types across different countries

## Design Direction

The design should evoke the feeling of using institutional-grade investment software - trustworthy, data-rich, powerful, and premium. The aesthetic should combine the analytical depth of Bloomberg Terminal with the modern polish of Linear and Stripe. Every interaction should feel intelligent and purposeful, reinforcing that this is AI-powered decision-making software, not a simple property listing portal.

## Color Selection

A sophisticated dark-mode-first color scheme that communicates financial technology professionalism with subtle accent colors for data visualization and status indicators.

- **Primary Color**: Deep indigo `oklch(0.35 0.15 270)` - Represents intelligence, trust, and premium positioning; used for primary CTAs and key interactive elements
- **Secondary Colors**: Rich slate backgrounds `oklch(0.18 0.02 260)` for cards and surfaces, creating depth and hierarchy
- **Accent Color**: Vibrant cyan `oklch(0.75 0.15 195)` - Represents AI intelligence and technology; used for highlights, scores, and data visualization accents
- **Success/Investment Green**: `oklch(0.65 0.18 145)` for positive ROI, good scores, and "buy" recommendations
- **Warning/Caution Amber**: `oklch(0.75 0.15 75)` for "watch" recommendations and moderate risk indicators
- **Destructive/Risk Red**: `oklch(0.60 0.22 25)` for "avoid" recommendations and high risk warnings

**Foreground/Background Pairings**:
- Background Dark `oklch(0.12 0.02 260)`: White text `oklch(0.98 0 0)` - Ratio 17.2:1 ✓
- Primary Indigo `oklch(0.35 0.15 270)`: White text `oklch(0.98 0 0)` - Ratio 8.9:1 ✓
- Accent Cyan `oklch(0.75 0.15 195)`: Dark text `oklch(0.15 0.02 260)` - Ratio 10.5:1 ✓
- Card Surface `oklch(0.18 0.02 260)`: White text `oklch(0.98 0 0)` - Ratio 13.8:1 ✓

## Font Selection

Typography should convey modern professionalism and financial precision with excellent readability for dense data displays.

- **Primary Font**: Inter - Modern, precise, optimized for UI and data display with excellent readability at all sizes
- **Accent Font**: Space Grotesk - Used sparingly for hero headings and feature titles to add distinctive character while maintaining technical credibility

**Typographic Hierarchy**:
- H1 (Hero Title): Space Grotesk Bold / 56px / -0.02em letter spacing / 1.1 line height
- H2 (Section Titles): Space Grotesk Bold / 36px / -0.01em letter spacing / 1.2 line height
- H3 (Card Titles): Inter Semibold / 20px / -0.01em letter spacing / 1.4 line height
- Body (Main Content): Inter Regular / 16px / normal letter spacing / 1.6 line height
- Small (Captions/Labels): Inter Medium / 13px / 0.01em letter spacing / 1.5 line height
- Data Display (Metrics): Inter Bold / varies / tabular-nums for alignment

## Animations

Animations should feel purposeful and premium, emphasizing the intelligence and sophistication of the platform. Use subtle motion to guide attention and provide feedback without feeling gimmicky.

**Animation Strategy**:
- **Page Transitions**: Smooth fade + subtle upward slide (300ms ease-out) when navigating between sections
- **Score Reveals**: Animated circular progress indicators that count up to final score (800ms ease-out)
- **Card Interactions**: Gentle lift on hover with soft shadow increase (200ms ease)
- **Form Feedback**: Success checkmarks animate in with spring physics; errors shake subtly
- **Data Loading**: Skeleton loaders pulse gently; charts animate in from zero state
- **AI Processing**: Pulsing gradient effect on analyzer to communicate AI thinking
- **Micro-interactions**: Button presses have subtle scale feedback (100ms)

## Component Selection

**Components**:
- **Dashboard Cards**: Use shadcn Card with custom gradient borders and backdrop blur for glassmorphic depth
- **Navigation**: Sidebar component for app navigation with collapsible sections and active state indicators
- **Forms**: Shadcn Form components with Input, Select, Textarea; custom styling for premium feel
- **Data Display**: Table component for opportunity tracker; custom metric cards for KPIs
- **Dialogs**: Dialog component for property comparison and detailed views
- **Charts**: Recharts for investment performance visualization with custom theming
- **Buttons**: Button component with variants (default, primary, ghost) and icon support
- **Badges**: Badge component for status indicators, scores, and tags
- **Tabs**: Tabs component for switching between analysis sections in reports
- **Progress**: Progress component styled as circular gauges for investment scores
- **Tooltip**: Tooltip component for metric explanations and help text
- **Scroll Area**: For contained scrolling in sidebar and long reports

**Customizations**:
- Custom gradient borders on hero cards using CSS conic gradients
- Custom score gauge components combining Progress with animated SVG overlays
- Custom metric cards with animated counting numbers on mount
- Premium glassmorphic effects using backdrop-filter blur on elevated cards
- Custom comparison table with color-coded cells highlighting winners

**States**:
- Buttons: Subtle scale on press, glow effect on primary variant hover
- Inputs: Cyan accent ring on focus, smooth border color transition
- Cards: Lift + shadow increase on hover, subtle border glow for active items
- Investment scores: Color shifts from red→amber→green based on score value
- Opportunity status: Distinct badge colors per status with dot indicators

**Icon Selection**:
- Phosphor icons throughout for consistency: TrendUp/Down for performance, ChartLine for analytics, Brain for AI features, Target for investment scores, Buildings for properties, Wallet for pricing
- Use duotone weight for feature highlights, regular weight for UI elements

**Spacing**:
- Base unit: 4px (0.25rem)
- Card padding: 24px (1.5rem)
- Section spacing: 64px (4rem) on desktop, 40px (2.5rem) on mobile
- Grid gaps: 16px (1rem) for compact layouts, 24px (1.5rem) for spacious layouts
- Consistent 32px (2rem) max-width container padding

**Mobile**:
- Sidebar collapses to bottom navigation on mobile
- Dashboard cards stack vertically with full width
- Comparison table becomes scrollable cards on mobile
- Hero text scales down: H1 to 36px, reduced padding throughout
- Forms maintain single column with optimized input sizes for touch
- Charts resize fluidly, some complex visualizations simplify to key metrics
