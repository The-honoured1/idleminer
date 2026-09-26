import { ads } from './ads.js';
import { sfx } from './audio.js';

export function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '$0';
  if (num < 1000) return '$' + Math.floor(num).toLocaleString();

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const i = Math.floor(Math.log10(num) / 3);
  if (i >= suffixes.length) return '$' + num.toExponential(2);

  const formatted = (num / Math.pow(10, i * 3)).toFixed(2);
  return '$' + formatted + suffixes[i];
}

export function formatGems(num) {
  if (num < 1000) return num.toString();
  return (num / 1000).toFixed(1) + 'K';
}

export const SHAFT_CONFIG = [
  { id: 1, name: 'Coal Mine', icon: '🪨', depth: '10m', unlockCost: 0, baseProd: 2, baseUpgrade: 10 },
  { id: 2, name: 'Copper Vein', icon: '🥉', depth: '40m', unlockCost: 120, baseProd: 14, baseUpgrade: 90 },
  { id: 3, name: 'Iron Core', icon: '🥈', depth: '90m', unlockCost: 1500, baseProd: 75, baseUpgrade: 750 },
  { id: 4, name: 'Gold Deposit', icon: '🥇', depth: '180m', unlockCost: 20000, baseProd: 450, baseUpgrade: 6000 },
  { id: 5, name: 'Diamond Cave', icon: '💎', depth: '320m', unlockCost: 350000, baseProd: 3200, baseUpgrade: 60000 },
  { id: 6, name: 'Amethyst Geode', icon: '🟣', depth: '550m', unlockCost: 6000000, baseProd: 26000, baseUpgrade: 500000 },
  { id: 7, name: 'Cosmic Crystal', icon: '🌌', depth: '1000m', unlockCost: 120000000, baseProd: 220000, baseUpgrade: 4500000 },
];

export const RESEARCH_PERKS = [
  { id: 'drill', name: 'Titanium Drills', icon: '⚡', desc: '+25% Digging Speed', baseCost: 15, costMult: 1.8, maxLvl: 10 },
  { id: 'elevator', name: 'Reinforced Cables', icon: '🛗', desc: '+30% Elevator Capacity', baseCost: 20, costMult: 1.8, maxLvl: 10 },
  { id: 'warehouse', name: 'Fleet Expansion', icon: '🚚', desc: '+30% Warehouse Speed', baseCost: 20, costMult: 1.8, maxLvl: 10 },
  { id: 'market', name: 'Contract Broker', icon: '📈', desc: '+20% Ore Sell Value', baseCost: 30, costMult: 2.0, maxLvl: 10 },
  { id: 'gemHunter', name: 'Gem Prospector', icon: '💎', desc: '5% Chance for +1 Gem on Taps', baseCost: 50, costMult: 2.2, maxLvl: 5 },
];

export const QUESTS = [
  { id: 'taps_50', title: 'Get Your Hands Dirty', desc: 'Tap miners or warehouse 50 times', target: 50, rewardGems: 10, type: 'taps' },
  { id: 'shafts_3', title: 'Digging Deeper', desc: 'Unlock 3 Mine Shafts', target: 3, rewardGems: 15, type: 'shafts' },
  { id: 'managers_3', title: 'Automated Operations', desc: 'Hire 3 Automation Managers', target: 3, rewardGems: 20, type: 'managers' },
  { id: 'cash_100k', title: 'Six-Figure Miner', desc: 'Earn a total of $100,000 cash', target: 100000, rewardGems: 25, type: 'totalCash' },
  { id: 'boost_3', title: 'Supercharged', desc: 'Activate 2x Boost 3 times', target: 3, rewardGems: 30, type: 'boosts' },
  { id: 'drone_2', title: 'Air Delivery', desc: 'Catch 2 Flying Supply Drones', target: 2, rewardGems: 25, type: 'drones' },
  { id: 'elev_lvl_25', title: 'Express Lift', desc: 'Upgrade Elevator to Level 25', target: 25, rewardGems: 35, type: 'elevatorLvl' },
  { id: 'prestige_1', title: 'Empire Builder', desc: 'Ascend/Sell your mine 1 time', target: 1, rewardGems: 50, type: 'prestiges' },
];

