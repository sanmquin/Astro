import { connectToDatabase } from './utils/mongodb';

export const handler = async (event: { httpMethod: string; body: string; queryStringParameters: Record<string, string> | null }) => {
  const { db } = await connectToDatabase();
  const collection = db.collection('users');

  const { username, sessionId } = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (username) {
      const user = await collection.findOne({ username });
      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      if (sessionId && user.activeSessionId && user.activeSessionId !== sessionId) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'El usuario ya tiene una sesión activa en otro dispositivo. Por favor, cierra sesión en el otro dispositivo primero.' }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(user),
      };
    } else {
      const allUsers = await collection.find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(allUsers),
      };
    }
  }

  if (event.httpMethod === 'POST') {
    const userData = JSON.parse(event.body || '{}');

    if (userData.action === 'login') {
      const { username: reqUsername, sessionId: reqSessionId } = userData;
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

      if (user.activeSessionId && user.activeSessionId !== reqSessionId) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'El usuario ya tiene una sesión activa en otro dispositivo. Por favor, cierra sesión en el otro dispositivo primero.' }),
        };
      }

      await collection.updateOne(
        { username: reqUsername },
        { $set: { activeSessionId: reqSessionId, updatedAt: new Date() } }
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ ...user, activeSessionId: reqSessionId }),
      };
    }

    if (userData.action === 'logout') {
      const { username: reqUsername, sessionId: reqSessionId } = userData;
      if (reqUsername) {
        const user = await collection.findOne({ username: reqUsername });
        if (user && (!user.activeSessionId || user.activeSessionId === reqSessionId)) {
          await collection.updateOne(
            { username: reqUsername },
            { $set: { activeSessionId: null, updatedAt: new Date() } }
          );
        }
      }
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
