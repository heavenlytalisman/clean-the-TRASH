const CONFIG = {
  speech: {
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    autoRestart: true,
    restartDelay: 50,
    maxAlternatives: 3,
    confidenceThreshold: 0.5
  },
  
  assets: {
    size: 250,
    maxCount: 50,
    spawnDelay: 50,
    animationSpeed: 0,
    bounceReduction: 0,
    intrusiveScale: 1.5,
    chaoticMovement: false,
    randomSpacing: 150,
    colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    assetFiles: [
      '1.jpg',
      '2.jpg', 
      '3.jpg',
      '4.jpg',
      '5.jpg',
      '6.jpg',
      '7.jpg'
    ],
    folder: './assets/',
    fallbackToColors: true
  },
  
  timing: {
    hiAnimationDuration: 6000, // Slower intro
    messageTransitions: 2000, // Slower message changes
    assetRemovalTime: 400,
    mockingFloodDuration: 8000,
    speechTimeout: 5000,
    continuousSpawnInterval: 1500, // Slower spawning
    promptDelay: 4000 // New: delay between prompts
  },
  
  audio: {
    introVolume: 0.7,
    enableAudio: true,
    fadeIn: true,
    fadeOut: true
  },
  
  keyboard: {
    enabled: true,
    randomKeys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm'],
    currentKey: null,
    showHint: true,
    mockingSpawnActive: false
  },
  
  debug: true
};

const COMMANDS = {
  HELLO: ['hello', 'hi', 'hey', 'hallo', 'helo', 'hullo', 'yellow', 'helo']
};

class AppState {
  constructor() {
    this.listening = false;
    this.stage = 0;
    this.spawnCount = 1;
    this.lastTranscript = '';
    this.assets = [];
    this.animationActive = false;
    this.recognition = null;
    this.availableAssets = [];
    this.volumeThreshold = 0;
    this.isMocking = false;
    this.speechTimeout = null;
    this.isProcessing = false;
    this.keyboardAttempts = 0;
    this.voiceAttempts = 0;
    this.currentRandomKey = null;
    this.continuousSpawnInterval = null;
    this.mockingMessages = [];
    this.isInMockingMode = false;
    this.occupiedPositions = [];
  }

  reset() {
    this.stage = 0;
    this.spawnCount = 1;
    this.lastTranscript = '';
    this.assets = [];
    this.animationActive = false;
    this.volumeThreshold = 0;
    this.isMocking = false;
    this.isProcessing = false;
    this.keyboardAttempts = 0;
    this.voiceAttempts = 0;
    this.currentRandomKey = null;
    this.isInMockingMode = false;
    this.occupiedPositions = [];
    
    document.querySelectorAll('.asset').forEach(el => el.remove());
    
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    
    if (this.continuousSpawnInterval) {
      clearInterval(this.continuousSpawnInterval);
      this.continuousSpawnInterval = null;
    }
    
    CONFIG.keyboard.mockingSpawnActive = false;
  }

  updateDebug() {
    if (!CONFIG.debug) return;
    
    const debugStage = document.getElementById('debug-stage');
    const debugAssets = document.getElementById('debug-assets');
    const debugAudio = document.getElementById('debug-audio');
    
    if (debugStage) debugStage.textContent = `${this.stage} (V:${this.voiceAttempts}, K:${this.keyboardAttempts})`;
    if (debugAssets) debugAssets.textContent = this.assets.length;
    if (debugAudio) debugAudio.textContent = AudioManager.audioEnabled ? 'ready' : 'loading';
  }
}

const appState = new AppState();

const spawnArea = document.getElementById('spawn-area');
const messageEl = document.getElementById('message');
const hiOverlay = document.getElementById('hi-overlay');
const debugPanel = document.getElementById('debug-panel');

// Enhanced Audio Manager with better error handling
class AudioManager {
  static init() {
    this.introAudio = document.getElementById('intro-audio');
    this.audioEnabled = false;
    this.fadeInterval = null;
    
    if (this.introAudio) {
      // Set initial properties
      this.introAudio.volume = CONFIG.audio.introVolume;
      this.introAudio.loop = false;
      this.introAudio.preload = 'auto';
      
      // Multiple event listeners for better compatibility
      this.introAudio.addEventListener('loadeddata', () => {
        this.audioEnabled = true;
        console.log('Audio loaded successfully');
        appState.updateDebug();
      });
      
      this.introAudio.addEventListener('canplaythrough', () => {
        this.audioEnabled = true;
        console.log('Audio can play through');
        appState.updateDebug();
      });
      
      this.introAudio.addEventListener('error', (e) => {
        console.warn('Audio failed to load:', e);
        this.audioEnabled = false;
        appState.updateDebug();
      });
      
      // Force load the audio
      this.introAudio.load();
      
      return true;
    }
    
    return false;
  }
  
