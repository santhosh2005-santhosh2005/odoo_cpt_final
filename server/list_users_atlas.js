const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb+srv://gaana:1234@cluster.y4fbnyi.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  const users = await db.collection('users').find({}).toArray();
  console.log(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, isApproved: u.isApproved, active: u.active })));
  process.exit(0);
}
main().catch(console.error);
