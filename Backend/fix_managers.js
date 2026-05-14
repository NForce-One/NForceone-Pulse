import sequelize from './src/config/db.js';
import User from './src/models/user.model.js';
import { Op } from 'sequelize';

const fixManagerAssignments = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Assign employees to managers
    // Manager id=2 (ramesh@test.com) gets employees with id 3-10
    await User.update({ managerId: 2 }, { where: { role: 'EMPLOYEE', id: { [Op.between]: [3, 10] } } });
    console.log('Assigned employees 3-10 to manager 2');

    // Manager id=5 (avinesh@gmail.com) gets employees with id 11-17
    await User.update({ managerId: 5 }, { where: { role: 'EMPLOYEE', id: { [Op.between]: [11, 17] } } });
    console.log('Assigned employees 11-17 to manager 5');

    // Manager id=18 (Karthik@gmai.com) gets remaining employees
    await User.update({ managerId: 18 }, { where: { role: 'EMPLOYEE', id: { [Op.gt]: 17 } } });
    console.log('Assigned remaining employees to manager 18');

    // Verify
    const users = await User.findAll({ attributes: ['id', 'email', 'role', 'managerId'] });
    console.log('\nUpdated users:');
    users.forEach(u => console.log(`id=${u.id}, email=${u.email}, role=${u.role}, managerId=${u.managerId}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

fixManagerAssignments();