  static async playIntroAudio() {
    if (this.audioEnabled && this.introAudio && CONFIG.audio.enableAudio) {
      try {
        // Reset audio to beginning
        this.introAudio.currentTime = 0;
        
        if (CONFIG.audio.fadeIn) {
          this.introAudio.volume = 0;
        } else {
          this.introAudio.volume = CONFIG.audio.introVolume;
        }
        
        // Use async play for better browser compatibility
        const playPromise = this.introAudio.play();
        
        if (playPromise !== undefined) {
          await playPromise.then(() => {
            console.log('Audio started playing successfully');
            if (CONFIG.audio.fadeIn) {
              this.fadeIn();
            }
          }).catch(error => {
            console.warn('Audio autoplay prevented:', error);
            // Try to play without user interaction after a delay
            setTimeout(() => {
              this.introAudio.play().catch(e => console.warn('Second audio attempt failed:', e));
            }, 1000);
          });
        }
      } catch (error) {
        console.warn('Error playing audio:', error);
      }
    } else {
      console.log('Audio not available or disabled');
    }
  }
  
  static fadeIn(duration = 2000) {
    if (!this.introAudio) return;
    
    const targetVolume = CONFIG.audio.introVolume;
    const steps = 60;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;
    
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    this.fadeInterval = setInterval(() => {
      if (currentStep < steps) {
        this.introAudio.volume = Math.min(volumeStep * currentStep, targetVolume);
        currentStep++;
      } else {
        clearInterval(this.fadeInterval);
        this.introAudio.volume = targetVolume;
        console.log('Audio fade in complete');
      }
    }, stepTime);
  }
  
  static stopIntroAudio() {
    if (this.introAudio) {
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }
      this.introAudio.pause();
      this.introAudio.currentTime = 0;
    }
  }
}

class AssetLoader {
  static async loadAvailableAssets() {
    const availableAssets = [];
    
    for (const asset of CONFIG.assets.assetFiles) {
      try {
        const response = await fetch(CONFIG.assets.folder + asset, { method: 'HEAD' });
        if (response.ok) {
          availableAssets.push(asset);
        }
      } catch (error) {
        console.log(`Asset ${asset} not found, skipping...`);
      }
    }

    appState.availableAssets = availableAssets;
    
    if (CONFIG.debug) {
      console.log('Available assets:', availableAssets);
    }
    
    return availableAssets;
  }

  static getRandomAsset() {
    if (appState.availableAssets.length > 0) {
      const randomIndex = Math.floor(Math.random() * appState.availableAssets.length);
      return CONFIG.assets.folder + appState.availableAssets[randomIndex];
    }
    return null;
  }
}

