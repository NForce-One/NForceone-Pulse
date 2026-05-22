import sequelize from './src/config/db.js';
import User from './src/models/user.model.js';
import bcrypt from 'bcrypt';

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const adminData = {
      name: 'Venkatesh',
      email: 'venkateshkodithyala44@gmail.com',
      password: 'Venky@6446',
      role: 'ADMIN',
      isActive: true,
    };

    const existing = await User.findOne({ where: { email: adminData.email } });

    if (existing) {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await existing.update({
        name: adminData.name,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      });
      console.log(`Admin user updated: ${adminData.email}`);
    } else {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await User.create({ ...adminData, password: hashedPassword });
      console.log(`Admin user created: ${adminData.email}`);
    }

    console.log('Admin seed complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
