// Main module - Connects MIDI, chord recognition, and UI

import { MidiHandler, midiNoteToName } from './midi.js';
import { chordRecognizer, ChordResult } from './chords.js';
import { practiceEngine, ChordChallenge, ChordQuality, RootSelection, VoicingMode } from './practice.js';

class ChordApp {
    private midiHandler: MidiHandler;
    private activeNotes: Set<number> = new Set();
    private virtualPressedNotes: Set<number> = new Set();

    // UI Elements
    private statusIndicator!: HTMLElement;
    private statusText!: HTMLElement;
    private connectBtn!: HTMLButtonElement;
    private deviceSection!: HTMLElement;
    private deviceList!: HTMLElement;
    private chordName!: HTMLElement;
    private chordNotes!: HTMLElement;
    private activeNotesDisplay!: HTMLElement;
    private keyboard!: HTMLElement;

    // Practice Mode UI Elements
    private rootSelection!: HTMLSelectElement;
    private targetKey!: HTMLSelectElement;
    // Triads
    private qualityMajor!: HTMLInputElement;
    private qualityMinor!: HTMLInputElement;
    private qualityDim!: HTMLInputElement;
    private qualityAug!: HTMLInputElement;
    // 7th Chords
    private qualityMaj7!: HTMLInputElement;
    private qualityDom7!: HTMLInputElement;
    private qualityM7!: HTMLInputElement;
    private qualityM7b5!: HTMLInputElement;
    // Extensions
    private qualityAdd9!: HTMLInputElement;
    // Other settings
    private voicingMode!: HTMLSelectElement;
    private smoothTransitions!: HTMLInputElement;
    private practiceBpm!: HTMLInputElement;
    private barsPerChord!: HTMLInputElement;
    private practiceStartBtn!: HTMLButtonElement;
    private practiceStopBtn!: HTMLButtonElement;
    private practiceDisplay!: HTMLElement;
    private targetChordName!: HTMLElement;
    private targetChordNotes!: HTMLElement;
    private hintKeyboard!: HTMLElement;
    private practiceResult!: HTMLElement;
    private practiceTimer!: HTMLElement;
    private statCorrect!: HTMLElement;
    private statMissed!: HTMLElement;

    // Practice Mode State
    private practiceStats = { correct: 0, missed: 0 };
    private timerInterval: number | null = null;
    private timerStartTime: number = 0;

    constructor() {
        this.midiHandler = new MidiHandler();
        this.initUI();
        this.setupEventListeners();
        this.createKeyboard();
        this.createHintKeyboard();
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

        // Practice Mode UI Elements
        this.rootSelection = document.getElementById('root-selection') as HTMLSelectElement;
        this.targetKey = document.getElementById('target-key') as HTMLSelectElement;
        // Triads
        this.qualityMajor = document.getElementById('quality-major') as HTMLInputElement;
        this.qualityMinor = document.getElementById('quality-minor') as HTMLInputElement;
        this.qualityDim = document.getElementById('quality-dim') as HTMLInputElement;
        this.qualityAug = document.getElementById('quality-aug') as HTMLInputElement;
        // 7th Chords
        this.qualityMaj7 = document.getElementById('quality-maj7') as HTMLInputElement;
        this.qualityDom7 = document.getElementById('quality-dom7') as HTMLInputElement;
        this.qualityM7 = document.getElementById('quality-m7') as HTMLInputElement;
        this.qualityM7b5 = document.getElementById('quality-m7b5') as HTMLInputElement;
        // Extensions
        this.qualityAdd9 = document.getElementById('quality-add9') as HTMLInputElement;
        // Other settings
        this.voicingMode = document.getElementById('voicing-mode') as HTMLSelectElement;
        this.smoothTransitions = document.getElementById('smooth-transitions') as HTMLInputElement;
        this.practiceBpm = document.getElementById('practice-bpm') as HTMLInputElement;
        this.barsPerChord = document.getElementById('bars-per-chord') as HTMLInputElement;
        this.practiceStartBtn = document.getElementById('practice-start') as HTMLButtonElement;
        this.practiceStopBtn = document.getElementById('practice-stop') as HTMLButtonElement;
        this.practiceDisplay = document.getElementById('practice-display')!;
        this.targetChordName = document.getElementById('target-chord-name')!;
        this.targetChordNotes = document.getElementById('target-chord-notes')!;
        this.hintKeyboard = document.getElementById('hint-keyboard')!;
        this.practiceResult = document.getElementById('practice-result')!;
        this.practiceTimer = document.getElementById('practice-timer')!;
        this.statCorrect = document.getElementById('stat-correct')!;
        this.statMissed = document.getElementById('stat-missed')!;
    }

