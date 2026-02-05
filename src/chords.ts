// Akkorderkennung - Erkennt Akkorde aus gespielten Noten

export interface ChordResult {
    name: string;
    root: string;
    type: string;
    notes: string[];
}

// Akkord-Intervall-Muster (in Halbtönen vom Grundton)
const CHORD_PATTERNS: { [key: string]: number[] } = {
    // Dreiklänge
    'dur': [0, 4, 7],
    'moll': [0, 3, 7],
    'dim': [0, 3, 6],
    'aug': [0, 4, 8],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],

    // Vierklänge
    'maj7': [0, 4, 7, 11],
    '7': [0, 4, 7, 10],
    'm7': [0, 3, 7, 10],
    'mMaj7': [0, 3, 7, 11],
    'dim7': [0, 3, 6, 9],
    'm7b5': [0, 3, 6, 10],
    'aug7': [0, 4, 8, 10],

    // Erweiterte Akkorde
    'add9': [0, 4, 7, 14],
    'madd9': [0, 3, 7, 14],
    '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9],
    '9': [0, 4, 7, 10, 14],
    'm9': [0, 3, 7, 10, 14],
    'maj9': [0, 4, 7, 11, 14],

    // Fünfklänge und mehr
    '11': [0, 4, 7, 10, 14, 17],
    '13': [0, 4, 7, 10, 14, 17, 21],
};

// Notennamen
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Anzeigenamen für Akkordtypen
const CHORD_DISPLAY_NAMES: { [key: string]: string } = {
    'dur': '',
    'moll': 'm',
    'dim': 'dim',
    'aug': 'aug',
    'sus2': 'sus2',
    'sus4': 'sus4',
    'maj7': 'maj7',
    '7': '7',
    'm7': 'm7',
    'mMaj7': 'm(maj7)',
    'dim7': 'dim7',
    'm7b5': 'm7b5',
    'aug7': 'aug7',
    'add9': 'add9',
    'madd9': 'm(add9)',
    '6': '6',
    'm6': 'm6',
    '9': '9',
    'm9': 'm9',
    'maj9': 'maj9',
    '11': '11',
    '13': '13',
};

export class ChordRecognizer {
    /**
     * Erkennt einen Akkord aus einer Menge von MIDI-Noten
     */
    recognize(midiNotes: number[]): ChordResult | null {
        if (midiNotes.length < 2) {
            return null;
        }

        // Noten auf Pitch-Klassen reduzieren (0-11) und sortieren
        const pitchClasses = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);

        if (pitchClasses.length < 2) {
            return null;
        }

        // Versuche jeden Ton als möglichen Grundton
        let bestMatch: ChordResult | null = null;
        let bestScore = 0;

        for (let i = 0; i < pitchClasses.length; i++) {
            const root = pitchClasses[i];

            // Berechne Intervalle relativ zum Grundton
            const intervals = pitchClasses.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);

            // Vergleiche mit bekannten Akkordmustern
            for (const [chordType, pattern] of Object.entries(CHORD_PATTERNS)) {
                const score = this.matchPattern(intervals, pattern);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        name: NOTE_NAMES[root] + CHORD_DISPLAY_NAMES[chordType],
                        root: NOTE_NAMES[root],
                        type: chordType,
                        notes: pitchClasses.map(pc => NOTE_NAMES[pc]),
                    };
                }
            }
        }

        // Nur zurückgeben, wenn eine gute Übereinstimmung gefunden wurde
        if (bestScore >= 0.6) {
            return bestMatch;
        }

        // Falls kein bekannter Akkord, gib die Noten als "Cluster" zurück
        if (pitchClasses.length >= 2) {
            return {
                name: pitchClasses.map(pc => NOTE_NAMES[pc]).join('/'),
                root: NOTE_NAMES[pitchClasses[0]],
                type: 'cluster',
                notes: pitchClasses.map(pc => NOTE_NAMES[pc]),
            };
        }

        return null;
    }

    /**
     * Berechnet, wie gut die Intervalle zu einem Muster passen
     */
    private matchPattern(intervals: number[], pattern: number[]): number {
        // Erweitere Pattern für Umkehrungen (Oktave hinzufügen)
        const extendedPattern = [...pattern, ...pattern.map(p => p + 12)];

        let matches = 0;
        let total = Math.max(intervals.length, pattern.length);

        for (const interval of intervals) {
            if (extendedPattern.includes(interval) || extendedPattern.includes(interval + 12)) {
                matches++;
            }
        }

        // Bevorzuge exakte Übereinstimmungen
        if (intervals.length === pattern.length && matches === pattern.length) {
            return 1.0;
        }

        // Bestrafe fehlende oder zusätzliche Töne leicht
        const coverage = matches / total;
        const precision = matches / intervals.length;

        return (coverage + precision) / 2;
    }

    /**
     * Gibt den Intervallnamen für ein Intervall in Halbtönen zurück
     */
    getIntervalName(semitones: number): string {
        const intervalNames: { [key: number]: string } = {
            0: 'Prime',
            1: 'kl. Sekunde',
            2: 'gr. Sekunde',
            3: 'kl. Terz',
            4: 'gr. Terz',
            5: 'Quarte',
            6: 'Tritonus',
            7: 'Quinte',
            8: 'kl. Sexte',
            9: 'gr. Sexte',
            10: 'kl. Septime',
            11: 'gr. Septime',
            12: 'Oktave',
        };
        return intervalNames[semitones % 12] || `${semitones} Halbtöne`;
    }
}

// Singleton-Instanz
export const chordRecognizer = new ChordRecognizer();
