import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';

class AdService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.initialized = false;
    this.testAdUnits = {
      // Official Google test ad unit IDs
      banner: 'ca-app-pub-3940256099942544/6300978111',
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
    };
  }

  async initialize() {
    if (!this.isNative) {
      console.log('[AdMob] Running on Web - Simulating AdMob');
      this.initialized = true;
      return;
    }

    try {
      await AdMob.initialize({
        initializeForTesting: true,
      });
      this.initialized = true;
      console.log('[AdMob] Native AdMob Initialized successfully');
    } catch (err) {
      console.warn('[AdMob] Native initialization failed, falling back to mock:', err);
      this.initialized = true;
    }
  }

  /**
   * Shows a rewarded video ad
   * @param {Object} options
   * @param {string} options.rewardTitle e.g. "Double Offline Cash"
   * @param {Function} options.onReward Callback when user completes ad
   * @param {Function} [options.onDismiss] Callback if ad closed early
   */
  async showRewardedAd({ rewardTitle = 'Reward', onReward, onDismiss }) {
    if (!this.isNative) {
      this._showWebMockAd(rewardTitle, onReward, onDismiss);
      return;
    }

    try {
      let rewardedEarned = false;

      const rewardListener = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (reward) => {
          console.log('[AdMob] Rewarded completed:', reward);
          rewardedEarned = true;
          if (onReward) onReward(reward);
        }
      );

      const dismissListener = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          rewardListener.remove();
          dismissListener.remove();
          if (!rewardedEarned && onDismiss) {
            onDismiss();
          }
        }
      );

      await AdMob.prepareRewardVideoAd({
        adId: this.testAdUnits.rewarded,
      });

      await AdMob.showRewardVideoAd();
    } catch (err) {
      console.error('[AdMob] Error showing native rewarded ad:', err);
      // Fallback to web modal so the player isn't stuck
      this._showWebMockAd(rewardTitle, onReward, onDismiss);
    }
  }

  // Web fallback simulation modal with countdown
  _showWebMockAd(title, onReward, onDismiss) {
    const modal = document.getElementById('ad-mock-modal');
    const titleEl = document.getElementById('ad-mock-title');
    const timerEl = document.getElementById('ad-mock-timer');
    const skipBtn = document.getElementById('ad-mock-skip');

    if (!modal) {
      // If modal element isn't in DOM, reward directly
      if (onReward) onReward({ amount: 1 });
      return;
    }

    titleEl.textContent = title;
    modal.classList.add('active');
    let timeLeft = 3;
    timerEl.textContent = `Ad playing... ${timeLeft}s`;
    skipBtn.disabled = true;
    skipBtn.textContent = 'Wait for reward...';

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        timerEl.textContent = `Ad playing... ${timeLeft}s`;
      } else {
        clearInterval(interval);
        timerEl.textContent = '🎉 Reward Ready!';
        skipBtn.disabled = false;
        skipBtn.textContent = 'Collect Reward';
        skipBtn.onclick = () => {
          modal.classList.remove('active');
          if (onReward) onReward({ amount: 1 });
        };
      }
    }, 1000);
  }
}

export const ads = new AdService();
