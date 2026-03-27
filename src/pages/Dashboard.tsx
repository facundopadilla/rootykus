import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBeexoWallet } from '../hooks/use-beexo-wallet'
import { useAllocation } from '../hooks/use-allocation'
import { useKDocPosition } from '../hooks/use-kdoc-position'
import {
  ROOTSTOCK_EXPLORER_URL,
  TREASURY_POLICY,
  formatTokenAmount,
  formatUsdAmount,
  shortenAddress,
} from '../lib/rootstock'

type Tab = 'simular' | 'constituir' | 'posicion'

// ── Compartir simulación ───────────────────────────────────────────────────

function buildShareUrl(params: { monto: string; meses: string; reserva: string; apy: string }) {
  const url = new URL(window.location.href)
  url.pathname = '/invertir'
  url.searchParams.set('tab', 'simular')
  url.searchParams.set('monto', params.monto)
  url.searchParams.set('meses', params.meses)
  url.searchParams.set('reserva', params.reserva)
  url.searchParams.set('apy', params.apy)
  return url.toString()
}

// ── Calculadora de proyección ──────────────────────────────────────────────

interface TabSimularProps {
  liveApy: number | null
}

function TabSimular({ liveApy }: TabSimularProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const defaultApy = liveApy !== null ? String(liveApy.toFixed(2)) : String(TREASURY_POLICY.sampleApy)

  const [monto, setMonto] = useState(searchParams.get('monto') ?? '')
  const [meses, setMeses] = useState(searchParams.get('meses') ?? '12')
  const [reservaRatio, setReservaRatio] = useState(searchParams.get('reserva') ?? String(TREASURY_POLICY.reserveRatio * 100))
  const [apy, setApy] = useState(searchParams.get('apy') ?? '')
  const [copied, setCopied] = useState(false)

  const effectiveApy = apy || defaultApy

  const montoNum = parseFloat(monto) || 0
  const mesesNum = Math.max(1, parseInt(meses) || 12)
  const reservaNum = Math.min(99, Math.max(0, parseFloat(reservaRatio) || 35)) / 100
  const apyNum = Math.max(0, parseFloat(effectiveApy) || 0)

  const reserva = montoNum * reservaNum
  const deployable = montoNum - reserva
  const yieldMensual = (deployable * apyNum) / 100 / 12
  const yieldTotal = yieldMensual * mesesNum
  const totalFinal = montoNum + yieldTotal

  const rows = Array.from({ length: Math.min(mesesNum, 24) }, (_, i) => {
    const mes = i + 1
    const acumulado = yieldMensual * mes
    return { mes, acumulado, total: montoNum + acumulado }
  })

  function handleShare() {
    const url = buildShareUrl({ monto, meses, reserva: reservaRatio, apy: effectiveApy })
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    // También actualiza la URL actual sin recargar
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'simular')
    params.set('monto', monto)
    params.set('meses', meses)
    params.set('reserva', reservaRatio)
    params.set('apy', effectiveApy)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="tab-body">
      <div className="sim-grid">
        {/* Inputs */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Parámetros</span>
            {liveApy !== null && (
              <span className="badge badge--ok">APY Live: {liveApy.toFixed(2)}%</span>
            )}
          </div>
          <div className="panel-body">
            <div className="sim-fields">
              <div className="field">
                <label className="field-label">Monto en DOC</label>
                <input
                  className="amount-input"
                  type="number"
                  min="0"
                  step="500"
                  placeholder="ej. 10000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Horizonte (meses)</label>
                <input
                  className="amount-input"
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={meses}
                  onChange={(e) => setMeses(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Reserva operativa (%)</label>
                <input
                  className="amount-input"
                  type="number"
                  min="0"
                  max="99"
                  step="5"
                  value={reservaRatio}
                  onChange={(e) => setReservaRatio(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">
                  APY estimado (%)
                  {liveApy !== null && (
                    <button
                      className="apy-reset-btn"
                      onClick={() => setApy(liveApy.toFixed(2))}
                      title="Usar APY real on-chain"
                    >
                      Usar Live
                    </button>
                  )}
                </label>
                <input
                  className="amount-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={effectiveApy}
                  onChange={(e) => setApy(e.target.value)}
                />
              </div>
            </div>

            {montoNum > 0 && (
              <button
                className="btn btn--share"
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                onClick={handleShare}
              >
                {copied ? '✓ Link copiado' : '↗ Compartir simulación'}
              </button>
            )}

            <p className="footnote">
              Simulación sin conexión a la blockchain. Los valores son estimativos y no constituyen asesoramiento financiero.
              {liveApy !== null && ` APY on-chain actual: ${liveApy.toFixed(2)}%.`}
            </p>
          </div>
        </div>

        {/* Resultados */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Proyección</span>
          </div>
          <div className="panel-body">
            {montoNum <= 0 ? (
              <p className="sim-empty">Ingresá un monto para ver la proyección.</p>
            ) : (
              <>
                <div className="alloc-split" style={{ marginBottom: '20px' }}>
                  <div className="alloc-split-row">
                    <span>Monto total</span>
                    <strong>{formatUsdAmount(montoNum)}</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Reserva operativa ({Math.round(reservaNum * 100)}%)</span>
                    <strong>{formatUsdAmount(reserva)}</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Disponible para Tropykus</span>
                    <strong className="highlight">{formatUsdAmount(deployable)}</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Yield mensual estimado</span>
                    <strong className="highlight">{formatUsdAmount(yieldMensual)}</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Yield acumulado a {mesesNum} {mesesNum === 1 ? 'mes' : 'meses'}</span>
                    <strong className="highlight">{formatUsdAmount(yieldTotal)}</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Total final proyectado</span>
                    <strong style={{ fontSize: '15px' }}>{formatUsdAmount(totalFinal)}</strong>
                  </div>
                </div>

                {rows.length > 1 && (
                  <>
                    <p className="sim-table-title">Evolución mes a mes</p>
                    <div className="sim-table-wrap">
                      <table className="sim-table">
                        <thead>
                          <tr>
                            <th>Mes</th>
                            <th>Yield acumulado</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.mes}>
                              <td>{r.mes}</td>
                              <td style={{ color: 'var(--accent)' }}>{formatUsdAmount(r.acumulado)}</td>
                              <td>{formatUsdAmount(r.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {mesesNum > 24 && (
                      <p className="footnote">Mostrando los primeros 24 meses de {mesesNum}.</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Posición ───────────────────────────────────────────────────────────

interface TabPosicionProps {
  wallet: ReturnType<typeof useBeexoWallet>['wallet']
  flags: ReturnType<typeof useBeexoWallet>['flags']
  connect: ReturnType<typeof useBeexoWallet>['connect']
  switchToRootstock: ReturnType<typeof useBeexoWallet>['switchToRootstock']
  liveApy: number | null
  kDocBalance: number | null
  underlyingDoc: number | null
  exchangeRate: number | null
  isLoadingPosition: boolean
  refetchPosition: () => Promise<void>
}

function TabPosicion({
  wallet,
  flags,
  connect,
  switchToRootstock,
  liveApy,
  kDocBalance,
  underlyingDoc,
  exchangeRate,
  isLoadingPosition,
  refetchPosition,
}: TabPosicionProps) {
  const [isRefetching, setIsRefetching] = useState(false)

  async function handleRefetch() {
    setIsRefetching(true)
    await refetchPosition()
    setIsRefetching(false)
  }

  if (!flags.isConnected) {
    return (
      <div className="tab-body">
        <div className="connect-state">
          <p>Conectá Beexo para ver tu posición en Tropykus.</p>
          <button
            className="btn btn--accent"
            onClick={() => void connect()}
            disabled={wallet.isConnecting}
          >
            {wallet.isConnecting ? 'Conectando...' : 'Conectar Beexo'}
          </button>
        </div>
      </div>
    )
  }

  if (!flags.isOnRootstock) {
    return (
      <div className="tab-body">
        <div className="wrong-net">
          <p>Estás en una red que no es Rootstock Testnet.</p>
          <button
            className="btn btn--accent"
            onClick={() => void switchToRootstock()}
            disabled={wallet.isSwitching}
          >
            {wallet.isSwitching ? 'Cambiando...' : 'Cambiar a Rootstock Testnet'}
          </button>
        </div>
      </div>
    )
  }

  const hasPosition = kDocBalance !== null && kDocBalance > 0
  const loading = isLoadingPosition

  return (
    <div className="tab-body">
      <div className="content-grid">
        {/* Panel principal: posición kDOC */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Posición en Tropykus — kDOC</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {liveApy !== null && (
                <span className="badge badge--ok">APY {liveApy.toFixed(2)}%</span>
              )}
            </div>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="pos-loading">
                <span className="skeleton" style={{ height: '16px', width: '180px', display: 'block', marginBottom: '12px' }} />
                <span className="skeleton" style={{ height: '48px', width: '240px', display: 'block', marginBottom: '8px' }} />
                <span className="skeleton" style={{ height: '14px', width: '120px', display: 'block' }} />
              </div>
            ) : !hasPosition ? (
              <div className="pos-empty">
                <p className="pos-empty-title">Sin posición activa</p>
                <p className="pos-empty-desc">
                  Todavía no tenés DOC depositado en el mercado kDOC de Tropykus.
                  Usá la pestaña <strong>Constituir</strong> para iniciar una posición.
                </p>
              </div>
            ) : (
              <>
                <div className="pos-hero">
                  <p className="pos-hero-label">DOC en Tropykus (valor actual)</p>
                  <p className="pos-hero-value">{formatUsdAmount(underlyingDoc ?? 0)}</p>
                  <p className="pos-hero-sub">acumulando intereses continuamente</p>
                </div>

                <div className="alloc-split" style={{ marginTop: '24px' }}>
                  <div className="alloc-split-row">
                    <span>Balance kDOC</span>
                    <strong className="mono-val">{formatTokenAmount(kDocBalance ?? 0)} kDOC</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>Equivalente en DOC</span>
                    <strong className="highlight">{formatUsdAmount(underlyingDoc ?? 0)}</strong>
                  </div>
                  {exchangeRate !== null && (
                    <div className="alloc-split-row">
                      <span>Exchange rate</span>
                      <strong>{exchangeRate.toFixed(6)} DOC/kDOC</strong>
                    </div>
                  )}
                  {liveApy !== null && (
                    <div className="alloc-split-row">
                      <span>APY actual on-chain</span>
                      <strong className="highlight">{liveApy.toFixed(2)}%</strong>
                    </div>
                  )}
                </div>

                <p className="footnote" style={{ marginTop: '16px' }}>
                  El saldo en DOC crece automáticamente a medida que se acumulan intereses. Retirá cuando quieras desde Tropykus.
                </p>
              </>
            )}

            <button
              className="btn"
              style={{ marginTop: '20px' }}
              onClick={() => void handleRefetch()}
              disabled={isRefetching || loading}
            >
              {isRefetching ? 'Actualizando...' : 'Actualizar posición'}
            </button>
          </div>
        </div>

        {/* Panel derecho: protocolo info */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Sobre el mercado kDOC</span>
          </div>
          <div className="panel-body">
            <div className="info-rows">
              <div className="info-row">
                <span className="info-row-label">Protocolo</span>
                <span className="info-row-value">Tropykus</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Token de posición</span>
                <span className="info-row-value mono">kDOC</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Contrato kDOC</span>
                <span className="info-row-value mono" style={{ fontSize: '10px' }}>
                  0x71e6b1...f3914
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label">APY on-chain</span>
                <span className="info-row-value" style={{ color: liveApy !== null ? 'var(--ok)' : 'var(--text-faint)' }}>
                  {liveApy !== null ? `${liveApy.toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Red</span>
                <span className="info-row-value">Rootstock Testnet</span>
              </div>
            </div>

            <div className="info-callout" style={{ marginTop: '20px' }}>
              <p>
                kDOC es un token de interés compuesto. El saldo crece con el tiempo — no necesitás hacer nada para cobrar el yield.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Flujo real de constitución ─────────────────────────────────────────────

interface TabConstituirProps {
  wallet: ReturnType<typeof useBeexoWallet>['wallet']
  flags: ReturnType<typeof useBeexoWallet>['flags']
  connect: ReturnType<typeof useBeexoWallet>['connect']
  switchToRootstock: ReturnType<typeof useBeexoWallet>['switchToRootstock']
  refresh: ReturnType<typeof useBeexoWallet>['refresh']
  disconnect: ReturnType<typeof useBeexoWallet>['disconnect']
  liveApy: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externalProvider?: any
}

function TabConstituir({ wallet, flags, connect, switchToRootstock, refresh, disconnect, liveApy, externalProvider }: TabConstituirProps) {
  const { allocation, allocate, reset } = useAllocation(externalProvider)
  const walletName = 'Beexo'
  const [inputAmount, setInputAmount] = useState('')

  const parsedAmount = parseFloat(inputAmount)
  const isValidAmount =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    wallet.deployableAmount !== null &&
    parsedAmount <= wallet.deployableAmount

  const hasTreasuryData = wallet.docBalance !== null
  const isFlowActive = allocation.step !== 'idle'
  const explorerBase = ROOTSTOCK_EXPLORER_URL + '/tx/'

  // Sin wallet
  if (!flags.isConnected) {
    return (
      <div className="tab-body">
        <div className="connect-state">
          <p>Conectá {walletName} para constituir una posición real en Tropykus.</p>
          <button
            className="btn btn--accent"
            onClick={() => void connect()}
            disabled={wallet.isConnecting}
          >
            {wallet.isConnecting ? 'Conectando...' : `Conectar ${walletName}`}
          </button>
        </div>
      </div>
    )
  }

  // Red incorrecta
  if (!flags.isOnRootstock) {
    return (
      <div className="tab-body">
        <div className="wrong-net">
          <p>Estás en una red que no es Rootstock Testnet.</p>
          <button
            className="btn btn--accent"
            onClick={() => void switchToRootstock()}
            disabled={wallet.isSwitching}
          >
            {wallet.isSwitching ? 'Cambiando...' : 'Cambiar a Rootstock Testnet'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-body">
      <div className="content-grid">
        {/* Panel principal: flujo */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Flujo de depósito — Tropykus</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {liveApy !== null && <span className="badge badge--ok">APY {liveApy.toFixed(2)}%</span>}
            </div>
          </div>
          <div className="panel-body">
            {hasTreasuryData && wallet.docBalance === 0 ? (
              <div className="pos-empty">
                <p className="pos-empty-title">Sin DOC en tu wallet</p>
                <p className="pos-empty-desc">
                  Tu balance de DOC es $0. Para constituir una posición necesitás DOC en Rootstock Mainnet.
                  Podés adquirirlo en Money on Chain o en un exchange que opere con DOC.
                </p>
                <a
                  href="https://moneyonchain.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--accent"
                  style={{ marginTop: '16px', display: 'inline-flex' }}
                >
                  Ir a Money on Chain ↗
                </a>
              </div>
            ) : !isFlowActive ? (
              <>
                <p className="alloc-desc">
                  Depositá DOC en el mercado kDOC de Tropykus para generar yield.
                  Reservamos el {Math.round(TREASURY_POLICY.reserveRatio * 100)}% como liquidez operativa.
                </p>

                <div className="alloc-split">
                  <div className="alloc-split-row">
                    <span>Disponible para deployer</span>
                    <strong>{hasTreasuryData ? formatUsdAmount(wallet.deployableAmount ?? 0) : '--'} DOC</strong>
                  </div>
                  <div className="alloc-split-row">
                    <span>
                      Proyección mensual al {liveApy !== null ? liveApy.toFixed(2) : TREASURY_POLICY.sampleApy}% APY
                    </span>
                    <strong className="highlight">{hasTreasuryData ? formatUsdAmount(wallet.monthlyProjection ?? 0) : '--'}</strong>
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '16px' }}>
                  <input
                    className="amount-input"
                    type="number"
                    min="1"
                    step="100"
                    placeholder="Monto en DOC (ej. 5000)"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    disabled={!hasTreasuryData}
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={!hasTreasuryData}
                    onClick={() => setInputAmount(String(Math.floor(wallet.deployableAmount ?? 0)))}
                  >
                    Máx
                  </button>
                </div>

                {inputAmount && !isValidAmount && (
                  <p className="error-msg">
                    El monto debe estar entre 1 y {formatTokenAmount(wallet.deployableAmount ?? 0)} DOC.
                  </p>
                )}

                <button
                  className="btn btn--accent btn--full"
                  style={{ marginTop: '12px' }}
                  disabled={!isValidAmount}
                  onClick={() => void allocate(parsedAmount)}
                >
                  {isValidAmount
                    ? `Aprobar y depositar ${formatUsdAmount(parsedAmount)}`
                    : 'Aprobar y depositar en Tropykus'}
                </button>

                <p className="footnote">
                  Dos transacciones: primero ERC-20 approve al mercado kDOC, luego mint en Tropykus.
                </p>
              </>
            ) : (
              <div className="flow-steps">
                <div className={`flow-step ${allocation.step === 'approving' ? 'flow-step--active' : allocation.approveTxHash ? 'flow-step--done' : ''}`}>
                  <div className="step-num">
                    {allocation.approveTxHash ? '✓' : allocation.step === 'approving' ? '…' : '1'}
                  </div>
                  <div className="step-body">
                    <p className="step-label">ERC-20 Approve</p>
                    <p className="step-desc">
                      {allocation.step === 'approving'
                        ? `Esperando firma en ${walletName}...`
                        : allocation.approveTxHash
                          ? <a href={explorerBase + allocation.approveTxHash} target="_blank" rel="noreferrer">{allocation.approveTxHash.slice(0, 22)}...</a>
                          : 'Pendiente'}
                    </p>
                  </div>
                </div>

                <div className={`flow-step ${allocation.step === 'depositing' ? 'flow-step--active' : allocation.depositTxHash ? 'flow-step--done' : ''}`}>
                  <div className="step-num">
                    {allocation.depositTxHash ? '✓' : allocation.step === 'depositing' ? '…' : '2'}
                  </div>
                  <div className="step-body">
                    <p className="step-label">Depósito en Tropykus (mint kDOC)</p>
                    <p className="step-desc">
                      {allocation.step === 'depositing'
                        ? `Esperando firma en ${walletName}...`
                        : allocation.depositTxHash
                          ? <a href={explorerBase + allocation.depositTxHash} target="_blank" rel="noreferrer">{allocation.depositTxHash.slice(0, 22)}...</a>
                          : 'Pendiente'}
                    </p>
                  </div>
                </div>

                {allocation.step === 'done' && (
                  <div className="flow-success">
                    <p className="success-title">Posición constituida</p>
                    <p className="footnote">
                      Tu DOC está generando yield en el mercado kDOC de Tropykus.
                    </p>
                    <button className="btn" onClick={() => { reset(); setInputAmount('') }}>
                      Nueva operación
                    </button>
                  </div>
                )}

                {allocation.step === 'error' && (
                  <>
                    <p className="error-msg" style={{ marginTop: '12px' }}>{allocation.error}</p>
                    <button className="btn" style={{ marginTop: '8px' }} onClick={() => { reset(); setInputAmount('') }}>
                      Intentar de nuevo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: info wallet */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Wallet</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {hasTreasuryData && <span className="badge badge--ok">Live</span>}
            </div>
          </div>
          <div className="panel-body">
            <div className="info-rows">
              <div className="info-row">
                <span className="info-row-label">Cuenta</span>
                <span className="info-row-value mono">
                  {wallet.account ? shortenAddress(wallet.account) : '--'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Red</span>
                <span className="info-row-value">Rootstock Mainnet</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Balance DOC</span>
                <span className="info-row-value">
                  {hasTreasuryData ? formatUsdAmount(wallet.docBalance ?? 0) : '--'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Allowance kDOC</span>
                <span className="info-row-value mono">
                  {wallet.allowanceToTropykus !== null
                    ? `${formatTokenAmount(wallet.allowanceToTropykus)} DOC`
                    : '--'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Modo</span>
                <span className="info-row-value">Balance real</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => void refresh()}
                disabled={wallet.isRefreshing}
              >
                {wallet.isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button className="btn btn--danger" onClick={disconnect}>
                Desconectar
              </button>
            </div>

            {wallet.error && (
              <p className="error-msg" style={{ marginTop: '12px' }}>{wallet.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────────────────

function DashboardContent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'simular'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const { wallet, flags, connect, switchToRootstock, refresh, disconnect, xoProvider } = useBeexoWallet()

  const { position, refetch: refetchPosition } = useKDocPosition(wallet.account, flags.isOnRootstock)

  const hasTreasuryData = wallet.docBalance !== null
  const liveApy = position.liveApy

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">DOCFlow</Link>
          <div className={`network-pill ${flags.isConnected && flags.isOnRootstock ? 'connected' : ''}`}>
            <span className="dot" />
            Rootstock Testnet
          </div>
          <nav className="dash-tabs">
            {(['simular', 'constituir', 'posicion'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`dash-tab ${activeTab === tab ? 'dash-tab--active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab === 'simular' ? 'Simular' : tab === 'constituir' ? 'Constituir' : 'Posición'}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-right">
          <span className="badge badge--beexo">Beexo</span>
          {flags.isConnected && wallet.account && (
            <span className="wallet-address">{shortenAddress(wallet.account)}</span>
          )}
          {!flags.isConnected ? (
            <button
              className="btn btn--accent"
              onClick={() => void connect()}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? 'Conectando...' : 'Conectar Beexo'}
            </button>
          ) : !flags.isOnRootstock ? (
            <button
              className="btn btn--accent"
              onClick={() => void switchToRootstock()}
              disabled={wallet.isSwitching}
            >
              {wallet.isSwitching ? 'Cambiando...' : 'Cambiar a Rootstock'}
            </button>
          ) : (
            <>
              <button
                className="btn"
                onClick={() => void refresh()}
                disabled={wallet.isRefreshing}
              >
                {wallet.isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button className="btn btn--danger" onClick={disconnect}>
                Desconectar
              </button>
            </>
          )}
        </div>
      </header>

      {/* KPI row — solo cuando hay datos */}
      {flags.isConnected && flags.isOnRootstock && (
        <div className="kpi-strip">
          <div className="kpi-strip-inner">
            <div className="kpi-row">
              <div className="kpi">
                <span className="kpi-label">DOC Total</span>
                {hasTreasuryData
                  ? <span className="kpi-value">{formatUsdAmount(wallet.docBalance ?? 0)}</span>
                  : <span className="skeleton skeleton-kpi-value" />}
                <span className="kpi-sub">Balance en wallet</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">Reserva Operativa</span>
                {hasTreasuryData
                  ? <span className="kpi-value kpi-value--muted">{formatUsdAmount(wallet.reserveAmount ?? 0)}</span>
                  : <span className="skeleton skeleton-kpi-value" />}
                <span className="kpi-sub">{Math.round(TREASURY_POLICY.reserveRatio * 100)}% del total</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">En Tropykus (kDOC)</span>
                {position.isLoading
                  ? <span className="skeleton skeleton-kpi-value" />
                  : <span className="kpi-value kpi-value--accent">
                    {position.underlyingDoc !== null && position.underlyingDoc > 0
                      ? formatUsdAmount(position.underlyingDoc)
                      : '—'}
                  </span>}
                <span className="kpi-sub">
                  {position.underlyingDoc !== null && position.underlyingDoc > 0
                    ? `${formatTokenAmount(position.kDocBalance ?? 0)} kDOC`
                    : 'Sin posición activa'}
                </span>
              </div>
              <div className="kpi">
                <span className="kpi-label">APY on-chain</span>
                {position.isLoading
                  ? <span className="skeleton skeleton-kpi-value" />
                  : <span className="kpi-value kpi-value--accent">
                    {liveApy !== null ? `${liveApy.toFixed(2)}%` : '—'}
                  </span>}
                <span className="kpi-sub">Tropykus kDOC · live</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs content */}
      <main className="main">
        {activeTab === 'simular' && <TabSimular liveApy={liveApy} />}
        {activeTab === 'constituir' && (
          <TabConstituir
            wallet={wallet}
            flags={flags}
            connect={connect}
            switchToRootstock={switchToRootstock}
            refresh={refresh}
            disconnect={disconnect}
            liveApy={liveApy}
            externalProvider={xoProvider}
          />
        )}
        {activeTab === 'posicion' && (
          <TabPosicion
            wallet={wallet}
            flags={flags}
            connect={connect}
            switchToRootstock={switchToRootstock}
            liveApy={liveApy}
            kDocBalance={position.kDocBalance}
            underlyingDoc={position.underlyingDoc}
            exchangeRate={position.exchangeRate}
            isLoadingPosition={position.isLoading}
            refetchPosition={refetchPosition}
          />
        )}
      </main>
    </div>
  )
}

export function Dashboard() {
  return <DashboardContent />
}
