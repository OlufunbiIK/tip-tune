import * as StellarSdk from '@stellar/stellar-sdk';

const STELLAR_NETWORK = (import.meta.env.VITE_STELLAR_NETWORK || 'testnet') as 'testnet' | 'mainnet';
const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL;

export const getServer = () => {
  if (HORIZON_URL) {
    return new StellarSdk.Server(HORIZON_URL);
  }
  return STELLAR_NETWORK === 'testnet'
    ? StellarSdk.Server.testnet()
    : StellarSdk.Server.publicNetwork();
};

export const getNetworkPassphrase = () => {
  return STELLAR_NETWORK === 'testnet'
    ? StellarSdk.Networks.TESTNET
    : StellarSdk.Networks.PUBLIC;
};

export const isValidStellarAddress = (address: string): boolean => {
  try {
    StellarSdk.Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const formatStellarAmount = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toFixed(7);
};

export { StellarSdk };
