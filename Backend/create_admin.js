import sequelize from './src/config/db.js';
import User from './src/models/user.model.js';
import bcrypt from 'bcrypt';

const createAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected ✅');

    const adminEmail = 'admin@nforce.com';
    const adminPassword = 'Admin@Password123';

    const existing = await User.findOne({ where: { email: adminEmail } });

    if (existing) {
      console.log('Admin already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await existing.update({ password: hashedPassword, role: 'ADMIN', isActive: true });
    } else {
      console.log('Creating Admin user...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      });
    }

    console.log('\n=======================================');
    console.log('ADMIN ACCOUNT CREATED/UPDATED');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('=======================================');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
