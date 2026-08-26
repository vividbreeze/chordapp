// Main module - Connects MIDI, chord recognition, and UI

import { MidiHandler, midiNoteToName } from './midi.js';
import { chordRecognizer, ChordResult } from './chords.js';
import { practiceEngine, ChordChallenge, ChordQuality, RootSelection, VoicingMode } from './practice.js';
import { rhythmEngine } from './rhythm.js';
import { scaleTrainer, ScaleType, SCALE_NAMES } from './scales.js';

type PracticeMode = 'scales' | 'chords';

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
    private modeTabs!: NodeListOf<HTMLElement>;
    private scaleSettings!: HTMLElement;
    private chordSettings!: HTMLElement;
    private scaleRoot!: HTMLSelectElement;
    private scaleType!: HTMLSelectElement;
    private scaleDirection!: HTMLSelectElement;
    private rootSelection!: HTMLSelectElement;
    private targetKey!: HTMLSelectElement;
    private voicingMode!: HTMLSelectElement;
    private qualityMajor!: HTMLInputElement;
    private qualityMinor!: HTMLInputElement;
    private qualityDim!: HTMLInputElement;
    private qualityAug!: HTMLInputElement;
    private qualityMaj7!: HTMLInputElement;
    private qualityDom7!: HTMLInputElement;
    private qualityM7!: HTMLInputElement;
    private qualityM7b5!: HTMLInputElement;
    private qualityAdd9!: HTMLInputElement;
    private useMetronome!: HTMLInputElement;
    private practiceBpm!: HTMLInputElement;
    private timeSignature!: HTMLSelectElement;
    private countIn!: HTMLInputElement;
    private practiceStartBtn!: HTMLButtonElement;
    private practiceStopBtn!: HTMLButtonElement;
    private practiceDisplay!: HTMLElement;
    private scaleDisplay!: HTMLElement;
    private chordPracticeDisplay!: HTMLElement;
    private scaleName!: HTMLElement;
    private scaleNotesDisplay!: HTMLElement;
    private nextNote!: HTMLElement;
    private scaleProgressFill!: HTMLElement;
    private targetChordName!: HTMLElement;
    private targetChordNotes!: HTMLElement;
    private hintKeyboard!: HTMLElement;
    private beatIndicator!: HTMLElement;
    private beatDots!: HTMLElement;
    private timingDisplay!: HTMLElement;
    private timingNeedle!: HTMLElement;
    private feedbackText!: HTMLElement;
    private practiceTimer!: HTMLElement;
    private statCorrect!: HTMLElement;
    private statMissed!: HTMLElement;

    // State
    private currentMode: PracticeMode = 'scales';
    private practiceStats = { correct: 0, missed: 0 };
    private timerInterval: number | null = null;
    private isPracticing = false;

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

        // Mode tabs
        this.modeTabs = document.querySelectorAll('.mode-tab');
        this.scaleSettings = document.getElementById('scale-settings')!;
        this.chordSettings = document.getElementById('chord-settings')!;

        // Scale settings
        this.scaleRoot = document.getElementById('scale-root') as HTMLSelectElement;
        this.scaleType = document.getElementById('scale-type') as HTMLSelectElement;
        this.scaleDirection = document.getElementById('scale-direction') as HTMLSelectElement;

        // Chord settings
        this.rootSelection = document.getElementById('root-selection') as HTMLSelectElement;
        this.targetKey = document.getElementById('target-key') as HTMLSelectElement;
        this.voicingMode = document.getElementById('voicing-mode') as HTMLSelectElement;
        this.qualityMajor = document.getElementById('quality-major') as HTMLInputElement;
        this.qualityMinor = document.getElementById('quality-minor') as HTMLInputElement;
        this.qualityDim = document.getElementById('quality-dim') as HTMLInputElement;
        this.qualityAug = document.getElementById('quality-aug') as HTMLInputElement;
        this.qualityMaj7 = document.getElementById('quality-maj7') as HTMLInputElement;
        this.qualityDom7 = document.getElementById('quality-dom7') as HTMLInputElement;
        this.qualityM7 = document.getElementById('quality-m7') as HTMLInputElement;
        this.qualityM7b5 = document.getElementById('quality-m7b5') as HTMLInputElement;
        this.qualityAdd9 = document.getElementById('quality-add9') as HTMLInputElement;

        // Metronome settings
        this.useMetronome = document.getElementById('use-metronome') as HTMLInputElement;
        this.practiceBpm = document.getElementById('practice-bpm') as HTMLInputElement;
        this.timeSignature = document.getElementById('time-signature') as HTMLSelectElement;
        this.countIn = document.getElementById('count-in') as HTMLInputElement;

        // Practice controls
        this.practiceStartBtn = document.getElementById('practice-start') as HTMLButtonElement;
        this.practiceStopBtn = document.getElementById('practice-stop') as HTMLButtonElement;

        // Practice display
        this.practiceDisplay = document.getElementById('practice-display')!;
        this.scaleDisplay = document.getElementById('scale-display')!;
        this.chordPracticeDisplay = document.getElementById('chord-practice-display')!;
        this.scaleName = document.getElementById('scale-name')!;
        this.scaleNotesDisplay = document.getElementById('scale-notes-display')!;
        this.nextNote = document.getElementById('next-note')!;
        this.scaleProgressFill = document.getElementById('scale-progress-fill')!;
        this.targetChordName = document.getElementById('target-chord-name')!;
        this.targetChordNotes = document.getElementById('target-chord-notes')!;
        this.hintKeyboard = document.getElementById('hint-keyboard')!;
        this.beatIndicator = document.getElementById('beat-indicator')!;
        this.beatDots = document.getElementById('beat-dots')!;
        this.timingDisplay = document.getElementById('timing-display')!;
        this.timingNeedle = document.getElementById('timing-needle')!;
        this.feedbackText = document.getElementById('feedback-text')!;
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

        // Mode tabs
        this.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchMode(tab.dataset.mode as PracticeMode));
        });

        // Practice controls
        this.practiceStartBtn.addEventListener('click', () => this.startPractice());
        this.practiceStopBtn.addEventListener('click', () => this.stopPractice());
    }

    private async connectMidi(): Promise<void> {
        this.connectBtn.disabled = true;
        this.statusText.textContent = 'Connecting...';

        const success = await this.midiHandler.connect();

        if (success) {
            this.statusIndicator.classList.remove('disconnected');
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = 'MIDI connected';

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
            this.deviceList.innerHTML = devices.map(d => `<li>${d}</li>`).join('');
        } else {
            this.deviceSection.classList.add('hidden');
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

        if (!this.isPracticing) return;

        // Register rhythm hit
        if (isNoteOn && this.useMetronome.checked && rhythmEngine.isActive()) {
            rhythmEngine.registerHit();
        }

        // Check answer based on mode
        if (isNoteOn) {
            if (this.currentMode === 'scales') {
                this.checkScaleNote(note);
            } else if (this.currentMode === 'chords' && this.activeNotes.size > 0) {
                this.checkChordAnswer();
            }
        }
    }

    private updateDisplay(): void {
        const notes = Array.from(this.activeNotes).sort((a, b) => a - b);

        this.activeNotesDisplay.innerHTML = notes
            .map(n => `<span class="note-badge">${midiNoteToName(n)}</span>`)
            .join('');

        if (notes.length > 0) {
            const result = chordRecognizer.recognize(notes);
            if (result) {
                this.chordName.textContent = result.name;
                this.chordNotes.textContent = result.notes.join(' - ');
            } else {
                this.chordName.textContent = '-';
                this.chordNotes.textContent = '';
            }
        } else {
            this.chordName.textContent = '-';
            this.chordNotes.textContent = '';
        }
    }

    private switchMode(mode: PracticeMode): void {
        this.currentMode = mode;

        this.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        this.scaleSettings.classList.toggle('hidden', mode !== 'scales');
        this.chordSettings.classList.toggle('hidden', mode !== 'chords');
    }

    private async startPractice(): Promise<void> {
        this.isPracticing = true;
        this.practiceStats = { correct: 0, missed: 0 };
        this.updateStatsDisplay();

        // Show practice display
        this.practiceDisplay.classList.remove('hidden');
        this.practiceStartBtn.classList.add('hidden');
        this.practiceStopBtn.classList.remove('hidden');

        // Setup based on mode
        if (this.currentMode === 'scales') {
            this.startScalePractice();
        } else {
            this.startChordPractice();
        }

        // Start metronome if enabled
        if (this.useMetronome.checked) {
            this.startMetronome();
        }
    }

    private stopPractice(): void {
        this.isPracticing = false;

        // Stop engines
        scaleTrainer.stop();
        practiceEngine.stop();
        rhythmEngine.stop();

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Hide displays
        this.practiceDisplay.classList.add('hidden');
        this.practiceStartBtn.classList.remove('hidden');
        this.practiceStopBtn.classList.add('hidden');
    }

    private startScalePractice(): void {
        // Update scale settings
        scaleTrainer.updateSettings({
            root: this.scaleRoot.value,
            scaleType: this.scaleType.value as ScaleType,
            direction: this.scaleDirection.value as 'ascending' | 'descending' | 'both'
        });

        scaleTrainer.start(3);

        // Show scale display
        this.scaleDisplay.classList.remove('hidden');
        this.chordPracticeDisplay.classList.add('hidden');

        // Update info
        const settings = scaleTrainer.getSettings();
        this.scaleName.textContent = `${settings.root} ${SCALE_NAMES[settings.scaleType]}`;
        this.scaleNotesDisplay.textContent = scaleTrainer.getScaleNotes().join(' - ');

        // Create hint keyboard
        this.createScaleHintKeyboard();
        this.updateScaleDisplay();
    }

    private startChordPractice(): void {
        // Update chord settings
        const qualities = new Set<ChordQuality>();
        if (this.qualityMajor.checked) qualities.add('Major');
        if (this.qualityMinor.checked) qualities.add('Minor');
        if (this.qualityDim.checked) qualities.add('Diminished');
        if (this.qualityAug.checked) qualities.add('Augmented');
        if (this.qualityMaj7.checked) qualities.add('maj7');
        if (this.qualityDom7.checked) qualities.add('7');
        if (this.qualityM7.checked) qualities.add('m7');
        if (this.qualityM7b5.checked) qualities.add('m7b5');
        if (this.qualityAdd9.checked) qualities.add('add9');

        if (qualities.size === 0) qualities.add('Major');

        practiceEngine.updateSettings({
            rootSelection: this.rootSelection.value as RootSelection,
            targetKey: this.targetKey.value,
            chordQualities: qualities,
            voicingMode: this.voicingMode.value as VoicingMode,
            bpm: parseInt(this.practiceBpm.value) || 80,
            barsPerChord: 2
        });

        // Show chord display
        this.scaleDisplay.classList.add('hidden');
        this.chordPracticeDisplay.classList.remove('hidden');

        // Start practice engine
        practiceEngine.start(
            (chord) => this.onNewChord(chord),
            () => this.onChordTimeout()
        );
    }

    private async startMetronome(): Promise<void> {
        rhythmEngine.updateSettings({
            bpm: parseInt(this.practiceBpm.value) || 80,
            beatsPerMeasure: parseInt(this.timeSignature.value) || 4,
            countIn: this.countIn.checked
        });

        // Show beat indicator
        this.beatIndicator.classList.remove('hidden');
        this.timingDisplay.classList.remove('hidden');
        this.createBeatDots();

        // Setup callbacks
        rhythmEngine.onBeat((event) => this.onBeat(event));
        rhythmEngine.onHit((timing, offset) => this.onRhythmHit(timing, offset));

        await rhythmEngine.start();
    }

    private createBeatDots(): void {
        const beats = parseInt(this.timeSignature.value) || 4;
        this.beatDots.innerHTML = '';

        for (let i = 0; i < beats; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot' + (i === 0 ? ' downbeat' : '');
            dot.textContent = (i + 1).toString();
            dot.dataset.beat = (i + 1).toString();
            this.beatDots.appendChild(dot);
        }
    }

    private onBeat(event: { beat: number; measure: number; isDownbeat: boolean }): void {
        if (event.measure < 0) return;

        const dots = this.beatDots.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));

        const activeDot = this.beatDots.querySelector(`[data-beat="${event.beat}"]`);
        if (activeDot) activeDot.classList.add('active');
    }

    private onRhythmHit(timing: 'perfect' | 'good' | 'early' | 'late' | 'miss', offsetMs: number): void {
        // Update needle position
        const maxOffset = 150;
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetMs));
        const needlePosition = 50 + (clampedOffset / maxOffset) * 50;

        this.timingNeedle.style.left = `${needlePosition}%`;
        this.timingNeedle.classList.add('visible');

        setTimeout(() => {
            this.timingNeedle.classList.remove('visible');
        }, 400);
    }

    private checkScaleNote(midiNote: number): void {
        const result = scaleTrainer.checkNote(midiNote);

        if (result === 'correct') {
            this.practiceStats.correct++;
            this.showFeedback('Correct!', 'correct');
        } else if (result === 'wrong' || result === 'outOfScale') {
            this.practiceStats.missed++;
            this.showFeedback('Wrong!', 'wrong');
        }

        this.updateStatsDisplay();
        this.updateScaleDisplay();

        if (scaleTrainer.isComplete()) {
            this.showFeedback('Scale complete!', 'correct');
            setTimeout(() => {
                scaleTrainer.start(3);
                this.updateScaleDisplay();
            }, 1000);
        }
    }

    private checkChordAnswer(): void {
        const playedNotes = Array.from(this.activeNotes);
        if (practiceEngine.checkAnswer(playedNotes)) {
            this.practiceStats.correct++;
            this.updateStatsDisplay();
            this.showFeedback('Correct!', 'correct');
            practiceEngine.markSuccess();
        }
    }

    private onNewChord(chord: ChordChallenge): void {
        this.targetChordName.textContent = chord.displaySymbol;
        this.targetChordNotes.textContent = `Notes: ${chord.requiredMidiNotes.map(n => midiNoteToName(n)).join(' - ')}`;
        this.updateChordHintKeyboard(chord.requiredMidiNotes);
        this.feedbackText.textContent = '';
    }

    private onChordTimeout(): void {
        this.practiceStats.missed++;
        this.updateStatsDisplay();
        this.showFeedback('Missed!', 'wrong');
    }

    private showFeedback(text: string, type: 'correct' | 'wrong'): void {
        this.feedbackText.textContent = text;
        this.feedbackText.className = `feedback-text ${type}`;

        setTimeout(() => {
            this.feedbackText.textContent = '';
            this.feedbackText.className = 'feedback-text';
        }, 500);
    }

    private updateStatsDisplay(): void {
        this.statCorrect.textContent = this.practiceStats.correct.toString();
        this.statMissed.textContent = this.practiceStats.missed.toString();
    }

    private updateScaleDisplay(): void {
        const expectedNote = scaleTrainer.getCurrentExpectedNote();
        if (expectedNote !== null) {
            this.nextNote.textContent = midiNoteToName(expectedNote).replace(/\d+/, '');
        } else {
            this.nextNote.textContent = '-';
        }

        const progress = scaleTrainer.getProgress();
        const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
        this.scaleProgressFill.style.width = `${percentage}%`;
    }

    private createScaleHintKeyboard(): void {
        this.hintKeyboard.innerHTML = '';

        const startNote = 48;
        const endNote = 84;
        const whiteKeyWidth = 16;
        const blackKeyWidth = 10;

        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        const keyboardInner = document.createElement('div');
        keyboardInner.className = 'hint-keyboard-inner';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;

        const scalePitchClasses = scaleTrainer.getScalePitchClasses();
        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);
            const isInScale = scalePitchClasses.has(note % 12);

            if (isBlack) {
                const key = document.createElement('div');
                key.className = 'hint-black-key' + (isInScale ? ' highlight' : '');
                key.style.left = `${whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2}px`;
                keyboardInner.appendChild(key);
            } else {
                const key = document.createElement('div');
                key.className = 'hint-white-key' + (isInScale ? ' highlight' : '');
                key.style.position = 'absolute';
                key.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;
                key.style.width = `${whiteKeyWidth}px`;
                key.style.height = '32px';
                keyboardInner.appendChild(key);
                whiteKeyIndex++;
            }
        }

        this.hintKeyboard.appendChild(keyboardInner);
    }

    private updateChordHintKeyboard(midiNotes: number[]): void {
        this.hintKeyboard.innerHTML = '';

        const startNote = 48;
        const endNote = 84;
        const whiteKeyWidth = 20;
        const blackKeyWidth = 14;

        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        const keyboardInner = document.createElement('div');
        keyboardInner.className = 'hint-keyboard-inner';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;

        const noteSet = new Set(midiNotes);
        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);
            const isHighlighted = noteSet.has(note);

            if (isBlack) {
                const key = document.createElement('div');
                key.className = 'hint-black-key' + (isHighlighted ? ' highlight' : '');
                key.style.left = `${whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2}px`;
                keyboardInner.appendChild(key);
            } else {
                const key = document.createElement('div');
                key.className = 'hint-white-key' + (isHighlighted ? ' highlight' : '');
                key.style.position = 'absolute';
                key.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;
                keyboardInner.appendChild(key);
                whiteKeyIndex++;
            }
        }

        this.hintKeyboard.appendChild(keyboardInner);
    }

    private createKeyboard(): void {
        const startNote = 36;
        const endNote = 96;
        const whiteKeyWidth = 22;
        const blackKeyWidth = 14;

        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (!this.isBlackKey(note)) whiteKeyCount++;
        }

        const keyboardInner = document.createElement('div');
        keyboardInner.style.position = 'relative';
        keyboardInner.style.width = `${whiteKeyCount * whiteKeyWidth}px`;
        keyboardInner.style.height = '75px';

        let whiteKeyIndex = 0;

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);

            if (isBlack) {
                const key = document.createElement('div');
                key.className = 'black-key';
                key.dataset.note = note.toString();
                key.style.left = `${whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2}px`;
                this.addKeyboardMouseEvents(key, note);
                keyboardInner.appendChild(key);
            } else {
                const key = document.createElement('div');
                key.className = 'white-key';
                key.dataset.note = note.toString();
                key.style.position = 'absolute';
                key.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;
                this.addKeyboardMouseEvents(key, note);
                keyboardInner.appendChild(key);
                whiteKeyIndex++;
            }
        }

        this.keyboard.appendChild(keyboardInner);

        document.addEventListener('mouseup', () => this.releaseAllVirtualNotes());
        this.keyboard.addEventListener('mouseleave', () => this.releaseAllVirtualNotes());
    }

    private addKeyboardMouseEvents(key: HTMLElement, note: number): void {
        key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.virtualPressedNotes.add(note);
            this.handleNote(note, 100, true);
        });

        key.addEventListener('mouseenter', (e) => {
            if (e.buttons === 1) {
                this.virtualPressedNotes.add(note);
                this.handleNote(note, 100, true);
            }
        });

        key.addEventListener('mouseleave', () => {
            if (this.virtualPressedNotes.has(note)) {
                this.virtualPressedNotes.delete(note);
                this.handleNote(note, 0, false);
            }
        });
    }

    private releaseAllVirtualNotes(): void {
        this.virtualPressedNotes.forEach(note => {
            this.handleNote(note, 0, false);
        });
        this.virtualPressedNotes.clear();
    }

    private isBlackKey(note: number): boolean {
        return [1, 3, 6, 8, 10].includes(note % 12);
    }

    private updateKeyboard(note: number, isActive: boolean): void {
        const key = this.keyboard.querySelector(`[data-note="${note}"]`);
        if (key) {
            key.classList.toggle('active', isActive);
        }
    }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    new ChordApp();
});
