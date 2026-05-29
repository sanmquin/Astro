import { connectToDatabase } from './utils/mongodb';

export const handler = async (event: { httpMethod: string; body: string; queryStringParameters: Record<string, string> | null }) => {
  const { db } = await connectToDatabase();
  const collection = db.collection('responses');

  const { userId, scriptId } = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (!userId || !scriptId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId and scriptId are required' }) };
    }
    const responses = await collection.findOne({ userId, scriptId });
    return {
      statusCode: 200,
      body: JSON.stringify(responses || { userId, scriptId, history: [] }),
    };
  }

  if (event.httpMethod === 'POST') {
    const { userId, scriptId, history } = JSON.parse(event.body);
    if (!userId || !scriptId || !history) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId, scriptId and history are required' }) };
    }

    await collection.updateOne(
      { userId, scriptId },
      { $set: { history, updatedAt: new Date() } },
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
