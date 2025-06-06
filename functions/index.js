const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setUserRole = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;
    const role = userData.role;

    if (role === 'Supervisor' || role === 'ATCO') {
      try {
        await admin.auth().setCustomUserClaims(userId, { role });
        console.log(`Set role ${role} for user ${userId}`);
        return null;
      } catch (error) {
        console.error('Error setting custom claims:', error);
        return null;
      }
    } else {
      console.error('Invalid role:', role);
      return null;
    }
  });