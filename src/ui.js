import { game, formatCurrency, formatGems, RESEARCH_PERKS, QUESTS } from './game.js';
import { ads } from './ads.js';
import { sfx } from './audio.js';

export class UIRenderer {
  constructor() {
    this.activeTab = 'mine';

    // Top Header
    this.cashEl = document.getElementById('cash-display');
    this.gemsEl = document.getElementById('gems-display');
    this.boostBtn = document.getElementById('boost-btn');
    this.boostTimerEl = document.getElementById('boost-timer');
    this.prestigeBtn = document.getElementById('prestige-badge-btn');
    this.settingsBtn = document.getElementById('settings-btn');

    // Surface
    this.warehouseBinEl = document.getElementById('warehouse-bin');
    this.warehouseLevelEl = document.getElementById('warehouse-level');
    this.warehouseUpgradeBtn = document.getElementById('warehouse-upgrade-btn');
    this.warehouseTapBtn = document.getElementById('warehouse-tap-btn');
    this.warehouseTruckEl = document.getElementById('warehouse-truck');

    this.elevatorLoadEl = document.getElementById('elevator-load');
    this.elevatorLevelEl = document.getElementById('elevator-level');
    this.elevatorUpgradeBtn = document.getElementById('elevator-upgrade-btn');
    this.elevatorTapBtn = document.getElementById('elevator-tap-btn');
    this.elevatorCabinEl = document.getElementById('elevator-cabin');

    // Tab Views
    this.tabViews = {
      mine: document.getElementById('tab-mine-view'),
      managers: document.getElementById('tab-managers-view'),
      research: document.getElementById('tab-research-view'),
      quests: document.getElementById('tab-quests-view'),
      shop: document.getElementById('tab-shop-view'),
    };

    // Nav Buttons
    this.navBtns = document.querySelectorAll('.nav-item');
    this.questBadgeEl = document.getElementById('quests-badge');

    // Containers
    this.shaftsContainer = document.getElementById('shafts-list');
    this.managersContainer = document.getElementById('managers-list-content');
    this.researchContainer = document.getElementById('research-list-content');
    this.questsContainer = document.getElementById('quests-list-content');
  }

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setupModals();

    this.renderShafts();
    this.renderManagers();
    this.renderResearch();
    this.renderQuests();

