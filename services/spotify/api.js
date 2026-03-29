import axios from 'axios';
import chalk from 'chalk';
import { waitForKey } from '../../utils/ui.js';
import { getSpotifyEnv } from './auth.js';

export function getBearerHeader(token) {
  return {
    'Authorization': `Bearer ${token}`
  };
}

export function isNoActiveDeviceError(err) {
  return err?.response?.status === 404;
}

export function isForbiddenError(err) {
  return err?.response?.status === 403;
}

export async function safeSpotifyRequest(requestFn, options = {}) {
  const {
    showDeviceError = true,
    waitOnDeviceError = true
  } = options;

  try {
    return await requestFn();
  } catch (err) {
    if (isNoActiveDeviceError(err) && showDeviceError) {
      console.log(chalk.red('\n  (!) No active Spotify device found.'));
      console.log(chalk.gray('      Open Spotify on any device and try again.'));
      if (waitOnDeviceError) await waitForKey();
      return null;
    }

    throw err;
  }
}

export async function fetchCurrentPlayback(token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();

  const res = await axios.get(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
    headers: getBearerHeader(token),
    validateStatus: (status) => [200, 204].includes(status)
  });

  if (res.status === 204 || !res.data?.item) return null;
  return res.data;
}

export async function playContext(token, body) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();

  return safeSpotifyRequest(
    async () =>
      axios.put(`${SPOTIFY_API_BASE}/me/player/play`, body, {
        headers: getBearerHeader(token)
      }),
    { showDeviceError: true, waitOnDeviceError: false }
  );
}

export async function queueTrack(token, trackUri) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();

  return safeSpotifyRequest(
    async () =>
      axios.post(`${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {}, {
        headers: getBearerHeader(token)
      }),
    { showDeviceError: true, waitOnDeviceError: false }
  );
}

export async function controlPlayback(action, token, isPlaying) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();

  try {
    if (action === 'playpause') {
      const endpoint = isPlaying ? 'pause' : 'play';

      await safeSpotifyRequest(
        async () =>
          axios.put(`${SPOTIFY_API_BASE}/me/player/${endpoint}`, {}, {
            headers: getBearerHeader(token)
          })
      );
    } else {
      await safeSpotifyRequest(
        async () =>
          axios.post(`${SPOTIFY_API_BASE}/me/player/${action}`, {}, {
            headers: getBearerHeader(token)
          })
      );
    }
  } catch (err) {
    console.log(chalk.red(`\n  (!) Playback control failed: ${err.message}`));
    await waitForKey();
  }
}