class AssetManager {
  static spawn(count = 1) {
    if (appState.isInMockingMode) {
      console.log('Skipping normal spawn - in mocking mode');
      return;
    }

    spawnArea.querySelectorAll('.asset').forEach(el => el.remove());
    appState.assets = [];
    appState.occupiedPositions = [];

    const assetSize = CONFIG.assets.size * CONFIG.assets.intrusiveScale;
    const maxWidth = spawnArea.clientWidth;
    const maxHeight = spawnArea.clientHeight;

    if (maxWidth < 100 || maxHeight < 100) return;

    console.log(`Spawning ${count} normal assets`);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createStaticAsset(assetSize, maxWidth, maxHeight, false);
      }, i * CONFIG.assets.spawnDelay);
    }

    appState.updateDebug();
  }
  
  static addRandomIntrusiveAsset() {
    if (!appState.isInMockingMode) {
      console.log('Not in mocking mode - skipping intrusive asset');
      return;
    }

    const assetSize = CONFIG.assets.size * CONFIG.assets.intrusiveScale;
    const maxWidth = spawnArea.clientWidth;
    const maxHeight = spawnArea.clientHeight;
    
    if (maxWidth < 100 || maxHeight < 100) return;
    
    console.log('Adding intrusive asset during mocking');
    this.createStaticAsset(assetSize, maxWidth, maxHeight, true);
    appState.updateDebug();
  }

  static createStaticAsset(assetSize, maxWidth, maxHeight, isContinuous = false) {
    const asset = document.createElement('div');
    asset.className = 'asset';
    
    let x, y;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!validPosition && attempts < maxAttempts) {
      x = Math.random() * (maxWidth - assetSize);
      y = Math.random() * (maxHeight - assetSize);
      
      const centerX = maxWidth / 2;
      const centerY = maxHeight / 2;
      const distanceFromCenter = Math.sqrt(
        Math.pow(x + assetSize/2 - centerX, 2) + Math.pow(y + assetSize/2 - centerY, 2)
      );
      
      if (distanceFromCenter < 200) {
        attempts++;
        continue;
      }
      
      validPosition = true;
      
      for (let occupiedPos of appState.occupiedPositions) {
        const distance = Math.sqrt(
          Math.pow(x - occupiedPos.x, 2) + Math.pow(y - occupiedPos.y, 2)
        );
        
        const requiredDistance = CONFIG.assets.randomSpacing;
        
        if (distance < requiredDistance) {
          validPosition = false;
          break;
        }
      }
      
      attempts++;
    }
    
    if (!validPosition) {
      const quadrant = Math.floor(Math.random() * 4);
      switch(quadrant) {
        case 0:
          x = Math.random() * (maxWidth * 0.4);
          y = Math.random() * (maxHeight * 0.4);
          break;
        case 1:
          x = maxWidth * 0.6 + Math.random() * (maxWidth * 0.4 - assetSize);
          y = Math.random() * (maxHeight * 0.4);
          break;
        case 2:
          x = Math.random() * (maxWidth * 0.4);
          y = maxHeight * 0.6 + Math.random() * (maxHeight * 0.4 - assetSize);
          break;
        case 3:
          x = maxWidth * 0.6 + Math.random() * (maxWidth * 0.4 - assetSize);
          y = maxHeight * 0.6 + Math.random() * (maxHeight * 0.4 - assetSize);
          break;
      }
      console.log(`Forced positioning to quadrant ${quadrant}`);
    }

    const assetFile = AssetLoader.getRandomAsset();
    let styling;
    
    const baseSize = assetSize + (Math.random() * 100 - 50);
    const index = appState.assets.length;

    if (assetFile && appState.availableAssets.length > 0) {
      styling = `
        position: absolute;
        width: ${baseSize}px;
        height: ${baseSize}px;
        background-image: url('${assetFile}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        border: ${isContinuous ? 8 : 6}px solid ${isContinuous ? 'rgba(255, 69, 0, 0.9)' : 'rgba(255, 255, 255, 0.7)'};
        border-radius: 50%;
        box-shadow: 
          0 ${isContinuous ? 25 : 20}px ${isContinuous ? 100 : 80}px ${isContinuous ? 'rgba(255, 69, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'}, 
          0 0 ${isContinuous ? 80 : 60}px ${isContinuous ? 'rgba(255, 69, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)'};
        transform: translate(${x}px, ${y}px) scale(1);
        z-index: ${10 + Math.floor(Math.random() * 5)};
        filter: brightness(${isContinuous ? 1.4 : 1.1}) saturate(${isContinuous ? 1.8 : 1.2});
      `;
    } else {
      const color = CONFIG.assets.colors[index % CONFIG.assets.colors.length];
      styling = `
        position: absolute;
        width: ${baseSize}px;
        height: ${baseSize}px;
        background: radial-gradient(circle at 30% 30%, ${color}, ${color}88);
        border: ${isContinuous ? 8 : 6}px solid ${isContinuous ? color + 'FF' : color + '88'};
        border-radius: 50%;
        box-shadow: 
          0 ${isContinuous ? 25 : 20}px ${isContinuous ? 100 : 80}px ${isContinuous ? color + '66' : 'rgba(255, 255, 255, 0.3)'}, 
          0 0 ${isContinuous ? 80 : 60}px ${isContinuous ? color + '88' : 'rgba(255, 255, 255, 0.4)'};
        transform: translate(${x}px, ${y}px) scale(1);
        z-index: ${10 + Math.floor(Math.random() * 5)};
        filter: brightness(${isContinuous ? 1.4 : 1.1}) saturate(${isContinuous ? 1.8 : 1.2});
      `;
    }

    asset.style.cssText = styling;
    
    if (isContinuous) {
      asset.classList.add('continuous-spawn');
    }
    
    spawnArea.appendChild(asset);

    appState.occupiedPositions.push({
      x: x,
      y: y,
      size: baseSize
    });

    appState.assets.push({ 
      el: asset, 
      x, 
      y, 
      size: baseSize,
      isContinuous: isContinuous
    });

    console.log(`Asset created at (${Math.round(x)}, ${Math.round(y)}) with size ${Math.round(baseSize)}px, isContinuous: ${isContinuous}`);
  }

  static removeAsset() {
    if (appState.assets.length > 0 && !appState.isInMockingMode) {
      const removedAsset = appState.assets.shift();
      const removedPosition = appState.occupiedPositions.shift();
      
      if (removedAsset.el.parentNode) {
        removedAsset.el.style.transition = 'all 0.6s ease-out';
        removedAsset.el.style.transform += ' scale(0) rotate(180deg)';
        removedAsset.el.style.opacity = '0';
        
        setTimeout(() => {
          if (removedAsset.el.parentNode) {
            removedAsset.el.remove();
          }
        }, CONFIG.timing.assetRemovalTime);
      }
    }
    appState.updateDebug();
  }
}

