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

    // Retro dark aesthetic styling for prank/satire
    asset.style.position = 'absolute';
    asset.style.width = assetSize + 'px';
    asset.style.height = assetSize + 'px';
    
    // Dark retro colors with sinister undertones
    const darkRetroColors = ['#660033', '#003366', '#330066', '#663300', '#006633', '#663333', '#336600', '#333366'];
    const color = darkRetroColors[i % darkRetroColors.length];
    
    asset.style.background = `radial-gradient(circle at 30% 30%, ${color}AA, ${color}44)`;
    asset.style.border = `2px solid ${color}88`;
    asset.style.borderRadius = '50%';
    asset.style.boxShadow = `0 0 15px ${color}44, inset 0 0 15px ${color}22`;
    asset.style.transform = `translate(${x}px, ${y}px) scale(0)`;
    asset.style.transition = 'none';
    
    // Add dark retro grid pattern
    asset.style.backgroundImage = `radial-gradient(circle at 30% 30%, ${color}AA, ${color}44), 
                                   repeating-linear-gradient(45deg, transparent, transparent 2px, ${color}11 2px, ${color}11 4px)`;
    
    // Spawn animation with ominous feel
    setTimeout(() => {
      asset.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      asset.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    }, i * 150); // Slower, more menacing spawn
    
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

    // Apply the new position with subtle dark glitch effect
    const glitchOffset = Math.sin(Date.now() * 0.01 + i) * 0.3;
    assetData.el.style.transform = `translate(${assetData.x + glitchOffset}px, ${assetData.y}px) scale(1)`;
    
    // Add rare ominous pulse effect
    if (Math.random() < 0.0005) {
      assetData.el.style.filter = 'brightness(0.7) saturate(1.2)';
      setTimeout(() => {
        assetData.el.style.filter = 'none';
      }, 200);
    }
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
  
  // Only update lastTranscript if we're actually going to process this command
  const isValidCommand = (stage === 0 && transcript.includes(CMD_HELLO)) ||
                        ((stage === 1 || stage === 2) && transcript.includes(CMD_REMOVE));
                        
  if (!isValidCommand) return;
  
  lastTranscript = transcript;

  console.log('Processing transcript:', transcript, 'Stage:', stage);

  // Tutorial flow with enhanced feedback
  if (stage === 0 && transcript.includes(CMD_HELLO)) {
    messageEl.textContent = '◆ Oh wow, you can speak! How... impressive. ◆';
    messageEl.style.background = 'linear-gradient(45deg, #330033, #003333)';
    messageEl.style.color = '#cccccc';
    messageEl.style.textShadow = '0 0 8px #666666';
    messageEl.style.animation = 'retroPulse 0.5s ease-in-out';
    
    setTimeout(() => {
      messageEl.textContent = '▶ Deploying your "reward"... how exciting... ◀';
      messageEl.style.animation = 'retroGlitch 0.3s ease-in-out';
      spawn(2);
      
      setTimeout(() => {
        messageEl.textContent = `☆ Now say "${CMD_REMOVE.toUpperCase()}" if you dare ☆`;
        messageEl.style.background = 'rgba(51, 0, 51, 0.4)';
        messageEl.style.color = '#999999';
        messageEl.style.textShadow = '0 0 8px #555555';
        messageEl.style.animation = 'none';
        stage = 1;
      }, 1000);
    }, 1500);
  }
  else if (stage === 1 && transcript.includes(CMD_REMOVE)) {
    // Remove one asset with sarcastic destruction effect
    if (assets.length > 0) {
      const removedAsset = assets.shift();
      if (removedAsset.el.parentNode) {
        removedAsset.el.style.transition = 'all 0.6s ease-out';
        removedAsset.el.style.transform += ' scale(0) rotate(180deg)';
        removedAsset.el.style.opacity = '0';
        removedAsset.el.style.filter = 'brightness(0.5) hue-rotate(90deg)';
        setTimeout(() => {
          if (removedAsset.el.parentNode) {
            removedAsset.el.remove();
          }
        }, 600);
      }
    }

    messageEl.textContent = '◇ Congratulations. You destroyed something. ◇';
    messageEl.style.background = 'linear-gradient(45deg, #003333, #330033)';
    messageEl.style.color = '#aaaaaa';
    messageEl.style.textShadow = '0 0 10px #444444';
    messageEl.style.animation = 'retroFlash 0.3s ease-in-out';
    
    setTimeout(() => {
      messageEl.textContent = '▼ Say it again. I dare you. ▼';
      messageEl.style.background = 'rgba(51, 0, 51, 0.4)';
      messageEl.style.color = '#888888';
      messageEl.style.textShadow = '0 0 8px #333333';
      messageEl.style.animation = 'none';
      stage = 2;
      spawnCount = 1;
      spawnIterations = 0;
    }, 2000);
  }
  else if (stage === 2 && transcript.includes(CMD_REMOVE)) {
    spawnCount *= 2;
    spawnIterations++;

    // Cap the spawn count for performance
    if (spawnCount > 128) spawnCount = 128;
    spawn(spawnCount);

    // Progressive sarcastic feedback messages
    if (spawnIterations === 1) {
      messageEl.textContent = `◈ Oh look, ${spawnCount} more things. Thrilling. ◈`;
      messageEl.style.background = 'linear-gradient(45deg, #331133, #113333)';
      messageEl.style.animation = 'retroBounce 0.4s ease-in-out';
    } else if (spawnIterations === 2) {
      messageEl.textContent = `▲ ${spawnCount} objects. You're really showing me. ▲`;
      messageEl.style.background = 'linear-gradient(45deg, #332211, #221133)';
      messageEl.style.animation = 'retroSlide 0.4s ease-in-out';
    } else if (spawnIterations === 3) {
      messageEl.textContent = `◉ Wow. ${spawnCount} spheres. Revolutionary. ◉`;
      messageEl.style.background = 'linear-gradient(45deg, #113322, #223311)';
      messageEl.style.animation = 'retroZoom 0.4s ease-in-out';
    } else if (spawnIterations >= 4) {
      const sarcasticMessages = [
        "♦ ERROR: User thinks this is impressive ♦",
        "⚠ WARNING: Detected chronic repetition syndrome ⚠",
        "◆ DIAGNOSIS: Terminal case of voice addiction ◆",
        "▼ STATUS: Still not impressed ▼",
        "☢ ALERT: Maximum cringe levels detected ☢"
      ];
      const randomMessage = sarcasticMessages[Math.min(spawnIterations - 4, sarcasticMessages.length - 1)];
      messageEl.textContent = randomMessage;
      messageEl.style.background = 'linear-gradient(45deg, #221122, #112211, #221122)';
      messageEl.style.animation = 'retroCrazy 1s ease-in-out';
      
      setTimeout(() => {
        messageEl.style.background = 'rgba(51, 0, 51, 0.4)';
        messageEl.style.animation = 'none';
      }, 2000);
    }
    
    // Reset message styling after animation
    setTimeout(() => {
      messageEl.style.color = '#888888';
      messageEl.style.textShadow = '0 0 8px #333333';
    }, 500);
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

// Initialize with dark retro sarcastic styling
messageEl.textContent = '◇ "ADVANCED" VOICE SYSTEM ◇ CLICK IF YOU MUST ◇';
messageEl.style.color = '#888888';
messageEl.style.textShadow = '0 0 8px #333333';
messageEl.style.background = 'rgba(51, 0, 51, 0.4)';
toggleBtn.textContent = '► "START" LISTENING ◄';

// Add CSS animations to the document with darker theme
const style = document.createElement('style');
style.textContent = `
  @keyframes retroPulse {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.02); filter: brightness(0.8); }
  }
  
  @keyframes retroGlitch {
    0%, 100% { transform: translateX(0); filter: brightness(1); }
    10% { transform: translateX(-1px); filter: brightness(0.9); }
    20% { transform: translateX(1px); filter: brightness(0.8); }
    30% { transform: translateX(-1px); filter: brightness(0.9); }
    40% { transform: translateX(1px); filter: brightness(0.7); }
    50% { transform: translateX(-1px); filter: brightness(0.8); }
    60% { transform: translateX(1px); filter: brightness(0.9); }
    70% { transform: translateX(-1px); filter: brightness(0.8); }
    80% { transform: translateX(1px); filter: brightness(0.9); }
    90% { transform: translateX(-1px); filter: brightness(0.8); }
  }
  
  @keyframes retroFlash {
    0%, 100% { opacity: 1; filter: brightness(1); }
    50% { opacity: 0.8; filter: brightness(0.7); }
  }
  
  @keyframes retroBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes retroSlide {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(5px); }
  }
  
  @keyframes retroZoom {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }
  
  @keyframes retroCrazy {
    0% { transform: rotate(0deg) scale(1); filter: brightness(1); }
    25% { transform: rotate(-2deg) scale(1.01); filter: brightness(0.8); }
    50% { transform: rotate(2deg) scale(0.99); filter: brightness(0.9); }
    75% { transform: rotate(-1deg) scale(1.01); filter: brightness(0.8); }
    100% { transform: rotate(0deg) scale(1); filter: brightness(1); }
  }
`;
document.head.appendChild(style);