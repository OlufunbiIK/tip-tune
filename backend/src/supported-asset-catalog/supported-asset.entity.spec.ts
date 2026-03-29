import { AssetScope, SupportedAsset } from './supported-asset.entity';

describe('SupportedAsset entity helpers', () => {
  function make(code: string, issuer: string | null): SupportedAsset {
    const a = new SupportedAsset();
    a.code = code;
    a.issuer = issuer;
    a.name = 'Test';
    a.decimals = 7;
    a.scope = AssetScope.GLOBAL;
    a.artistId = null;
    a.isEnabled = true;
    return a;
  }

  describe('isNative', () => {
    it('is true for XLM with null issuer', () => {
      expect(make('XLM', null).isNative).toBe(true);
    });

    it('is false for XLM with an issuer (edge case)', () => {
      expect(make('XLM', 'GISSUER').isNative).toBe(false);
    });

    it('is false for USDC', () => {
      expect(make('USDC', 'GISSUER').isNative).toBe(false);
    });
  });

  describe('catalogKey', () => {
    it('returns "XLM:native" for native', () => {
      expect(make('XLM', null).catalogKey).toBe('XLM:native');
    });

    it('returns "CODE:ISSUER" for credit assets', () => {
      const issuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
      expect(make('USDC', issuer).catalogKey).toBe(`USDC:${issuer}`);
    });
  });
});
