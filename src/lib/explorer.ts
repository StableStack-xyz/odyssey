/**
 * Utility for generating blockchain explorer URLs (address & tx hash)
 * supports production (mainnet) and staging/sandbox (testnet).
 */

export interface GetExplorerUrlOptions {
  network?: string | null;
  address?: string | null;
  txHash?: string | null;
}

export function getExplorerUrl({ network, address, txHash }: GetExplorerUrlOptions): string | null {
  if (!network || (!address && !txHash)) {
    return null;
  }

  const envMode = (
    import.meta.env.VITE_REACT_APP_ENV_MODE ||
    import.meta.env.VITE_APP_ENV ||
    import.meta.env.MODE ||
    ''
  ).toLowerCase();

  // If explicitly prod/production -> use mainnet. Staging, sandbox, dev -> testnet.
  const isProduction = envMode === 'production' || envMode === 'prod';

  const net = network.toLowerCase().trim();

  // TRON / TRC20 / TRX
  if (net.includes('tron') || net.includes('trc20') || net.includes('trx')) {
    const domain = isProduction ? 'https://tronscan.org/#' : 'https://shasta.tronscan.org/#';
    if (address) return `${domain}/address/${address}`;
    if (txHash) return `${domain}/transaction/${txHash}`;
  }

  // BSC / BEP20
  if (net.includes('bep20') || net.includes('bsc') || net.includes('binance')) {
    const domain = isProduction ? 'https://bscscan.com' : 'https://testnet.bscscan.com';
    if (address) return `${domain}/address/${address}`;
    if (txHash) return `${domain}/tx/${txHash}`;
  }

  // Polygon / MATIC / POL
  if (net.includes('polygon') || net.includes('matic') || net.includes('pol')) {
    const domain = isProduction ? 'https://polygonscan.com' : 'https://amoy.polygonscan.com';
    if (address) return `${domain}/address/${address}`;
    if (txHash) return `${domain}/tx/${txHash}`;
  }

  // Ethereum / ERC20 / ETH
  if (net.includes('erc20') || net.includes('eth') || net.includes('ethereum')) {
    const domain = isProduction ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
    if (address) return `${domain}/address/${address}`;
    if (txHash) return `${domain}/tx/${txHash}`;
  }

  // Solana
  if (net.includes('solana') || net.includes('sol')) {
    const cluster = isProduction ? '' : '?cluster=devnet';
    if (address) return `https://solscan.io/account/${address}${cluster}`;
    if (txHash) return `https://solscan.io/tx/${txHash}${cluster}`;
  }

  // Bitcoin
  if (net.includes('bitcoin') || net.includes('btc')) {
    const domain = isProduction ? 'https://mempool.space' : 'https://mempool.space/testnet';
    if (address) return `${domain}/address/${address}`;
    if (txHash) return `${domain}/tx/${txHash}`;
  }

  // Default fallback (Ethereum)
  const defaultDomain = isProduction ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
  if (address) return `${defaultDomain}/address/${address}`;
  if (txHash) return `${defaultDomain}/tx/${txHash}`;

  return null;
}
