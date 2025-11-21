const { google } = require('googleapis');

// Replace these with your actual values
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://agreements.photoboothguys.ca/api/auth/google/callback';
const AUTH_CODE = process.argv[2] || 'YOUR_AUTH_CODE_HERE';

if (AUTH_CODE === 'YOUR_AUTH_CODE_HERE' || !AUTH_CODE) {
  console.error('Please provide the authorization code as an argument:');
  console.error('node exchange-token.js YOUR_AUTH_CODE');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

console.log('Exchanging authorization code for tokens...\n');

oauth2Client.getToken(AUTH_CODE)
  .then(({ tokens }) => {
    console.log('✅ Success! Here are your tokens:\n');
    console.log('REFRESH_TOKEN:', tokens.refresh_token);
    console.log('\nAdd these to your Vercel environment variables:');
    console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_DRIVE_REDIRECT_URI=${REDIRECT_URI}\n`);
  })
  .catch((error) => {
    console.error('❌ Error exchanging code for tokens:', error.message);
    console.error('\nMake sure:');
    console.error('1. The authorization code is correct');
    console.error('2. The CLIENT_ID and CLIENT_SECRET match what you used to generate the code');
    console.error('3. The REDIRECT_URI matches exactly what you used');
    process.exit(1);
  });

