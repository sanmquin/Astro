import { connectToDatabase } from './utils/mongodb';

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
    const userData = JSON.parse(event.body);
    if (!userData.username || !userData.sunSign || !userData.moonSign || !userData.venusSign) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    await collection.updateOne(
      { username: userData.username },
      { $set: { ...userData, updatedAt: new Date() } },
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
