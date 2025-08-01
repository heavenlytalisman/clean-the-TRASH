// app.js

// Grab DOM elements
const spawnArea = document.getElementById('spawn-area');
const toggleBtn = document.getElementById('toggleBtn');
const messageEl = document.getElementById('message');

let listening = false;
let stage = 0;          // 0 = wait "hello"; 1 = wait first remove; 2 = loud remove stage

let spawnCount = 1;     // Number of assets to spawn (double in stage 2)
let spawnIterations = 0; // Number of times doubled/spawned in stage 2

// Voice commands
const CMD_HELLO  = 'hello';
const CMD_REMOVE = 'remove it';

// Set up Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) throw new Error('Web Speech API unsupported');

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

// Position an element randomly inside spawnArea (not used now, but kept for reference)
function positionRandom(el) {
  const maxX = spawnArea.clientWidth - 60;
  const maxY = spawnArea.clientHeight - 60;
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  el.style.transform = `translate(${x}px, ${y}px)`;
}

// Spawn count assets evenly spaced in a grid layout in spawnArea
function spawn(count = 1) {
  // Clear previous assets so only current ones are visible
  spawnArea.innerHTML = '';

  const assetSize = 60; // Must match CSS .asset size
  const maxWidth = spawnArea.clientWidth;
  const maxHeight = spawnArea.clientHeight;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const hSpacing = (maxWidth - cols * assetSize) / (cols + 1);
  const vSpacing = (maxHeight - rows * assetSize) / (rows + 1);

  for (let i = 0; i < count; i++) {
    const asset = document.createElement('div');
    asset.className = 'asset';

    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = hSpacing + col * (assetSize + hSpacing);
    const y = vSpacing + row * (assetSize + vSpacing);

    asset.style.transform = `translate(${x}px, ${y}px)`;

    spawnArea.appendChild(asset);
  }
}

let lastTranscript = '';

// Handle speech recognition results
recognition.addEventListener('result', evt => {
  const transcript = Array.from(evt.results)
    .slice(evt.resultIndex)
    .map(r => r[0].transcript.trim().toLowerCase())
    .join(' ');

  // Prevent repeated reaction to the same transcript
  if (transcript === lastTranscript) return;
  lastTranscript = transcript;

  if (stage === 0 && transcript.includes(CMD_HELLO)) {
    messageEl.textContent = 'Awesome voice! Spawning two items...';
    spawn(2);
    setTimeout(() => {
      messageEl.textContent = `Say "${CMD_REMOVE}" to remove one`;
      stage = 1;
    }, 2000);
  }
  else if (stage === 1 && transcript.includes(CMD_REMOVE)) {
    // Remove one asset
    const firstAsset = spawnArea.querySelector('.asset');
    if (firstAsset) firstAsset.remove();
    messageEl.textContent = 'One gone! Say it louder to remove the last';
    stage = 2;
    spawnCount = 1;       // reset doubling counter
    spawnIterations = 0;  // reset iteration count
  }
  else if (stage === 2 && transcript.includes(CMD_REMOVE)) {
    spawnCount *= 2;
    spawnIterations++;

    if (spawnIterations < 4) {
      spawn(spawnCount);
      messageEl.textContent = `Spawned ${spawnCount} item${spawnCount > 1 ? 's' : ''}! Speak louder and clearer to remove more.`;
    } else {
      // After 4th doubling, mocking the user
      messageEl.textContent =
        "Wow, you really like saying that? Are you trying to fill the whole screen with nonsense? 😂";
      // Cap number of assets to prevent overload
      spawn(spawnCount > 64 ? 64 : spawnCount);
    }
  }
});

// Toggle voice recognition on button click
toggleBtn.addEventListener('click', () => {
  if (listening) {
    recognition.stop();
    toggleBtn.textContent = 'Start';
    messageEl.textContent = 'Click “Start” to begin';
    stage = 0;
    spawnArea.innerHTML = ''; // Clear spawned assets on stop
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
