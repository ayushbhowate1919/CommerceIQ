import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { environment } from '../src/config/env.js';
import User from '../src/models/user.model.js';

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

before(async () => {
  await connectDatabase();
  await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com', 'frontend@example.com'] } });
  server = app.listen(0);
  const address = server.address();
  if (address && typeof address === 'object') {
    baseUrl = `http://localhost:${address.port}`;
  }
});

after(async () => {
  await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com', 'frontend@example.com'] } });
  server.close();
  await mongoose.disconnect();
});

test('Milestone 2 Backend Verification Checklist', async (t) => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  await t.test('1 & 2. Server and MongoDB Health Check', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json() as { status: string; database: string };
    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.database, 'connected');
  });

  await t.test('3. Register User A', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: 'usera@example.com', password: 'Password123!' }),
    });
    const data = await res.json() as { success: boolean; data: { token: string; user: { id: string; name: string; email: string; role: string } } };
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
    assert.equal(data.data.user.email, 'usera@example.com');
    assert.equal(data.data.user.name, 'User A');
    assert.equal(data.data.user.role, 'merchant');
    userAToken = data.data.token;
    userAId = data.data.user.id;
  });

  await t.test('4. Register User B', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: 'userb@example.com', password: 'Password456!' }),
    });
    const data = await res.json() as { success: boolean; data: { token: string; user: { id: string; name: string; email: string; role: string } } };
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
    assert.equal(data.data.user.email, 'userb@example.com');
    userBToken = data.data.token;
    userBId = data.data.user.id;
  });

  await t.test('5 & 6. Verify users stored in MongoDB and passwords hashed', async () => {
    const docA = await User.findOne({ email: 'usera@example.com' });
    const docB = await User.findOne({ email: 'userb@example.com' });

    assert.ok(docA);
    assert.ok(docB);
    assert.notEqual(docA.passwordHash, 'Password123!');
    assert.notEqual(docB.passwordHash, 'Password456!');
    assert.ok(docA.passwordHash.startsWith('$2b$') || docA.passwordHash.startsWith('$2a$'));
    assert.ok(await bcrypt.compare('Password123!', docA.passwordHash));
    assert.ok(await bcrypt.compare('Password456!', docB.passwordHash));
  });

  await t.test('7. Verify duplicate email registration is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A Duplicate', email: 'USERA@example.com', password: 'Password123!' }),
    });
    const data = await res.json() as { success: boolean; error: { code: string; message: string } };
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'EMAIL_IN_USE');
  });

  await t.test('8. Login User A', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@example.com', password: 'Password123!' }),
    });
    const data = await res.json() as { success: boolean; data: { token: string; user: { id: string; email: string } } };
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
    assert.equal(data.data.user.email, 'usera@example.com');
  });

  await t.test('9. Login User B', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userb@example.com', password: 'Password456!' }),
    });
    const data = await res.json() as { success: boolean; data: { token: string; user: { id: string; email: string } } };
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
    assert.equal(data.data.user.email, 'userb@example.com');
  });

  await t.test('10. Verify JWT authentication signature and claims', async () => {
    assert.ok(environment.jwtSecret);
    const decodedA = jwt.verify(userAToken, environment.jwtSecret!) as { sub: string; role: string };
    assert.equal(decodedA.sub, userAId);
    assert.equal(decodedA.role, 'merchant');
  });

  await t.test('11. Verify GET /api/auth/me', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const data = await res.json() as { success: boolean; data: { user: { id: string; name: string; email: string } } };
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.user.id, userAId);
    assert.equal(data.data.user.name, 'User A');
    assert.equal(data.data.user.email, 'usera@example.com');
  });

  await t.test('12. Verify protected routes reject unauthenticated users', async () => {
    const resNoToken = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(resNoToken.status, 401);

    const resInvalidToken = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.equal(resInvalidToken.status, 401);
  });

  await t.test('13. Verify logout flow', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const data = await res.json() as { success: boolean; data: { message: string } };
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.message, 'Logged out successfully.');
  });

  await t.test('14. Verify User A cannot access User B protected data', async () => {
    const resA = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const dataA = await resA.json() as { data: { user: { id: string; email: string } } };

    const resB = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const dataB = await resB.json() as { data: { user: { id: string; email: string } } };

    assert.equal(dataA.data.user.id, userAId);
    assert.equal(dataA.data.user.email, 'usera@example.com');
    assert.equal(dataB.data.user.id, userBId);
    assert.equal(dataB.data.user.email, 'userb@example.com');
    assert.notEqual(dataA.data.user.id, dataB.data.user.id);
  });

  await t.test('15. Verify frontend login/register flow simulation', async () => {
    // 15a. Frontend Registration
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Frontend Merchant', email: 'frontend@example.com', password: 'Password123!' }),
    });
    const regData = await resData<AuthResult>(regRes);
    assert.equal(regRes.status, 201);
    assert.equal(regData.user.name, 'Frontend Merchant');
    const storedToken = regData.token;

    // 15b. Frontend session restoration via GET /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    });
    const meData = await resData<{ user: PublicUser }>(meRes);
    assert.equal(meRes.status, 200);
    assert.equal(meData.user.name, 'Frontend Merchant');

    // 15c. Frontend Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'frontend@example.com', password: 'Password123!' }),
    });
    const loginData = await resData<AuthResult>(loginRes);
    assert.equal(loginRes.status, 200);
    assert.equal(loginData.user.name, 'Frontend Merchant');

    // 15d. Frontend Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(logoutRes.status, 200);
  });
});

async function resData<T>(res: Response): Promise<T> {
  const json = await res.json() as { success: boolean; data: T };
  return json.data;
}
type PublicUser = { id: string; name: string; email: string; role: string; createdAt: string };
type AuthResult = { token: string; user: PublicUser };
