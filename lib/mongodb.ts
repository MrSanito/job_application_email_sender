import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectMongoose(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('Mongoose connection error:', e);
    return null;
  }
}

export async function testMongooseConnection(): Promise<{
  success: boolean;
  message: string;
  dbName?: string;
}> {
  if (!MONGODB_URI) {
    return { success: false, message: 'MONGODB_URI is not configured in .env.local.' };
  }

  try {
    const conn = await connectMongoose();
    if (!conn || !conn.connection.db) {
      return { success: false, message: 'Could not connect to MongoDB Atlas.' };
    }

    const dbName = conn.connection.db.databaseName;
    return {
      success: true,
      dbName,
      message: `Mongoose connected successfully to database "${dbName}"!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Mongoose connection failed.',
    };
  }
}
