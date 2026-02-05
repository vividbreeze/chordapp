// Hauptmodul - Verbindet MIDI, Akkorderkennung und UI

import { MidiHandler, midiNoteToName, midiNoteToBaseName } from './midi.js';
import { chordRecognizer, ChordResult } from './chords.js';

class ChordApp {
    private midiHandler: MidiHandler;
    private activeNotes: Set<number> = new Set();
    private history: string[] = [];
    private lastChord: string = '';

    // UI-Elemente
    private statusIndicator!: HTMLElement;
    private statusText!: HTMLElement;
    private connectBtn!: HTMLButtonElement;
    private deviceSection!: HTMLElement;
    private deviceList!: HTMLElement;
    private chordName!: HTMLElement;
    private chordNotes!: HTMLElement;
    private activeNotesDisplay!: HTMLElement;
    private keyboard!: HTMLElement;
    private historyDisplay!: HTMLElement;
    private clearHistoryBtn!: HTMLButtonElement;

    constructor() {
        this.midiHandler = new MidiHandler();
        this.initUI();
        this.setupEventListeners();
        this.createKeyboard();
    }

    private initUI(): void {
        this.statusIndicator = document.getElementById('status-indicator')!;
        this.statusText = document.getElementById('status-text')!;
        this.connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
        this.deviceSection = document.getElementById('device-section')!;
        this.deviceList = document.getElementById('device-list')!;
        this.chordName = document.getElementById('chord-name')!;
        this.chordNotes = document.getElementById('chord-notes')!;
        this.activeNotesDisplay = document.getElementById('active-notes')!;
        this.keyboard = document.getElementById('keyboard')!;
        this.historyDisplay = document.getElementById('history')!;
        this.clearHistoryBtn = document.getElementById('clear-history') as HTMLButtonElement;
    }

    private setupEventListeners(): void {
        // Verbinden-Button
        this.connectBtn.addEventListener('click', () => this.connectMidi());

        // Verlauf löschen
        this.clearHistoryBtn.addEventListener('click', () => {
            this.history = [];
            this.updateHistoryDisplay();
        });

        // MIDI-Callbacks
        this.midiHandler.onNote((note, velocity, isNoteOn) => {
            this.handleNote(note, velocity, isNoteOn);
        });

        this.midiHandler.onConnectionChange((devices) => {
            this.updateDeviceList(devices);
        });
    }

    private async connectMidi(): Promise<void> {
        this.connectBtn.disabled = true;
        this.statusText.textContent = 'Verbinde...';

        const success = await this.midiHandler.connect();

        if (success) {
            this.statusIndicator.classList.remove('disconnected');
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = 'MIDI verbunden';
            this.connectBtn.textContent = 'Verbunden';

            const devices = this.midiHandler.getConnectedDevices();
            this.updateDeviceList(devices);
        } else {
            this.statusText.textContent = 'Verbindung fehlgeschlagen';
            this.connectBtn.disabled = false;
        }
    }

    private updateDeviceList(devices: string[]): void {
        if (devices.length > 0) {
            this.deviceSection.classList.remove('hidden');
            this.deviceList.innerHTML = devices
                .map(d => `<li>${d}</li>`)
                .join('');
        } else {
            this.deviceSection.classList.add('hidden');
            this.deviceList.innerHTML = '';
        }
    }

    private handleNote(note: number, velocity: number, isNoteOn: boolean): void {
        if (isNoteOn) {
            this.activeNotes.add(note);
        } else {
            this.activeNotes.delete(note);
        }

        this.updateDisplay();
        this.updateKeyboard(note, isNoteOn);
    }

    private updateDisplay(): void {
        const notes = Array.from(this.activeNotes).sort((a, b) => a - b);

        // Aktive Noten anzeigen
        this.activeNotesDisplay.innerHTML = notes
            .map(n => `<span class="note-badge">${midiNoteToName(n)}</span>`)
            .join('');

        // Akkord erkennen
        if (notes.length >= 2) {
            const chord = chordRecognizer.recognize(notes);
            if (chord) {
                this.displayChord(chord);
            }
        } else if (notes.length === 1) {
            // Einzelne Note anzeigen
            this.chordName.textContent = midiNoteToName(notes[0]);
            this.chordNotes.textContent = 'Einzelne Note';
        } else {
            this.chordName.textContent = '-';
            this.chordNotes.textContent = '';
        }
    }

    private displayChord(chord: ChordResult): void {
        this.chordName.textContent = chord.name;
        this.chordNotes.textContent = chord.notes.join(' - ');

        // Zum Verlauf hinzufügen (nur wenn sich der Akkord geändert hat)
        if (chord.name !== this.lastChord && chord.type !== 'cluster') {
            this.lastChord = chord.name;
            this.history.unshift(chord.name);

            // Verlauf auf 20 Einträge begrenzen
            if (this.history.length > 20) {
                this.history.pop();
            }

            this.updateHistoryDisplay();
        }
    }

    private updateHistoryDisplay(): void {
        this.historyDisplay.innerHTML = this.history
            .map(h => `<span class="history-item">${h}</span>`)
            .join('');
    }

    private createKeyboard(): void {
        // Erstelle 2 Oktaven (C3 bis B4)
        const startNote = 48; // C3
        const endNote = 72; // C5

        const whiteKeyWidth = 40;
        const blackKeyWidth = 24;

        // Zähle zuerst die weißen Tasten für die Gesamtbreite
        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        // Container für relative Positionierung
        const keyboardInner = document.createElement('div');
        keyboardInner.style.position = 'relative';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;
        keyboardInner.style.height = '140px';

        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);

            if (isBlack) {
                const blackKey = document.createElement('div');
                blackKey.className = 'black-key';
                blackKey.dataset.note = note.toString();

                // Schwarze Taste liegt zwischen der vorherigen und nächsten weißen Taste
                const blackKeyOffset = whiteKeyIndex * whiteKeyWidth - (blackKeyWidth / 2);
                blackKey.style.left = `${blackKeyOffset}px`;

                keyboardInner.appendChild(blackKey);
            } else {
                const whiteKey = document.createElement('div');
                whiteKey.className = 'white-key';
                whiteKey.dataset.note = note.toString();
                whiteKey.style.position = 'absolute';
                whiteKey.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;

                keyboardInner.appendChild(whiteKey);
                whiteKeyIndex++;
            }
        }

        this.keyboard.appendChild(keyboardInner);

        // Klick-Events für virtuelle Tastatur
        this.keyboard.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.dataset.note) {
                const note = parseInt(target.dataset.note);
                this.handleNote(note, 100, true);
            }
        });

        this.keyboard.addEventListener('mouseup', (e) => {
            const target = e.target as HTMLElement;
            if (target.dataset.note) {
                const note = parseInt(target.dataset.note);
                this.handleNote(note, 0, false);
            }
        });

        this.keyboard.addEventListener('mouseleave', (e) => {
            const target = e.target as HTMLElement;
            if (target.dataset.note) {
                const note = parseInt(target.dataset.note);
                this.handleNote(note, 0, false);
            }
        });
    }

    private isBlackKey(note: number): boolean {
        const noteInOctave = note % 12;
        return [1, 3, 6, 8, 10].includes(noteInOctave);
    }

    private updateKeyboard(note: number, isActive: boolean): void {
        const key = this.keyboard.querySelector(`[data-note="${note}"]`);
        if (key) {
            if (isActive) {
                key.classList.add('active');
            } else {
                key.classList.remove('active');
            }
        }
    }
}

// App starten
document.addEventListener('DOMContentLoaded', () => {
    new ChordApp();
});
