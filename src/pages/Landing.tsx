import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="logo">DOCFlow</span>
        <nav className="landing-nav">
          <Link to="/pitch" className="btn">Pitch</Link>
          <Link to="/invertir" className="btn btn--accent">Invertir</Link>
        </nav>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="l-hero">
          <div className="l-hero-eyebrow">
            <span className="l-tag">Rootstock Testnet</span>
            <span className="l-tag">DOC · Tropykus</span>
          </div>
          <h1 className="l-hero-title">
            Tu tesorería en DOC<br />no debería estar parada.
          </h1>
          <p className="l-hero-sub">
            DOCFlow es una herramienta para founders y CFOs de startups que mantienen
            su caja en DOC sobre Rootstock. Simulá rendimientos, definí tu política de
            reserva y constituí posiciones de yield en Tropykus — todo desde el browser.
          </p>
          <div className="l-hero-actions">
            <Link to="/pitch" className="btn btn--lg">
              Ver pitch
            </Link>
            <Link to="/invertir" className="btn btn--accent btn--lg">
              Ir al dashboard
            </Link>
            <a
              href="https://tropykus.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn--lg"
            >
              Qué es Tropykus ↗
            </a>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="l-section">
          <h2 className="l-section-title">Cómo funciona</h2>
          <div className="l-steps">
            <div className="l-step">
              <span className="l-step-num">01</span>
              <div>
                <p className="l-step-label">Conectás tu wallet</p>
                <p className="l-step-desc">
                  Abrís DOCFlow desde el navegador interno de <strong>Beexo</strong> y conectás tu cuenta Rootstock. La app lee tu balance DOC directo del contrato token — sin servidores, sin custodia.
                </p>
              </div>
            </div>
            <div className="l-step">
              <span className="l-step-num">02</span>
              <div>
                <p className="l-step-label">Simulás la estrategia</p>
                <p className="l-step-desc">
                  Ingresás el monto que querés deployer y el horizonte temporal. La calculadora te muestra la proyección de yield al {' '}
                  <strong>6.2% APY</strong> con la reserva operativa ya separada.
                </p>
              </div>
            </div>
            <div className="l-step">
              <span className="l-step-num">03</span>
              <div>
                <p className="l-step-label">Constituís la posición</p>
                <p className="l-step-desc">
                  Con un click ejecutás el flujo real: ERC-20 approve al mercado kDOC de Tropykus, seguido del depósito. Dos firmas en Beexo, confirmadas on-chain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Protocolo */}
        <section className="l-section">
          <h2 className="l-section-title">El stack</h2>
          <div className="l-cards">
            <div className="l-card">
              <p className="l-card-label">Activo estable</p>
              <p className="l-card-value">DOC</p>
              <p className="l-card-desc">
                Dollar On Chain — stablecoin nativa de Money on Chain, colateralizada en Bitcoin sobre Rootstock.
              </p>
            </div>
            <div className="l-card">
              <p className="l-card-label">Protocolo de yield</p>
              <p className="l-card-value">Tropykus</p>
              <p className="l-card-desc">
                Mercado de dinero descentralizado en Rootstock. Depositás DOC, recibís kDOC que acumula intereses continuamente.
              </p>
            </div>
            <div className="l-card">
              <p className="l-card-label">Red</p>
              <p className="l-card-value">Rootstock</p>
              <p className="l-card-desc">
                EVM-compatible, anclada a Bitcoin por merge mining. Smart contracts con la seguridad de la red Bitcoin.
              </p>
            </div>
            <div className="l-card">
              <p className="l-card-label">Wallets</p>
              <p className="l-card-value">Beexo</p>
              <p className="l-card-desc">
                Wallet de XO Labs con browser interno y soporte nativo para Rootstock. El flujo principal de DOCFlow está pensado para abrirse desde Beexo.
              </p>
            </div>
            <div className="l-card">
              <p className="l-card-label">Política de reserva</p>
              <p className="l-card-value">35 / 65</p>
              <p className="l-card-desc">
                35% queda líquido para gastos operativos. El 65% restante se despliega a yield. Configurable según tu runway.
              </p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="l-cta">
          <p className="l-cta-text">
            Está en testnet. Podés probar el flujo completo sin riesgo.
          </p>
          <Link to="/invertir" className="btn btn--accent btn--lg">
            Abrir dashboard →
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>DOCFlow · Rootstock Testnet · Hackathon 2026</span>
      </footer>
    </div>
  )
}
