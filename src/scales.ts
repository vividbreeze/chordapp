// Scale definitions and utilities

export type ScaleType =
    | 'major'
    | 'naturalMinor'
    | 'harmonicMinor'
    | 'melodicMinor'
    | 'pentatonicMajor'
    | 'pentatonicMinor'
    | 'blues'
    | 'dorian'
    | 'mixolydian';

// Intervals from root (in semitones)
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
    major:           [0, 2, 4, 5, 7, 9, 11],      // W-W-H-W-W-W-H
    naturalMinor:    [0, 2, 3, 5, 7, 8, 10],      // W-H-W-W-H-W-W
    harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],      // W-H-W-W-H-WH-H
    melodicMinor:    [0, 2, 3, 5, 7, 9, 11],      // W-H-W-W-W-W-H (ascending)
    pentatonicMajor: [0, 2, 4, 7, 9],             // W-W-m3-W-m3
    pentatonicMinor: [0, 3, 5, 7, 10],            // m3-W-W-m3-W
    blues:           [0, 3, 5, 6, 7, 10],         // m3-W-H-H-m3-W
    dorian:          [0, 2, 3, 5, 7, 9, 10],      // W-H-W-W-W-H-W
    mixolydian:      [0, 2, 4, 5, 7, 9, 10],      // W-W-H-W-W-H-W
};

export const SCALE_NAMES: Record<ScaleType, string> = {
    major: 'Major',
    naturalMinor: 'Natural Minor',
    harmonicMinor: 'Harmonic Minor',
    melodicMinor: 'Melodic Minor',
    pentatonicMajor: 'Pentatonic Major',
    pentatonicMinor: 'Pentatonic Minor',
    blues: 'Blues',
    dorian: 'Dorian',
    mixolydian: 'Mixolydian',
};

export const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map note names to pitch class (0-11)
const NOTE_TO_PITCH_CLASS: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11,
};

export function getScalePitchClasses(root: string, scaleType: ScaleType): Set<number> {
    const rootPitchClass = NOTE_TO_PITCH_CLASS[root] ?? 0;
    const intervals = SCALE_INTERVALS[scaleType];

    return new Set(intervals.map(interval => (rootPitchClass + interval) % 12));
}

export function isNoteInScale(midiNote: number, root: string, scaleType: ScaleType): boolean {
    const pitchClass = midiNote % 12;
    const scalePitchClasses = getScalePitchClasses(root, scaleType);
    return scalePitchClasses.has(pitchClass);
}

export function getScaleNoteNames(root: string, scaleType: ScaleType): string[] {
    const rootPitchClass = NOTE_TO_PITCH_CLASS[root] ?? 0;
    const intervals = SCALE_INTERVALS[scaleType];

    // Use flats for flat keys, sharps for sharp keys
    const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(root);
    const noteNames = useFlats
        ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
        : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    return intervals.map(interval => {
        const pitchClass = (rootPitchClass + interval) % 12;
        return noteNames[pitchClass];
    });
}

export interface ScaleSettings {
    root: string;
    scaleType: ScaleType;
    direction: 'ascending' | 'descending' | 'both';
    octaves: number;
    showHints: boolean;
}

export class ScaleTrainer {
    private settings: ScaleSettings = {
        root: 'C',
        scaleType: 'major',
        direction: 'ascending',
        octaves: 2,
        showHints: true
    };

    private currentNoteIndex = 0;
    private expectedNotes: number[] = [];
    private isActive = false;

    updateSettings(settings: Partial<ScaleSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    getSettings(): ScaleSettings {
        return { ...this.settings };
    }

    getScalePitchClasses(): Set<number> {
        return getScalePitchClasses(this.settings.root, this.settings.scaleType);
    }

    getScaleNotes(): string[] {
        return getScaleNoteNames(this.settings.root, this.settings.scaleType);
    }

    generateExpectedNotes(startOctave: number = 3): number[] {
        const rootPitchClass = NOTE_TO_PITCH_CLASS[this.settings.root] ?? 0;
        const intervals = SCALE_INTERVALS[this.settings.scaleType];
        const notes: number[] = [];

        // Starting MIDI note
        const startMidi = startOctave * 12 + rootPitchClass;

        // Generate ascending notes
        for (let octave = 0; octave < this.settings.octaves; octave++) {
            for (const interval of intervals) {
                notes.push(startMidi + octave * 12 + interval);
            }
        }
        // Add final root note
        notes.push(startMidi + this.settings.octaves * 12);

        if (this.settings.direction === 'descending') {
            return notes.reverse();
        } else if (this.settings.direction === 'both') {
            // Up then down (without repeating top note)
            const descending = [...notes].reverse().slice(1);
            return [...notes, ...descending];
        }

        return notes;
    }

    start(startOctave: number = 3): void {
        this.expectedNotes = this.generateExpectedNotes(startOctave);
        this.currentNoteIndex = 0;
        this.isActive = true;
    }

    stop(): void {
        this.isActive = false;
        this.currentNoteIndex = 0;
        this.expectedNotes = [];
    }

    isRunning(): boolean {
        return this.isActive;
    }

    getCurrentExpectedNote(): number | null {
        if (!this.isActive || this.currentNoteIndex >= this.expectedNotes.length) {
            return null;
        }
        return this.expectedNotes[this.currentNoteIndex];
    }

    getProgress(): { current: number; total: number } {
        return {
            current: this.currentNoteIndex,
            total: this.expectedNotes.length
        };
    }

    checkNote(midiNote: number): 'correct' | 'wrong' | 'inScale' | 'outOfScale' {
        if (!this.isActive) {
            // Free play mode - just check if note is in scale
            return isNoteInScale(midiNote, this.settings.root, this.settings.scaleType)
                ? 'inScale'
                : 'outOfScale';
        }

        const expected = this.getCurrentExpectedNote();
        if (expected === null) {
            return 'inScale';
        }

        // Check pitch class (octave-independent for more forgiving play)
        if (midiNote % 12 === expected % 12) {
            this.currentNoteIndex++;

            // Check if scale is complete
            if (this.currentNoteIndex >= this.expectedNotes.length) {
                this.isActive = false;
            }

            return 'correct';
        }

        return isNoteInScale(midiNote, this.settings.root, this.settings.scaleType)
            ? 'inScale'
            : 'wrong';
    }

    isComplete(): boolean {
        return this.currentNoteIndex >= this.expectedNotes.length;
    }
}

export const scaleTrainer = new ScaleTrainer();