    // 60 FPS visual loop
    let lastAnim = 0;
    const loop = (timestamp) => {
      this.updateUI();
      if (timestamp - lastAnim > 40) {
        this.updateAnimations();
        lastAnim = timestamp;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setupNavigation() {
    this.navBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    if (!this.tabViews[tabName]) return;
    this.activeTab = tabName;

    // Update active nav button
    this.navBtns.forEach((b) => {
      if (b.dataset.tab === tabName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Toggle tab views
    Object.keys(this.tabViews).forEach((key) => {
      if (key === tabName) {
        this.tabViews[key].classList.add('active');
      } else {
        this.tabViews[key].classList.remove('active');
      }
    });

    // Refresh contents when entering tab
    if (tabName === 'managers') this.renderManagers();
    if (tabName === 'research') this.renderResearch();
    if (tabName === 'quests') this.renderQuests();
    sfx.playDig();
  }

  setupEventListeners() {
    // 2x Boost
    this.boostBtn.addEventListener('click', () => {
      ads.showRewardedAd({
        rewardTitle: '2 Hours of 2x Revenue Boost',
        onReward: () => {
          game.activateBoost(2);
        },
      });
    });

    // Surface actions
    this.warehouseTapBtn.addEventListener('click', () => {
      game.tapWarehouse();
      this.triggerTruckAnimation();
    });
    this.warehouseUpgradeBtn.addEventListener('click', () => game.upgradeWarehouse());

    this.elevatorTapBtn.addEventListener('click', () => {
      game.tapElevator();
      this.triggerElevatorAnimation();
    });
    this.elevatorUpgradeBtn.addEventListener('click', () => game.upgradeElevator());

    // Time Warp Shop items
    document.getElementById('warp-ad-btn')?.addEventListener('click', () => {
      ads.showRewardedAd({
        rewardTitle: '1 Hour Instant Time Warp',
        onReward: () => {
          game.applyTimeWarp(1);
        },
      });
    });

    document.getElementById('warp-4h-btn')?.addEventListener('click', () => {
      if (game.gems >= 20) {
        game.gems -= 20;
        game.applyTimeWarp(4);
      }
    });

    document.getElementById('warp-24h-btn')?.addEventListener('click', () => {
      if (game.gems >= 80) {
        game.gems -= 80;
        game.applyTimeWarp(24);
      }
    });
  }

  setupModals() {
    // Prestige Modal
    const prestigeModal = document.getElementById('prestige-modal');
    this.prestigeBtn.addEventListener('click', () => {
      const rewardGems = game.getPrestigeRewardGems();
      document.getElementById('prestige-reward-gems').textContent = `+${rewardGems} 💎`;
      document.getElementById('prestige-mult-preview').textContent = `+${((game.prestiges + 1) * 25)}% Multiplier`;
      const confirmBtn = document.getElementById('prestige-confirm-btn');
      confirmBtn.disabled = !game.canPrestige();
      prestigeModal.classList.add('active');
    });

    document.getElementById('prestige-confirm-btn').addEventListener('click', () => {
      if (game.performPrestige()) {
        prestigeModal.classList.remove('active');
        this.renderShafts();
        this.renderManagers();
        this.switchTab('mine');
      }
    });

    document.getElementById('prestige-close-btn').addEventListener('click', () => {
      prestigeModal.classList.remove('active');
    });

    // Settings Modal
    const settingsModal = document.getElementById('settings-modal');
    this.settingsBtn.addEventListener('click', () => {
      document.getElementById('stat-total-cash').textContent = formatCurrency(game.totalLifetimeCash);
      document.getElementById('stat-taps').textContent = game.totalTaps.toLocaleString();
      document.getElementById('stat-prestiges').textContent = game.prestiges;
      const mins = Math.floor(game.playTimeSeconds / 60);
      document.getElementById('stat-playtime').textContent = `${mins} mins`;
      settingsModal.classList.add('active');
    });

    document.getElementById('settings-close-btn').addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });

    const muteBtn = document.getElementById('setting-mute-btn');
    muteBtn.addEventListener('click', () => {
      const isMuted = sfx.toggleMute();
      muteBtn.textContent = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
    });

    document.getElementById('setting-reset-btn').addEventListener('click', () => {
      if (confirm('Reset all game progress? This cannot be undone.')) {
        game.resetAllData();
      }
    });
  }

  triggerTruckAnimation() {
    if (!this.warehouseTruckEl) return;
    this.warehouseTruckEl.classList.remove('driving');
    void this.warehouseTruckEl.offsetWidth; // re-flow
    this.warehouseTruckEl.classList.add('driving');
  }

  triggerElevatorAnimation() {
    if (!this.elevatorCabinEl) return;
    this.elevatorCabinEl.classList.remove('moving');
    void this.elevatorCabinEl.offsetWidth;
    this.elevatorCabinEl.classList.add('moving');
  }

  updateAnimations() {
    // Animate elevator cabin continuously if manager hired
    if (game.elevator.hasManager && this.elevatorCabinEl) {
      if (!this.elevatorCabinEl.classList.contains('auto-moving')) {
        this.elevatorCabinEl.classList.add('auto-moving');
      }
    } else if (this.elevatorCabinEl) {
      this.elevatorCabinEl.classList.remove('auto-moving');
    }

    // Animate truck continuously if manager hired
    if (game.warehouse.hasManager && this.warehouseTruckEl && game.warehouse.surfaceBin > 0) {
      if (!this.warehouseTruckEl.classList.contains('auto-driving')) {
        this.warehouseTruckEl.classList.add('auto-driving');
      }
    } else if (this.warehouseTruckEl) {
      this.warehouseTruckEl.classList.remove('auto-driving');
    }
  }

  renderShafts() {
    this.shaftsContainer.innerHTML = '';

    game.shafts.forEach((shaft) => {
      const card = document.createElement('div');
      card.className = `shaft-card ${shaft.unlocked ? 'unlocked' : 'locked'}`;
      card.id = `shaft-${shaft.id}`;

      if (shaft.unlocked) {
        card.innerHTML = `
          <div class="shaft-icon ${shaft.hasManager ? 'mining-anim' : ''}">
            <span class="icon-ore">${shaft.icon}</span>
            <span class="miner-pick">⛏️</span>
          </div>
          <div class="shaft-details">
            <div class="shaft-name-row">
              <span class="shaft-name">${shaft.name} <span class="shaft-depth">${shaft.depth}</span></span>
              <span class="shaft-level" id="shaft-lvl-${shaft.id}">Lv. ${shaft.level}</span>
            </div>
            <div class="shaft-bin-row">
              <span class="shaft-bin" id="shaft-bin-${shaft.id}">Bin: 0</span>
              <span class="shaft-rate" id="shaft-rate-${shaft.id}">+${formatCurrency(shaft.baseProd * shaft.level)}/s</span>
            </div>
            <div class="shaft-progress-bar">
              <div class="shaft-progress-fill" id="shaft-prog-${shaft.id}"></div>
            </div>
          </div>
          <div class="shaft-actions">
            <button class="btn btn-tap" id="shaft-tap-${shaft.id}">Dig</button>
            <button class="btn btn-upgrade" id="shaft-upg-${shaft.id}">
              <span>Upg</span>
              <span class="cost" id="shaft-cost-${shaft.id}">$0</span>
            </button>
          </div>
        `;

        this.shaftsContainer.appendChild(card);

        card.querySelector(`#shaft-tap-${shaft.id}`).addEventListener('click', () => {
          game.tapShaft(shaft.id);
          const iconEl = card.querySelector('.shaft-icon');
          iconEl.classList.add('tap-swing');
          setTimeout(() => iconEl.classList.remove('tap-swing'), 200);
        });

        card.querySelector(`#shaft-upg-${shaft.id}`).addEventListener('click', () => {
          game.upgradeShaft(shaft.id);
          this.renderShafts();
        });
      } else {
        card.innerHTML = `
          <div class="shaft-icon locked-icon">🔒</div>
          <div class="shaft-details">
            <div class="shaft-name">${shaft.name} <span class="shaft-depth">${shaft.depth}</span></div>
            <span class="shaft-locked-desc">Dig deeper for massive multiplier profits</span>
          </div>
          <button class="btn btn-unlock" id="shaft-unlock-${shaft.id}">
            Unlock: ${formatCurrency(shaft.unlockCost)}
          </button>
        `;

        this.shaftsContainer.appendChild(card);

        card.querySelector(`#shaft-unlock-${shaft.id}`).addEventListener('click', () => {
          if (game.cash >= shaft.unlockCost) {
            game.unlockShaft(shaft.id);
            this.renderShafts();
          }
        });
      }
    });
  }

  renderManagers() {
    this.managersContainer.innerHTML = '';

    // Elevator manager
    const elCard = document.createElement('div');
    elCard.className = 'manager-item';
    elCard.innerHTML = `
      <div class="m-avatar">🛗</div>
      <div class="m-info">
        <span class="m-title">Elevator Operator</span>
        <span class="m-desc">Automates elevator gathering</span>
      </div>
      <button class="btn ${game.elevator.hasManager ? 'btn-hired' : 'btn-hire'}" id="hire-elevator">
        ${game.elevator.hasManager ? 'Hired' : `Hire: ${formatCurrency(game.elevator.managerCost)}`}
      </button>
    `;
    this.managersContainer.appendChild(elCard);
    if (!game.elevator.hasManager) {
      elCard.querySelector('#hire-elevator').onclick = () => {
        game.hireManager('elevator');
        this.renderManagers();
      };
    }

    // Warehouse manager
    const whCard = document.createElement('div');
    whCard.className = 'manager-item';
    whCard.innerHTML = `
      <div class="m-avatar">🚚</div>
      <div class="m-info">
        <span class="m-title">Warehouse Dispatcher</span>
        <span class="m-desc">Automates surface selling for Cash</span>
      </div>
      <button class="btn ${game.warehouse.hasManager ? 'btn-hired' : 'btn-hire'}" id="hire-warehouse">
        ${game.warehouse.hasManager ? 'Hired' : `Hire: ${formatCurrency(game.warehouse.managerCost)}`}
      </button>
    `;
    this.managersContainer.appendChild(whCard);
    if (!game.warehouse.hasManager) {
      whCard.querySelector('#hire-warehouse').onclick = () => {
        game.hireManager('warehouse');
        this.renderManagers();
      };
    }

    // Shaft managers
    game.shafts.forEach((shaft) => {
      if (!shaft.unlocked) return;
      const sCard = document.createElement('div');
      sCard.className = 'manager-item';
      sCard.innerHTML = `
        <div class="m-avatar">${shaft.icon}</div>
        <div class="m-info">
          <span class="m-title">${shaft.name} Foreman</span>
          <span class="m-desc">Auto-mines continuously</span>
        </div>
        <button class="btn ${shaft.hasManager ? 'btn-hired' : 'btn-hire'}" id="hire-shaft-${shaft.id}">
          ${shaft.hasManager ? 'Hired' : `Hire: ${formatCurrency(shaft.managerCost)}`}
        </button>
      `;
      this.managersContainer.appendChild(sCard);
      if (!shaft.hasManager) {
        sCard.querySelector(`#hire-shaft-${shaft.id}`).onclick = () => {
          game.hireManager('shaft', shaft.id);
          this.renderManagers();
        };
      }
    });
  }

  renderResearch() {
    this.researchContainer.innerHTML = '';

    RESEARCH_PERKS.forEach((perk) => {
      const currentLvl = game.research[perk.id] || 0;
      const cost = game.getResearchCost(perk.id);
      const isMax = currentLvl >= perk.maxLvl;

      const card = document.createElement('div');
      card.className = 'research-card';
      card.innerHTML = `
        <div class="research-icon">${perk.icon}</div>
        <div class="research-info">
          <div class="research-name-row">
            <span class="research-name">${perk.name}</span>
            <span class="research-level">Lv. ${currentLvl}/${perk.maxLvl}</span>
          </div>
          <span class="research-desc">${perk.desc}</span>
        </div>
        <button class="btn btn-research ${isMax ? 'btn-max' : ''}" id="res-btn-${perk.id}" ${isMax || game.gems < cost ? 'disabled' : ''}>
          ${isMax ? 'MAX' : `${cost} 💎`}
        </button>
      `;

      this.researchContainer.appendChild(card);

      if (!isMax) {
        card.querySelector(`#res-btn-${perk.id}`).onclick = () => {
          if (game.upgradeResearch(perk.id)) {
            this.renderResearch();
          }
        };
      }
    });
  }

  renderQuests() {
    this.questsContainer.innerHTML = '';

    QUESTS.forEach((quest) => {
      const completed = game.isQuestCompleted(quest);
      const claimed = game.claimedQuests.includes(quest.id);

      const card = document.createElement('div');
      card.className = `quest-card ${claimed ? 'claimed' : completed ? 'ready' : ''}`;
      card.innerHTML = `
        <div class="quest-info">
          <span class="quest-title">${quest.title}</span>
          <span class="quest-desc">${quest.desc}</span>
        </div>
        <button class="btn btn-quest ${claimed ? 'btn-claimed' : completed ? 'btn-claim' : 'btn-progress'}" id="quest-btn-${quest.id}" ${claimed || !completed ? 'disabled' : ''}>
          ${claimed ? 'Claimed' : completed ? `Claim ${quest.rewardGems} 💎` : `${quest.rewardGems} 💎`}
        </button>
      `;

      this.questsContainer.appendChild(card);

      if (completed && !claimed) {
        card.querySelector(`#quest-btn-${quest.id}`).onclick = () => {
          game.claimQuest(quest.id);
          this.renderQuests();
        };
      }
    });
  }

  updateUI() {
    // Currencies
    this.cashEl.textContent = formatCurrency(game.cash);
    this.gemsEl.textContent = formatGems(game.gems);

    // Boost timer
    const boostSec = game.getBoostRemainingSeconds();
    if (boostSec > 0) {
      const mins = Math.floor(boostSec / 60);
      const secs = boostSec % 60;
      this.boostTimerEl.textContent = `2x (${mins}:${secs < 10 ? '0' : ''}${secs})`;
      this.boostBtn.classList.add('active');
    } else {
      this.boostTimerEl.textContent = '2x Boost';
      this.boostBtn.classList.remove('active');
    }

    // Prestige Badge button
    if (game.canPrestige()) {
      this.prestigeBtn.classList.add('glow');
      this.prestigeBtn.textContent = `🌟 Ascend (+${game.getPrestigeRewardGems()} 💎)`;
    } else {
      this.prestigeBtn.classList.remove('glow');
      this.prestigeBtn.textContent = `⭐ Prestige (Lv. ${game.prestiges})`;
    }

    // Quest badge notification
    const unclaimed = game.getUnclaimedQuestCount();
    if (unclaimed > 0) {
      this.questBadgeEl.textContent = unclaimed;
      this.questBadgeEl.style.display = 'inline-block';
    } else {
      this.questBadgeEl.style.display = 'none';
    }

    // Surface Displays
    const elevCap = game.getEffectiveElevatorCapacity();
    this.elevatorLevelEl.textContent = `Lv. ${game.elevator.level}`;
    this.elevatorLoadEl.textContent = `Load: ${Math.floor(game.elevator.currentLoad)} / ${elevCap}`;
    this.elevatorUpgradeBtn.querySelector('.cost').textContent = formatCurrency(game.getElevatorUpgradeCost());
    this.elevatorUpgradeBtn.disabled = game.cash < game.getElevatorUpgradeCost();

    const whCap = game.getEffectiveWarehouseCapacity();
    this.warehouseLevelEl.textContent = `Lv. ${game.warehouse.level}`;
    this.warehouseBinEl.textContent = `Surface Ore: ${formatCurrency(game.warehouse.surfaceBin)}`;
    this.warehouseUpgradeBtn.querySelector('.cost').textContent = formatCurrency(game.getWarehouseUpgradeCost());
    this.warehouseUpgradeBtn.disabled = game.cash < game.getWarehouseUpgradeCost();

    // Shaft dynamic values
    game.shafts.forEach((shaft) => {
      if (!shaft.unlocked) {
        const unlockBtn = document.getElementById(`shaft-unlock-${shaft.id}`);
        if (unlockBtn) unlockBtn.disabled = game.cash < shaft.unlockCost;
        return;
      }

      const binEl = document.getElementById(`shaft-bin-${shaft.id}`);
      if (binEl) binEl.textContent = `Bin: ${formatCurrency(shaft.currentBin)}`;

      const costEl = document.getElementById(`shaft-cost-${shaft.id}`);
      const cost = game.getShaftUpgradeCost(shaft);
      if (costEl) costEl.textContent = formatCurrency(cost);

      const upgBtn = document.getElementById(`shaft-upg-${shaft.id}`);
      if (upgBtn) upgBtn.disabled = game.cash < cost;

      const rateEl = document.getElementById(`shaft-rate-${shaft.id}`);
      if (rateEl) {
        const rate = shaft.baseProd * shaft.level * game.getGlobalMultiplier() * game.getDigSpeedMultiplier();
        rateEl.textContent = `+${formatCurrency(rate)}/s`;
      }
    });
  }
}
