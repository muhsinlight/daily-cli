import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, openUrl, askQuestion, waitForKey } from '../utils/ui.js';
import { getConfig, setConfig } from '../utils/config.js';

function getSpotifyEnv() {
  const clean = (val) => (val || '').trim().replace(/['"]/g, '').replace(/\r/g, '');
  return {
    CLIENT_ID: clean(process.env.SPOTIFY_CLIENT_ID),
    CLIENT_SECRET: clean(process.env.SPOTIFY_CLIENT_SECRET),
    REDIRECT_URI: clean(process.env.SPOTIFY_REDIRECT_URI),
     SPOTIFY_API_BASE: clean(process.env.SPOTIFY_API_BASE),
    SPOTIFY_ACCOUNTS_BASE: clean(process.env.SPOTIFY_ACCOUNTS_BASE)
  };
}


async function getAccessToken() {
  const { CLIENT_ID, CLIENT_SECRET, SPOTIFY_ACCOUNTS_BASE } = getSpotifyEnv();
  const config = getConfig();
  if (!config.spotify_refresh_token) return null;

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', config.spotify_refresh_token);

    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const res = await axios.post(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return res.data.access_token;
  } catch (err) {
    if (err.response?.data) {
      console.error(chalk.red(`\n  (!) Spotify Error Detail: ${JSON.stringify(err.response.data)}`));
    }
    return null;
  }
}

async function setupSpotify() {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SPOTIFY_ACCOUNTS_BASE } = getSpotifyEnv();

  clearScreen();
  console.log(chalk.bold.cyan('\n  [SPOTIFY SETUP]\n'));

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log(chalk.red('\n  (!) SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing!'));
    console.log(chalk.gray(`      Checking .env at your CLI root. (Loaded ID: ${CLIENT_ID ? CLIENT_ID.substring(0, 5) + '...' : 'EMPTY'})`));
    await waitForKey();
    return;
  }

  const scopes = 'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read';
  
  const authUrl = `${SPOTIFY_ACCOUNTS_BASE}/authorize?` + 
                  `response_type=code` +
                  `&client_id=${CLIENT_ID}` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&scope=${encodeURIComponent(scopes)}` +
                  `&show_dialog=true`;

  console.log(chalk.gray(`     DEBUG: Client_ID found: ${CLIENT_ID ? 'YES (' + CLIENT_ID.substring(0, 4) + '...)' : 'NO'}`));
  console.log(chalk.gray(`     SCOPES : ${scopes}\n`));
  console.log(chalk.yellow('  1. Opening browser... (If it fails, use the link below)'));
  console.log(chalk.gray(`     LINK: ${authUrl}\n`));
  openUrl(authUrl);

  console.log(chalk.yellow('  2. After Agree (Kabul Et), COPY the URL from the browser bar.'));
 console.log(chalk.yellow(`     It should look like: ${REDIRECT_URI}/?code=AQC...`));
  
  const input = await askQuestion(chalk.cyan('\n  PASTE THE ENTIRE URL OR CODE HERE: '));

  if (input) {
    try {
      let code = input.trim();
      if (input.includes('code=')) {
         const match = input.match(/code=([^&]+)/);
         if (match) code = match[1];
      }

      const spinner = ora('Saving Spotify token...').start();
      
      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('code', code);
      tokenParams.append('redirect_uri', REDIRECT_URI.trim());

      const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      const res = await axios.post(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, tokenParams, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { refresh_token } = res.data;
      setConfig({ spotify_refresh_token: refresh_token });
      
      spinner.succeed(chalk.green('Spotify successfully connected! 🎉'));
      await waitForKey();
    } catch (err) {
      spinner.fail(chalk.red(`Setup failed: ${err.message}`));
      if (err.response?.data) {
         console.log(chalk.gray(`  (Response: ${JSON.stringify(err.response.data)})`));
      }
      await waitForKey();
    }
  }
}

export async function showMusic() {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const config = getConfig();
  if (!config.spotify_refresh_token) {
    await setupSpotify();
    return;
  }

  const token = await getAccessToken();
  if (!token) {
    console.log(chalk.red('\n  (!) Error: Access token failed. Restarting setup...'));
    await setupSpotify();
    return;
  }

  while (true) {
    clearScreen();
    console.log(chalk.bold.cyan('\n  [SPOTIFY MUSIC]\n'));

    const spinner = ora('Fetching music info...').start();
    let currentTrack = null;
    try {
      const res = await axios.get(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      spinner.stop();

      if (res.status === 204 || !res.data || !res.data.item) {
        console.log(chalk.yellow('  💤 No song is playing right now.'));
      } else {
        currentTrack = res.data;
        const track = currentTrack.item;
        const status = currentTrack.is_playing ? chalk.green('▶ PLYING') : chalk.yellow('❚❚ PAUSED');
        
        // Progress bar calculation
        const progressMs = currentTrack.progress_ms;
        const durationMs = track.duration_ms;
        const progressPercent = Math.floor((progressMs / durationMs) * 30);
        const progressBar = chalk.green('━'.repeat(progressPercent)) + chalk.gray('━'.repeat(30 - progressPercent));
        const timeStr = `${formatMs(progressMs)} / ${formatMs(durationMs)}`;

        console.log(`  ${status}  ${chalk.bold.white(track.name)}`);
        console.log(`           ${chalk.gray(track.artists.map(a => a.name).join(', '))}`);
        console.log(`           ${chalk.gray(track.album.name)}`);
        console.log(`\n  ${progressBar} ${chalk.cyan(timeStr)}`);
      }

      console.log(chalk.cyan(`\n  ${'─'.repeat(50)}`));
      console.log(chalk.white(`  [P] ${currentTrack?.is_playing ? 'Pause' : 'Play'}   [N] Next   [B] Back (Prev)`));
      console.log(chalk.white(`  [L] My Playlists  [S] Search & Play`));
      console.log(chalk.white(`  [O] Open Spotify  [R] Reset Connection  [0] Main Menu`));
      console.log(chalk.cyan(`${'─'.repeat(50)}`));

      const choice = await askQuestion(chalk.cyan('  Choice: '));
      const cleanChoice = choice.trim().toLowerCase();

      if (cleanChoice === '0') break;
      else if (cleanChoice === 'p') await controlPlayback('playpause', token, currentTrack?.is_playing);
      else if (cleanChoice === 'n') await controlPlayback('next', token);
      else if (cleanChoice === 'b') await controlPlayback('previous', token);
      else if (cleanChoice === 'l') await listPlaylists(token);
      else if (cleanChoice === 'o') openUrl('spotify:');
      else if (cleanChoice === 'r') {
        await setupSpotify();
        return;
      } else if (cleanChoice === 's') {
        const q = await askQuestion(chalk.yellow('\n  Search Track/Artist: '));
        if (q) await searchAndPlay(q, token);
      } else if (choice.length > 0) {
        await searchAndPlay(choice, token);
      }

    } catch (err) {
      spinner.stop();
      console.log(chalk.red(`\n  (!) API Error: ${err.message}`));
      if (err.response?.status === 403) {
         console.log(chalk.yellow('      Spotify Premium required for some features.'));
      }
      await waitForKey();
    }
  }
}

function formatMs(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

async function controlPlayback(action, token, isPlaying) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  try {
    if (action === 'playpause') {
      const endpoint = isPlaying ? 'pause' : 'play';
      await axios.put(`${SPOTIFY_API_BASE}/me/player/${endpoint}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } else {
      await axios.post(`${SPOTIFY_API_BASE}/me/player/${action}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(chalk.red('\n  (!) No active device found. Open Spotify on any device first.'));
      await waitForKey();
    }
  }
}

async function listPlaylists(token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const spinner = ora('Fetching your playlists...').start();
  try {
    const res = await axios.get(`${SPOTIFY_API_BASE}/me/playlists?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    spinner.stop();

    const playlists = res.data.items;
    if (playlists.length === 0) {
      console.log(chalk.yellow('\n  You have no playlists!'));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan('\n  [MY PLAYLISTS]\n'));
    playlists.forEach((p, index) => {
      const itemsInfo = p.tracks || p.items || {};
      const songCount = itemsInfo.total !== undefined ? itemsInfo.total : 0;
      console.log(`  ${chalk.green(index + 1)}. ${chalk.white(p.name)} ${chalk.gray('(' + songCount + ' songs)')}`);
    });

    console.log(chalk.gray(`\n  Enter number to play or [0] to go back.`));
    const selection = await askQuestion(chalk.cyan('  Selection: '));
    const idx = parseInt(selection) - 1;

    if (idx >= 0 && idx < playlists.length) {
      await showPlaylistTracks(playlists[idx], token);
    }
  } catch (err) {
    spinner.fail(`Hata: ${err.message}`);
    await waitForKey();
  }
}

