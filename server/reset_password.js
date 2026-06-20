const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function main() {
  await mongoose.connect('mongodb+srv://gaana:1234@cluster.y4fbnyi.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  
  const hashedPassword = await bcrypt.hash('12345', 10);
  const result = await db.collection('users').updateOne(
    { email: 'waiter@gmail.com' },
    { $set: { passwordHash: hashedPassword } }
  );
  
  console.log('Password reset result:', result);
  process.exit(0);
}
main().catch(console.error);