    private setupEventListeners(): void {
        // Connect button
        this.connectBtn.addEventListener('click', () => this.connectMidi());

        // MIDI callbacks
        this.midiHandler.onNote((note, velocity, isNoteOn) => {
            this.handleNote(note, velocity, isNoteOn);
        });

        this.midiHandler.onConnectionChange((devices) => {
            this.updateDeviceList(devices);
        });

        // Practice Mode event listeners
        this.practiceStartBtn.addEventListener('click', () => this.startPractice());
        this.practiceStopBtn.addEventListener('click', () => this.stopPractice());

        // Settings change listeners
        this.rootSelection.addEventListener('change', () => this.updatePracticeSettings());
        this.targetKey.addEventListener('change', () => this.updatePracticeSettings());
        this.voicingMode.addEventListener('change', () => this.updatePracticeSettings());
        this.smoothTransitions.addEventListener('change', () => this.updatePracticeSettings());
        this.practiceBpm.addEventListener('change', () => this.updatePracticeSettings());
        this.barsPerChord.addEventListener('change', () => this.updatePracticeSettings());
        // Triads
        this.qualityMajor.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityMinor.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityDim.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityAug.addEventListener('change', () => this.updatePracticeSettings());
        // 7th Chords
        this.qualityMaj7.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityDom7.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityM7.addEventListener('change', () => this.updatePracticeSettings());
        this.qualityM7b5.addEventListener('change', () => this.updatePracticeSettings());
        // Extensions
        this.qualityAdd9.addEventListener('change', () => this.updatePracticeSettings());
    }

    private async connectMidi(): Promise<void> {
        this.connectBtn.disabled = true;
        this.statusText.textContent = 'Connecting...';

        const success = await this.midiHandler.connect();

        if (success) {
            this.statusIndicator.classList.remove('disconnected');
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = 'MIDI connected';
            this.connectBtn.textContent = 'Connected';

            const devices = this.midiHandler.getConnectedDevices();
            this.updateDeviceList(devices);
        } else {
            this.statusText.textContent = 'Connection failed';
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

        // Check practice mode answer
        if (practiceEngine.isActive() && this.activeNotes.size > 0) {
            this.checkPracticeAnswer();
        }
    }

    private updateDisplay(): void {
        const notes = Array.from(this.activeNotes).sort((a, b) => a - b);

        // Display active notes
        this.activeNotesDisplay.innerHTML = notes
            .map(n => `<span class="note-badge">${midiNoteToName(n)}</span>`)
            .join('');

        // Recognize chord
        if (notes.length >= 2) {
            const chord = chordRecognizer.recognize(notes);
            if (chord) {
                this.displayChord(chord);
            }
        } else if (notes.length === 1) {
            // Display single note
            this.chordName.textContent = midiNoteToName(notes[0]);
            this.chordNotes.textContent = 'Single note';
        } else {
            this.chordName.textContent = '-';
            this.chordNotes.textContent = '';
        }
    }

    private displayChord(chord: ChordResult): void {
        this.chordName.textContent = chord.name;
        this.chordNotes.textContent = chord.notes.join(' - ');
    }

    // Practice Mode Methods
    private updatePracticeSettings(): void {
        const qualities: ChordQuality[] = [];

        // Triads
        if (this.qualityMajor.checked) qualities.push('Major');
        if (this.qualityMinor.checked) qualities.push('Minor');
        if (this.qualityDim.checked) qualities.push('Diminished');
        if (this.qualityAug.checked) qualities.push('Augmented');

        // 7th Chords
        if (this.qualityMaj7.checked) qualities.push('maj7');
        if (this.qualityDom7.checked) qualities.push('7');
        if (this.qualityM7.checked) qualities.push('m7');
        if (this.qualityM7b5.checked) qualities.push('m7b5');

        // Extensions
        if (this.qualityAdd9.checked) qualities.push('add9');

        // Ensure at least one quality is selected
        if (qualities.length === 0) {
            this.qualityMajor.checked = true;
            qualities.push('Major');
        }

        practiceEngine.updateSettings({
            rootSelection: this.rootSelection.value as RootSelection,
            targetKey: this.targetKey.value,
            voicingMode: this.voicingMode.value as VoicingMode,
            smoothTransitions: this.smoothTransitions.checked,
            bpm: parseInt(this.practiceBpm.value) || 60,
            barsPerChord: parseInt(this.barsPerChord.value) || 2,
        });
        practiceEngine.setChordQualities(qualities);
    }

    private startPractice(): void {
        this.updatePracticeSettings();
        this.practiceStats = { correct: 0, missed: 0 };
        this.updateStatsDisplay();

        this.practiceStartBtn.classList.add('hidden');
        this.practiceStopBtn.classList.remove('hidden');
        this.practiceDisplay.classList.remove('hidden');
        this.practiceResult.textContent = '';
        this.practiceResult.className = 'practice-result';

        practiceEngine.start(
            (chord) => this.onNewChord(chord),
            () => this.onChordTimeout()
        );
    }

    private stopPractice(): void {
        practiceEngine.stop();
        this.stopTimerAnimation();

        this.practiceStartBtn.classList.remove('hidden');
        this.practiceStopBtn.classList.add('hidden');
        this.practiceDisplay.classList.add('hidden');
    }

    private onNewChord(chord: ChordChallenge): void {
        this.targetChordName.textContent = chord.displaySymbol;
        this.targetChordNotes.textContent = `Notes: ${chord.requiredMidiNotes.map(n => midiNoteToName(n)).join(' - ')}`;
        this.updateHintKeyboard(chord.requiredMidiNotes);
        this.practiceResult.textContent = '';
        this.practiceResult.className = 'practice-result';
        this.startTimerAnimation();
    }

    private onChordTimeout(): void {
        this.practiceStats.missed++;
        this.updateStatsDisplay();
        this.showResult('timeout', 'Missed!');
    }

    private checkPracticeAnswer(): void {
        const playedNotes = Array.from(this.activeNotes);
        if (practiceEngine.checkAnswer(playedNotes)) {
            this.practiceStats.correct++;
            this.updateStatsDisplay();
            this.showResult('success', 'Correct!');
            practiceEngine.markSuccess();
        }
    }

    private showResult(type: 'success' | 'timeout', text: string): void {
        this.practiceResult.textContent = text;
        this.practiceResult.className = `practice-result ${type}`;
    }

    private updateStatsDisplay(): void {
        this.statCorrect.textContent = this.practiceStats.correct.toString();
        this.statMissed.textContent = this.practiceStats.missed.toString();
    }

    private createHintKeyboard(): void {
        // Create a 2-octave hint keyboard centered around middle C
        const startNote = 48; // C3
        const endNote = 77; // F5

        const whiteKeyWidth = 20;
        const blackKeyWidth = 14;

        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        const keyboardInner = document.createElement('div');
        keyboardInner.className = 'hint-keyboard-inner';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;

        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);

            if (isBlack) {
                const blackKey = document.createElement('div');
                blackKey.className = 'hint-black-key';
                blackKey.dataset.hintNote = note.toString();
                const offset = whiteKeyIndex * whiteKeyWidth - (blackKeyWidth / 2);
                blackKey.style.left = `${offset}px`;
                keyboardInner.appendChild(blackKey);
            } else {
                const whiteKey = document.createElement('div');
                whiteKey.className = 'hint-white-key';
                whiteKey.dataset.hintNote = note.toString();
                whiteKey.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;
                keyboardInner.appendChild(whiteKey);
                whiteKeyIndex++;
            }
        }

