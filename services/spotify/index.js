import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, openUrl, askQuestion, waitForKey } from '../../utils/ui.js';
import { getConfig } from '../../utils/config.js';
import { setupSpotify, getAccessToken, getSpotifyEnv } from './auth.js';
import { 
  getBearerHeader, isForbiddenError, fetchCurrentPlayback, 
  playContext, queueTrack, controlPlayback 
} from './api.js';

function formatMs(ms = 0) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function printDivider() {
  console.log(chalk.cyan(`${'─'.repeat(50)}`));
}

function renderNowPlaying(currentTrack) {
  if (!currentTrack?.item) {
    console.log(chalk.yellow('  💤 No song is playing right now.'));
    return;
  }

  const track = currentTrack.item;
  const status = currentTrack.is_playing ? chalk.green('▶ PLAYING') : chalk.yellow('❚❚ PAUSED');

  const progressMs = currentTrack.progress_ms ?? 0;
  const durationMs = track.duration_ms ?? 1;
  const progressPercent = Math.min(30, Math.floor((progressMs / durationMs) * 30));
  const progressBar =
    chalk.green('━'.repeat(progressPercent)) + chalk.gray('━'.repeat(30 - progressPercent));
  const timeStr = `${formatMs(progressMs)} / ${formatMs(durationMs)}`;

  console.log(`  ${status}  ${chalk.bold.white(track.name)}`);
  console.log(`           ${chalk.gray(track.artists?.map(a => a.name).join(', ') || 'Unknown Artist')}`);
  console.log(`           ${chalk.gray(track.album?.name || 'Unknown Album')}`);
  console.log(`\n  ${progressBar} ${chalk.cyan(timeStr)}`);
}

function renderMusicMenu(isPlaying) {
  console.log();
  printDivider();
  console.log(chalk.white(`  [P] ${isPlaying ? 'Pause' : 'Play'}   [N] Next   [B] Previous`));
  console.log(chalk.white(`  [L] My Playlists  [S] Search (Play/Queue)`));
  console.log(chalk.white(`  [O] Open Spotify  [R] Reset Connection  [0] Main Menu`));
  printDivider();
}

