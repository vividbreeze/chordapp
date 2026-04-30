// Practice Mode Engine - Generates chords for practice sessions

export type RootSelection = 'chromatic' | 'circleOfFifths' | 'random' | 'diatonic';
export type VoicingMode = 'rootPosition' | 'randomInversion';
export type ChordQuality = 'Major' | 'Minor' | 'Diminished' | '7th';

export interface PracticeSettings {
    rootSelection: RootSelection;
    chordQualities: Set<ChordQuality>;
    targetKey: string;
    voicingMode: VoicingMode;
    bpm: number;
    barsPerChord: number;
}

export interface ChordChallenge {
    chordName: string;
    displaySymbol: string;
    requiredMidiNotes: number[];
    rootNote: number;
    quality: ChordQuality;
}

export type PracticeResult = 'waiting' | 'success' | 'timeout';

// Note names with enharmonic equivalents based on key context
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys that prefer flats
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

// Circle of fifths order (ascending by perfect 5th = 7 semitones)
const CIRCLE_OF_FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C, G, D, A, E, B, F#, C#, Ab, Eb, Bb, F

// Diatonic scale intervals (major scale)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Chord intervals from root
const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
    'Major': [0, 4, 7],
    'Minor': [0, 3, 7],
    'Diminished': [0, 3, 6],
    '7th': [0, 4, 7, 10],
};

// Display suffixes for chord qualities
const QUALITY_SUFFIX: Record<ChordQuality, string> = {
    'Major': '',
    'Minor': 'm',
    'Diminished': 'dim',
    '7th': '7',
};

export class PracticeEngine {
    private settings: PracticeSettings;
    private currentChord: ChordChallenge | null = null;
    private currentRootIndex: number = 0;
    private chromaticIndex: number = 0;
    private circleIndex: number = 0;
    private diatonicIndex: number = 0;
    private timer: number | null = null;
    private onChordChange: ((chord: ChordChallenge) => void) | null = null;
    private onTimeout: (() => void) | null = null;
    private isRunning: boolean = false;

    constructor() {
        this.settings = this.getDefaultSettings();
    }

    getDefaultSettings(): PracticeSettings {
        return {
            rootSelection: 'chromatic',
            chordQualities: new Set<ChordQuality>(['Major']),
            targetKey: 'C',
            voicingMode: 'rootPosition',
            bpm: 60,
            barsPerChord: 2,
        };
    }

    getSettings(): PracticeSettings {
        return this.settings;
    }

    updateSettings(partial: Partial<PracticeSettings>): void {
        this.settings = { ...this.settings, ...partial };
    }

    setChordQualities(qualities: ChordQuality[]): void {
        this.settings.chordQualities = new Set(qualities);
    }

    private useFlats(): boolean {
        return FLAT_KEYS.includes(this.settings.targetKey);
    }

    private getNoteNameForPitchClass(pitchClass: number): string {
        const noteNames = this.useFlats() ? FLAT_NOTES : SHARP_NOTES;
        return noteNames[pitchClass % 12];
    }

    private getTargetKeyRoot(): number {
        const keyName = this.settings.targetKey.replace('m', '');
        let index = SHARP_NOTES.indexOf(keyName);
        if (index === -1) {
            index = FLAT_NOTES.indexOf(keyName);
        }
        return index >= 0 ? index : 0;
    }

    private getDiatonicRoots(): number[] {
        const keyRoot = this.getTargetKeyRoot();
        const isMinor = this.settings.targetKey.endsWith('m');

        // For minor keys, use natural minor scale (relative to major)
        const intervals = isMinor
            ? [0, 2, 3, 5, 7, 8, 10] // Natural minor intervals
            : MAJOR_SCALE_INTERVALS;

        return intervals.map(interval => (keyRoot + interval) % 12);
    }

