// Practice Mode Engine - Generates chords for practice sessions

export type RootSelection = 'chromatic' | 'circleOfFifths' | 'random' | 'diatonic';

export type VoicingMode =
    | 'rootPosition'
    | 'firstInversion'
    | 'secondInversion'
    | 'thirdInversion'
    | 'randomInversion';

// Expanded chord qualities
export type ChordQuality =
    // Triads
    | 'Major'
    | 'Minor'
    | 'Diminished'
    | 'Augmented'
    // 7th Chords
    | 'maj7'      // Major 7th
    | '7'         // Dominant 7th
    | 'm7'        // Minor 7th
    | 'm7b5'      // Half-Diminished
    // Extensions
    | 'add9';

export interface PracticeSettings {
    rootSelection: RootSelection;
    chordQualities: Set<ChordQuality>;
    targetKey: string;
    voicingMode: VoicingMode;
    bpm: number;
    barsPerChord: number;
    smoothTransitions: boolean;
}

export interface ChordChallenge {
    chordName: string;
    displaySymbol: string;
    requiredMidiNotes: number[];
    rootNote: number;
    quality: ChordQuality;
    inversion: number;
    bassNote: number;
}

export type PracticeResult = 'waiting' | 'success' | 'timeout';

// Note names with enharmonic equivalents based on key context
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys that prefer flats
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

// Circle of fifths order (ascending by perfect 5th = 7 semitones)
const CIRCLE_OF_FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

// Diatonic scale intervals (major scale)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Chord intervals from root (in semitones)
const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
    // Triads
    'Major': [0, 4, 7],           // Root, Major 3rd, Perfect 5th
    'Minor': [0, 3, 7],           // Root, Minor 3rd, Perfect 5th
    'Diminished': [0, 3, 6],      // Root, Minor 3rd, Diminished 5th
    'Augmented': [0, 4, 8],       // Root, Major 3rd, Augmented 5th
    // 7th Chords
    'maj7': [0, 4, 7, 11],        // Major 7th: Root, Major 3rd, Perfect 5th, Major 7th
    '7': [0, 4, 7, 10],           // Dominant 7th: Root, Major 3rd, Perfect 5th, Minor 7th
    'm7': [0, 3, 7, 10],          // Minor 7th: Root, Minor 3rd, Perfect 5th, Minor 7th
    'm7b5': [0, 3, 6, 10],        // Half-Diminished: Root, Minor 3rd, Dim 5th, Minor 7th
    // Extensions
    'add9': [0, 4, 7, 14],        // Add9: Root, Major 3rd, Perfect 5th, Major 9th
};

// Display suffixes for chord qualities
const QUALITY_SUFFIX: Record<ChordQuality, string> = {
    'Major': '',
    'Minor': 'm',
    'Diminished': 'dim',
    'Augmented': 'aug',
    'maj7': 'maj7',
    '7': '7',
    'm7': 'm7',
    'm7b5': 'm7b5',
    'add9': 'add9',
};

// Full names for chord qualities
const QUALITY_FULL_NAME: Record<ChordQuality, string> = {
    'Major': 'Major',
    'Minor': 'Minor',
    'Diminished': 'Diminished',
    'Augmented': 'Augmented',
    'maj7': 'Major 7th',
    '7': 'Dominant 7th',
    'm7': 'Minor 7th',
    'm7b5': 'Half-Diminished',
    'add9': 'Add 9',
};

// Chord degree names for inversions
const DEGREE_NAMES = ['Root', '3rd', '5th', '7th', '9th'];

/**
 * VoicingManager - Handles chord inversions and voice leading
 */
export class VoicingManager {
    /**
     * Get the maximum inversion number for a chord quality
     */
    static getMaxInversion(quality: ChordQuality): number {
        const intervals = CHORD_INTERVALS[quality];
        return intervals.length - 1;
    }

    /**
     * Check if a chord quality supports 3rd inversion (4-note chords)
     */
    static supportsThirdInversion(quality: ChordQuality): boolean {
        return CHORD_INTERVALS[quality].length >= 4;
    }

