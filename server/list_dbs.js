const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb+srv://gaana:1234@cluster.y4fbnyi.mongodb.net/?retryWrites=true&w=majority');
  await client.connect();
  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  console.log('Databases:', dbs.databases.map(db => db.name));
  
  for (const dbInfo of dbs.databases) {
    const db = client.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    console.log(`Collections in ${dbInfo.name}:`, collections.map(c => c.name));
  }
  
  await client.close();
}
main().catch(console.error);
