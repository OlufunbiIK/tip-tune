/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_STELLAR_NETWORK: 'testnet' | 'mainnet';
  readonly VITE_STELLAR_HORIZON_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
