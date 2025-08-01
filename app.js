// app.js

const spawnArea = document.getElementById('spawn-area');
const toggleBtn = document.getElementById('toggleBtn');
const messageEl = document.getElementById('message');

let listening = false;
let stage = 0;          // 0: tutorial start, 1: wait first remove, 2: explosion/removal loop

let spawnCount = 1;
let spawnIterations = 0;

const CMD_HELLO  = 'hello';
const CMD_REMOVE = 'remove it';

// Array holding currently moving asset objects for smooth animation
let assets = [];
let animationActive = false;

// Set up Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  messageEl.textContent = 'Web Speech API not supported in this browser';
  toggleBtn.disabled = true;
  throw new Error('Web Speech API unsupported');
}

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

// Helper: create and add animated assets to the spawn area
function spawn(count = 1) {
  spawnArea.innerHTML = '';
  assets = [];

  const assetSize = 60;
  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;

  // Ensure minimum dimensions
  if (maxWidth < assetSize || maxHeight < assetSize) return;

  // Arrange in a neat grid visually
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  // Calculate spacing to distribute assets evenly
  const hSpacing = Math.max(10, (maxWidth - cols * assetSize) / (cols + 1));
  const vSpacing = Math.max(10, (maxHeight - rows * assetSize) / (rows + 1));

  for (let i = 0; i < count; i++) {
    const asset = document.createElement('div');
    asset.className = 'asset';

    // Grid layout for initial positioning
    const row = Math.floor(i / cols);
    const col = i % cols;
    let x = hSpacing + col * (assetSize + hSpacing);
    let y = vSpacing + row * (assetSize + vSpacing);

    // Ensure assets start within bounds
    x = Math.min(x, maxWidth - assetSize);
    y = Math.min(y, maxHeight - assetSize);

    // Each asset will get its own velocity for animation (smoother speeds)
    let dx = (Math.random() * 1.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1);
    let dy = (Math.random() * 1.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1);

    asset.style.position = 'absolute';
    asset.style.width = assetSize + 'px';
    asset.style.height = assetSize + 'px';
    asset.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    asset.style.borderRadius = '50%';
    asset.style.transform = `translate(${x}px, ${y}px)`;
    asset.style.transition = 'none';
    
    spawnArea.appendChild(asset);

    assets.push({ el: asset, x, y, dx, dy, size: assetSize });
  }

  // Start animation if not already running
  if (!animationActive) {
    animationActive = true;
    animate();
  }
}

// Animation loop: moves all assets, bounces on edges
function animate() {
  if (!animationActive || assets.length === 0) {
    animationActive = false;
    return;
  }

  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;
  
  for (let assetData of assets) {
    // Update position
    assetData.x += assetData.dx;
    assetData.y += assetData.dy;

    // Bounce off edges with proper boundary checking
    if (assetData.x <= 0) {
      assetData.x = 0;
      assetData.dx = Math.abs(assetData.dx);
    } else if (assetData.x >= maxWidth - assetData.size) {
      assetData.x = maxWidth - assetData.size;
      assetData.dx = -Math.abs(assetData.dx);
    }

    if (assetData.y <= 0) {
      assetData.y = 0;
      assetData.dy = Math.abs(assetData.dy);
    } else if (assetData.y >= maxHeight - assetData.size) {
      assetData.y = maxHeight - assetData.size;
      assetData.dy = -Math.abs(assetData.dy);
    }

    // Apply the new position
    assetData.el.style.transform = `translate(${assetData.x}px, ${assetData.y}px)`;
  }
  
  requestAnimationFrame(animate);
}

let lastTranscript = '';