class KeyboardManager {
  static init() {
    this.generateRandomKey();
    this.attachEventListeners();
    
    if (CONFIG.debug) {
      console.log('Keyboard manager initialized. Current key:', CONFIG.keyboard.currentKey);
    }
  }
  
  static generateRandomKey() {
    const availableKeys = CONFIG.keyboard.randomKeys;
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    CONFIG.keyboard.currentKey = availableKeys[randomIndex];
    appState.currentRandomKey = CONFIG.keyboard.currentKey;
    
    if (CONFIG.debug) {
      console.log('New random key generated:', CONFIG.keyboard.currentKey);
    }
    
    return CONFIG.keyboard.currentKey;
  }
  
  static attachEventListeners() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }
  
  static handleKeyPress(event) {
    if (!CONFIG.keyboard.enabled) return;
    
    const pressedKey = event.key.toLowerCase();
    
    if (CONFIG.debug) {
      console.log('Key pressed:', pressedKey, 'Expected:', CONFIG.keyboard.currentKey, 'Stage:', appState.stage, 'Attempts:', appState.keyboardAttempts);
    }
    
    if (pressedKey === CONFIG.keyboard.currentKey) {
      this.processKeyCommand();
    }
  }
  
  static processKeyCommand() {
    if (appState.isProcessing) return;
    
    appState.isProcessing = true;
    appState.keyboardAttempts++;
    
    console.log(`Processing keyboard command. Total attempts: ${appState.keyboardAttempts}, Stage: ${appState.stage}`);
    
    if (appState.keyboardAttempts === 1) {
      MessageSystem.showKeyboardStage0Response();
    } else if (appState.keyboardAttempts === 2) {
      MessageSystem.showKeyboardStage1Response();
    } else if (appState.keyboardAttempts >= 3) {
      MessageSystem.showKeyboardStage2Response();
    }
    
    setTimeout(() => {
      appState.isProcessing = false;
    }, 1000);
  }
  
  static startContinuousSpawning() {
    console.log('Starting continuous spawning for keyboard mocking');
    
    if (appState.continuousSpawnInterval) {
      clearInterval(appState.continuousSpawnInterval);
    }
    
    CONFIG.keyboard.mockingSpawnActive = true;
    appState.isInMockingMode = true;
    
    document.body.classList.add('chaos-mode');
    this.createSpawnNotification();
    
    appState.continuousSpawnInterval = setInterval(() => {
      if (CONFIG.keyboard.mockingSpawnActive) {
        const additionalAssets = Math.floor(Math.random() * 2) + 2;
        
        console.log(`Spawning ${additionalAssets} mocking assets`);
        
        for (let i = 0; i < additionalAssets; i++) {
          setTimeout(() => {
            AssetManager.addRandomIntrusiveAsset();
          }, i * 200);
        }
        
        this.showRandomMockingMessage();
      }
    }, CONFIG.timing.continuousSpawnInterval);
  }
  
  static createSpawnNotification() {
    const existing = document.querySelector('.spawn-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'spawn-notification';
    notification.textContent = 'CHAOS MODE ACTIVE';
    document.body.appendChild(notification);
  }
  
  static showRandomMockingMessage() {
    const mockingMessages = [
      `twin really pressed "${CONFIG.keyboard.currentKey.toUpperCase()}" thinking it would work LMAO`,
      `imagine thinking "${CONFIG.keyboard.currentKey.toUpperCase()}" is the solution to your problems`,
      `"${CONFIG.keyboard.currentKey.toUpperCase()}" FOR WHAT??? more assets for you bestie`,
      `pressed "${CONFIG.keyboard.currentKey.toUpperCase()}" and made it WORSE congratulations`,
      `the definition of insanity: pressing "${CONFIG.keyboard.currentKey.toUpperCase()}" expecting different results`,
      `"${CONFIG.keyboard.currentKey.toUpperCase()}" key said LET ME ADD MORE CHAOS`,
      `you: presses "${CONFIG.keyboard.currentKey.toUpperCase()}" | the universe: and i took that personally`,
      `"${CONFIG.keyboard.currentKey.toUpperCase()}" button broken? try unplugging your brain first`,
      `pressed "${CONFIG.keyboard.currentKey.toUpperCase()}" faster, that'll definitely help twin`,
      `"${CONFIG.keyboard.currentKey.toUpperCase()}" key working overtime to disappoint you`,
      `still pressing "${CONFIG.keyboard.currentKey.toUpperCase()}"? the assets are multiplying because of you`,
      `every "${CONFIG.keyboard.currentKey.toUpperCase()}" press spawns MORE chaos - but sure, keep going`,
      `"${CONFIG.keyboard.currentKey.toUpperCase()}" addiction is real twin, seek help`,
      `plot twist: "${CONFIG.keyboard.currentKey.toUpperCase()}" makes everything WORSE`
    ];
    
    const randomMessage = mockingMessages[Math.floor(Math.random() * mockingMessages.length)];
    
    MessageSystem.show(randomMessage, {
      background: 'rgba(244, 67, 54, 0.6)',
      animation: 'retroGlitch 0.5s ease-in-out',
      zIndex: '150',
      color: '#ffffff'
    });
  }
  
  static stopContinuousSpawning() {
    console.log('Stopping continuous spawning');
    CONFIG.keyboard.mockingSpawnActive = false;
    appState.isInMockingMode = false;
    
    document.body.classList.remove('chaos-mode');
    
    const notification = document.querySelector('.spawn-notification');
    if (notification) notification.remove();
    
    if (appState.continuousSpawnInterval) {
      clearInterval(appState.continuousSpawnInterval);
      appState.continuousSpawnInterval = null;
    }
  }
}

