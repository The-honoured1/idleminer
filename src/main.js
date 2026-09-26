import './style.css';
import { ads } from './ads.js';
import { game } from './game.js';
import { UIRenderer } from './ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Booting Idle Miner Tycoon...');

  // Initialize ads (Native AdMob or Web mock)
  await ads.initialize();

  // Initialize game engine
  game.init();

  // Initialize UI renderer
  const ui = new UIRenderer();
  ui.init();

  console.log('Idle Miner Tycoon Ready!');
});
