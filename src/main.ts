// Main module - Connects MIDI, chord recognition, and UI

import { MidiHandler, midiNoteToName } from './midi.js';
import { chordRecognizer, ChordResult } from './chords.js';
import { practiceEngine, ChordChallenge, ChordQuality, RootSelection, VoicingMode } from './practice.js';
import { rhythmEngine, RhythmMode } from './rhythm.js';
import { scaleTrainer, ScaleType, SCALE_NAMES } from './scales.js';

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

    // Rhythm Training UI Elements
    private rhythmMode!: HTMLSelectElement;
    private rhythmBpm!: HTMLInputElement;
    private rhythmTimeSig!: HTMLSelectElement;
    private rhythmCountIn!: HTMLInputElement;
    private rhythmStartBtn!: HTMLButtonElement;
    private rhythmStopBtn!: HTMLButtonElement;
    private rhythmDisplay!: HTMLElement;
    private beatDots!: HTMLElement;
    private rhythmTiming!: HTMLElement;
    private rhythmPerfect!: HTMLElement;
    private rhythmGood!: HTMLElement;
    private rhythmMissed!: HTMLElement;
    private timingNeedle!: HTMLElement;

    // Scale Training UI Elements
    private scaleSettings!: HTMLElement;
    private scaleRoot!: HTMLSelectElement;
    private scaleType!: HTMLSelectElement;
    private scaleDirection!: HTMLSelectElement;
    private scaleHints!: HTMLInputElement;
    private scaleDisplay!: HTMLElement;
    private scaleName!: HTMLElement;
    private scaleNotesDisplay!: HTMLElement;
    private nextNote!: HTMLElement;
    private scaleProgressFill!: HTMLElement;
    private scaleHintKeyboard!: HTMLElement;
    private scaleFeedback!: HTMLElement;

    // Practice Mode State
    private practiceStats = { correct: 0, missed: 0 };
    private timerInterval: number | null = null;
    private timerStartTime: number = 0;

    // Rhythm Training State
    private rhythmStats = { perfect: 0, good: 0, missed: 0 };
    private isScaleMode = false;

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

        // Rhythm Training UI Elements
        this.rhythmMode = document.getElementById('rhythm-mode') as HTMLSelectElement;
        this.rhythmBpm = document.getElementById('rhythm-bpm') as HTMLInputElement;
        this.rhythmTimeSig = document.getElementById('rhythm-time-sig') as HTMLSelectElement;
        this.rhythmCountIn = document.getElementById('rhythm-count-in') as HTMLInputElement;
        this.rhythmStartBtn = document.getElementById('rhythm-start') as HTMLButtonElement;
        this.rhythmStopBtn = document.getElementById('rhythm-stop') as HTMLButtonElement;
        this.rhythmDisplay = document.getElementById('rhythm-display')!;
        this.beatDots = document.getElementById('beat-dots')!;
        this.rhythmTiming = document.getElementById('rhythm-timing')!;
        this.rhythmPerfect = document.getElementById('rhythm-perfect')!;
        this.rhythmGood = document.getElementById('rhythm-good')!;
        this.rhythmMissed = document.getElementById('rhythm-missed')!;
        this.timingNeedle = document.getElementById('timing-needle')!;

        // Scale Training UI Elements
        this.scaleSettings = document.getElementById('scale-settings')!;
        this.scaleRoot = document.getElementById('scale-root') as HTMLSelectElement;
        this.scaleType = document.getElementById('scale-type') as HTMLSelectElement;
        this.scaleDirection = document.getElementById('scale-direction') as HTMLSelectElement;
        this.scaleHints = document.getElementById('scale-hints') as HTMLInputElement;
        this.scaleDisplay = document.getElementById('scale-display')!;
        this.scaleName = document.getElementById('scale-name')!;
        this.scaleNotesDisplay = document.getElementById('scale-notes-display')!;
        this.nextNote = document.getElementById('next-note')!;
        this.scaleProgressFill = document.getElementById('scale-progress-fill')!;
        this.scaleHintKeyboard = document.getElementById('scale-hint-keyboard')!;
        this.scaleFeedback = document.getElementById('scale-feedback')!;
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

        // Rhythm Training event listeners
        this.rhythmStartBtn.addEventListener('click', () => this.startRhythm());
        this.rhythmStopBtn.addEventListener('click', () => this.stopRhythm());
        this.rhythmBpm.addEventListener('change', () => this.updateRhythmSettings());
        this.rhythmTimeSig.addEventListener('change', () => this.updateRhythmSettings());
        this.rhythmMode.addEventListener('change', () => this.onRhythmModeChange());
        this.rhythmCountIn.addEventListener('change', () => this.updateRhythmSettings());

        // Scale Training event listeners
        this.scaleRoot.addEventListener('change', () => this.updateScaleSettings());
        this.scaleType.addEventListener('change', () => this.updateScaleSettings());
        this.scaleDirection.addEventListener('change', () => this.updateScaleSettings());
        this.scaleHints.addEventListener('change', () => this.updateScaleSettings());
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

        // Register rhythm hit on note-on
        if (isNoteOn && rhythmEngine.isActive()) {
            rhythmEngine.registerHit();
        }

        // Check scale note on note-on
        if (isNoteOn && this.isScaleMode) {
            this.checkScaleNote(note);
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
        // Create hint keyboard from C3 to C6 (covers most chord voicings)
        const startNote = 48; // C3
        const endNote = 84; // C6

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
                whiteKey.style.position = 'absolute';
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

        // Highlight only the exact MIDI notes (show chord once, not in all octaves)
        const noteSet = new Set(midiNotes);

        allKeys.forEach(key => {
            const keyNote = parseInt((key as HTMLElement).dataset.hintNote || '0');
            if (noteSet.has(keyNote)) {
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

    // Rhythm Training Methods
    private updateRhythmSettings(): void {
        rhythmEngine.updateSettings({
            bpm: parseInt(this.rhythmBpm.value) || 80,
            beatsPerMeasure: parseInt(this.rhythmTimeSig.value) || 4,
            mode: this.rhythmMode.value as RhythmMode,
            countIn: this.rhythmCountIn.checked
        });
    }

    private async startRhythm(): Promise<void> {
        this.updateRhythmSettings();
        this.rhythmStats = { perfect: 0, good: 0, missed: 0 };
        this.updateRhythmStatsDisplay();

        // Create beat dots
        this.createBeatDots();

        // Show display, toggle buttons
        this.rhythmDisplay.classList.remove('hidden');
        this.rhythmStartBtn.classList.add('hidden');
        this.rhythmStopBtn.classList.remove('hidden');
        this.rhythmTiming.textContent = '';
        this.rhythmTiming.className = 'rhythm-timing';

        // Start scale mode if selected
        if (this.rhythmMode.value === 'scales') {
            this.startScaleMode();
        }

        // Set up callbacks
        rhythmEngine.onBeat((event) => this.onBeat(event));
        rhythmEngine.onHit((timing, offset) => this.onRhythmHit(timing, offset));

        await rhythmEngine.start();
    }

    private stopRhythm(): void {
        rhythmEngine.stop();
        this.rhythmStartBtn.classList.remove('hidden');
        this.rhythmStopBtn.classList.add('hidden');
        this.rhythmDisplay.classList.add('hidden');

        // Stop scale mode if active
        if (this.isScaleMode) {
            this.stopScaleMode();
        }
    }

    private createBeatDots(): void {
        const beatsPerMeasure = parseInt(this.rhythmTimeSig.value) || 4;
        this.beatDots.innerHTML = '';

        for (let i = 0; i < beatsPerMeasure; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot' + (i === 0 ? ' downbeat' : '');
            dot.textContent = (i + 1).toString();
            dot.dataset.beat = (i + 1).toString();
            this.beatDots.appendChild(dot);
        }
    }

    private onBeat(event: { beat: number; measure: number; isDownbeat: boolean }): void {
        // Skip count-in visually
        if (event.measure < 0) return;

        // Update beat dots
        const dots = this.beatDots.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));

        const activeDot = this.beatDots.querySelector(`[data-beat="${event.beat}"]`);
        if (activeDot) {
            activeDot.classList.add('active');
        }
    }

    private onRhythmHit(timing: 'perfect' | 'good' | 'early' | 'late' | 'miss', offsetMs: number): void {
        // Update stats
        if (timing === 'perfect') {
            this.rhythmStats.perfect++;
        } else if (timing === 'good') {
            this.rhythmStats.good++;
        } else {
            this.rhythmStats.missed++;
        }
        this.updateRhythmStatsDisplay();

        // Update timing needle position
        // offsetMs: negative = early, positive = late
        // Map -150ms to 0%, 0ms to 50%, +150ms to 100%
        const maxOffset = 150;
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetMs));
        const needlePosition = 50 + (clampedOffset / maxOffset) * 50;

        this.timingNeedle.style.left = `${needlePosition}%`;
        this.timingNeedle.classList.add('visible');

        // Show timing feedback
        const labels = {
            perfect: 'Perfect!',
            good: 'Good!',
            early: 'Early',
            late: 'Late',
            miss: 'Miss'
        };
        this.rhythmTiming.textContent = labels[timing];
        this.rhythmTiming.className = `rhythm-timing ${timing}`;

        // Clear feedback after short delay
        setTimeout(() => {
            this.rhythmTiming.textContent = '';
            this.rhythmTiming.className = 'rhythm-timing';
            this.timingNeedle.classList.remove('visible');
        }, 500);
    }

    private updateRhythmStatsDisplay(): void {
        this.rhythmPerfect.textContent = this.rhythmStats.perfect.toString();
        this.rhythmGood.textContent = this.rhythmStats.good.toString();
        this.rhythmMissed.textContent = this.rhythmStats.missed.toString();
    }

    // Scale Training Methods
    private onRhythmModeChange(): void {
        const mode = this.rhythmMode.value;
        this.isScaleMode = mode === 'scales';

        if (this.isScaleMode) {
            this.scaleSettings.classList.remove('hidden');
            this.updateScaleSettings();
        } else {
            this.scaleSettings.classList.add('hidden');
        }

        this.updateRhythmSettings();
    }

    private updateScaleSettings(): void {
        scaleTrainer.updateSettings({
            root: this.scaleRoot.value,
            scaleType: this.scaleType.value as ScaleType,
            direction: this.scaleDirection.value as 'ascending' | 'descending' | 'both',
            showHints: this.scaleHints.checked
        });
    }

    private startScaleMode(): void {
        this.isScaleMode = true;
        this.updateScaleSettings();
        scaleTrainer.start(3); // Start at octave 3

        // Show scale display
        this.scaleDisplay.classList.remove('hidden');
        this.scaleFeedback.classList.remove('hidden');

        // Update scale info
        const settings = scaleTrainer.getSettings();
        this.scaleName.textContent = `${settings.root} ${SCALE_NAMES[settings.scaleType]}`;
        this.scaleNotesDisplay.textContent = scaleTrainer.getScaleNotes().join(' - ');

        // Create scale hint keyboard
        this.createScaleHintKeyboard();

        // Update next note display
        this.updateScaleDisplay();
    }

    private stopScaleMode(): void {
        scaleTrainer.stop();
        this.scaleDisplay.classList.add('hidden');
        this.scaleFeedback.classList.add('hidden');
        this.isScaleMode = false;
    }

    private createScaleHintKeyboard(): void {
        this.scaleHintKeyboard.innerHTML = '';

        const startNote = 48; // C3
        const endNote = 84; // C6
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
                const blackKey = document.createElement('div');
                blackKey.className = 'hint-black-key' + (isInScale ? ' highlight' : '');
                blackKey.dataset.scaleNote = note.toString();
                const offset = whiteKeyIndex * whiteKeyWidth - (blackKeyWidth / 2);
                blackKey.style.left = `${offset}px`;
                keyboardInner.appendChild(blackKey);
            } else {
                const whiteKey = document.createElement('div');
                whiteKey.className = 'hint-white-key' + (isInScale ? ' highlight' : '');
                whiteKey.dataset.scaleNote = note.toString();
                whiteKey.style.position = 'absolute';
                whiteKey.style.left = `${whiteKeyIndex * whiteKeyWidth}px`;
                whiteKey.style.width = `${whiteKeyWidth}px`;
                whiteKey.style.height = '32px';
                keyboardInner.appendChild(whiteKey);
                whiteKeyIndex++;
            }
        }

        this.scaleHintKeyboard.appendChild(keyboardInner);
    }

    private checkScaleNote(midiNote: number): void {
        if (!scaleTrainer.isRunning()) {
            // Free play - just show if note is in scale
            const result = scaleTrainer.checkNote(midiNote);
            this.showScaleFeedback(result);
            return;
        }

        const result = scaleTrainer.checkNote(midiNote);
        this.showScaleFeedback(result);
        this.updateScaleDisplay();

        if (scaleTrainer.isComplete()) {
            this.showScaleFeedback('complete');
            setTimeout(() => {
                scaleTrainer.start(3); // Restart scale
                this.updateScaleDisplay();
            }, 1500);
        }
    }

    private showScaleFeedback(result: string): void {
        const messages: Record<string, string> = {
            correct: 'Correct!',
            wrong: 'Wrong note!',
            inScale: 'In scale',
            outOfScale: 'Out of scale!',
            complete: 'Scale complete!'
        };

        this.scaleFeedback.textContent = messages[result] || '';
        this.scaleFeedback.className = `scale-feedback ${result === 'correct' || result === 'inScale' ? 'correct' : result === 'complete' ? 'complete' : 'wrong'}`;

        if (result !== 'complete') {
            setTimeout(() => {
                this.scaleFeedback.textContent = '';
                this.scaleFeedback.className = 'scale-feedback';
            }, 400);
        }
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
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    new ChordApp();
});
