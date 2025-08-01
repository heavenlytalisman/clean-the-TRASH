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

// Set up Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) throw new Error('Web Speech API unsupported');

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

// Helper: create and add animated assets to the spawn area
function spawn(count = 1) {
  spawnArea.innerHTML = '';
  assets = [];

  const assetSize = 60;
  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;

  // Arrange in a neat grid visually
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const hSpacing = (maxWidth - cols * assetSize) / (cols + 1);
  const vSpacing = (maxHeight - rows * assetSize) / (rows + 1);

  for (let i = 0; i < count; i++) {
    const asset = document.createElement('div');
    asset.className = 'asset';

    // Grid layout for initial positioning
    const row = Math.floor(i / cols);
    const col = i % cols;
    let x = hSpacing + col * (assetSize + hSpacing);
    let y = vSpacing + row * (assetSize + vSpacing);

    // Each asset will get its own velocity for animation
    let dx = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);
    let dy = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);

    asset.style.transform = `translate(${x}px, ${y}px)`;
    spawnArea.appendChild(asset);

    assets.push({ el: asset, x, y, dx, dy, size: assetSize });
  }
}

// Animation loop: moves all assets, bounces on edges
function animate() {
  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;
  for (let assetData of assets) {
    // Update position
    assetData.x += assetData.dx;
    assetData.y += assetData.dy;

    // Bounce off edges
    if (assetData.x <= 0 || assetData.x >= maxWidth - assetData.size) assetData.dx *= -1;
    if (assetData.y <= 0 || assetData.y >= maxHeight - assetData.size) assetData.dy *= -1;

    assetData.el.style.transform = `translate(${assetData.x}px, ${assetData.y}px)`;
  }
  requestAnimationFrame(animate);
}

// Start animating after page and first spawn
requestAnimationFrame(animate);

let lastTranscript = '';

// Main speech result handler
recognition.addEventListener('result', evt => {
  const transcript = Array.from(evt.results)
    .slice(evt.resultIndex)
    .map(r => r[0].transcript.trim().toLowerCase())
    .join(' ');

  if (transcript === lastTranscript) return;
  lastTranscript = transcript;

  // Tutorial flow
  if (stage === 0 && transcript.includes(CMD_HELLO)) {
    messageEl.textContent = 'Awesome voice! Spawning two items...';
    spawn(2);
    setTimeout(() => {
      messageEl.textContent = `Say "${CMD_REMOVE}" to remove one`;
      stage = 1;
    }, 2000);
  }
  else if (stage === 1 && transcript.includes(CMD_REMOVE)) {
    // Remove one asset if it exists
    const firstAsset = spawnArea.querySelector('.asset');
    if (firstAsset) firstAsset.remove();
    // Always keep 'assets' array in sync
    assets = assets.filter(ad => ad.el !== firstAsset);

    messageEl.textContent = 'One gone! Say it louder to remove the last';
    stage = 2;
    spawnCount = 1;
    spawnIterations = 0;
  }
  else if (stage === 2 && transcript.includes(CMD_REMOVE)) {
    spawnCount *= 2;
    spawnIterations++;

    if (spawnCount > 64) spawnCount = 64; // Safe cap
    spawn(spawnCount);

    if (spawnIterations < 4) {
      messageEl.textContent = `Spawned ${spawnCount} item${spawnCount > 1 ? 's' : ''}! Speak louder and clearer to remove more.`;
    } else {
      messageEl.textContent = "Wow, you really like saying that? Are you trying to fill the whole screen with nonsense? 😂";
    }
  }
});

// Button toggles listening on and off
toggleBtn.addEventListener('click', () => {
  if (listening) {
    recognition.stop();
    toggleBtn.textContent = 'Start';
    messageEl.textContent = 'Click “Start” to begin';
    stage = 0;
    spawnArea.innerHTML = '';
    assets = [];
  } else {
    recognition.start();
    toggleBtn.textContent = 'Stop';
    messageEl.textContent = 'Say "hello"';
  }
  listening = !listening;
});

// Auto restart recognition if stopped unexpectedly
recognition.addEventListener('end', () => {
  if (listening) recognition.start();
  else toggleBtn.textContent = 'Start';
});
