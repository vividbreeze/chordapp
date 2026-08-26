// Rhythm Training Engine

export type RhythmMode = 'freeplay' | 'chords';

export interface RhythmSettings {
    bpm: number;
    beatsPerMeasure: number; // 4 = 4/4, 3 = 3/4
    mode: RhythmMode;
    countIn: boolean; // 1 Takt Einzählen
}

export interface BeatEvent {
    beat: number; // 1-based beat number in measure
    measure: number;
    isDownbeat: boolean; // First beat of measure
    timestamp: number;
}

export type BeatCallback = (event: BeatEvent) => void;
export type HitCallback = (timing: 'perfect' | 'good' | 'early' | 'late' | 'miss', offsetMs: number) => void;

export class RhythmEngine {
    private settings: RhythmSettings = {
        bpm: 80,
        beatsPerMeasure: 4,
        mode: 'freeplay',
        countIn: true
    };

    private isRunning = false;
    private audioContext: AudioContext | null = null;
    private nextBeatTime = 0;
    private currentBeat = 0;
    private currentMeasure = 0;
    private schedulerInterval: number | null = null;
    private lastBeatTimestamp = 0;

    private beatCallback: BeatCallback | null = null;
    private hitCallback: HitCallback | null = null;

    // Timing windows in ms
    private readonly PERFECT_WINDOW = 50;
    private readonly GOOD_WINDOW = 100;
    private readonly ACCEPTABLE_WINDOW = 150;

    updateSettings(settings: Partial<RhythmSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    getSettings(): RhythmSettings {
        return { ...this.settings };
    }

    getBeatIntervalMs(): number {
        return 60000 / this.settings.bpm;
    }

    onBeat(callback: BeatCallback): void {
        this.beatCallback = callback;
    }

    onHit(callback: HitCallback): void {
        this.hitCallback = callback;
    }

    async start(): Promise<void> {
        if (this.isRunning) return;

        // Create audio context for precise timing
        this.audioContext = new AudioContext();
        await this.audioContext.resume();

        this.isRunning = true;
        this.currentBeat = 0;
        this.currentMeasure = this.settings.countIn ? -1 : 0;
        this.nextBeatTime = this.audioContext.currentTime + 0.1;

        // Schedule ahead
        this.schedulerInterval = window.setInterval(() => this.scheduler(), 25);
    }

    stop(): void {
        this.isRunning = false;

        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    private scheduler(): void {
        if (!this.audioContext || !this.isRunning) return;

        const scheduleAhead = 0.1; // Schedule 100ms ahead

        while (this.nextBeatTime < this.audioContext.currentTime + scheduleAhead) {
            this.scheduleBeat(this.nextBeatTime);
            this.advanceBeat();
        }
    }

    private scheduleBeat(time: number): void {
        if (!this.audioContext) return;

        const isDownbeat = this.currentBeat === 0;

        // Play click sound
        this.playClick(time, isDownbeat);

        // Schedule visual callback
        const delayMs = (time - this.audioContext.currentTime) * 1000;
        setTimeout(() => {
            this.lastBeatTimestamp = performance.now();

            if (this.beatCallback) {
                this.beatCallback({
                    beat: this.currentBeat + 1,
                    measure: this.currentMeasure,
                    isDownbeat,
                    timestamp: this.lastBeatTimestamp
                });
            }
        }, Math.max(0, delayMs));
    }

    private playClick(time: number, isDownbeat: boolean): void {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        // Higher pitch for downbeat
        osc.frequency.value = isDownbeat ? 1000 : 800;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    private advanceBeat(): void {
        const beatInterval = 60 / this.settings.bpm;
        this.nextBeatTime += beatInterval;

        this.currentBeat++;
        if (this.currentBeat >= this.settings.beatsPerMeasure) {
            this.currentBeat = 0;
            this.currentMeasure++;
        }
    }

    registerHit(): void {
        if (!this.isRunning || !this.hitCallback) return;

        const now = performance.now();
        const timeSinceLastBeat = now - this.lastBeatTimestamp;
        const beatInterval = this.getBeatIntervalMs();

        // Check if closer to last beat or next beat
        const timeToNextBeat = beatInterval - timeSinceLastBeat;

        let offset: number;
        if (timeSinceLastBeat < timeToNextBeat) {
            offset = timeSinceLastBeat; // Late hit
        } else {
            offset = -timeToNextBeat; // Early hit for next beat
        }

        const absOffset = Math.abs(offset);

        if (absOffset <= this.PERFECT_WINDOW) {
            this.hitCallback('perfect', offset);
        } else if (absOffset <= this.GOOD_WINDOW) {
            this.hitCallback('good', offset);
        } else if (absOffset <= this.ACCEPTABLE_WINDOW) {
            this.hitCallback(offset > 0 ? 'late' : 'early', offset);
        } else {
            this.hitCallback('miss', offset);
        }
    }

    isActive(): boolean {
        return this.isRunning;
    }

    getCurrentMeasure(): number {
        return this.currentMeasure;
    }
}

export const rhythmEngine = new RhythmEngine();
