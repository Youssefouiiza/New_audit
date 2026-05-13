const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '123456',
  port: 5432,
});

async function run() {
  await client.connect();
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("Admin123!", salt);
  
  console.log("Updating admin password...");
  const res = await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'admin@audit.local' RETURNING *`, [hash]);
  
  if (res.rows.length > 0) {
      console.log("Admin password reset successfully.");
  } else {
      console.log("Admin user not found! Here are the existing users:");
      const allUsers = await client.query('SELECT email, role, status FROM users;');
      console.table(allUsers.rows);
  }
  
  await client.end();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
