const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const pointTypeToInstrument = {
    star: "guitar",
    galaxy: "harp",
};
function midi2note(midi) {
    var octave = ((midi-6) / 12) - 1;
    var noteIndex = (midi % 12);
    var noteName = noteNames[noteIndex]
    return noteName + Math.round( octave )
}


class SamplePlayer {
    constructor() {

        this.amp_scale = 1;
        this.last_sample_index=-1;
        this.last_midi_note = -1;

        this.setHarmony('major pentatonic');
        

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



    playSample(pitch_value, vol_value, instrument) {

        const midiNoteIndex = int(map(pitch_value, 0,  1, 0, this.midiNumbers.length-1)); //map the star's size to an index in the midiNumbers array
        const midiNote = this.midiNumbers[midiNoteIndex];
        const sampleIndex = midiNote - midiMin;

        //console.log('playing',midiNoteIndex,  midiNote, sampleIndex, sampleNames[sampleIndex], 'at', vol_value**this.amp_scale);
        if (midiNote >= midiMin && midiNote < midiMax) {
            //this.playSound(buffers[sampleIndex], vol_value**this.amp_scale);     //WASNT WORKING, NO SOUND

            //sounds[sampleIndex].play(); //using p5
            //sounds[sampleIndex].setVolume(vol_value*0.5);

            //using web audio api
            this.playAudio(`${instrument}_${midiNote}`, vol_value)
            //console.log(`Playing audio: harp_${midiNote} at volume: ${vol_value}`);

        }
        this.last_sample_index = sampleIndex;
        this.last_midi_note = midiNote;
    }

    triggerPoints(points) {
        if (points && points.length > 0) {
            for (let point of points) {
                let point_freqData = map(point.color_br ** 0.4, 0, 1, 0, 1); // Map br color to frequency
                let point_amplitude = map(point.size, 0, point_size_scale, 0, 0.75); // Map size to amplitude
                let instrument = pointTypeToInstrument[point.type] || 'harp'; // Default to 'harp' if type is not found
                //console.log('triggering', point_freqData, point_amplitude, point.type, instrument);
                sampler.playSample(point_freqData, 0.05 + point_amplitude ** 0.5, instrument);
            }
          } 
    }

    playAudio(name, volume = 1.0) {
        if (audioBuffers[name]) {
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain(); // Create a GainNode for volume control
    
            source.buffer = audioBuffers[name];
            source.connect(gainNode); // Connect the source to the GainNode
            gainNode.connect(audioContext.destination); // Connect the GainNode to the destination
    
            gainNode.gain.value = volume; // Set the volume (0.0 to 1.0)
    
            source.start(0);
            //console.log(`Playing audio: ${name} at volume: ${volume}`);
        } else {
            console.log(`Audio buffer not loaded for: ${name}`);
        }
    }

    // playSound(buffer, volume) {
    //     if (!buffer) {
    //         console.error('Buffer is not loaded');
    //         return;
    //     }
    
    //     // Constrain volume to valid range
    //     volume = constrain(volume, 0, 1);
    
    //     // Create a buffer source
    //     const source = audioContext.createBufferSource();
    //     source.buffer = buffer;
    
    //     // Create a GainNode
    //     const gainNode = audioContext.createGain();
    //     gainNode.gain.value = volume; // Set the volume (0.0 to 1.0)
    
    //     // Connect the source to the GainNode
    //     source.connect(gainNode);
    
    //     // Connect the GainNode to the destination (speakers)
    //     gainNode.connect(audioContext.destination);
    
    //     // Start playing the sound
    //     source.start(0);
    //     }
}

// function playSound(buffer, volume) {
//     // Create a buffer source
//     const source = audioContext.createBufferSource();
//     source.buffer = buffer;

//     // Create a GainNode
//     const gainNode = audioContext.createGain();
//     gainNode.gain.value = volume; // Set the volume (0.0 to 1.0)
//     // Connect the source to the GainNode
//     source.connect(gainNode);

//     // Connect the GainNode to the destination (speakers)
//     gainNode.connect(audioContext.destination);

//     // Start playing the sound
//     source.start(0);
// }

