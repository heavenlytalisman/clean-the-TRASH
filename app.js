class VoiceTrashCleaner {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.status = document.getElementById('status');
        this.instructions = document.getElementById('instructions');
        this.volumeFill = document.getElementById('volumeFill');
        this.trashCounter = document.getElementById('trashCounter');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
                
        this.trash = [];
        this.currentVolume = 0;
        this.gameState = 'waiting'; // waiting, greeting, listening, cleaning, revealed
        this.trashCount = 0;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
                this.dataArray = null;
                this.speechSynth = window.speechSynthesis;
                this.recognition = null;
                
                this.trashTypes = ['🗑️', '🥤', '🍔', '📦', '🧻', '🍕', '🥘', '🍌', '🧽', '🗞️'];
                
                this.setupCanvas();
                this.setupEventListeners();
                this.animate();
            }
            
            setupCanvas() {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                
                window.addEventListener('resize', () => {
                    this.canvas.width = window.innerWidth;
                    this.canvas.height = window.innerHeight;
                });
            }
            
            setupEventListeners() {
                this.startBtn.addEventListener('click', () => this.startExperience());
                this.resetBtn.addEventListener('click', () => this.reset());
            }
            
            async startExperience() {
                try {
                    await this.setupAudio();
                    this.setupSpeechRecognition();
                    this.gameState = 'greeting';
                    this.startBtn.disabled = true;
                    this.greetUser();
                } catch (error) {
                    this.updateStatus('❌ Microphone access required! Please allow and try again.');
                }
            }
            
            async setupAudio() {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                
                this.microphone.connect(this.analyser);
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                this.monitorVolume();
            }
            
            setupSpeechRecognition() {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    this.recognition = new SpeechRecognition();
                    this.recognition.continuous = true;
                    this.recognition.interimResults = true;
                    
                    this.recognition.onresult = (event) => {
                        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                        this.handleSpeechResult(transcript);
                    };
                    
                    this.recognition.start();
                }
            }
            
            handleSpeechResult(transcript) {
                if (this.gameState === 'listening' && transcript.includes('hello')) {
                    this.gameState = 'cleaning';
                    this.startCleaningPhase();
                }
            }
            
            greetUser() {
                this.updateStatus('👋 Welcome to the Voice Trash Cleaner!');
                this.updateInstructions('Say "Hello" to start cleaning the environment!');
                
                this.speak("Welcome to the amazing voice-controlled trash cleaner! Say hello to begin your eco-friendly mission!", () => {
                    this.gameState = 'listening';
                    this.spawnInitialTrash();
                });
            }
            
            startCleaningPhase() {
                this.updateStatus('🎯 Great! Now say "CLEAN THE TRASH" loudly!');
                this.updateInstructions('The louder you speak, the more effective the cleaning! 📢');
                
                this.speak("Perfect! Now say 'clean the trash' as loudly as you can. The louder you speak, the more trash we can clean!");
            }
            
            speak(text, callback) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.1;
                utterance.pitch = 1.2;
                utterance.volume = 0.8;
                
                if (callback) {
                    utterance.onend = callback;
                }
                
                this.speechSynth.speak(utterance);
            }
            
            monitorVolume() {
                const checkVolume = () => {
                    if (this.analyser) {
                        this.analyser.getByteFrequencyData(this.dataArray);
                        
                        let sum = 0;
                        for (let i = 0; i < this.dataArray.length; i++) {
                            sum += this.dataArray[i];
                        }
                        
                        this.currentVolume = (sum / this.dataArray.length) / 255;
                        this.volumeFill.style.width = (this.currentVolume * 100) + '%';
                        
                        if (this.gameState === 'cleaning') {
                            this.handleVolumeInput();
                        }
                    }
                    
                    requestAnimationFrame(checkVolume);
                };
                
                checkVolume();
            }
            
            handleVolumeInput() {
                if (this.currentVolume > 0.1) {
                    // The prank: instead of cleaning, spawn MORE trash!
                    const spawnCount = Math.floor(this.currentVolume * 5) + 1;
                    
                    for (let i = 0; i < spawnCount; i++) {
                        this.spawnTrash();
                    }
                    
                    // Encourage them to speak louder
                    if (this.currentVolume > 0.3 && Math.random() < 0.1) {
                        const encouragements = [
                            "Great! Speak even louder for maximum cleaning power!",
                            "Louder! The trash is fighting back!",
                            "More volume needed! You're almost there!",
                            "Keep going! Louder for better results!"
                        ];
                        
                        const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
                        this.updateInstructions(randomEncouragement);
                    }
                    
                    // Reveal the prank after enough trash
                    if (this.trashCount > 50 && Math.random() < 0.02) {
                        this.revealPrank();
                    }
                }
            }
            
            spawnInitialTrash() {
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => this.spawnTrash(), i * 200);
                }
            }
            
            spawnTrash() {
                const trash = {
                    x: Math.random() * this.canvas.width,
                    y: -50,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 3 + 2,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    type: this.trashTypes[Math.floor(Math.random() * this.trashTypes.length)],
                    size: 20 + Math.random() * 15,
                    opacity: 1
                };
                
                this.trash.push(trash);
                this.trashCount++;
                this.updateTrashCounter();
            }
            
            updateTrashCounter() {
                this.trashCounter.textContent = `Trash Count: ${this.trashCount}`;
                this.trashCounter.style.color = this.trashCount > 30 ? '#ff4757' : '#ff6b6b';
            }
            
            revealPrank() {
                this.gameState = 'revealed';
                this.updateStatus('🎉 GOTCHA! 🎉');
                this.updateInstructions('');
                
                const prankMessage = document.createElement('div');
                prankMessage.className = 'prank-reveal';
                prankMessage.innerHTML = `
                    <div class="emoji">😂</div>
                    <div>SURPRISE! This was a prank!</div>
                    <div>The louder you spoke, the MORE trash appeared!</div>
                    <div>Thanks for being a good sport! 🎭</div>
                    <div class="emoji">🗑️➡️📈</div>
                `;
                
                document.querySelector('.container').appendChild(prankMessage);
                
                this.speak("Surprise! This was all a prank! The louder you spoke, the more trash appeared instead of disappearing. Thanks for being such a good sport!");
                
                // Make remaining trash fall faster
                this.trash.forEach(item => {
                    item.vy *= 2;
                });
            }
            
            animate() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Update and draw trash
                for (let i = this.trash.length - 1; i >= 0; i--) {
                    const item = this.trash[i];
                    
                    item.x += item.vx;
                    item.y += item.vy;
                    item.rotation += item.rotationSpeed;
                    
                    // Remove trash that falls off screen
                    if (item.y > this.canvas.height + 100) {
                        this.trash.splice(i, 1);
                        continue;
                    }
                    
                    // Draw trash
                    this.ctx.save();
                    this.ctx.translate(item.x, item.y);
                    this.ctx.rotate(item.rotation);
                    this.ctx.font = `${item.size}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.globalAlpha = item.opacity;
                    this.ctx.fillText(item.type, 0, 0);
                    this.ctx.restore();
                }
                
                requestAnimationFrame(() => this.animate());
            }
            
            updateStatus(message) {
                this.status.textContent = message;
                this.status.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    this.status.style.transform = 'scale(1)';
                }, 200);
            }
            
            updateInstructions(message) {
                this.instructions.textContent = message;
            }
            
            reset() {
                this.gameState = 'waiting';
                this.trash = [];
                this.trashCount = 0;
                this.currentVolume = 0;
                this.startBtn.disabled = false;
                
                this.updateStatus('Click "Start" to begin cleaning!');
                this.updateInstructions('Get ready for an eco-friendly voice adventure!');
                this.updateTrashCounter();
                this.volumeFill.style.width = '0%';
                
                // Remove prank reveal if it exists
                const prankReveal = document.querySelector('.prank-reveal');
                if (prankReveal) {
                    prankReveal.remove();
                }
                
                // Stop speech recognition
                if (this.recognition) {
                    this.recognition.stop();
                }
                
                // Stop audio context
                if (this.audioContext) {
                    this.audioContext.close();
                    this.audioContext = null;
                }
            }
        }
        
        // Initialize the app when the page loads
        window.addEventListener('load', () => {
            new VoiceTrashCleaner();
        });