import sequelize from './src/config/db.js';

const check = async () => {
  await sequelize.authenticate();
  const [tables] = await sequelize.query('SHOW TABLES');
  console.log('Tables found:', tables.length);
  for (const t of tables) {
    const tn = Object.values(t)[0];
    const [rows] = await sequelize.query('SELECT COUNT(*) as cnt FROM `' + tn + '`');
    const count = rows[0].cnt;
    console.log('  ' + tn + ': ' + count + ' rows');
  }
  process.exit(0);
};
check().catch(e => { console.error(e); process.exit(1); });