// Message System with slower timing
class MessageSystem {
  static show(text, styling = {}) {
    messageEl.textContent = text;
    
    Object.assign(messageEl.style, {
      color: styling.color || 'rgba(255, 255, 255, 0.9)',
      background: styling.background || 'rgba(255, 255, 255, 0.1)',
      textShadow: styling.textShadow || '0 2px 8px rgba(0, 0, 0, 0.3)',
      animation: styling.animation || 'none',
      fontSize: styling.fontSize || 'clamp(1rem, 3vw, 1.5rem)',
      zIndex: styling.zIndex || '150'
    });
  }

  // VOICE COMMANDS with slower timing
  static showStage0Response() {
    appState.voiceAttempts++;
    console.log(`Voice attempt #${appState.voiceAttempts}`);
    
    this.show('omg twin you have such a nice voice! say hello again!', {
      background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4))',
      animation: 'retroPulse 0.5s ease-in-out',
      zIndex: '150'
    });

    AssetManager.spawn(3);
    
    setTimeout(() => {
      this.show('please twin, just say "HELLO" again - your voice is so soothing!', {
        background: 'rgba(102, 200, 234, 0.4)',
        animation: 'retroBounce 0.4s ease-in-out',
        zIndex: '150'
      });
      appState.stage = 1;
      appState.volumeThreshold = 1;
    }, CONFIG.timing.promptDelay); // Slower transition
  }

  static showStage1Response() {
    appState.voiceAttempts++;
    console.log(`Voice attempt #${appState.voiceAttempts}`);
    
    AssetManager.removeAsset();
    
    this.show('twin i can barely hear you... could you say HELLO LOUDER please?', {
      background: 'linear-gradient(45deg, rgba(255, 193, 7, 0.4), rgba(255, 152, 0, 0.4))',
      animation: 'retroSlide 0.4s ease-in-out',
      zIndex: '150'
    });

    setTimeout(() => {
      this.show('come on twin, say "HELLO" really LOUD so i can hear you better!', {
        background: 'rgba(255, 193, 7, 0.4)',
        animation: 'retroZoom 0.4s ease-in-out',
        zIndex: '150'
      });
      
      AssetManager.spawn(6);
      appState.stage = 2;
      appState.volumeThreshold = 2;
    }, CONFIG.timing.promptDelay); // Slower transition
  }

  static showStage2Response() {
    appState.voiceAttempts++;
    console.log(`Voice attempt #${appState.voiceAttempts} - TRIGGERING VOICE MOCKING`);
    
    appState.isMocking = true;
    appState.isInMockingMode = true;
    
    spawnArea.querySelectorAll('.asset').forEach(el => el.remove());
    appState.assets = [];
    appState.occupiedPositions = [];
    
    this.createMockingFlood();
  }

  // KEYBOARD COMMANDS with slower timing
  static showKeyboardStage0Response() {
    console.log(`Keyboard attempt #1 - encouraging`);
    
    this.show(`amazing twin! you pressed "${CONFIG.keyboard.currentKey.toUpperCase()}" perfectly! do it again!`, {
      background: 'linear-gradient(45deg, rgba(34, 139, 34, 0.4), rgba(50, 205, 50, 0.4))',
      animation: 'retroPulse 0.5s ease-in-out',
      zIndex: '150'
    });

    AssetManager.spawn(3);
    
    setTimeout(() => {
      KeyboardManager.generateRandomKey();
      this.show(`brilliant! now press "${CONFIG.keyboard.currentKey.toUpperCase()}" again twin - you're so good at this!`, {
        background: 'rgba(50, 205, 50, 0.4)',
        animation: 'retroBounce 0.4s ease-in-out',
        zIndex: '150'
      });
    }, CONFIG.timing.promptDelay); // Slower transition
  }

  static showKeyboardStage1Response() {
    console.log(`Keyboard attempt #2 - still encouraging`);
    
    AssetManager.removeAsset();
    
    this.show(`perfect twin! "${CONFIG.keyboard.currentKey.toUpperCase()}" key mastery! one more time to show your skills!`, {
      background: 'linear-gradient(45deg, rgba(72, 61, 139, 0.4), rgba(123, 104, 238, 0.4))',
      animation: 'retroSlide 0.4s ease-in-out',
      zIndex: '150'
    });

    setTimeout(() => {
      KeyboardManager.generateRandomKey();
      this.show(`you're incredible! press "${CONFIG.keyboard.currentKey.toUpperCase()}" one final time to complete the challenge!`, {
        background: 'rgba(123, 104, 238, 0.4)',
        animation: 'retroZoom 0.4s ease-in-out',
        zIndex: '150'
      });
      
      AssetManager.spawn(6);
    }, CONFIG.timing.promptDelay); // Slower transition
  }

  static showKeyboardStage2Response() {
    console.log(`Keyboard attempt #3+ - STARTING MOCKING AND CONTINUOUS SPAWNING`);
    
    this.show(`LMAOOO twin really thought "${CONFIG.keyboard.currentKey.toUpperCase()}" would work a THIRD time???`, {
      background: 'rgba(220, 20, 60, 0.6)',
      animation: 'retroCrazy 0.5s ease-in-out',
      zIndex: '150'
    });

    KeyboardManager.startContinuousSpawning();

    setTimeout(() => {
      this.show(`keep pressing "${CONFIG.keyboard.currentKey.toUpperCase()}" twin, it's definitely helping! *spawns more assets*`, {
        background: 'rgba(255, 69, 0, 0.6)',
        animation: 'retroGlitch 0.5s ease-in-out',
        zIndex: '150'
      });
    }, CONFIG.timing.promptDelay);

    setTimeout(() => {
      this.createKeyboardMockingEnd();
    }, CONFIG.timing.promptDelay * 2);
  }

  static createKeyboardMockingEnd() {
    messageEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: clamp(1.5rem, 5vw, 3rem);
      color: #fff;
      text-align: center;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.8);
      padding: 2rem;
      border-radius: 20px;
      border: 3px solid #ff1493;
      box-shadow: 0 0 50px rgba(255, 20, 147, 0.8);
      animation: keyboardAchievementPulse 2s ease-in-out infinite;
    `;
    messageEl.textContent = `KEYBOARD WARRIOR ACHIEVEMENT UNLOCKED: "${CONFIG.keyboard.currentKey.toUpperCase()}" SPAM CHAMPION`;
    
    setTimeout(() => {
      KeyboardManager.stopContinuousSpawning();
    }, 5000);
  }

  // Mocking flood for voice commands (same as before)
  static createMockingFlood() {
    const mockingMessages = [
      "LMAOOOOO YOU ACTUALLY FELL FOR IT",
      "say hello louder AND YOU DID IT",
      "TWIN REALLY THOUGHT I CARED",
      "THE WAY YOU RAISED YOUR VOICE THO",
      "WELCOME TO THE CIRCUS YOU ARE THE CLOWN",
      "CONGRATULATIONS ON BEING PLAYED",
      "IMAGINE THINKING I NEEDED TO HEAR YOU",
      "your voice is soothing I CANNOT",
      "YOU REALLY SAID HELLO LOUDER I AM DECEASED",
      "ACADEMY AWARD FOR BEST GULLIBLE PERFORMANCE"
    ];

    const floodOverlay = document.createElement('div');
    floodOverlay.id = 'mocking-flood';
    floodOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(45deg, 
        rgba(244, 67, 154, 0.95), 
        rgba(156, 39, 176, 0.95),
        rgba(244, 67, 54, 0.95)
      );
      z-index: 1000;
      overflow: hidden;
      animation: floodAppear 0.5s ease-out forwards;
    `;
    document.body.appendChild(floodOverlay);

    this.createCrownEffect(floodOverlay);

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex >= mockingMessages.length) {
        messageIndex = 0;
      }
      
      this.createFloatingMessage(mockingMessages[messageIndex], floodOverlay);
      messageIndex++;
      
      if (!appState.isMocking) {
        clearInterval(messageInterval);
      }
    }, 400); // Slower message appearance

    setTimeout(() => {
      messageEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: clamp(1.5rem, 5vw, 3rem);
        color: #fff;
        text-align: center;
        z-index: 1001;
        background: rgba(0, 0, 0, 0.8);
        padding: 2rem;
        border-radius: 20px;
        border: 3px solid gold;
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
        animation: crownPulse 2s ease-in-out infinite;
      `;
      messageEl.textContent = "CROWNED MOST GULLIBLE PERSON ALIVE";
    }, 4000); // Slower crown appearance

    setTimeout(() => {
      clearInterval(messageInterval);
      appState.isMocking = false;
      if (floodOverlay.parentNode) {
        floodOverlay.style.animation = 'floodFadeOut 1s ease-in forwards';
        setTimeout(() => {
          if (floodOverlay.parentNode) {
            floodOverlay.remove();
          }
        }, 1000);
      }
    }, CONFIG.timing.mockingFloodDuration);
  }

  static createFloatingMessage(text, container) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    messageDiv.className = 'mocking-message';
    
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const rotation = Math.random() * 360;
    const scale = 0.8 + Math.random() * 0.4;
    
    messageDiv.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      color: white;
      font-size: ${1.2 + Math.random() * 1.8}rem;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      transform: rotate(${rotation}deg) scale(${scale});
      animation: floatAndFade 6s ease-out forwards;
      z-index: 1001;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      letter-spacing: -0.01em;
    `;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 6000);
  }

  static createCrownEffect(container) {
    const crownTexts = ['CROWN', 'KING', 'QUEEN', 'ROYAL', 'WINNER'];
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const crown = document.createElement('div');
        crown.textContent = crownTexts[i % crownTexts.length];
        crown.style.cssText = `
          position: absolute;
          font-size: 2.5rem;
          left: ${20 + i * 15}%;
          top: 10%;
          animation: crownFloat 2s ease-in-out infinite;
          z-index: 1002;
          filter: drop-shadow(0 0 10px gold);
          color: gold;
          font-weight: bold;
        `;
        container.appendChild(crown);
      }, i * 400); // Slower crown appearance
    }
  }
}

