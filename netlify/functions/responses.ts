import { connectToDatabase } from './utils/mongodb';

export const handler = async (event: { httpMethod: string; body: string; queryStringParameters: Record<string, string> | null }) => {
  const { db } = await connectToDatabase();
  const collection = db.collection('responses');

  const { userId, scriptId } = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (userId && !scriptId) {
      const userResponses = await collection.find({ userId }).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(userResponses),
      };
    } else if (!userId) {
      const allResponses = await collection.find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(allResponses),
      };
    }
    const responses = await collection.findOne({ userId, scriptId });
    return {
      statusCode: 200,
      body: JSON.stringify(responses || { userId, scriptId, history: [] }),
    };
  }

  if (event.httpMethod === 'DELETE') {
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }
    await collection.deleteMany({ userId });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
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

    // Secondary write-only backup collection for progress interactions
    try {
      const backupCollection = db.collection('responses_backup');
      await backupCollection.insertOne({
        userId,
        scriptId,
        history,
        createdAt: new Date()
      });
    } catch (backupErr) {
      console.error('Failed to write to responses_backup collection', backupErr);
    }

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
