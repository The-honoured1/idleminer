# Idle Miner Tycoon ⛏️

A mobile idle management tycoon built with **JavaScript**, **Vite**, and **Capacitor 6**, monetized with **Google AdMob**, and configured with package name `com.ceo3.idleminer`.

---

## 🚀 Quick Start (Play & Test in Browser)

```bash
cd /home/chris/Projects/idleminer
npm run dev
```
Open `http://localhost:5173` in your browser.
* On the web, AdMob rewarded video ads are automatically simulated with a 3-second interactive countdown modal so you can test all reward loops without needing a physical phone!

---

## 📱 Build APK & AAB with GitHub Actions (No local Android Studio needed)

1. Initialize a git repository and push to GitHub:
   ```bash
   cd /home/chris/Projects/idleminer
   git init
   git add .
   git commit -m "Initial commit of Idle Miner"
   git remote add origin https://github.com/YOUR_USERNAME/idleminer.git
   git push -u origin main
   ```
2. On GitHub, go to the **Actions** tab.
3. The **Build Android APK & Google Play AAB** workflow will run automatically.
4. When finished, download the **`IdleMiner-Debug-APK`** to install on your phone, or **`IdleMiner-Release-AAB`** for the Google Play Store!

---

## 💰 AdMob Configuration

* **Package ID**: `com.ceo3.idleminer`
* **Test IDs**: Currently uses official Google AdMob test IDs so you won't get banned while testing.
* **To switch to your live AdMob IDs**:
  1. Open `android/app/src/main/AndroidManifest.xml` and replace `ca-app-pub-3940256099942544~3347511713` with your real **AdMob App ID**.
  2. Open `src/ads.js` and replace the test unit IDs with your real **Rewarded Ad Unit ID**.
  3. Run `npm run build && npx cap sync android`.

---

## 🎮 Game Features Included

* **7 Mine Shafts**: Coal, Copper, Iron, Gold, Diamond, Amethyst, and Cosmic Crystal.
* **Automation Managers**: Hire Shaft Foremen, Elevator Operators, and Warehouse Dispatchers.
* **Offline Progress System**: Saves timestamp in `localStorage`. Shows "Welcome Back" modal when away with a **"Watch Ad for 2x Offline Cash"** button!
* **AdMob Boost**: 2x speed for 2 hours button with countdown timer.
* **Flying Lucky Drone**: Randomly spawns across the sky carrying golden crates unlocked via Rewarded Ads.
* **Retro Synthesizer SFX**: 100% Web Audio API procedural sound effects (coins, digging, upgrade chimes, drone buzz).
