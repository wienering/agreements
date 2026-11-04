/**
 * One-time setup: lets the app write to the photoboothguys.ca@gmail.com Google Calendar.
 * Prints a refresh token to put in Vercel as GOOGLE_CALENDAR_REFRESH_TOKEN.
 *
 * Before running: in Google Cloud Console (the project behind the Drive connection), enable the
 * Google Calendar API. Stop `npm run dev` first, because this listens on the same address.
 *
 *   npx tsx scripts/google-calendar-auth.ts
 *
 * Reads GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and GOOGLE_DRIVE_REDIRECT_URI from .env.
 */
import { createServer } from 'http';
import { OAuth2Client } from 'google-auth-library';

const loadEnvFile = (process as unknown as { loadEnvFile?: (file: string) => void }).loadEnvFile;
for (const file of ['.env', '.env.local']) {
  try {
    loadEnvFile?.(file);
  } catch {
    // file not present
  }
}

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

if (!clientId || !clientSecret) {
  console.error('GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set (in .env or this terminal).');
  process.exit(1);
}

const redirect = new URL(redirectUri);
if (!['localhost', '127.0.0.1'].includes(redirect.hostname)) {
  console.error(`GOOGLE_DRIVE_REDIRECT_URI is ${redirectUri}; this script needs a localhost address to catch the sign-in.`);
  process.exit(1);
}

const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
const url = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
});

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', redirectUri);
  if (requestUrl.pathname !== redirect.pathname) {
    res.writeHead(404).end();
    return;
  }
  const code = requestUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('No code in the response. Close this tab and run the script again.');
    return;
  }
  try {
    const { tokens } = await oauth.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Done. You can close this tab and go back to the terminal.');
    if (!tokens.refresh_token) {
      console.error('\nGoogle did not return a refresh token. Remove the app at https://myaccount.google.com/permissions and run this again.');
    } else {
      console.log('\nAdd this to Vercel as GOOGLE_CALENDAR_REFRESH_TOKEN (Production), then redeploy:\n');
      console.log(tokens.refresh_token);
    }
  } catch (error) {
    res.writeHead(500).end('Sign-in failed. See the terminal.');
    console.error(error);
  } finally {
    server.close();
  }
});

server.listen(Number(redirect.port) || 80, () => {
  console.log('Open this link, sign in as photoboothguys.ca@gmail.com, and allow calendar access:\n');
  console.log(url);
});