export class GameEngine {
  constructor() {
    this.cash = 0;
    this.gems = 15;
    this.totalLifetimeCash = 0;
    this.totalTaps = 0;
    this.boostsActivated = 0;
    this.dronesCaught = 0;
    this.prestiges = 0;
    this.playTimeSeconds = 0;

    this.boostEndTime = 0;
    this.lastSaved = Date.now();

    this.elevator = {
      level: 1,
      capacity: 25,
      currentLoad: 0,
      hasManager: false,
      managerCost: 400,
      position: 0, // 0 = surface, 1 = bottom
    };

    this.warehouse = {
      level: 1,
      capacity: 30,
      surfaceBin: 0,
      hasManager: false,
      managerCost: 500,
    };

    this.shafts = SHAFT_CONFIG.map((cfg, index) => ({
      ...cfg,
      unlocked: index === 0,
      level: 1,
      currentBin: 0,
      hasManager: false,
      managerCost: Math.max(150, Math.floor(cfg.unlockCost * 0.35)),
    }));

    // Research levels { drill: 0, elevator: 0, ... }
    this.research = {};
    RESEARCH_PERKS.forEach((p) => {
      this.research[p.id] = 0;
    });

    // Completed quests array of IDs
    this.claimedQuests = [];

    this.droneActive = false;
    this.droneTimeout = null;
  }

  init() {
    this.loadState();
    this.checkOfflineProgress();
    this.startLoop();
    this.scheduleDrone();
  }

  // Multipliers
  getGlobalMultiplier() {
    let mult = 1.0;
    // 1. Boost (2x)
    if (Date.now() < this.boostEndTime) mult *= 2.0;
    // 2. Prestige bonus (+20% per prestige level)
    mult *= (1.0 + this.prestiges * 0.25);
    // 3. Research market bonus
    const marketLvl = this.research['market'] || 0;
    mult *= (1.0 + marketLvl * 0.20);

    return mult;
  }

  getDigSpeedMultiplier() {
    const drillLvl = this.research['drill'] || 0;
    return 1.0 + drillLvl * 0.25;
  }

  getElevatorCapacityMultiplier() {
    const elevLvl = this.research['elevator'] || 0;
    return 1.0 + elevLvl * 0.30;
  }

  getWarehouseCapacityMultiplier() {
    const whLvl = this.research['warehouse'] || 0;
    return 1.0 + whLvl * 0.30;
  }

  getEffectiveElevatorCapacity() {
    return Math.floor(
      (25 * Math.pow(1.15, this.elevator.level - 1)) * this.getElevatorCapacityMultiplier()
    );
  }

  getEffectiveWarehouseCapacity() {
    return Math.floor(
      (30 * Math.pow(1.15, this.warehouse.level - 1)) * this.getWarehouseCapacityMultiplier()
    );
  }

  getBoostRemainingSeconds() {
    return Math.max(0, Math.floor((this.boostEndTime - Date.now()) / 1000));
  }

  activateBoost(durationHours = 2) {
    const now = Date.now();
    const durationMs = durationHours * 60 * 60 * 1000;
    this.boostEndTime = Math.max(now, this.boostEndTime) + durationMs;
    // Max 8 hours
    if (this.boostEndTime > now + 8 * 60 * 60 * 1000) {
      this.boostEndTime = now + 8 * 60 * 60 * 1000;
    }
    this.boostsActivated += 1;
    sfx.playUpgrade();
  }

  // Cost calculations
  getShaftUpgradeCost(shaft) {
    return Math.floor(shaft.baseUpgrade * Math.pow(1.15, shaft.level));
  }

  getElevatorUpgradeCost() {
    return Math.floor(20 * Math.pow(1.15, this.elevator.level));
  }

  getWarehouseUpgradeCost() {
    return Math.floor(25 * Math.pow(1.15, this.warehouse.level));
  }

  getResearchCost(perkId) {
    const perk = RESEARCH_PERKS.find((p) => p.id === perkId);
    if (!perk) return 999;
    const currentLvl = this.research[perkId] || 0;
    return Math.floor(perk.baseCost * Math.pow(perk.costMult, currentLvl));
  }

