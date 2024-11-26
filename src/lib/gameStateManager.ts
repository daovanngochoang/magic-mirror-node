class GameStateManager {
    private mode: 'Welcome' | 'Learning' | 'Game';
    private score: number;
    private timer: number;
    private timerRef: NodeJS.Timeout | null;

    constructor() {
        this.mode = 'Welcome';
        this.score = 0;
        this.timer = 20;
        this.timerRef = null;
    }

    setMode(newMode: 'Welcome' | 'Learning' | 'Game'): void {
        this.mode = newMode;
    }

    incrementScore(): void {
        this.score += 1;
    }

    resetTimer(): void {
        if (this.timerRef) clearInterval(this.timerRef);
        this.timer = 20;
        this.timerRef = setInterval(() => {
            if (this.timer <= 1) {
                clearInterval(this.timerRef!);
                this.timerRef = null;
                return;
            }
            this.timer -= 1;
        }, 1000);
    }

    stopTimer(): void {
        if (this.timerRef) clearInterval(this.timerRef);
    }

    getMode(): 'Welcome' | 'Learning' | 'Game' {
        return this.mode;
    }

    getScore(): number {
        return this.score;
    }

    getTimer(): number {
        return this.timer;
    }
}
export default GameStateManager;