// Enhanced speech result handler with better transcript processing
recognition.addEventListener('result', evt => {
  let finalTranscript = '';
  
  // Process all results, focusing on final results
  for (let i = evt.resultIndex; i < evt.results.length; i++) {
    if (evt.results[i].isFinal) {
      finalTranscript += evt.results[i][0].transcript;
    }
  }
  
  if (!finalTranscript) return;
  
  const transcript = finalTranscript.trim().toLowerCase();
  
  // Avoid processing the same transcript multiple times
  if (transcript === lastTranscript) return;
  lastTranscript = transcript;

  console.log('Processing transcript:', transcript, 'Stage:', stage);

  // Tutorial flow with enhanced feedback
  if (stage === 0 && transcript.includes(CMD_HELLO)) {
    messageEl.textContent = 'Awesome voice! 🎉 Spawning two items...';
    messageEl.style.background = 'rgba(76, 175, 80, 0.3)';
    spawn(2);
    setTimeout(() => {
      messageEl.textContent = `Perfect! Now say "${CMD_REMOVE}" to remove one`;
      messageEl.style.background = 'rgba(255,255,255,0.1)';
      stage = 1;
    }, 2000);
  }
  else if (stage === 1 && transcript.includes(CMD_REMOVE)) {
    // Remove one asset if it exists
    if (assets.length > 0) {
      const removedAsset = assets.shift();
      if (removedAsset.el.parentNode) {
        removedAsset.el.style.transition = 'all 0.3s ease-out';
        removedAsset.el.style.transform += ' scale(0)';
        removedAsset.el.style.opacity = '0';
        setTimeout(() => {
          if (removedAsset.el.parentNode) {
            removedAsset.el.remove();
          }
        }, 300);
      }
    }

    messageEl.textContent = 'Excellent! 🎯 Say "remove it" louder to spawn more!';
    messageEl.style.background = 'rgba(33, 150, 243, 0.3)';
    setTimeout(() => {
      messageEl.style.background = 'rgba(255,255,255,0.1)';
      stage = 2;
      spawnCount = 1;
      spawnIterations = 0;
    }, 1500);
  }
  else if (stage === 2 && transcript.includes(CMD_REMOVE)) {
    spawnCount *= 2;
    spawnIterations++;

    // Cap the spawn count for performance
    if (spawnCount > 128) spawnCount = 128;
    spawn(spawnCount);

    // Progressive feedback messages
    if (spawnIterations === 1) {
      messageEl.textContent = `Nice! ${spawnCount} assets spawned! Keep going! 🚀`;
    } else if (spawnIterations === 2) {
      messageEl.textContent = `Wow! ${spawnCount} assets! You're getting the hang of this! ⭐`;
    } else if (spawnIterations === 3) {
      messageEl.textContent = `Amazing! ${spawnCount} assets bouncing around! 🌟`;
    } else if (spawnIterations >= 4) {
      const messages = [
        "Seriously? You REALLY love saying 'remove it'! 😂",
        "Are you trying to crash my browser? 🤖💥",
        "I think you've got the hang of it now! 🎪",
        "Still going? You're persistent! 🔥",
        "Okay, okay, I get it - you like voice commands! 🎤"
      ];
      const randomMessage = messages[Math.min(spawnIterations - 4, messages.length - 1)];
      messageEl.textContent = randomMessage;
      messageEl.style.background = 'rgba(255, 193, 7, 0.3)';
      setTimeout(() => {
        messageEl.style.background = 'rgba(255,255,255,0.1)';
      }, 2000);
    }
  }
});

// Enhanced error handling
recognition.addEventListener('error', (event) => {
  console.error('Speech recognition error:', event.error);
  if (event.error === 'no-speech') {
    // Don't show error for no-speech, just continue
    return;
  }
  messageEl.textContent = `Recognition error: ${event.error}. Try again!`;
  messageEl.style.background = 'rgba(244, 67, 54, 0.3)';
  setTimeout(() => {
    messageEl.style.background = 'rgba(255,255,255,0.1)';
  }, 3000);
});

// Button toggles listening on and off
toggleBtn.addEventListener('click', () => {
  if (listening) {
    recognition.stop();
    toggleBtn.textContent = 'Start Listening';
    toggleBtn.style.background = '';
    messageEl.textContent = 'Click "Start Listening" to begin the voice tutorial!';
    messageEl.style.background = 'rgba(255,255,255,0.1)';
    stage = 0;
    spawnCount = 1;
    spawnIterations = 0;
    lastTranscript = '';
    spawnArea.innerHTML = '';
    assets = [];
    animationActive = false;
  } else {
    try {
      recognition.start();
      toggleBtn.textContent = 'Stop Listening';
      toggleBtn.style.background = 'rgba(76, 175, 80, 0.8)';
      messageEl.textContent = '🎤 Listening... Say "hello" to start!';
      messageEl.style.background = 'rgba(33, 150, 243, 0.3)';
    } catch (error) {
      console.error('Error starting recognition:', error);
      messageEl.textContent = 'Error starting voice recognition. Please try again.';
    }
  }
  listening = !listening;
});

// Auto restart recognition if stopped unexpectedly
recognition.addEventListener('end', () => {
  if (listening) {
    // Small delay before restarting to avoid rapid restarts
    setTimeout(() => {
      if (listening) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }
    }, 100);
  } else {
    toggleBtn.textContent = 'Start Listening';
    toggleBtn.style.background = '';
  }
});

// Handle window resize to update animation boundaries
window.addEventListener('resize', () => {
  // Update positions to ensure assets stay within new boundaries
  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;
  
  assets.forEach(assetData => {
    assetData.x = Math.min(assetData.x, maxWidth - assetData.size);
    assetData.y = Math.min(assetData.y, maxHeight - assetData.size);
    assetData.el.style.transform = `translate(${assetData.x}px, ${assetData.y}px)`;
  });
});

// Initialize
messageEl.textContent = 'Click "Start Listening" to begin your voice-controlled journey! 🎤';
toggleBtn.textContent = 'Start Listening';