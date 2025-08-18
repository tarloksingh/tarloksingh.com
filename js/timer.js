// Gala Reel Countdown Timer
class GalaReelTimer {
    constructor() {
        this.timerElement = document.getElementById('gala-timer');
        this.startTime = new Date().getTime();
        this.duration = 3 * 60 * 60 * 1000 + 42 * 60 * 1000 + 9 * 1000; // 3:42:09 in milliseconds
        this.endTime = this.startTime + this.duration;
        
        if (this.timerElement) {
            this.startCountdown();
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateTimer() {
        const now = new Date().getTime();
        const timeLeft = this.endTime - now;

        if (timeLeft > 0) {
            const formattedTime = this.formatTime(timeLeft);
            this.timerElement.innerHTML = `CAM CLOSES<br>${formattedTime}`;
        } else {
            // Timer finished
            this.timerElement.innerHTML = `CAM CLOSES<br>0:00:00`;
            clearInterval(this.interval);
        }
    }

    startCountdown() {
        // Update immediately
        this.updateTimer();
        
        // Update every second
        this.interval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }
}

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GalaReelTimer();
});