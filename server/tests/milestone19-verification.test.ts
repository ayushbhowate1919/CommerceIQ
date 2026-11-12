import assert from 'node:assert/strict';
import test from 'node:test';
import cors from 'cors';
import { corsOptions, getAllowedOrigins } from '../src/app.js';
import { runSeed } from '../src/seed/seed.js';

void test('Milestone 19.2 — CORS Configuration & Normalization', async (t) => {
  await t.test('getAllowedOrigins normalizes trailing slashes and whitespace', () => {
    const raw = 'https://commerceiq.vercel.app/ , http://localhost:5173/ ';
    const origins = getAllowedOrigins(raw);

    assert.ok(origins.includes('https://commerceiq.vercel.app'));
    assert.ok(origins.includes('https://commerceiq.vercel.app/'));
    assert.ok(origins.includes('http://localhost:5173'));
    assert.ok(origins.includes('http://localhost:5173/'));
    assert.strictEqual(origins.includes('https://malicious.example.com'), false);
  });

  await t.test('getAllowedOrigins defaults to localhost:5173 when unset or empty', () => {
    const origins = getAllowedOrigins('');
    assert.ok(origins.includes('http://localhost:5173'));
    assert.ok(origins.includes('http://localhost:5173/'));
  });

  await t.test('CORS allows preflight for trusted origin', () => {
    const originalClientUrl = process.env.CLIENT_URL;
    process.env.CLIENT_URL = 'https://commerceiq.vercel.app/';

    const corsMiddleware = cors(corsOptions);
    const resHeaders: Record<string, string> = {};
    let ended = false;

    const mockReq = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://commerceiq.vercel.app',
      },
    };

    const mockRes = {
      statusCode: 200,
      setHeader(k: string, v: string) {
        resHeaders[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return resHeaders[k.toLowerCase()];
      },
      end() {
        ended = true;
      },
    };

    corsMiddleware(mockReq as never, mockRes as never, () => {});

    assert.ok(ended, 'Preflight response should have ended');
    assert.strictEqual(resHeaders['access-control-allow-origin'], 'https://commerceiq.vercel.app');
    assert.strictEqual(resHeaders['access-control-allow-credentials'], 'true');

    process.env.CLIENT_URL = originalClientUrl;
  });

  await t.test('CORS rejects untrusted origin in preflight', () => {
    const originalClientUrl = process.env.CLIENT_URL;
    process.env.CLIENT_URL = 'https://commerceiq.vercel.app';

    const corsMiddleware = cors(corsOptions);
    const resHeaders: Record<string, string> = {};
    let ended = false;

    const mockReq = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://unauthorized-attacker.com',
      },
    };

    const mockRes = {
      statusCode: 200,
      setHeader(k: string, v: string) {
        resHeaders[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return resHeaders[k.toLowerCase()];
      },
      end() {
        ended = true;
      },
    };

    corsMiddleware(mockReq as never, mockRes as never, () => {});

    assert.ok(ended, 'Preflight response should have ended');
    assert.strictEqual(resHeaders['access-control-allow-origin'], undefined, 'Untrusted origin should not receive Access-Control-Allow-Origin');

    process.env.CLIENT_URL = originalClientUrl;
  });

  await t.test('CORS sets header on standard GET request for trusted origin', () => {
    const originalClientUrl = process.env.CLIENT_URL;
    process.env.CLIENT_URL = 'https://commerceiq.vercel.app';

    const corsMiddleware = cors(corsOptions);
    const resHeaders: Record<string, string> = {};
    let nextCalled = false;

    const mockReq = {
      method: 'GET',
      headers: {
        origin: 'https://commerceiq.vercel.app',
      },
    };

    const mockRes = {
      statusCode: 200,
      setHeader(k: string, v: string) {
        resHeaders[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return resHeaders[k.toLowerCase()];
      },
      end() {},
    };

    corsMiddleware(mockReq as never, mockRes as never, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled, 'Next should be called for regular request');
    assert.strictEqual(resHeaders['access-control-allow-origin'], 'https://commerceiq.vercel.app');
    assert.strictEqual(resHeaders['access-control-allow-credentials'], 'true');

    process.env.CLIENT_URL = originalClientUrl;
  });
});

void test('Milestone 19.2 — Seed Production Guardrail', async (t) => {
  await t.test('blocks seeding when NODE_ENV is production and ALLOW_PRODUCTION_SEED is unset', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PRODUCTION_SEED;

    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_PRODUCTION_SEED;

    await assert.rejects(
      async () => {
        await runSeed(false);
      },
      {
        name: 'Error',
        message: /Production seeding blocked: ALLOW_PRODUCTION_SEED=true is required/,
      },
    );

    process.env.NODE_ENV = originalEnv;
    if (originalAllow !== undefined) {
      process.env.ALLOW_PRODUCTION_SEED = originalAllow;
    }
  });

  await t.test('blocks seeding when NODE_ENV is production and ALLOW_PRODUCTION_SEED is false', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PRODUCTION_SEED;

    process.env.NODE_ENV = 'production';
    process.env.ALLOW_PRODUCTION_SEED = 'false';

    await assert.rejects(
      async () => {
        await runSeed(false);
      },
      {
        name: 'Error',
        message: /Production seeding blocked: ALLOW_PRODUCTION_SEED=true is required/,
      },
    );

    process.env.NODE_ENV = originalEnv;
    if (originalAllow !== undefined) {
      process.env.ALLOW_PRODUCTION_SEED = originalAllow;
    } else {
      delete process.env.ALLOW_PRODUCTION_SEED;
    }
  });
});
