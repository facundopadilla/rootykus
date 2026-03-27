export const ROOTSTOCK_NETWORK_NAME = 'Rootstock Mainnet'
export const ROOTSTOCK_CHAIN_ID_HEX = '0x1e'
export const ROOTSTOCK_CHAIN_ID_DEC = 30
export const ROOTSTOCK_NATIVE_SYMBOL = 'RBTC'
export const ROOTSTOCK_RPC_URL = 'https://public-node.rsk.co'
export const ROOTSTOCK_EXPLORER_URL = 'https://explorer.rootstock.io'
export const DOC_TOKEN_ADDRESS = '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db'
export const TROPYKUS_KDOC_ADDRESS = '0x71e6b108d823c2786f8ef63a3e0589576b4f3914'
export const MOC_DOC_MINT_ADDRESS = '0x2820f6d4D199B8D8838A4B26F9917754B86a0c1F'
export const ROOTSTOCK_FAUCET_URL = 'https://faucet.rootstock.io/'

export const DOC_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const

export const TREASURY_POLICY = {
  reserveRatio: 0.35,
  sampleApy: 6.2,
}

export const MOC_DOC_MINT_ABI = [
  'function mintDoc(uint256 btcToMint) payable',
] as const

export const DOC_TOKEN_WRITE_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
] as const

export const TROPYKUS_KDOC_ABI = [
  'function mint(uint256 mintAmount) returns (uint256)',
] as const

export const TROPYKUS_KDOC_READ_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function balanceOfUnderlying(address owner) returns (uint256)',
  'function exchangeRateCurrent() returns (uint256)',
  'function exchangeRateStored() view returns (uint256)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const

// Rootstock testnet: ~26s block time
export const RSK_BLOCKS_PER_YEAR = Math.floor((86400 / 26) * 365)
export const MANTISSA = 1e18

export function supplyRateToApy(ratePerBlock: bigint): number {
  const rate = Number(ratePerBlock) / MANTISSA
  return ((1 + rate) ** RSK_BLOCKS_PER_YEAR - 1) * 100
}

export function isRootstockChain(chainId: string | null) {
  return chainId?.toLowerCase() === ROOTSTOCK_CHAIN_ID_HEX
}

export function formatUsdAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatTokenAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}
