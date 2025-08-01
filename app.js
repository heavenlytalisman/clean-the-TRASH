// Interactive Voice-Controlled "Prank" Trash-Cleaning Web App
// The Ultimate Prank: User thinks they're lifting trash, but they're the one being lifted!

class TrashCleaningGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isGameActive = false;
        this.trashItems = [];
        this.audioContext = null;
        this.microphone = null;
        this.analyser = null;
        this.dataArray = null;
        this.speechSynthesis = window.speechSynthesis;
        this.recognition = null;
        this.currentVolume = 0;
        this.gamePhase = 'welcome'; // welcome, greeting, playing, lifting, pranked
        this.prankRevealed = false;
        this.groundLevel = 500;
        this.trashBin = { x: 650, y: 100, width: 100, height: 120 };
        this.cameraY = 0; // This will create the "lifting" effect
        this.maxLift = 0;
        this.liftProgress = 0;
        
        // Ground trash items (static positions)
        this.trashTypes = [
            { emoji: '🗑️', size: 30, x: 100, y: this.groundLevel, lifted: 0 },
            { emoji: '🥤', size: 25, x: 200, y: this.groundLevel, lifted: 0 },
            { emoji: '🍕', size: 28, x: 300, y: this.groundLevel, lifted: 0 },
            { emoji: '📦', size: 35, x: 450, y: this.groundLevel, lifted: 0 },
            { emoji: '🧻', size: 20, x: 550, y: this.groundLevel, lifted: 0 },
            { emoji: '🍌', size: 22, x: 150, y: this.groundLevel, lifted: 0 },
            { emoji: '🥫', size: 24, x: 400, y: this.groundLevel, lifted: 0 }
        ];
        
        // Initialize trash items
        this.trashItems = [...this.trashTypes];
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.gameLoop();
    }
    
    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.gameUI = document.getElementById('gameUI');
        this.volumeFill = document.getElementById('volumeFill');
        this.trashCount = document.getElementById('trashCount');
        this.promptText = document.getElementById('promptText');
        this.micStatus = document.getElementById('micStatus');
        this.micStatusText = document.getElementById('micStatusText');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
    }
    
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                this.handleSpeechInput(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.log('Speech recognition error:', event.error);
            };
        }
    }
    
    async startGame() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudioContext(stream);
            
            // Hide welcome screen and show game UI
            this.welcomeScreen.style.display = 'none';
            this.gameUI.style.display = 'block';
            this.resetBtn.style.display = 'inline-block';
            
            this.isGameActive = true;
            this.gamePhase = 'greeting';
            
            // Update microphone status
            this.micStatus.classList.add('connected');
            this.micStatusText.textContent = 'Connected';
            
            // Start speech recognition
            if (this.recognition) {
                this.recognition.start();
            }
            
            // Give initial greeting
            setTimeout(() => {
                this.speak("Welcome! Say 'hello' to begin cleaning the trash!");
            }, 1000);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.micStatus.classList.add('error');
            this.micStatusText.textContent = 'Access Denied';
            alert('Microphone access is required for this game. Please allow microphone access and try again.');
        }
    }
    
    setupAudioContext(stream) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        this.microphone.connect(this.analyser);
        
        // Start volume monitoring
        this.monitorVolume();
    }
    
    monitorVolume() {
        if (!this.analyser || !this.isGameActive) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        this.currentVolume = (average / 255) * 100;
        
        // Update volume meter
        this.volumeFill.style.width = `${this.currentVolume}%`;
        
        // New prank logic: lift trash (and secretly lift the camera/user!)
        if (this.gamePhase === 'lifting' && this.currentVolume > 15) {
            this.liftTrashAndCamera();
        }
        
        requestAnimationFrame(() => this.monitorVolume());
    }
    
    handleSpeechInput(transcript) {
        console.log('Speech input:', transcript);
        
        if (this.gamePhase === 'greeting' && transcript.includes('hello')) {
            this.gamePhase = 'playing';
            this.promptText.textContent = 'Great! Now speak loudly to lift the trash into the bin!';
            this.speak("Perfect! I can see trash scattered on the ground and a trash bin. Speak loudly to lift the trash up into the bin. The louder you speak, the higher the trash will rise!");
        } else if (this.gamePhase === 'playing' || this.gamePhase === 'lifting') {
            // Any speech during playing phase starts the lifting
            if (this.gamePhase === 'playing') {
                this.gamePhase = 'lifting';
            }
        }
    }
    
    liftTrashAndCamera() {
        const liftAmount = Math.min(this.currentVolume / 2, 10); // Max 10 pixels per frame
        
        // Lift trash items towards the bin
        this.trashItems.forEach(trash => {
            if (trash.lifted < 300) { // Max lift distance
                trash.lifted += liftAmount * 0.5;
                trash.y = this.groundLevel - trash.lifted;
            }
        });
        
        // Secret prank: Also lift the camera (user's perspective)
        if (this.cameraY < 400) {
            this.cameraY += liftAmount * 0.3; // Camera lifts slower than trash appears to
            this.maxLift = Math.max(this.maxLift, this.cameraY);
        }
        
        // Check if it's time for the prank reveal
        this.checkPrankReveal();
    }
    
    checkPrankReveal() {
        // Reveal prank when camera has lifted significantly
        if (!this.prankRevealed && this.cameraY > 200) {
            this.prankRevealed = true;
            this.gamePhase = 'pranked';
            
            // Dramatic prank reveal with camera shake and message
            this.promptText.textContent = '😈 GOTCHA! YOU are the one being lifted! 😈';
            this.speak("Surprise! You thought you were lifting the trash, but you're the one who fell for it! You've been lifted up instead! The trash was never moving - YOU were!");
            
            // Add some camera shake effect for drama
            this.addCameraShake();
        }
    }
    
    addCameraShake() {
        let shakeIntensity = 10;
        let shakeCount = 0;
        const maxShakes = 20;
        
        const shake = () => {
            if (shakeCount < maxShakes) {
                this.cameraY += (Math.random() - 0.5) * shakeIntensity;
                shakeIntensity *= 0.9; // Reduce shake over time
                shakeCount++;
                setTimeout(shake, 50);
            }
        };
        shake();
    }
    
    speak(text) {
        if (this.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            this.speechSynthesis.speak(utterance);
        }
    }
    
    updateTrashCount() {
        this.trashCount.textContent = this.trashItems.length;
    }
    
    gameLoop() {
        this.clearCanvas();
        
        if (this.isGameActive) {
            this.drawScene();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    clearCanvas() {
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawScene() {
        // Save the current context state
        this.ctx.save();
        
        // Apply camera movement (this creates the "lifting" illusion)
        this.ctx.translate(0, -this.cameraY);
        
        // Draw background with sky-to-ground gradient
        this.drawBackground();
        
        // Draw ground
        this.drawGround();
        
        // Draw trash bin
        this.drawTrashBin();
        
        // Draw trash items
        this.drawTrashItems();
        
        // Draw clouds (they move with camera to enhance the lifting effect)
        this.drawClouds();
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI elements that shouldn't move with camera
        this.drawStaticUI();
    }
    
    drawBackground() {
        // Create a nice sky-to-ground gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height + 400);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(0.6, '#98FB98'); // Light green
        gradient.addColorStop(1, '#90EE90'); // Grass green
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height + 400);
    }
    
    drawGround() {
        // Draw ground line
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.groundLevel, this.canvas.width, 20);
        
        // Add some grass texture
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.fillText('🌱', i, this.groundLevel - 5);
        }
    }
    
    drawTrashBin() {
        // Draw trash bin
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(this.trashBin.x, this.trashBin.y, this.trashBin.width, this.trashBin.height);
        
        // Add bin details
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(this.trashBin.x + 10, this.trashBin.y + 10, this.trashBin.width - 20, this.trashBin.height - 20);
        
        // Bin emoji/label
        this.ctx.font = '60px Arial';
        this.ctx.fillText('🗑️', this.trashBin.x + this.trashBin.width/2, this.trashBin.y + this.trashBin.height/2 + 20);
    }
    
    drawTrashItems() {
        this.ctx.textAlign = 'center';
        
        this.trashItems.forEach(trash => {
            this.ctx.font = `${trash.size}px Arial`;
            this.ctx.fillText(trash.emoji, trash.x, trash.y);
            
            // Add a subtle shadow for depth
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillText(trash.emoji, trash.x + 2, trash.y + 2);
            this.ctx.fillStyle = 'black'; // Reset color
        });
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '40px Arial';
        // Clouds at various heights - they'll move with the camera
        this.ctx.fillText('☁️', 100, 80);
        this.ctx.fillText('☁️', 300, 60);
        this.ctx.fillText('☁️', 500, 90);
        this.ctx.fillText('☁️', 650, 70);
        this.ctx.fillText('☁️', 200, 120);
        this.ctx.fillText('☁️', 450, 40);
    }
    
    drawStaticUI() {
        // Draw any UI elements that should stay fixed (none needed for now)
        // This could include progress bars, instructions, etc. that shouldn't move with camera
    }
    
    resetGame() {
        // Stop audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Stop speech recognition
        if (this.recognition) {
            this.recognition.stop();
        }
        
        // Reset game state
        this.isGameActive = false;
        this.gamePhase = 'welcome';
        this.prankRevealed = false;
        this.currentVolume = 0;
        this.cameraY = 0;
        this.maxLift = 0;
        this.liftProgress = 0;
        
        // Reset trash items to original positions
        this.trashItems = this.trashTypes.map(trash => ({
            ...trash,
            y: this.groundLevel,
            lifted: 0
        }));
        
        // Reset UI
        this.welcomeScreen.style.display = 'block';
        this.gameUI.style.display = 'none';
        this.resetBtn.style.display = 'none';
        this.volumeFill.style.width = '0%';
        this.trashCount.textContent = this.trashItems.length;
        this.promptText.textContent = 'Say "Hello" to begin!';
        
        // Reset microphone status
        this.micStatus.classList.remove('connected', 'error');
        this.micStatusText.textContent = 'Not Connected';
        
        // Stop any ongoing speech
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TrashCleaningGame();
});