  upgradeResearch(perkId) {
    const perk = RESEARCH_PERKS.find((p) => p.id === perkId);
    if (!perk) return false;
    const currentLvl = this.research[perkId] || 0;
    if (currentLvl >= perk.maxLvl) return false;

    const costGems = this.getResearchCost(perkId);
    if (this.gems >= costGems) {
      this.gems -= costGems;
      this.research[perkId] = currentLvl + 1;
      sfx.playUpgrade();
      this.saveState();
      return true;
    }
    return false;
  }

  upgradeShaft(shaftId) {
    const shaft = this.shafts.find((s) => s.id === shaftId);
    if (!shaft) return;
    const cost = this.getShaftUpgradeCost(shaft);
    if (this.cash >= cost) {
      this.cash -= cost;
      shaft.level += 1;
      sfx.playUpgrade();
      this.saveState();
    }
  }

  unlockShaft(shaftId) {
    const shaft = this.shafts.find((s) => s.id === shaftId);
    if (!shaft || shaft.unlocked) return;
    if (this.cash >= shaft.unlockCost) {
      this.cash -= shaft.unlockCost;
      shaft.unlocked = true;
      sfx.playUpgrade();
      this.saveState();
    }
  }

  upgradeElevator() {
    const cost = this.getElevatorUpgradeCost();
    if (this.cash >= cost) {
      this.cash -= cost;
      this.elevator.level += 1;
      sfx.playUpgrade();
      this.saveState();
    }
  }

  upgradeWarehouse() {
    const cost = this.getWarehouseUpgradeCost();
    if (this.cash >= cost) {
      this.cash -= cost;
      this.warehouse.level += 1;
      sfx.playUpgrade();
      this.saveState();
    }
  }

  hireManager(type, shaftId = null) {
    if (type === 'elevator') {
      if (this.cash >= this.elevator.managerCost && !this.elevator.hasManager) {
        this.cash -= this.elevator.managerCost;
        this.elevator.hasManager = true;
        sfx.playUpgrade();
      }
    } else if (type === 'warehouse') {
      if (this.cash >= this.warehouse.managerCost && !this.warehouse.hasManager) {
        this.cash -= this.warehouse.managerCost;
        this.warehouse.hasManager = true;
        sfx.playUpgrade();
      }
    } else if (type === 'shaft' && shaftId !== null) {
      const shaft = this.shafts.find((s) => s.id === shaftId);
      if (shaft && !shaft.hasManager && this.cash >= shaft.managerCost) {
        this.cash -= shaft.managerCost;
        shaft.hasManager = true;
        sfx.playUpgrade();
      }
    }
    this.saveState();
  }

  // Manual actions with tap feedback & gem prospector roll
  rollGemProspector() {
    const prospectorLvl = this.research['gemHunter'] || 0;
    if (prospectorLvl > 0) {
      const chance = prospectorLvl * 0.05; // 5% per level
      if (Math.random() < chance) {
        this.gems += 1;
        sfx.playFanfare();
        this.createFloatingText('+1 💎', 'gems');
      }
    }
  }

  tapShaft(shaftId) {
    const shaft = this.shafts.find((s) => s.id === shaftId);
    if (!shaft || !shaft.unlocked) return;

    this.totalTaps += 1;
    const prod = shaft.baseProd * shaft.level * this.getGlobalMultiplier() * this.getDigSpeedMultiplier();
    shaft.currentBin += prod;
    sfx.playDig();
    this.createFloatingText(`+${formatCurrency(prod)}`, 'ore');
    this.rollGemProspector();
  }

  tapElevator() {
    this.totalTaps += 1;
    const cap = this.getEffectiveElevatorCapacity();
    let space = cap - this.elevator.currentLoad;
    if (space <= 0) return;

    for (const shaft of this.shafts) {
      if (!shaft.unlocked || shaft.currentBin <= 0) continue;
      const take = Math.min(space, shaft.currentBin);
      shaft.currentBin -= take;
      this.elevator.currentLoad += take;
      space -= take;
      if (space <= 0) break;
    }

    if (this.elevator.currentLoad > 0) {
      this.warehouse.surfaceBin += this.elevator.currentLoad;
      this.elevator.currentLoad = 0;
      sfx.playDig();
    }
    this.rollGemProspector();
  }

