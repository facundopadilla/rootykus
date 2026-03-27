import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROOTSTOCK_NETWORK_NAME, TREASURY_POLICY, TROPYKUS_KDOC_ADDRESS } from '../lib/rootstock'

interface PitchSlide {
  id: string
  title: string
  kicker: string
  bullets: string[]
  note?: string
  metrics?: Array<{ label: string; value: string }>
}

const slides: PitchSlide[] = [
  {
    id: 'cover',
    kicker: 'DOCFlow',
    title: 'Treasury deployment for teams holding DOC on Rootstock',
    bullets: [
      'For founders and CFOs with idle DOC sitting in a wallet.',
      'Simulate reserve policy, estimate yield, then execute the move on-chain.',
      `Built to work directly in the browser on ${ROOTSTOCK_NETWORK_NAME}.`,
    ],
    metrics: [
      { label: 'Reserve policy', value: `${Math.round(TREASURY_POLICY.reserveRatio * 100)}%` },
      { label: 'Deployable capital', value: `${Math.round((1 - TREASURY_POLICY.reserveRatio) * 100)}%` },
      { label: 'Reference APY', value: `${TREASURY_POLICY.sampleApy}%` },
    ],
  },
  {
    id: 'problem',
    kicker: 'Problem',
    title: 'Stable treasury usually has no workflow, only balance checking',
    bullets: [
      'Teams keep DOC idle because operations and DeFi decisions live in separate tools.',
      'There is no clear split between operating runway and deployable capital.',
      'That means treasury policy stays in a spreadsheet and execution never happens.',
    ],
  },
  {
    id: 'solution',
    kicker: 'Solution',
    title: 'DOCFlow turns treasury policy into an executable flow',
    bullets: [
      'Connect wallet and read real DOC balance.',
      'Simulate reserve, horizon, and projected return with live APY context.',
      'Execute approve + deposit into Tropykus without backend custody.',
    ],
  },
  {
    id: 'proof',
    kicker: 'Proof',
    title: 'This is not a mock dashboard pretending to be fintech',
    bullets: [
      'Browser connects directly to the wallet and chain.',
      'Balance, allowance, kDOC position, exchange rate, and APY are read on-chain.',
      'The product story is treasury management, not speculation theater.',
    ],
    metrics: [
      { label: 'Execution model', value: 'Client only' },
      { label: 'Custody', value: 'None' },
      { label: 'Protocol', value: 'Tropykus kDOC' },
    ],
  },
  {
    id: 'flow',
    kicker: 'Flow',
    title: 'Three screens, one narrative',
    bullets: [
      'Landing explains the treasury use case in business language.',
      'Dashboard simulates allocation and shareable projections.',
      'Execution tab completes the on-chain deposit flow and position tracking.',
    ],
  },
  {
    id: 'why-now',
    kicker: 'Why it matters',
    title: 'Rootstock gets a treasury tool instead of another generic wallet surface',
    bullets: [
      'DOC already solves the stable asset side for Bitcoin-native users.',
      'Tropykus already solves yield infrastructure.',
      'DOCFlow solves the missing decision layer between treasury policy and protocol execution.',
    ],
    note: `kDOC market address: ${TROPYKUS_KDOC_ADDRESS}`,
  },
  {
    id: 'cta',
    kicker: 'Demo',
    title: 'The pitch ends where the product starts',
    bullets: [
      'Open the dashboard, connect the wallet, and show real DOC evidence.',
      'Run a simulation, explain the reserve policy, then trigger the on-chain flow.',
      'If the deposit is not executed live, the product still demonstrates the treasury logic clearly.',
    ],
  },
]

export function Pitch() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeIndex = useMemo(() => {
    const raw = Number(searchParams.get('slide') ?? '1')
    if (Number.isNaN(raw)) return 0
    return Math.min(slides.length - 1, Math.max(0, raw - 1))
  }, [searchParams])

  const activeSlide = slides[activeIndex]

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        setSearchParams({ slide: String(Math.min(slides.length, activeIndex + 2)) }, { replace: true })
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        setSearchParams({ slide: String(Math.max(1, activeIndex)) }, { replace: true })
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [activeIndex, setSearchParams])

  function goToSlide(nextIndex: number) {
    setSearchParams({ slide: String(nextIndex + 1) }, { replace: true })
  }

  return (
    <div className="pitch-page">
      <header className="pitch-topbar">
        <Link to="/" className="logo">DOCFlow</Link>
        <div className="pitch-topbar-actions">
          <span className="pitch-counter">{activeIndex + 1} / {slides.length}</span>
          <Link to="/invertir" className="btn">Abrir producto</Link>
        </div>
      </header>

      <main className="pitch-main">
        <aside className="pitch-sidebar" aria-label="Índice de diapositivas">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`pitch-index-item ${index === activeIndex ? 'pitch-index-item--active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              <span className="pitch-index-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="pitch-index-title">{slide.kicker}</span>
            </button>
          ))}
        </aside>

        <section className="pitch-slide" aria-live="polite">
          <div className="pitch-slide-head">
            <p className="pitch-kicker">{activeSlide.kicker}</p>
            <h1 className="pitch-title">{activeSlide.title}</h1>
          </div>

          <div className="pitch-slide-body">
            <div className="pitch-bullets">
              {activeSlide.bullets.map((bullet) => (
                <p key={bullet} className="pitch-bullet">{bullet}</p>
              ))}
            </div>

            {activeSlide.metrics && (
              <div className="pitch-metrics">
                {activeSlide.metrics.map((metric) => (
                  <div key={metric.label} className="pitch-metric">
                    <span className="pitch-metric-label">{metric.label}</span>
                    <strong className="pitch-metric-value">{metric.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {activeSlide.note && <p className="pitch-note">{activeSlide.note}</p>}
          </div>

          <footer className="pitch-controls">
            <button
              type="button"
              className="btn"
              onClick={() => goToSlide(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => goToSlide(Math.min(slides.length - 1, activeIndex + 1))}
              disabled={activeIndex === slides.length - 1}
            >
              Siguiente →
            </button>
          </footer>
        </section>
      </main>
    </div>
  )
}