async function showPlaylistTracks(playlist, token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const spinner = ora(`Loading tracks from ${playlist.name}...`).start();
  try {
    const itemsInfo = playlist.tracks || playlist.items || {};
    const url = itemsInfo.href || `${SPOTIFY_API_BASE}/playlists/${playlist.id}/tracks?limit=30`;
    
    let res;
    try {
      res = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (fetchErr) {
      spinner.stop();
      if (fetchErr.response?.status === 403) {
        console.log(chalk.yellow(`\n  Bu playlistin içindeki parçalar listelenemedi.`));
        const ans = await askQuestion(chalk.cyan(`  Yine de bu playlisti başlatmak ister misiniz? (E/H): `));
        
        if (ans.trim().toLowerCase() === 'e') {
          const playSpinner = ora('Başlatılıyor...').start();
          try {
            await axios.put(`${SPOTIFY_API_BASE}/me/player/play`, { context_uri: playlist.uri }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            playSpinner.succeed(`Çalıyor: ${playlist.name}`);
          } catch(playErr) {
            playSpinner.fail('Hata: Spotify uygulamanızın açık olduğundan emin olun.');
          }
        }
        await waitForKey();
        return;
      }
      throw fetchErr; 
    }
    
    spinner.stop();

    const tracks = res.data.items;
    if (tracks.length === 0) {
      console.log(chalk.yellow(`\n  This playlist is empty.`));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan(`\n  [PLAYLIST: ${playlist.name}]\n`));
    console.log(`  ${chalk.green('A')}. Play All (Shuffle/Order)`);
    
    tracks.forEach((item, index) => {
      const t = item.track || item.item;
      if (t) {
        let artistName = 'Unknown Artist';
        if (t.artists && t.artists.length > 0) artistName = t.artists[0].name;
        console.log(`  ${chalk.green(index + 1)}. ${chalk.white(t.name)} - ${chalk.gray(artistName)}`);
      }
    });

    console.log(chalk.gray(`\n  Selection: Number to play specific track, [A] for all, [0] for back.`));
    const choice = await askQuestion(chalk.cyan('  Choice: '));
    const cleanChoice = choice.trim().toLowerCase();

    if (cleanChoice === '0') return;

    const playSpinner = ora('Starting playback...').start();
    try {
      if (cleanChoice === 'a') {
        await axios.put(`${SPOTIFY_API_BASE}/me/player/play`, { context_uri: playlist.uri }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        playSpinner.succeed(`Playing playlist: ${playlist.name}`);
      } else {
        const idx = parseInt(cleanChoice) - 1;
        if (idx >= 0 && idx < tracks.length) {
          const track = tracks[idx].track || tracks[idx].item;
          // Play starting from this track in the context of the playlist
          await axios.put(`${SPOTIFY_API_BASE}/me/player/play`, { 
            context_uri: playlist.uri,
            offset: { uri: track.uri }
          }, { 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          playSpinner.succeed(`Playing: ${track.name}`);
        } else {
          playSpinner.stop();
        }
      }
    } catch (err) {
       playSpinner.fail('Could not start playback. Open Spotify on a device first.');
    }
    await waitForKey();
  } catch (err) {
    spinner.fail(`Hata: ${err.message}`);
    await waitForKey();
  }
}


async function searchAndPlay(query, token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const spinner = ora(`Finding music: "${query}"...`).start();
  try {
    const res = await axios.get(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    spinner.stop();

    const tracks = res.data.tracks.items;
    const playlists = res.data.playlists.items;

    if (tracks.length === 0 && playlists.length === 0) {
      console.log(chalk.red('\n  No results found for your search.'));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan(`\n  [SEARCH RESULTS: ${query}]\n`));
    
    let count = 0;
    const items = [];

    if (tracks.length > 0) {
      console.log(chalk.yellow('  Tracks:'));
      tracks.forEach(track => {
        count++;
        items.push({ type: 'track', uri: track.uri, name: track.name, artist: track.artists[0].name });
        console.log(`  ${chalk.green(count)}. [Track] ${chalk.white(track.name)} - ${chalk.gray(track.artists[0].name)}`);
      });
    }

    if (playlists.length > 0) {
      console.log(chalk.yellow('\n  Playlists:'));
      playlists.forEach(pl => {
        count++;
        items.push({ type: 'playlist', uri: pl.uri, name: pl.name });
        console.log(`  ${chalk.green(count)}. [Playlist] ${chalk.white(pl.name)}`);
      });
    }

    const selection = await askQuestion(chalk.cyan('\n  Select number to play or [0] to cancel: '));
    const idx = parseInt(selection) - 1;

    if (idx >= 0 && idx < items.length) {
      const selected = items[idx];
      const playSpinner = ora(`Starting ${selected.name}...`).start();
      try {
        const body = selected.type === 'track' ? { uris: [selected.uri] } : { context_uri: selected.uri };
        await axios.put(`${SPOTIFY_API_BASE}/me/player/play`, body, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        playSpinner.succeed(`Playing: ${selected.name}`);
      } catch (err) {
        playSpinner.fail('Could not start playback. Open Spotify on a device first.');
      }
      await waitForKey();
    }
  } catch (err) {
    spinner.fail(`Error: ${err.message}`);
    await waitForKey();
  }
}
