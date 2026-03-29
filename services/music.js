import chalk from 'chalk';
import { clearScreen, askQuestion, waitForKey } from '../utils/ui.js';
import { showSpotifyMusic } from './spotify/index.js';

export async function showMusic() {
  while (true) {
    clearScreen();
    console.log(chalk.bold.cyan('\n  [MUSIC CONTROL]\n'));
    
    console.log(chalk.white(`  [1] Spotify`));
    console.log(chalk.gray(`  [2] SoundCloud (Gelecek Özellik)`));
    console.log(chalk.gray(`  [3] Apple Music (Gelecek Özellik)`));
    console.log(chalk.red(`  [0] Ana Menü (Main Menu)`));

    console.log(chalk.cyan(`\n  ${'─'.repeat(50)}\n`));

    const choice = await askQuestion(chalk.cyan('  Açmak İstediğiniz Platform: '));
    const cleanChoice = choice.trim().toLowerCase();

    if (cleanChoice === '0') {
      break;
    } else if (cleanChoice === '1') {
      await showSpotifyMusic();
    } else if (cleanChoice === '2' || cleanChoice === '3') {
      console.log(chalk.yellow('\n  (!) Bu servis henüz entegre edilmedi. İlerleyen güncellemelerde eklenecek!'));
      await waitForKey();
    }
  }
}