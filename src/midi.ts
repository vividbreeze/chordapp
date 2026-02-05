// MIDI Handler - Verwaltet die Web MIDI API Verbindung

export type MidiEventCallback = (note: number, velocity: number, isNoteOn: boolean) => void;

export class MidiHandler {
    private midiAccess: MIDIAccess | null = null;
    private inputs: Map<string, MIDIInput> = new Map();
    private noteCallback: MidiEventCallback | null = null;
    private connectionCallback: ((devices: string[]) => void) | null = null;

    async connect(): Promise<boolean> {
        if (!navigator.requestMIDIAccess) {
            console.error('Web MIDI API wird von diesem Browser nicht unterstützt');
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupInputs();

            // Auf Geräteänderungen reagieren
            this.midiAccess.onstatechange = () => this.setupInputs();

            return true;
        } catch (error) {
            console.error('MIDI-Zugriff fehlgeschlagen:', error);
            return false;
        }
    }

    private setupInputs(): void {
        if (!this.midiAccess) return;

        // Alte Listener entfernen
        this.inputs.forEach((input) => {
            input.onmidimessage = null;
        });
        this.inputs.clear();

        // Neue Inputs registrieren
        const deviceNames: string[] = [];
        this.midiAccess.inputs.forEach((input, id) => {
            if (input.state === 'connected') {
                this.inputs.set(id, input);
                input.onmidimessage = (event) => this.handleMidiMessage(event);
                deviceNames.push(input.name || `Unbekanntes Gerät (${id})`);
            }
        });

        // Callback für Verbindungsänderungen
        if (this.connectionCallback) {
            this.connectionCallback(deviceNames);
        }
    }

    private handleMidiMessage(event: MIDIMessageEvent): void {
        const data = event.data;
        if (!data || data.length < 3) return;

        const status = data[0];
        const note = data[1];
        const velocity = data[2];

        // Note On: 0x90-0x9F, Note Off: 0x80-0x8F
        const isNoteOn = (status & 0xF0) === 0x90 && velocity > 0;
        const isNoteOff = (status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && velocity === 0);

        if ((isNoteOn || isNoteOff) && this.noteCallback) {
            this.noteCallback(note, velocity, isNoteOn);
        }
    }

    onNote(callback: MidiEventCallback): void {
        this.noteCallback = callback;
    }

    onConnectionChange(callback: (devices: string[]) => void): void {
        this.connectionCallback = callback;
    }

    getConnectedDevices(): string[] {
        const devices: string[] = [];
        this.inputs.forEach((input) => {
            devices.push(input.name || 'Unbekanntes Gerät');
        });
        return devices;
    }

    disconnect(): void {
        this.inputs.forEach((input) => {
            input.onmidimessage = null;
        });
        this.inputs.clear();
        this.midiAccess = null;
    }
}

// Hilfsfunktion: MIDI-Notennummer zu Notenname
export function midiNoteToName(note: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(note / 12) - 1;
    const noteName = noteNames[note % 12];
    return `${noteName}${octave}`;
}

// Hilfsfunktion: Nur Notenname ohne Oktave
export function midiNoteToBaseName(note: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[note % 12];
}
