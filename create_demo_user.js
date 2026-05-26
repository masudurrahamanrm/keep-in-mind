const admin = require('./backend/src/config/firebaseAdmin');

async function createDemoUser() {
  const email = 'masudurrahamanrm@gmail.com';
  const password = 'masudur@8145';
  const displayName = 'Masudur Rahaman';

  try {
    const user = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
    console.log('Successfully created demo user:', user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Demo user already exists in Firebase.');
    } else {
      console.error('Error creating demo user:', error);
    }
  }
  process.exit();
}

createDemoUser();