async function listPlaylists(token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const spinner = ora('Fetching your playlists...').start();

  try {
    const res = await axios.get(`${SPOTIFY_API_BASE}/me/playlists?limit=20`, {
      headers: getBearerHeader(token)
    });

    spinner.stop();

    const playlists = res.data.items || [];

    if (playlists.length === 0) {
      console.log(chalk.yellow('\n  You have no playlists.'));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan('\n  [MY PLAYLISTS]\n'));

    playlists.forEach((p, index) => {
      const itemsInfo = p.tracks || p.items || {};
      const songCount = itemsInfo.total ?? 0;
      console.log(`  ${chalk.green(index + 1)}. ${chalk.white(p.name)} ${chalk.gray(`(${songCount} songs)`)}`);
    });

    console.log(chalk.gray('\n  Enter a number to open or [0] to go back.'));
    const selection = await askQuestion(chalk.cyan('  Selection: '));
    const idx = parseInt(selection, 10) - 1;

    if (idx >= 0 && idx < playlists.length) {
      await showPlaylistTracks(playlists[idx], token);
    }
  } catch (err) {
    spinner.fail(`Error: ${err.message}`);
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
        headers: getBearerHeader(token)
      });
    } catch (fetchErr) {
      spinner.stop();

      if (isForbiddenError(fetchErr)) {
        console.log(chalk.yellow('\n  The tracks in this playlist could not be listed.'));
        const ans = await askQuestion(chalk.cyan('  Do you still want to start this playlist? (Y/N): '));

        if (ans.trim().toLowerCase() === 'y') {
          const playSpinner = ora('Starting playlist...').start();

          try {
            const result = await playContext(token, { context_uri: playlist.uri });

            if (result) playSpinner.succeed(`Now playing: ${playlist.name}`);
            else playSpinner.fail('Could not start playlist.');
          } catch (playErr) {
            playSpinner.fail(`Error: ${playErr.message}`);
          }
        }

        await waitForKey();
        return;
      }

      throw fetchErr;
    }

    spinner.stop();

    const tracks = res.data.items || [];

    if (tracks.length === 0) {
      console.log(chalk.yellow('\n  This playlist is empty.'));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan(`\n  [PLAYLIST: ${playlist.name}]\n`));
    console.log(`  ${chalk.green('A')}. Play All`);

    const validTracks = [];

    tracks.forEach((item) => {
      const t = item.track || item.item;
      if (!t) return;
      validTracks.push(t);
    });

    validTracks.forEach((track, index) => {
      const artistName = track.artists?.[0]?.name || 'Unknown Artist';
      console.log(`  ${chalk.green(index + 1)}. ${chalk.white(track.name)} - ${chalk.gray(artistName)}`);
    });

    console.log(chalk.gray('\n  Selection: Choose a track number, [A] Play All, [0] Back.'));
    const choice = await askQuestion(chalk.cyan('  Choice: '));
    const cleanChoice = choice.trim().toLowerCase();

    if (cleanChoice === '0') return;

    if (cleanChoice === 'a') {
      const actionSpinner = ora('Starting playlist...').start();

      try {
        const result = await playContext(token, { context_uri: playlist.uri });

        if (result) actionSpinner.succeed(`Now playing: ${playlist.name}`);
        else actionSpinner.fail('Could not start playlist.');
      } catch (err) {
        actionSpinner.fail(`Action failed: ${err.message}`);
      }

      await waitForKey();
      return;
    }

    const idx = parseInt(cleanChoice, 10) - 1;

    if (idx >= 0 && idx < validTracks.length) {
      const track = validTracks[idx];

      console.log(chalk.white(`\n  Selected: ${track.name}`));
      const action = await askQuestion(chalk.cyan('  [P] Play Now  [Q] Add to Queue  [0] Cancel: '));
      const cleanAction = action.trim().toLowerCase();

      if (cleanAction === '0') return;
      if (!['p', 'q'].includes(cleanAction)) return;

      const isQueue = cleanAction === 'q';
      const actionSpinner = ora(isQueue ? 'Adding to queue...' : 'Playing track...').start();

      try {
        if (isQueue) {
          const result = await queueTrack(token, track.uri);
          if (result) actionSpinner.succeed(`Added to Queue: ${track.name}`);
          else actionSpinner.fail('Could not add track to queue.');
        } else {
          const result = await playContext(token, {
            context_uri: playlist.uri,
            offset: { uri: track.uri }
          });

          if (result) actionSpinner.succeed(`Now playing: ${track.name}`);
          else actionSpinner.fail('Could not start playback.');
        }
      } catch (err) {
        actionSpinner.fail(`Action failed: ${err.message}`);
      }
    }

    await waitForKey();
  } catch (err) {
    spinner.fail(`Error: ${err.message}`);
    await waitForKey();
  }
}