// Speech Recognition (same logic but with slower timing)
class SpeechManager {
  static init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      MessageSystem.show('twin your browser does not support this... it is giving Internet Explorer vibes');
      return false;
    }

    appState.recognition = new SpeechRecognition();
    
    appState.recognition.continuous = CONFIG.speech.continuous;
    appState.recognition.interimResults = CONFIG.speech.interimResults;
    appState.recognition.lang = CONFIG.speech.lang;
    appState.recognition.maxAlternatives = CONFIG.speech.maxAlternatives;

    this.attachEventListeners();
    return true;
  }

  static attachEventListeners() {
    appState.recognition.addEventListener('result', this.handleResult.bind(this));
    appState.recognition.addEventListener('error', this.handleError.bind(this));
    appState.recognition.addEventListener('end', this.handleEnd.bind(this));
    appState.recognition.addEventListener('start', this.handleStart.bind(this));
  }

  static handleStart() {
    if (CONFIG.debug) {
      console.log('Speech recognition started');
    }
  }

  static handleResult(evt) {
    if (appState.isProcessing || CONFIG.keyboard.mockingSpawnActive) return;

    let transcript = '';
    
    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      transcript += evt.results[i][0].transcript;
      
      for (let j = 0; j < evt.results[i].length; j++) {
        transcript += ' ' + evt.results[i][j].transcript;
      }
    }
    
    transcript = transcript.trim().toLowerCase();
    
    if (CONFIG.debug) {
      console.log('Heard:', transcript);
      const debugCommand = document.getElementById('debug-command');
      if (debugCommand) debugCommand.textContent = transcript;
    }
    
    if (!transcript) return;
    
    const matchesHello = COMMANDS.HELLO.some(cmd => transcript.includes(cmd));
    
    if (CONFIG.debug) {
      console.log('Stage:', appState.stage, 'Hello match:', matchesHello, 'Voice attempts:', appState.voiceAttempts);
    }
    
    if (!matchesHello) return;
    
    if (transcript === appState.lastTranscript) return;
    
    appState.isProcessing = true;
    appState.lastTranscript = transcript;
    
    if (appState.stage === 1) {
      const simulatedVolume = Math.random() * 3;
      if (simulatedVolume < 1.2 && Math.random() > 0.1) {
        MessageSystem.show('twin i still cannot hear you... say HELLO LOUDER please!', {
          background: 'rgba(255, 87, 34, 0.5)',
          animation: 'retroCrazy 0.5s ease-in-out',
          zIndex: '150'
        });
        setTimeout(() => { appState.isProcessing = false; }, 500);
        return;
      }
    }

    this.processCommand();
    
    setTimeout(() => {
      appState.isProcessing = false;
    }, 1000);
  }

  static processCommand() {
    if (CONFIG.debug) {
      console.log('Processing hello command - Stage:', appState.stage, 'Voice attempts:', appState.voiceAttempts);
    }

    if (appState.stage === 0) {
      console.log('Stage 0 -> Stage 1');
      MessageSystem.showStage0Response();
    } else if (appState.stage === 1) {
      console.log('Stage 1 -> Stage 2');
      MessageSystem.showStage1Response();
    } else if (appState.stage === 2) {
      console.log('Stage 2 -> Voice Mocking');
      MessageSystem.showStage2Response();
    }

    appState.updateDebug();
  }

  static handleError(event) {
    console.error('Speech recognition error:', event.error);
    
    appState.isProcessing = false;
    
    if (event.error === 'no-speech') {
      this.restart();
      return;
    }
    
    MessageSystem.show(`Speech error: ${event.error}`, {
      background: 'rgba(244, 67, 54, 0.5)',
      zIndex: '150'
    });
    
    this.restart();
  }

  static handleEnd() {
    if (CONFIG.debug) {
      console.log('Speech recognition ended');
    }
    
    if (appState.listening && CONFIG.speech.autoRestart && !appState.isMocking && !CONFIG.keyboard.mockingSpawnActive) {
      this.restart();
    }
  }

  static restart() {
    setTimeout(() => {
      if (appState.listening && !appState.isMocking && !CONFIG.keyboard.mockingSpawnActive) {
        try {
          appState.recognition.start();
        } catch (error) {
          if (error.name !== 'InvalidStateError') {
            console.error('Error restarting recognition:', error);
          }
        }
      }
    }, CONFIG.speech.restartDelay);
  }

  static start() {
    if (!appState.recognition) return false;
    
    try {
      appState.recognition.start();
      appState.listening = true;
      return true;
    } catch (error) {
      if (error.name !== 'InvalidStateError') {
        console.error('Error starting recognition:', error);
        return false;
      }
      return true;
    }
  }

  static stop() {
    if (appState.recognition) {
      appState.recognition.stop();
      appState.listening = false;
    }
  }
}

