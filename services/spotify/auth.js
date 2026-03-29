import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, openUrl, askQuestion, waitForKey } from '../../utils/ui.js';
import { getConfig, setConfig } from '../../utils/config.js';

export function getSpotifyEnv() {
  const clean = (val) => (val || '').trim().replace(/['"]/g, '').replace(/\r/g, '');
  return {
    CLIENT_ID: clean(process.env.SPOTIFY_CLIENT_ID),
    CLIENT_SECRET: clean(process.env.SPOTIFY_CLIENT_SECRET),
    REDIRECT_URI: clean(process.env.SPOTIFY_REDIRECT_URI),
    SPOTIFY_API_BASE: clean(process.env.SPOTIFY_API_BASE),
    SPOTIFY_ACCOUNTS_BASE: clean(process.env.SPOTIFY_ACCOUNTS_BASE)
  };
}

export function buildAuthHeader(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
}

export function extractCodeFromInput(input) {
  const trimmed = input.trim();
  if (trimmed.includes('code=')) {
    const match = trimmed.match(/code=([^&]+)/);
    if (match) return match[1];
  }
  return trimmed;
}

export async function getAccessToken() {
  const { CLIENT_ID, CLIENT_SECRET, SPOTIFY_ACCOUNTS_BASE } = getSpotifyEnv();
  const config = getConfig();

  if (!config.spotify_refresh_token) return null;

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', config.spotify_refresh_token);

    const res = await axios.post(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, params, {
      headers: buildAuthHeader(CLIENT_ID, CLIENT_SECRET)
    });

    return res.data.access_token;
  } catch (err) {
    if (err.response?.data) {
      console.error(chalk.red(`\n  (!) Spotify Error Detail: ${JSON.stringify(err.response.data)}`));
    }
    return null;
  }
}

export async function setupSpotify() {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SPOTIFY_ACCOUNTS_BASE } = getSpotifyEnv();

  clearScreen();
  console.log(chalk.bold.cyan('\n  [SPOTIFY SETUP]\n'));

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log(chalk.red('\n  (!) SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing!'));
    console.log(
      chalk.gray(
        `      Checking .env at your CLI root. (Loaded ID: ${CLIENT_ID ? CLIENT_ID.substring(0, 5) + '...' : 'EMPTY'})`
      )
    );
    await waitForKey();
    return;
  }

  const scopes =
    'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read';

  const authUrl =
    `${SPOTIFY_ACCOUNTS_BASE}/authorize?` +
    `response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&show_dialog=true`;

  console.log(
    chalk.gray(`     DEBUG: Client_ID found: ${CLIENT_ID ? 'YES (' + CLIENT_ID.substring(0, 4) + '...)' : 'NO'}`)
  );
  console.log(chalk.gray(`     SCOPES : ${scopes}\n`));
  console.log(chalk.yellow('  1. Opening browser... (If it fails, use the link below)'));
  console.log(chalk.gray(`     LINK: ${authUrl}\n`));

  openUrl(authUrl);

  console.log(chalk.yellow('  2. After clicking Agree, COPY the URL from the browser bar.'));
  console.log(chalk.yellow(`     It should look like: ${REDIRECT_URI}/?code=AQC...`));

  const input = await askQuestion(chalk.cyan('\n  PASTE THE ENTIRE URL OR CODE HERE: '));
  if (!input) return;

  let spinner;

  try {
    const code = extractCodeFromInput(input);

    spinner = ora('Saving Spotify token...').start();

    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('code', code);
    tokenParams.append('redirect_uri', REDIRECT_URI);

    const res = await axios.post(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, tokenParams, {
      headers: buildAuthHeader(CLIENT_ID, CLIENT_SECRET)
    });

    const { refresh_token } = res.data;

    if (!refresh_token) {
      spinner.fail(chalk.red('Setup failed: No refresh token was returned.'));
      await waitForKey();
      return;
    }

    setConfig({ spotify_refresh_token: refresh_token });

    spinner.succeed(chalk.green('Spotify successfully connected! 🎉'));
    await waitForKey();
  } catch (err) {
    if (spinner) spinner.fail(chalk.red(`Setup failed: ${err.message}`));
    else console.log(chalk.red(`\n  (!) Setup failed: ${err.message}`));

    if (err.response?.data) {
      console.log(chalk.gray(`  (Response: ${JSON.stringify(err.response.data)})`));
    }

    await waitForKey();
  }
}