    /**
     * Apply inversion to chord notes
     * @param notes Original MIDI notes in root position
     * @param inversion Inversion number (0=root, 1=1st, 2=2nd, 3=3rd)
     * @returns Inverted MIDI notes array
     */
    static applyInversion(notes: number[], inversion: number): number[] {
        if (inversion === 0 || inversion >= notes.length) {
            return [...notes];
        }

        const result = [...notes];

        // Move the bottom 'inversion' notes up an octave
        for (let i = 0; i < inversion; i++) {
            result[i] += 12;
        }

        // Sort to get proper voicing order
        return result.sort((a, b) => a - b);
    }

    /**
     * Get the bass note pitch class for a given inversion
     * @param rootPitchClass The root note's pitch class (0-11)
     * @param quality The chord quality
     * @param inversion The inversion number
     * @returns The pitch class of the bass note
     */
    static getBassNotePitchClass(rootPitchClass: number, quality: ChordQuality, inversion: number): number {
        const intervals = CHORD_INTERVALS[quality];
        if (inversion >= intervals.length) {
            return rootPitchClass;
        }
        return (rootPitchClass + intervals[inversion]) % 12;
    }

    /**
     * Get inversion name
     */
    static getInversionName(inversion: number): string {
        switch (inversion) {
            case 0: return 'Root Position';
            case 1: return '1st Inversion';
            case 2: return '2nd Inversion';
            case 3: return '3rd Inversion';
            default: return 'Root Position';
        }
    }

    /**
     * Calculate voice leading distance between two sets of notes
     * Lower distance = smoother transition
     */
    static calculateVoiceLeadingDistance(currentNotes: number[], targetNotes: number[]): number {
        if (currentNotes.length === 0) return 0;

        const currentPitchClasses = currentNotes.map(n => n % 12).sort((a, b) => a - b);
        const targetPitchClasses = targetNotes.map(n => n % 12).sort((a, b) => a - b);

        let totalDistance = 0;
        const maxLen = Math.max(currentPitchClasses.length, targetPitchClasses.length);

        for (let i = 0; i < maxLen; i++) {
            const current = currentPitchClasses[i % currentPitchClasses.length];
            const target = targetPitchClasses[i % targetPitchClasses.length];

            // Calculate minimum semitone distance (considering wrap-around)
            const directDistance = Math.abs(target - current);
            const wrapDistance = 12 - directDistance;
            totalDistance += Math.min(directDistance, wrapDistance);
        }

        return totalDistance;
    }

    /**
     * Find the best inversion for smooth voice leading
     */
    static findSmoothestInversion(
        rootPitchClass: number,
        quality: ChordQuality,
        currentNotes: number[],
        baseOctave: number
    ): { notes: number[]; inversion: number } {
        const intervals = CHORD_INTERVALS[quality];
        const maxInversion = intervals.length - 1;

        let bestInversion = 0;
        let bestDistance = Infinity;
        let bestNotes: number[] = [];

        for (let inv = 0; inv <= maxInversion; inv++) {
            const rootPosition = intervals.map(interval => baseOctave + rootPitchClass + interval);
            const inverted = this.applyInversion(rootPosition, inv);
            const distance = this.calculateVoiceLeadingDistance(currentNotes, inverted);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestInversion = inv;
                bestNotes = inverted;
            }
        }

        return { notes: bestNotes, inversion: bestInversion };
    }
}

export class PracticeEngine {
    private settings: PracticeSettings;
    private currentChord: ChordChallenge | null = null;
    private lastPlayedNotes: number[] = [];
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
            smoothTransitions: false,
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

        const intervals = isMinor
            ? [0, 2, 3, 5, 7, 8, 10]
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

    private determineInversion(quality: ChordQuality, rootPitchClass: number, baseOctave: number): { inversion: number; midiNotes: number[] } {
        const intervals = CHORD_INTERVALS[quality];
        const rootPositionNotes = intervals.map(interval => baseOctave + rootPitchClass + interval);
        const maxInversion = VoicingManager.getMaxInversion(quality);

        // Handle smooth transitions
        if (this.settings.smoothTransitions && this.lastPlayedNotes.length > 0) {
            const result = VoicingManager.findSmoothestInversion(
                rootPitchClass,
                quality,
                this.lastPlayedNotes,
                baseOctave
            );
            return { inversion: result.inversion, midiNotes: result.notes };
        }

        // Handle voicing mode
        switch (this.settings.voicingMode) {
            case 'rootPosition':
                return { inversion: 0, midiNotes: rootPositionNotes };

            case 'firstInversion':
                if (maxInversion >= 1) {
                    return { inversion: 1, midiNotes: VoicingManager.applyInversion(rootPositionNotes, 1) };
                }
                return { inversion: 0, midiNotes: rootPositionNotes };

            case 'secondInversion':
                if (maxInversion >= 2) {
                    return { inversion: 2, midiNotes: VoicingManager.applyInversion(rootPositionNotes, 2) };
                }
                return { inversion: 0, midiNotes: rootPositionNotes };

            case 'thirdInversion':
                if (VoicingManager.supportsThirdInversion(quality)) {
                    return { inversion: 3, midiNotes: VoicingManager.applyInversion(rootPositionNotes, 3) };
                }
                return { inversion: 0, midiNotes: rootPositionNotes };

            case 'randomInversion':
                const randomInv = Math.floor(Math.random() * (maxInversion + 1));
                return {
                    inversion: randomInv,
                    midiNotes: VoicingManager.applyInversion(rootPositionNotes, randomInv)
                };

            default:
                return { inversion: 0, midiNotes: rootPositionNotes };
        }
    }

