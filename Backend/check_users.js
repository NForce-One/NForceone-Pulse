import sequelize from './src/config/db.js';
import User from './src/models/user.model.js';
import bcrypt from 'bcrypt';

const checkAndCreateUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected ✅');

    // Check existing users
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role']
    });
    
    console.log('Existing users:', users.length);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));

    // Users to create/fix
    const usersToCreate = [
      {
        name: 'Arun Manager',
        email: 'arun@gmail.com',
        password: 'Arun@6446',
        role: 'MANAGER'
      },
      {
        name: 'Ramesh Manager',
        email: 'ReameshManger@gmail.com',
        password: 'Now@ramesh',
        role: 'MANAGER'
      },
      {
        name: 'Ali Manager',
        email: 'Ali@gmail.com',
        password: 'Ali@6446',
        role: 'MANAGER'
      }
    ];

    for (const userData of usersToCreate) {
      const existing = await User.findOne({
        where: { email: userData.email }
      });

      if (existing) {
        console.log(`\nUpdating user: ${userData.email}`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await existing.update({
          password: hashedPassword,
          isActive: true
        });
        console.log(`✅ Updated ${userData.email}`);
      } else {
        console.log(`\nCreating user: ${userData.email}`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          isActive: true
        });
        console.log(`✅ Created ${userData.email}`);
      }
    }

    console.log('\n✅ All users ready!');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkAndCreateUsers();
