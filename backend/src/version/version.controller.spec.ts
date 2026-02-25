import { VersionController } from './version.controller';

describe('VersionController', () => {
  it('returns API version metadata', () => {
    process.env.API_VERSION = 'v1';
    const controller = new VersionController();
    expect(controller.getVersion()).toEqual({
      current: 'v1',
      supported: ['v1'],
      deprecated: [],
    });
  });
});
