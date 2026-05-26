const admin = require('./backend/src/config/firebaseAdmin');

async function resetDemoUser() {
  const email = 'masudurrahamanrm@gmail.com';
  const newPassword = 'masudur@8145';

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
      emailVerified: true
    });
    console.log('Successfully reset password for demo user:', email);
  } catch (error) {
    console.error('Error resetting demo user:', error);
  }
  process.exit();
}

resetDemoUser();