  tapWarehouse() {
    if (this.warehouse.surfaceBin <= 0) return;
    this.totalTaps += 1;

    const cap = this.getEffectiveWarehouseCapacity();
    const sold = Math.min(cap, this.warehouse.surfaceBin);
    this.warehouse.surfaceBin -= sold;
    this.cash += sold;
    this.totalLifetimeCash += sold;
    sfx.playCoin();
    this.createFloatingText(`+${formatCurrency(sold)}`, 'cash');
    this.rollGemProspector();
  }

  // Instant Time Warp (e.g. 1 hour instant earnings)
  applyTimeWarp(hours = 1) {
    const totalProdPerSec = this.calculateAutomationPerSecond();
    if (totalProdPerSec <= 0) return 0;

    const earned = totalProdPerSec * (hours * 3600);
    this.cash += earned;
    this.totalLifetimeCash += earned;
    sfx.playWarp();
    this.createFloatingText(`WARP: +${formatCurrency(earned)}`, 'cash');
    this.saveState();
    return earned;
  }

  // Calculate current automated throughput
  calculateAutomationPerSecond() {
    let mineRate = 0;
    for (const shaft of this.shafts) {
      if (shaft.unlocked && shaft.hasManager) {
        mineRate += shaft.baseProd * shaft.level * this.getGlobalMultiplier() * this.getDigSpeedMultiplier();
      }
    }

    if (!this.elevator.hasManager || !this.warehouse.hasManager) {
      return 0; // logistics bottleneck if not automated
    }

    const elevRate = this.getEffectiveElevatorCapacity() * 0.8;
    const whRate = this.getEffectiveWarehouseCapacity() * 0.8;

    return Math.min(mineRate, elevRate, whRate);
  }

  // Prestige calculation
  getPrestigeRewardGems() {
    if (this.totalLifetimeCash < 25000) return 0;
    // Cubic root scaling gives great pacing
    return Math.floor(Math.cbrt(this.totalLifetimeCash / 25000) * 8);
  }

  canPrestige() {
    return this.getPrestigeRewardGems() >= 5;
  }

  performPrestige() {
    const rewardGems = this.getPrestigeRewardGems();
    if (rewardGems < 5) return false;

    this.gems += rewardGems;
    this.prestiges += 1;

    // Reset cash, warehouse, elevator, shafts
    this.cash = 100; // Small starter bonus
    this.elevator = {
      level: 1,
      capacity: 25,
      currentLoad: 0,
      hasManager: false,
      managerCost: 400,
      position: 0,
    };
    this.warehouse = {
      level: 1,
      capacity: 30,
      surfaceBin: 0,
      hasManager: false,
      managerCost: 500,
    };
    this.shafts = SHAFT_CONFIG.map((cfg, index) => ({
      ...cfg,
      unlocked: index === 0,
      level: 1,
      currentBin: 0,
      hasManager: false,
      managerCost: Math.max(150, Math.floor(cfg.unlockCost * 0.35)),
    }));

    sfx.playFanfare();
    this.saveState();
    return true;
  }

  // Quest verification
  isQuestCompleted(quest) {
    if (this.claimedQuests.includes(quest.id)) return true;

    switch (quest.type) {
      case 'taps':
        return this.totalTaps >= quest.target;
      case 'shafts':
        return this.shafts.filter((s) => s.unlocked).length >= quest.target;
      case 'managers':
        let mCount = (this.elevator.hasManager ? 1 : 0) + (this.warehouse.hasManager ? 1 : 0);
        mCount += this.shafts.filter((s) => s.hasManager).length;
        return mCount >= quest.target;
      case 'totalCash':
        return this.totalLifetimeCash >= quest.target;
      case 'boosts':
        return this.boostsActivated >= quest.target;
      case 'drones':
        return this.dronesCaught >= quest.target;
      case 'elevatorLvl':
        return this.elevator.level >= quest.target;
      case 'prestiges':
        return this.prestiges >= quest.target;
      default:
        return false;
    }
  }

