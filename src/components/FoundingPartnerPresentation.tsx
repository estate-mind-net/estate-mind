import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, CheckCircle, House, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type SlideKind =
  | 'hero'
  | 'problem'
  | 'solution'
  | 'why-you'
  | 'revenue'
  | 'income-streams'
  | 'deal-flow'
  | 'combined'
  | 'benefits'
  | 'cta'

type SlideData = {
  id: number
  title: string
  subtitle?: string
  kind: SlideKind
}

const slides: SlideData[] = [
  {
    id: 1,
    title: 'EstateMind Founding Partner Program',
    subtitle: 'Help build the Bloomberg Terminal for Real Estate Investment Intelligence',
    kind: 'hero',
  },
  {
    id: 2,
    title: 'The Problem',
    subtitle: 'Fragmented investor workflow creates costly blind spots',
    kind: 'problem',
  },
  {
    id: 3,
    title: 'EstateMind Solution',
    subtitle: 'AI-powered investment intelligence for real estate opportunities.',
    kind: 'solution',
  },
  {
    id: 4,
    title: 'Why You',
    subtitle: 'You sit at the center of the market.',
    kind: 'why-you',
  },
  {
    id: 5,
    title: 'Recurring Subscription Revenue',
    subtitle: 'High-margin recurring revenue with predictable growth.',
    kind: 'revenue',
  },
  {
    id: 6,
    title: 'Multiple Income Streams',
    subtitle: 'Build layered revenue beyond subscriptions.',
    kind: 'income-streams',
  },
  {
    id: 7,
    title: 'Future Deal Flow Opportunity',
    subtitle: 'Platform leads can convert into agency commissions.',
    kind: 'deal-flow',
  },
  {
    id: 8,
    title: 'Combined Opportunity',
    subtitle: 'Premium upside across recurring and transactional revenue.',
    kind: 'combined',
  },
  {
    id: 9,
    title: 'Founding Partner Benefits',
    subtitle: 'Strategic advantages from joining early.',
    kind: 'benefits',
  },
  {
    id: 10,
    title: "Let's Build This Together",
    subtitle: 'Become one of the first EstateMind Founding Partners.',
    kind: 'cta',
  },
]

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-3xl text-base text-white/70 sm:text-xl">{subtitle}</p> : null}
    </div>
  )
}

function Step({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="font-semibold text-white">{label}</p>
    </div>
  )
}

function BigMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function renderSlideContent(slide: SlideData) {
  if (slide.kind === 'hero') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-medium text-cyan-200">
          <Sparkle className="h-4 w-4" weight="fill" />
          EstateMind Founding Partner Program
        </div>
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15">
          <Brain className="h-10 w-10 text-cyan-200" weight="duotone" />
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          EstateMind Founding Partner Program
        </h1>
        <p className="mx-auto mt-5 max-w-4xl text-lg text-white/70 sm:text-2xl">
          Help build the Bloomberg Terminal for Real Estate Investment Intelligence
        </p>
      </div>
    )
  }

  if (slide.kind === 'problem') {
    const today = ['Property portals', 'Real estate agents', 'WhatsApp groups', 'Viber groups', 'Excel spreadsheets', 'Gut feeling']
    const result = ['Missed opportunities', 'Inconsistent analysis', 'Poor comparisons', 'Hidden risks', 'Slower decisions']

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="mb-4 text-sm uppercase tracking-wide text-cyan-200">Today investors rely on</p>
            <ul className="space-y-2 text-lg text-white/85">
              {today.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-6">
            <p className="mb-4 text-sm uppercase tracking-wide text-amber-200">As a result</p>
            <ul className="space-y-2 text-lg text-white/85">
              {result.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (slide.kind === 'solution') {
    const cards = [
      ['ROI', '12.4%'],
      ['Rental Yield', '8.1%'],
      ['Airbnb Potential', 'High'],
      ['Legal Risk', 'Low'],
      ['Renovation Upside', 'Medium'],
    ]

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-cyan-300/20 bg-slate-900/80 p-6">
            <p className="text-xs uppercase tracking-wide text-cyan-200">AI Deal Analyzer Mockup</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/60">Investment Score</p>
                <p className="mt-2 text-4xl font-bold text-white">87/100</p>
              </div>
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/15 p-5">
                <p className="text-sm text-emerald-200">Recommendation</p>
                <p className="mt-2 text-4xl font-bold text-emerald-100">BUY</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/60">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Tagline</p>
            <p className="mt-4 text-2xl font-semibold leading-snug text-white">
              AI-powered investment intelligence for real estate opportunities.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (slide.kind === 'why-you') {
    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-8 text-center">
            <p className="text-sm uppercase tracking-wide text-cyan-200">Card 1</p>
            <p className="mt-3 text-4xl font-bold text-white">Investor</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-8 text-center">
            <p className="text-sm uppercase tracking-wide text-emerald-200">Card 2</p>
            <p className="mt-3 text-4xl font-bold text-white">Agent</p>
          </div>
        </div>
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-lg text-white/90">You understand investors, opportunities, deal flow, and local market dynamics.</p>
          <p className="mt-2 text-white/70">This makes you an ideal EstateMind Founding Partner.</p>
        </div>
      </div>
    )
  }

  if (slide.kind === 'revenue') {
    const scenarios = [
      ['Scenario A', '20 Pro Users', '20 x EUR 149', 'EUR 2,980 Monthly Revenue', '30% Share', 'EUR 894/month', 'EUR 10,728/year'],
      ['Scenario B', '50 Pro Users', '50 x EUR 149', 'EUR 7,450 Monthly Revenue', '30% Share', 'EUR 2,235/month', 'EUR 26,820/year'],
      ['Scenario C', '100 Pro Users', '100 x EUR 149', 'EUR 14,900 Monthly Revenue', '30% Share', 'EUR 4,470/month', 'EUR 53,640/year'],
      ['Scenario D', '300 Pro Users', '300 x EUR 149', 'EUR 44,700 Monthly Revenue', '30% Share', 'EUR 13,410/month', 'EUR 160,920/year'],
    ]

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-4 lg:grid-cols-2">
          {scenarios.map((s) => (
            <div key={s[0]} className="rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/15 to-emerald-400/10 p-6">
              <p className="text-sm uppercase tracking-wide text-cyan-200">{s[0]}</p>
              <p className="mt-2 text-3xl font-bold text-white">{s[1]}</p>
              <p className="mt-1 text-white/70">{s[2]}</p>
              <p className="mt-4 text-xl font-semibold text-white">{s[3]}</p>
              <p className="mt-2 text-white/80">{s[4]}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-200">{s[5]}</p>
              <p className="text-lg text-emerald-100">{s[6]}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'income-streams') {
    const streams = [
      ['Income Stream #1', 'Subscription Revenue', '100 Pro Users', 'EUR 53,640/year'],
      ['Income Stream #2', 'Agency Plans', '10 Agencies, 10 x EUR 999/month, 30% Share', 'EUR 35,964/year'],
      ['Income Stream #3', 'Premium Reports', '20 Reports/month, EUR 99 each, 30% Share', 'EUR 7,128/year'],
      ['Income Stream #4', 'Partner Referrals', 'Lawyers, Mortgage Brokers, Renovation Companies, Property Managers', 'EUR 5,000-EUR 50,000+/year'],
    ]

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-4 lg:grid-cols-2">
          {streams.map((stream) => (
            <div key={stream[0]} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-wide text-cyan-200">{stream[0]}</p>
              <p className="mt-2 text-2xl font-bold text-white">{stream[1]}</p>
              <p className="mt-2 text-white/70">{stream[2]}</p>
              <p className="mt-3 text-2xl font-semibold text-emerald-200">{stream[3]}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'deal-flow') {
    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-3 text-center sm:grid-cols-4">
            <Step label="EstateMind" />
            <Step label="Investor Lead" />
            <Step label="Property Purchase" />
            <Step label="Agency Commission" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BigMetric label="Property Value" value="EUR 150,000" />
          <BigMetric label="Agency Commission" value="3%" />
          <BigMetric label="Commission" value="EUR 4,500" />
          <BigMetric label="10 Deals / Year" value="EUR 45,000/year" />
        </div>
        <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-6 text-center">
          <p className="text-sm text-emerald-200">20 Deals Per Year</p>
          <p className="mt-2 text-5xl font-bold text-emerald-100">EUR 90,000/year</p>
        </div>
      </div>
    )
  }

  if (slide.kind === 'combined') {
    const rows = [
      ['Subscription Revenue', 'EUR 53,640'],
      ['Agency Plans', 'EUR 35,964'],
      ['Reports', 'EUR 7,128'],
      ['Deal Closings', 'EUR 45,000'],
    ]

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <table className="w-full text-left">
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} className="border-b border-white/10 last:border-0">
                  <td className="py-3 text-white/80">{row[0]}</td>
                  <td className="py-3 text-right text-xl font-semibold text-white">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-400/12 p-6 text-center">
          <p className="text-sm uppercase tracking-wide text-cyan-200">Total Potential</p>
          <p className="mt-2 text-5xl font-bold text-white">EUR 141,732/year</p>
        </div>
        <p className="mt-5 text-lg text-white/75">
          Build recurring income today while helping create a leading AI investment intelligence platform for real estate.
        </p>
      </div>
    )
  }

  if (slide.kind === 'benefits') {
    const benefits = [
      'Recurring Revenue Share',
      'Early Access',
      'Product Influence',
      'Strategic Opportunities',
      'Access to Investor Network',
      'Potential Exclusive Territory Rights',
    ]

    return (
      <div>
        <SectionTitle title={slide.title} subtitle={slide.subtitle} />
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <CheckCircle className="h-5 w-5 text-emerald-300" weight="fill" />
              <span className="text-white/90">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <SectionTitle title={slide.title} subtitle={slide.subtitle} />
      <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-8">
        <p className="text-2xl text-white/90">Help shape the future of scalable real estate investment intelligence across global markets.</p>
        <button
          type="button"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-cyan-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Schedule Partnership Discussion
        </button>
      </div>
    </div>
  )
}

function Slide({ slide }: { slide: SlideData }) {
  return (
    <section
      className="relative flex min-h-[calc(100svh-9.5rem)] items-center rounded-2xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl transition-all duration-500 sm:p-8 lg:p-12"
      aria-roledescription="slide"
      aria-label={`Slide ${slide.id}: ${slide.title}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.12),transparent_42%)]" />
      <div className="relative z-10 mx-auto w-full max-w-7xl">{renderSlideContent(slide)}</div>
    </section>
  )
}

interface FoundingPartnerPresentationProps {
  onExit: () => void
}

export function FoundingPartnerPresentation({ onExit }: FoundingPartnerPresentationProps) {
  const [index, setIndex] = useState(0)
  const active = slides[index]

  const next = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, slides.length - 1))
  }, [])

  const prev = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') prev()
      if (event.key === 'Escape') onExit()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, onExit, prev])

  const progress = useMemo(() => ((index + 1) / slides.length) * 100, [index])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(52,211,153,0.08),transparent_35%)]" />

      <div className="relative z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/15">
              <House className="h-5 w-5 text-cyan-200" weight="duotone" />
            </div>
            <div>
              <p className="font-semibold">EstateMind Founding Partner Program</p>
              <p className="text-xs text-white/60">Slide {active.id} of {slides.length}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-sm text-white/70 sm:flex">
            <span>Left/Right arrows</span>
            <span className="text-white/40">•</span>
            <span>Click sides to navigate</span>
          </div>

          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/15" onClick={onExit}>
            Exit
          </Button>
        </div>
        <div className="h-1 w-full bg-white/10">
          <div className="h-full bg-cyan-300 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="relative z-10 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={prev}
              className="absolute bottom-0 left-0 top-0 z-20 w-10 cursor-w-resize opacity-0"
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={next}
              className="absolute bottom-0 right-0 top-0 z-20 w-10 cursor-e-resize opacity-0"
            />
            <Slide slide={active} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {slides.map((slide, dotIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Go to slide ${slide.id}`}
                  className={[
                    'h-2.5 rounded-full transition-all',
                    dotIndex === index ? 'w-8 bg-cyan-300' : 'w-2.5 bg-white/30 hover:bg-white/50',
                  ].join(' ')}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={next}
                disabled={index === slides.length - 1}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-300/40 bg-cyan-300/15 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
