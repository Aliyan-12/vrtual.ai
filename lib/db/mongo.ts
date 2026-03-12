import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const c = new MongoClient(uri, {});
  await c.connect();
  await c.db().command({ ping: 1 });
  try {
    const dbName = process.env.MONGODB_DB ?? "vrtual_ai";
    const db = c.db(dbName);
    await db.collection("videos").createIndex({ id: 1 }, { unique: true });
  } catch {}
  client = c;
  return client;
}

export async function getDb(name?: string) {
  const c = await getMongoClient();
  const dbName = name ?? process.env.MONGODB_DB ?? "vrtual_ai";
  return c.db(dbName);
}
