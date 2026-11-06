import { afterEach, describe, expect, it } from 'vitest';
import { appUrl, PRODUCTION_APP_URL } from '@/lib/appUrl';

const original = process.env.APP_URL;

afterEach(() => {
  if (original === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = original;
});

describe('appUrl', () => {
  it('defaults to the production domain', () => {
    delete process.env.APP_URL;
    expect(appUrl()).toBe(PRODUCTION_APP_URL);
  });

  it('uses APP_URL without a trailing slash', () => {
    process.env.APP_URL = 'http://localhost:3000/';
    expect(appUrl()).toBe('http://localhost:3000');
  });

  it('ignores a blank APP_URL', () => {
    process.env.APP_URL = '  ';
    expect(appUrl()).toBe(PRODUCTION_APP_URL);
  });
});
