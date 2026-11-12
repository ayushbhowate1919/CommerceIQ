import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import cors from 'cors';
import mongoose from 'mongoose';
import app, { corsOptions, getAllowedOrigins } from '../src/app.js';
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

void test('Milestone 19 — Liveness and Readiness Health Checks', async (t) => {
  const originalReadyState = mongoose.connection.readyState;

  const dispatchGet = (url: string): Promise<{ status: number; body: Record<string, unknown> }> => {
    return new Promise((resolve) => {
      const req = new EventEmitter();
      Object.assign(req, {
        method: 'GET',
        url,
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        connection: {},
      });

      const res = new EventEmitter();
      let body = '';
      Object.assign(res, {
        statusCode: 200,
        setHeader() {},
        getHeader() {},
        removeHeader() {},
        end(chunk?: Buffer | string) {
          if (chunk) {
            body += chunk.toString();
          }
          resolve({
            status: (res as unknown as { statusCode: number }).statusCode,
            body: body ? (JSON.parse(body) as Record<string, unknown>) : {},
          });
        },
      });

      app.handle(req as never, res as never);
    });
  };

  await t.test('GET /api/health returns HTTP 200 liveness response', async () => {
    const res = await dispatchGet('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  await t.test('GET /api/ready returns HTTP 200 when MongoDB is connected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true, writable: true });
    const res = await dispatchGet('/api/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.database, 'connected');
  });

  await t.test('GET /api/ready returns HTTP 503 when MongoDB is disconnected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });
    const res = await dispatchGet('/api/ready');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.status, 'degraded');
    assert.strictEqual(res.body.database, 'disconnected');
  });

  await t.test('GET /api/ready returns HTTP 503 when MongoDB is connecting or disconnecting', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 2, configurable: true, writable: true });
    const resConnecting = await dispatchGet('/api/ready');
    assert.strictEqual(resConnecting.status, 503);
    assert.strictEqual(resConnecting.body.status, 'degraded');
    assert.strictEqual(resConnecting.body.database, 'disconnected');

    Object.defineProperty(mongoose.connection, 'readyState', { value: 3, configurable: true, writable: true });
    const resDisconnecting = await dispatchGet('/api/ready');
    assert.strictEqual(resDisconnecting.status, 503);
    assert.strictEqual(resDisconnecting.body.status, 'degraded');
    assert.strictEqual(resDisconnecting.body.database, 'disconnected');

    // Restore original readyState
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true, writable: true });
  });
});