        this.hintKeyboard.appendChild(keyboardInner);
    }

    private updateHintKeyboard(midiNotes: number[]): void {
        // Clear all highlights
        const allKeys = this.hintKeyboard.querySelectorAll('[data-hint-note]');
        allKeys.forEach(key => key.classList.remove('highlight'));

        // Highlight the required notes (match by pitch class, any octave in range)
        const pitchClasses = new Set(midiNotes.map(n => n % 12));

        allKeys.forEach(key => {
            const keyNote = parseInt((key as HTMLElement).dataset.hintNote || '0');
            if (pitchClasses.has(keyNote % 12)) {
                key.classList.add('highlight');
            }
        });
    }

    private startTimerAnimation(): void {
        this.stopTimerAnimation();

        const duration = practiceEngine.getMillisecondsPerChord();
        this.timerStartTime = Date.now();

        // Create timer bar if it doesn't exist
        let timerBar = this.practiceTimer.querySelector('.practice-timer-bar') as HTMLElement;
        if (!timerBar) {
            timerBar = document.createElement('div');
            timerBar.className = 'practice-timer-bar';
            this.practiceTimer.appendChild(timerBar);
        }

        timerBar.style.width = '100%';

        this.timerInterval = window.setInterval(() => {
            const elapsed = Date.now() - this.timerStartTime;
            const remaining = Math.max(0, 1 - elapsed / duration);
            timerBar.style.width = `${remaining * 100}%`;

            if (remaining <= 0) {
                this.stopTimerAnimation();
            }
        }, 50);
    }

    private stopTimerAnimation(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private createKeyboard(): void {
        // Create 5 octaves (C2 to C7)
        const startNote = 36; // C2
        const endNote = 96; // C7

        const whiteKeyWidth = 22;
        const blackKeyWidth = 14;

        // Count white keys first for total width
        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        // Container for relative positioning
        const keyboardInner = document.createElement('div');
        keyboardInner.style.position = 'relative';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;
        keyboardInner.style.height = '75px';

        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);

            if (isBlack) {
                const blackKey = document.createElement('div');
                blackKey.className = 'black-key';
                blackKey.dataset.note = note.toString();

                // Black key sits between previous and next white key
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

        // Click events for virtual keyboard
        this.keyboard.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.dataset.note) {
                const note = parseInt(target.dataset.note);
                this.virtualPressedNotes.add(note);
                this.handleNote(note, 100, true);
            }
        });

        // Mouseup on document so it always triggers
        document.addEventListener('mouseup', () => {
            this.releaseAllVirtualNotes();
        });

        // Release all when mouse leaves keyboard
        this.keyboard.addEventListener('mouseleave', () => {
            this.releaseAllVirtualNotes();
        });
    }

    private releaseAllVirtualNotes(): void {
        this.virtualPressedNotes.forEach(note => {
            this.handleNote(note, 0, false);
        });
        this.virtualPressedNotes.clear();
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

// Start app
document.addEventListener('DOMContentLoaded', () => {
    new ChordApp();
});
