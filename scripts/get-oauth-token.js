import readline from 'node:readline';
import { google } from 'googleapis';

async function main() {
  console.log('=====================================================');
  console.log(' Casa Siete - Google OAuth 2.0 Token Generator');
  console.log('=====================================================\n');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  let finalClientId = clientId;
  if (!finalClientId) {
    finalClientId = await question('Enter your GOOGLE_CLIENT_ID: ');
  }

  let finalClientSecret = clientSecret;
  if (!finalClientSecret) {
    finalClientSecret = await question('Enter your GOOGLE_CLIENT_SECRET: ');
  }

  let finalRedirectUri = redirectUri;
  const changeRedirect = await question(`Redirect URI [default: ${redirectUri}]: `);
  if (changeRedirect.trim()) {
    finalRedirectUri = changeRedirect.trim();
  }

  if (!finalClientId || !finalClientSecret) {
    console.error('\n[ERROR] Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
    rl.close();
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    finalClientId.trim(),
    finalClientSecret.trim(),
    finalRedirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  console.log('\n-----------------------------------------------------');
  console.log('1. Open the following URL in your web browser:');
  console.log('-----------------------------------------------------\n');
  console.log(authUrl);
  console.log('\n-----------------------------------------------------');
  console.log('2. Log in with your personal Google account (the document owner).');
  console.log('3. Grant requested permissions.');
  console.log('4. After authorization, copy the "code" parameter from the redirect URL in your browser.');
  console.log('   (Example: http://localhost/?code=4/0AXX... -> copy the code value)');
  console.log('-----------------------------------------------------\n');

  const code = await question('Enter the authorization code here: ');

  if (!code.trim()) {
    console.error('\n[ERROR] Authorization code cannot be empty.');
    rl.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\n=====================================================');
    console.log(' Success! OAuth 2.0 Credentials Obtained');
    console.log('=====================================================\n');

    if (!tokens.refresh_token) {
      console.warn('[WARNING] No refresh_token returned. This happens if consent was already granted without prompt=consent.');
      console.warn('Try revoking app permissions in Google Account settings and re-running this script.');
    } else {
      console.log('Add the following variables to Netlify (Site settings > Environment variables):\n');
      console.log(`GOOGLE_CLIENT_ID=${finalClientId.trim()}`);
      console.log(`GOOGLE_CLIENT_SECRET=${finalClientSecret.trim()}`);
      console.log(`GOOGLE_REDIRECT_URI=${finalRedirectUri}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n=====================================================\n');
    }
  } catch (err) {
    console.error('\n[ERROR] Failed to exchange authorization code for tokens:', err.message);
  } finally {
    rl.close();
  }
}

main();
