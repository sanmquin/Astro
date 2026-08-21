import crypto from 'node:crypto';
import { connectToDatabase } from './utils/mongodb';

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
  } catch {
    return false;
  }
}

function sanitizeUser(user: Record<string, unknown> | null) {
  if (!user) return user;
  const sanitized = { ...user };
  const hasPassword = Boolean(sanitized.passwordHash);
  delete sanitized.passwordHash;
  delete sanitized.salt;
  return {
    ...sanitized,
    hasPassword,
  };
}

export const handler = async (event: { httpMethod: string; body: string; queryStringParameters: Record<string, string> | null }) => {
  const { db } = await connectToDatabase();
  const collection = db.collection('users');

  const { username } = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (username) {
      const user = await collection.findOne({ username });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(sanitizeUser(user)),
      };
    } else {
      const allUsers = await collection.find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(allUsers.map(sanitizeUser)),
      };
    }
  }

  if (event.httpMethod === 'POST') {
    const userData = JSON.parse(event.body || '{}');

    if (userData.action === 'login') {
      const { username: reqUsername, password: reqPassword } = userData;
      if (!reqUsername) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Username is required' }) };
      }

      const user = await collection.findOne({ username: reqUsername });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'El usuario no existe. Por favor, contacta al administrador para crear tu cuenta.' }),
        };
      }

      // First-time login: user does not have a password set yet
      if (!user.passwordHash) {
        if (!reqPassword) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              requiresPassword: true,
              hasPassword: false,
              firstTime: true,
              username: reqUsername,
            }),
          };
        }

        // Set initial password
        const { hash, salt } = hashPassword(reqPassword);
        await collection.updateOne(
          { username: reqUsername },
          { $set: { passwordHash: hash, salt, updatedAt: new Date() } }
        );

        const updatedUser = await collection.findOne({ username: reqUsername });
        return {
          statusCode: 200,
          body: JSON.stringify(sanitizeUser(updatedUser)),
        };
      }

      // Existing password set
      if (!reqPassword) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            requiresPassword: true,
            hasPassword: true,
            firstTime: false,
            username: reqUsername,
          }),
        };
      }

      // Verify existing password
      const isValid = verifyPassword(reqPassword, user.passwordHash, user.salt);
      if (!isValid) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Contraseña incorrecta. Por favor, intenta de nuevo.' }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(sanitizeUser(user)),
      };
    }

    if (userData.action === 'reset-password') {
      const { username: reqUsername } = userData;
      if (!reqUsername) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Username is required' }) };
      }

      const user = await collection.findOne({ username: reqUsername });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Usuario no encontrado' }),
        };
      }

      await collection.updateOne(
        { username: reqUsername },
        { $set: { passwordHash: null, salt: null, updatedAt: new Date() } }
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Contraseña restablecida correctamente' }),
      };
    }

    if (userData.action === 'logout') {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (
      !userData.username ||
      !userData.sunSign ||
      !userData.moonSign ||
      !userData.venusSign ||
      !userData.casaCuatroSign ||
      !userData.descendenteSign ||
      !userData.nodoLunarSign
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const allowedLessons = userData.allowedLessons && Array.isArray(userData.allowedLessons) && userData.allowedLessons.length > 0
      ? userData.allowedLessons
      : ['Intro'];

    const updatePayload = {
      ...userData,
      allowedLessons,
      updatedAt: new Date()
    };
    delete updatePayload.action;
    delete updatePayload.password;

    await collection.updateOne(
      { username: userData.username },
      { $set: updatePayload },
      { upsert: true }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
