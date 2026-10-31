import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('returns a successful API health response', () => {
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('api');
    expect(response.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