  claimQuest(questId) {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest || this.claimedQuests.includes(questId)) return false;

    if (this.isQuestCompleted(quest)) {
      this.claimedQuests.push(questId);
      this.gems += quest.rewardGems;
      sfx.playFanfare();
      this.createFloatingText(`+${quest.rewardGems} 💎`, 'gems');
      this.saveState();
      return true;
    }
    return false;
  }

  getUnclaimedQuestCount() {
    return QUESTS.filter((q) => !this.claimedQuests.includes(q.id) && this.isQuestCompleted(q)).length;
  }

  // Main game tick
  tick(deltaSeconds) {
    this.playTimeSeconds += deltaSeconds;
    const mult = this.getGlobalMultiplier();

    // 1. Shaft mining
    for (const shaft of this.shafts) {
      if (shaft.unlocked && shaft.hasManager) {
        const rate = shaft.baseProd * shaft.level * mult * this.getDigSpeedMultiplier();
        shaft.currentBin += rate * deltaSeconds;
      }
    }

    // 2. Elevator auto-collection
    if (this.elevator.hasManager) {
      const cap = this.getEffectiveElevatorCapacity();
      const transferRate = (cap / 1.5) * deltaSeconds;
      let needed = transferRate;

      for (const shaft of this.shafts) {
        if (!shaft.unlocked || shaft.currentBin <= 0) continue;
        const take = Math.min(needed, shaft.currentBin);
        shaft.currentBin -= take;
        this.warehouse.surfaceBin += take;
        needed -= take;
        if (needed <= 0) break;
      }
    }

    // 3. Warehouse auto-sell
    if (this.warehouse.hasManager && this.warehouse.surfaceBin > 0) {
      const cap = this.getEffectiveWarehouseCapacity();
      const sellRate = (cap / 1.5) * deltaSeconds;
      const sold = Math.min(sellRate, this.warehouse.surfaceBin);
      this.warehouse.surfaceBin -= sold;
      this.cash += sold;
      this.totalLifetimeCash += sold;
    }
  }

  startLoop() {
    let lastTime = performance.now();
    setInterval(() => {
      const now = performance.now();
      const delta = Math.min(1.0, (now - lastTime) / 1000);
      lastTime = now;
      this.tick(delta);
    }, 100);

    setInterval(() => this.saveState(), 3000);
  }

  scheduleDrone() {
    const delay = Math.floor(Math.random() * 20000) + 35000;
    this.droneTimeout = setTimeout(() => {
      this.spawnDrone();
    }, delay);
  }

  spawnDrone() {
    const droneEl = document.getElementById('flying-drone');
    if (!droneEl) return;

    this.droneActive = true;
    droneEl.classList.add('fly');
    sfx.playDrone();

    droneEl.onclick = () => {
      if (!this.droneActive) return;
      this.droneActive = false;
      this.dronesCaught += 1;
      droneEl.classList.remove('fly');
      this.openDroneRewardModal();
      this.scheduleDrone();
    };

    setTimeout(() => {
      if (this.droneActive) {
        this.droneActive = false;
        droneEl.classList.remove('fly');
        this.scheduleDrone();
      }
    }, 11000);
  }

  openDroneRewardModal() {
    const modal = document.getElementById('drone-modal');
    const claimBtn = document.getElementById('drone-ad-btn');
    const closeBtn = document.getElementById('drone-close-btn');
    const rewardPreview = document.getElementById('drone-reward-preview');

    const rewardCash = Math.max(500, Math.floor(this.cash * 0.3) + 250);
    rewardPreview.textContent = `${formatCurrency(rewardCash)} + 5 💎`;
    modal.classList.add('active');

    claimBtn.onclick = () => {
      ads.showRewardedAd({
        rewardTitle: 'Open Mystery Drone Crate',
        onReward: () => {
          modal.classList.remove('active');
          this.cash += rewardCash;
          this.totalLifetimeCash += rewardCash;
          this.gems += 5;
          sfx.playFanfare();
          this.createFloatingText(`+${formatCurrency(rewardCash)}`, 'cash');
        },
      });
    };

    closeBtn.onclick = () => {
      modal.classList.remove('active');
    };
  }

  checkOfflineProgress() {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastSaved) / 1000);
    if (elapsedSeconds < 20) return;

    const cappedSeconds = Math.min(28800, elapsedSeconds);
    const autoRate = this.calculateAutomationPerSecond();
    if (autoRate <= 0) return;

    const offlineEarned = Math.floor(autoRate * cappedSeconds * 0.75);
    if (offlineEarned <= 0) return;

    const modal = document.getElementById('offline-modal');
    const earnedText = document.getElementById('offline-earned-text');
    const timeText = document.getElementById('offline-time-text');
    const collectBtn = document.getElementById('offline-collect-btn');
    const doubleBtn = document.getElementById('offline-double-btn');

    const hours = Math.floor(cappedSeconds / 3600);
    const mins = Math.floor((cappedSeconds % 3600) / 60);
    timeText.textContent = `You were away for ${hours > 0 ? `${hours}h ` : ''}${mins}m`;
    earnedText.textContent = formatCurrency(offlineEarned);
    modal.classList.add('active');

    collectBtn.onclick = () => {
      this.cash += offlineEarned;
      this.totalLifetimeCash += offlineEarned;
      modal.classList.remove('active');
      sfx.playCoin();
    };

    doubleBtn.onclick = () => {
      ads.showRewardedAd({
        rewardTitle: 'Double Offline Earnings',
        onReward: () => {
          this.cash += offlineEarned * 2;
          this.totalLifetimeCash += offlineEarned * 2;
          modal.classList.remove('active');
          sfx.playFanfare();
          this.createFloatingText(`+${formatCurrency(offlineEarned * 2)}`, 'cash');
        },
      });
    };
  }

  createFloatingText(text, type = 'cash') {
    const container = document.getElementById('floating-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `floating-number ${type}`;
    el.textContent = text;
    el.style.left = `${Math.random() * 60 + 20}%`;
    el.style.top = `${Math.random() * 40 + 30}%`;
    container.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 900);
  }

  saveState() {
    this.lastSaved = Date.now();
    const data = {
      cash: this.cash,
      gems: this.gems,
      totalLifetimeCash: this.totalLifetimeCash,
      totalTaps: this.totalTaps,
      boostsActivated: this.boostsActivated,
      dronesCaught: this.dronesCaught,
      prestiges: this.prestiges,
      playTimeSeconds: this.playTimeSeconds,
      boostEndTime: this.boostEndTime,
      lastSaved: this.lastSaved,
      elevator: this.elevator,
      warehouse: this.warehouse,
      shafts: this.shafts,
      research: this.research,
      claimedQuests: this.claimedQuests,
    };
    try {
      localStorage.setItem('idle_miner_save_v2', JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('idle_miner_save_v2') || localStorage.getItem('idle_miner_save_v1');
      if (saved) {
        const p = JSON.parse(saved);
        this.cash = p.cash || 0;
        this.gems = p.gems ?? 15;
        this.totalLifetimeCash = p.totalLifetimeCash || this.cash;
        this.totalTaps = p.totalTaps || 0;
        this.boostsActivated = p.boostsActivated || 0;
        this.dronesCaught = p.dronesCaught || 0;
        this.prestiges = p.prestiges || 0;
        this.playTimeSeconds = p.playTimeSeconds || 0;
        this.boostEndTime = p.boostEndTime || 0;
        this.lastSaved = p.lastSaved || Date.now();
        if (p.elevator) Object.assign(this.elevator, p.elevator);
        if (p.warehouse) Object.assign(this.warehouse, p.warehouse);
        if (p.research) Object.assign(this.research, p.research);
        if (p.claimedQuests) this.claimedQuests = p.claimedQuests;
        if (p.shafts && Array.isArray(p.shafts)) {
          p.shafts.forEach((savedShaft) => {
            const current = this.shafts.find((s) => s.id === savedShaft.id);
            if (current) Object.assign(current, savedShaft);
          });
        }
      }
    } catch (e) {
      console.error('Error loading save:', e);
    }
  }

  resetAllData() {
    localStorage.removeItem('idle_miner_save_v1');
    localStorage.removeItem('idle_miner_save_v2');
    window.location.reload();
  }
}

export const game = new GameEngine();
