class PixelSynth {
    constructor(oscillator_type) {
        this.start_note = 60;
        //this.midiNumbers = [0, 0, 7, 12, 16, 19, 21, 24, 26, 28, 31, 33]; // The midi numbers for the notes in the scale
        //this.midiNumbers = this.midiNumbers.map(number => number + this.start_note - 12); // Shift the notes to the correct octave
        this.setHarmony('major pentatonic');
        this.noteFrequencies = this.midiNumbers.map(midiToFrequency);
        this.frequencyScale = 1; // The scale of the frequency
        this.amplitudeScale = 1.5; // The scale of the amplitude

        

        this.gainNode = new p5.Gain();
        this.gainNode.amp(0.4);
        this.reverbNode = new p5.Reverb();

        this.filterNode = new p5.LowPass();
        this.filterNode.freq(1000); // Set the initial frequency of the low pass filter, gets reset by column avergage
        this.filterNode.res(10); // Set the initial resonance of the low pass filter

        this.oscillator = new p5.Oscillator(oscillator_type)
        this.oscillator.amp(0.3)
        this.oscillator.disconnect(); // Disconnect the oscillators from the main output
        this.oscillator.connect(this.filterNode); // Connect the oscillators to the filterNode

        this.filterNode.connect(this.reverbNode); // Connect the reverbNode to the filterNode
        this.reverbNode.connect(this.gainNode); // Connect the filterNode to the gainNode
        this.gainNode.connect(); // Connect the gainNode to the main output
        //this.filterNode.disconnect(); // Disconnect the filterNode from the main output
        //this.reverbNode.disconnect(); // Disconnect the reverbNode from the main output
    }

    setHarmony(harmony){
        switch (harmony) {
            case 'major':
                this.midiNumbers = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
                break;  
            case 'minor':
                this.midiNumbers = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22];
                break;  
            case 'major pentatonic':
                this.midiNumbers = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
                break;
            case 'minor pentatonic':    
                this.midiNumbers = [0, 3, 5, 7, 0, 12, 15, 17, 19, 22];
                break;  
            case 'whole tone':    
                this.midiNumbers = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
                break;  
            case 'diminished':  
                this.midiNumbers = [0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23];
                break;
            case 'chromatic':
                this.midiNumbers = Array.from({length: 24}, (_, i) => i);
                break;
            case 'lydian':
                this.midiNumbers = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23];
                break;  
            case 'mixolydian':
                this.midiNumbers = [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22];
                break; 
            case 'byzantine':
                this.midiNumbers = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23];
                break;  
            case 'asavari': //1, b2, 4, 5, b6
                this.midiNumbers = [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24];
                break;  
            case 'hijaz': //1, b2, 3, 4, 5, b6, b7
                this.midiNumbers = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19, 20, 22];
                break; 
            case 'egyptian': //1, 2, 4, 5, b7
                this.midiNumbers = [0, 2, 5, 7, 10, 12, 14, 17, 19, 22, 24];
                break;
        }
        this.midiNumbers = this.midiNumbers.map(number => number + start_note - 12);
    }


    
    start() {
        if (getAudioContext().state !== 'running') {
            getAudioContext().resume();
        }
        //this.oscillator.amp(0.5);
        this.oscillator.start();
    }
    
    stop() {
        //this.oscillator.amp(0.5, 0.1); // Fade out the sound when pausing
        this.oscillator.stop();
    }

    setAmp(amp) {
        //this.oscillator.amp(0);
        let offset = 0.; //trying to make dark regions quie
        let ampCon = constrain(amp - offset, 0, 0.8);

        this.oscillator.amp(ampCon);
        //this.gainNode.amp(ampCon);
    }
    setFreq(freqData) {
        let noteIndex = floor(map(freqData**this.frequencyScale, 0, 1, 0, this.noteFrequencies.length)); // Map to note pitches (should rescale all color data first or refercne a premade b-r image)
        noteIndex = constrain(noteIndex, 0, this.noteFrequencies.length - 1); // Ensure the index is within bounds
        let freq = this.noteFrequencies[noteIndex]; // Get the corresponding frequency
    
        this.oscillator.freq(freq);
    }
    setFilterFreq(freq) {
        this.filterNode.freq(freq);
    }
    setFilterRes(res) {
        this.filterNode.res(res);
    }
    setReverbTime(time) {
        this.reverbNode.set(time);
    }
    setReverbDecay(decay) {
        this.reverbNode.set(decay);
    }

    update(rgbValues) {
        let brightness = (rgbValues.r + rgbValues.g + rgbValues.b) / 3; // Calculate brightness as the average of r, g, b
        let freqData = map(rgbValues.b, 0, 255, 0, 1); // Map to note pitches (should rescale all color data first or refercne a premade b-r image)
        let amplitude = map(brightness, 0, 255, 0, 1); // Map brightness to a range of 0 to 1

        this.updateOsc(freqData, 0.2*amplitude**this.amplitudeScale);
    }
    updateOsc(freqData, amp) {
        this.setFreq(freqData);
        this.setAmp(amp);
    }
}

function midiToFrequency(midiNumber) {
    const A4 = 440; // Frequency of A4
    return A4 * Math.pow(2, (midiNumber - 69) / 12);
}