// App initialization
async function initializeApp() {
  console.log('Initializing app...');
  
  await AssetLoader.loadAvailableAssets();
  
  // Initialize audio first
  AudioManager.init();
  KeyboardManager.init();
  
  if (!SpeechManager.init()) {
    return;
  }

  // Start audio immediately
  setTimeout(() => {
    AudioManager.playIntroAudio();
  }, 500);

  // Slower intro timing
  setTimeout(() => {
    document.body.classList.add('started');
    
    if (SpeechManager.start()) {
      MessageSystem.show(`Say "hello" OR press "${CONFIG.keyboard.currentKey.toUpperCase()}" to begin, twin!`);
    } else {
      MessageSystem.show(`Press "${CONFIG.keyboard.currentKey.toUpperCase()}" to begin, twin!`);
    }
  }, CONFIG.timing.hiAnimationDuration);

  // Debug controls
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === CONFIG.keyboard.currentKey) return;
    
    if (e.key === 'r') {
      console.log('Reset triggered');
      appState.reset();
      KeyboardManager.stopContinuousSpawning();
      KeyboardManager.generateRandomKey();
      MessageSystem.show(`Game reset! Say "hello" OR press "${CONFIG.keyboard.currentKey.toUpperCase()}" to begin, twin!`);
    }
    if (e.key === 's') {
      console.log('Manual spawning 6 assets');
      AssetManager.spawn(6);
    }
    if (e.key === 't') {
      console.log('Testing continuous spawn');
      KeyboardManager.startContinuousSpawning();
    }
    if (e.key === 'd') debugPanel?.classList.toggle('active');
    if (e.key === 'h') {
      console.log('Debug hello command');
      SpeechManager.processCommand();
    }
    if (e.key === 'k') {
      console.log('Debug keyboard command');
      KeyboardManager.processKeyCommand();
    }
    if (e.key === 'a') {
      console.log('Testing audio');
      AudioManager.playIntroAudio();
    }
    if (e.key === 'g') {
      console.log('Generating new random key');
      KeyboardManager.generateRandomKey();
      console.log('New key:', CONFIG.keyboard.currentKey);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

window.VoiceApp = {
  CONFIG,
  appState,
  AssetManager,
  MessageSystem,
  SpeechManager,
  AssetLoader,
  AudioManager,
  KeyboardManager
};