    private getNextRoot(): number {
        switch (this.settings.rootSelection) {
            case 'chromatic':
                const chromRoot = this.chromaticIndex;
                this.chromaticIndex = (this.chromaticIndex + 1) % 12;
                return chromRoot;

            case 'circleOfFifths':
                const cofRoot = CIRCLE_OF_FIFTHS[this.circleIndex];
                this.circleIndex = (this.circleIndex + 1) % 12;
                return cofRoot;

            case 'random':
                return Math.floor(Math.random() * 12);

            case 'diatonic':
                const diatonicRoots = this.getDiatonicRoots();
                const diaRoot = diatonicRoots[this.diatonicIndex];
                this.diatonicIndex = (this.diatonicIndex + 1) % diatonicRoots.length;
                return diaRoot;

            default:
                return 0;
        }
    }

    private getRandomQuality(): ChordQuality {
        const qualities = Array.from(this.settings.chordQualities);
        if (qualities.length === 0) {
            return 'Major';
        }
        return qualities[Math.floor(Math.random() * qualities.length)];
    }

    private applyInversion(notes: number[], inversion: number): number[] {
        const result = [...notes];
        for (let i = 0; i < inversion; i++) {
            result[i] += 12;
        }
        return result.sort((a, b) => a - b);
    }

    getNextChord(): ChordChallenge {
        const rootPitchClass = this.getNextRoot();
        const quality = this.getRandomQuality();
        const intervals = CHORD_INTERVALS[quality];

        // Base octave (middle C = 60)
        const baseOctave = 60;
        let midiNotes = intervals.map(interval => baseOctave + rootPitchClass + interval);

        // Apply inversion if randomInversion mode
        if (this.settings.voicingMode === 'randomInversion') {
            const maxInversion = intervals.length - 1;
            const inversion = Math.floor(Math.random() * (maxInversion + 1));
            if (inversion > 0) {
                midiNotes = this.applyInversion(midiNotes, inversion);
            }
        }

        const rootName = this.getNoteNameForPitchClass(rootPitchClass);
        const suffix = QUALITY_SUFFIX[quality];

        this.currentChord = {
            chordName: `${rootName} ${quality}`,
            displaySymbol: `${rootName}${suffix}`,
            requiredMidiNotes: midiNotes,
            rootNote: rootPitchClass,
            quality: quality,
        };

        this.currentRootIndex = rootPitchClass;
        return this.currentChord;
    }

    getCurrentChord(): ChordChallenge | null {
        return this.currentChord;
    }

    checkAnswer(playedMidiNotes: number[]): boolean {
        if (!this.currentChord) return false;

        // Reduce to pitch classes for comparison (octave-independent)
        const requiredPitchClasses = new Set(
            this.currentChord.requiredMidiNotes.map(n => n % 12)
        );
        const playedPitchClasses = new Set(
            playedMidiNotes.map(n => n % 12)
        );

        // Check if all required pitch classes are present
        if (requiredPitchClasses.size !== playedPitchClasses.size) {
            return false;
        }

        for (const pc of requiredPitchClasses) {
            if (!playedPitchClasses.has(pc)) {
                return false;
            }
        }

        return true;
    }

    getMillisecondsPerChord(): number {
        // beats per bar = 4 (assuming 4/4 time)
        const beatsPerBar = 4;
        const totalBeats = beatsPerBar * this.settings.barsPerChord;
        const msPerBeat = 60000 / this.settings.bpm;
        return msPerBeat * totalBeats;
    }

    start(onChordChange: (chord: ChordChallenge) => void, onTimeout: () => void): void {
        this.onChordChange = onChordChange;
        this.onTimeout = onTimeout;
        this.isRunning = true;

        // Reset indices
        this.chromaticIndex = 0;
        this.circleIndex = 0;
        this.diatonicIndex = 0;

        this.nextChordCycle();
    }

    private nextChordCycle(): void {
        if (!this.isRunning) return;

        const chord = this.getNextChord();
        if (this.onChordChange) {
            this.onChordChange(chord);
        }

        this.timer = window.setTimeout(() => {
            if (this.onTimeout) {
                this.onTimeout();
            }
            this.nextChordCycle();
        }, this.getMillisecondsPerChord());
    }

    markSuccess(): void {
        // User played correctly, advance to next chord immediately
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.nextChordCycle();
    }

    stop(): void {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.currentChord = null;
    }

    isActive(): boolean {
        return this.isRunning;
    }
}

// Singleton instance
export const practiceEngine = new PracticeEngine();