async function searchAndPlay(query, token) {
  const { SPOTIFY_API_BASE } = getSpotifyEnv();
  const spinner = ora(`Searching for: "${query}"...`).start();

  try {
    const res = await axios.get(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=5`,
      {
        headers: getBearerHeader(token)
      }
    );

    spinner.stop();

    const tracks = res.data?.tracks?.items || [];
    const playlists = res.data?.playlists?.items || [];

    if (tracks.length === 0 && playlists.length === 0) {
      console.log(chalk.red('\n  No results found.'));
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan(`\n  [SEARCH RESULTS: ${query}]\n`));

    let count = 0;
    const items = [];

    if (tracks.length > 0) {
      console.log(chalk.yellow('  Tracks:'));

      tracks.forEach((track) => {
        if (!track) return;

        count++;
        const artistName = track.artists?.[0]?.name || 'Unknown Artist';

        items.push({
          type: 'track',
          uri: track.uri,
          name: track.name,
          artist: artistName
        });

        console.log(`  ${chalk.green(count)}. [Track] ${chalk.white(track.name)} - ${chalk.gray(artistName)}`);
      });
    }

    if (playlists.length > 0) {
      console.log(chalk.yellow('\n  Playlists:'));

      playlists.forEach((pl) => {
        if (!pl) return;

        count++;
        items.push({
          type: 'playlist',
          uri: pl.uri,
          name: pl.name
        });

        console.log(`  ${chalk.green(count)}. [Playlist] ${chalk.white(pl.name)}`);
      });
    }

    const selection = await askQuestion(chalk.cyan('\n  Choose a number (or [0] Cancel): '));
    const cleanSel = selection.trim().toLowerCase();

    if (cleanSel === '0') return;

    const idx = parseInt(cleanSel, 10) - 1;

    if (idx >= 0 && idx < items.length) {
      const selected = items[idx];

      console.log(chalk.white(`\n  Selected: ${selected.name}`));

      const actionPrompt =
        selected.type === 'track'
          ? '  [P] Play Now  [Q] Add to Queue  [0] Cancel: '
          : '  [P] Play Playlist  [0] Cancel: ';

      const action = await askQuestion(chalk.cyan(actionPrompt));
      const cleanAction = action.trim().toLowerCase();

      if (cleanAction === '0') return;

      if (cleanAction === 'q') {
        if (selected.type !== 'track') {
          console.log(chalk.yellow('\n  (!) Only individual tracks can be added to the queue.'));
          await waitForKey();
          return;
        }

        const queueSpinner = ora(`Adding to queue: ${selected.name}...`).start();

        try {
          const result = await queueTrack(token, selected.uri);

          if (result) queueSpinner.succeed(`Added to Queue: ${selected.name}`);
          else queueSpinner.fail('Could not add to queue.');
        } catch (err) {
          queueSpinner.fail(`Queue failed: ${err.message}`);
        }

        await waitForKey();
      } else if (cleanAction === 'p') {
        const playSpinner = ora(`Starting: ${selected.name}...`).start();

        try {
          const body =
            selected.type === 'track'
              ? { uris: [selected.uri] }
              : { context_uri: selected.uri };

          const result = await playContext(token, body);

          if (result) playSpinner.succeed(`Now playing: ${selected.name}`);
          else playSpinner.fail('Could not start playback.');
        } catch (err) {
          playSpinner.fail(`Playback failed: ${err.message}`);
        }

        await waitForKey();
      }
    }
  } catch (err) {
    spinner.fail(`Error: ${err.message}`);
    await waitForKey();
  }
}

export async function showSpotifyMusic() {
  const config = getConfig();

  if (!config.spotify_refresh_token) {
    await setupSpotify();
    return;
  }

  while (true) {
    const token = await getAccessToken();

    if (!token) {
      console.log(chalk.red('\n  (!) Error: Failed to refresh access token. Restarting setup...'));
      await setupSpotify();
      return;
    }

    clearScreen();
    console.log(chalk.bold.cyan('\n  [SPOTIFY MUSIC]\n'));

    const spinner = ora('Fetching music info...').start();
    let currentTrack = null;

    try {
      currentTrack = await fetchCurrentPlayback(token);
      spinner.stop();

      renderNowPlaying(currentTrack);
      renderMusicMenu(currentTrack?.is_playing);

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
        const q = await askQuestion(chalk.yellow('\n  Search track or playlist: '));
        if (q) await searchAndPlay(q, token);
      } else if (choice.length > 0) {
        await searchAndPlay(choice, token);
      }
    } catch (err) {
      spinner.stop();
      console.log(chalk.red(`\n  (!) API Error: ${err.message}`));

      if (isForbiddenError(err)) {
        console.log(chalk.yellow('      Spotify Premium is required for some playback features.'));
      }

      await waitForKey();
    }
  }
}