    private buildDisplaySymbol(rootName: string, quality: ChordQuality, inversion: number, bassNoteName: string): string {
        const suffix = QUALITY_SUFFIX[quality];
        const baseSymbol = `${rootName}${suffix}`;

        // Only show slash notation if not in root position
        if (inversion === 0) {
            return baseSymbol;
        }

        return `${baseSymbol}/${bassNoteName}`;
    }

    getNextChord(): ChordChallenge {
        const rootPitchClass = this.getNextRoot();
        const quality = this.getRandomQuality();
        const baseOctave = 60; // Middle C

        const { inversion, midiNotes } = this.determineInversion(quality, rootPitchClass, baseOctave);

        const rootName = this.getNoteNameForPitchClass(rootPitchClass);
        const bassPitchClass = VoicingManager.getBassNotePitchClass(rootPitchClass, quality, inversion);
        const bassNoteName = this.getNoteNameForPitchClass(bassPitchClass);

        const displaySymbol = this.buildDisplaySymbol(rootName, quality, inversion, bassNoteName);
        const qualityFullName = QUALITY_FULL_NAME[quality];
        const inversionName = inversion > 0 ? ` (${VoicingManager.getInversionName(inversion)})` : '';

        this.currentChord = {
            chordName: `${rootName} ${qualityFullName}${inversionName}`,
            displaySymbol: displaySymbol,
            requiredMidiNotes: midiNotes,
            rootNote: rootPitchClass,
            quality: quality,
            inversion: inversion,
            bassNote: bassPitchClass,
        };

        return this.currentChord;
    }

    getCurrentChord(): ChordChallenge | null {
        return this.currentChord;
    }

    /**
     * Update last played notes for voice leading calculation
     */
    setLastPlayedNotes(notes: number[]): void {
        this.lastPlayedNotes = [...notes];
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

        if (requiredPitchClasses.size !== playedPitchClasses.size) {
            return false;
        }

        for (const pc of requiredPitchClasses) {
            if (!playedPitchClasses.has(pc)) {
                return false;
            }
        }

        // Store for voice leading
        this.lastPlayedNotes = [...playedMidiNotes];
        return true;
    }

    getMillisecondsPerChord(): number {
        const beatsPerBar = 4;
        const totalBeats = beatsPerBar * this.settings.barsPerChord;
        const msPerBeat = 60000 / this.settings.bpm;
        return msPerBeat * totalBeats;
    }

    start(onChordChange: (chord: ChordChallenge) => void, onTimeout: () => void): void {
        this.onChordChange = onChordChange;
        this.onTimeout = onTimeout;
        this.isRunning = true;
        this.lastPlayedNotes = [];

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
        this.lastPlayedNotes = [];
    }

    isActive(): boolean {
        return this.isRunning;
    }
}

// Singleton instance
export const practiceEngine = new PracticeEngine();

// Export chord quality groups for UI
export const TRIAD_QUALITIES: ChordQuality[] = ['Major', 'Minor', 'Diminished', 'Augmented'];
export const SEVENTH_QUALITIES: ChordQuality[] = ['maj7', '7', 'm7', 'm7b5'];
export const EXTENSION_QUALITIES: ChordQuality[] = ['add9'];
export const ALL_QUALITIES: ChordQuality[] = [...TRIAD_QUALITIES, ...SEVENTH_QUALITIES, ...EXTENSION_QUALITIES];
