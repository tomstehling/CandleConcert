if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({sysex: false}).then(function (midiAccess) {
        midi = midiAccess;
        var inputs = midi.inputs.values();
        
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            // Warten auf Midi Message
            input.value.onmidimessage = onMIDIMessage;
        }
    });
} else {
    alert("Fehlender Browser MIDI Support");
}

function onMIDIMessage(event) {
    // event.data is an array
    // event.data[0] = on (144) / off (128) / controlChange (176)  / pitchBend (224) / ...
    // event.data[1] = midi note
    // event.data[2] = velocity
    //console.log(event.data[0], event.data[1], event.data[2]);

    switch (event.data[0]) {
    case 144:
        // your function startNote(note, velocity)
        switch (event.data[1]) {
            case 5: //Drum Compressor An
                console.log("Kompressor An");
                console.log(drumValueSpeicher);
                compressorNode.threshold.value = drumValueSpeicher;
                EffektAn[0] = 1;
                break;
            
            case 6:
                console.log("Bass Distortion An");
                distortionNode.curve = makeDistortionCurve(bassValueSpeicher);
                EffektAn[1] = 1;
                break;
            
            case 7: // Stimme Hall Effekt auf alten Wert 
                console.log("Hall An");
                voxHallGain.gain.value = voxValueSpeicher;
                EffektAn[2] = 1;
                break;

            case 8:
                console.log("Guitar EQ An");
                filterNode.frequency.value = guitarValueSpeicher[0];
                filterNode.detune.value = guitarValueSpeicher[1];
                filterNode.Q.value = guitarValueSpeicher[2];
                filterNode.gain.value = guitarValueSpeicher[3];
                filterNode.type = guitarValueSpeicher[4];
                EffektAn[3] = 1;
                break;

                
            case 36:    // Pad 1 auf meinem Midi Controller. Startet / Stoppt den Song
                console.log("Start Song")
                startSong ();
                break;
        }
        break;
    case 128:
        // your function stopNote(note, velocity)
        switch (event.data[1]) {
            case 5: //Drum Compressor Aus, indem Treshold auf 0 dB gestellt wird 
                if (EffektAn[0] == 1) {
                    console.log("Kompressor Aus");
                    drumValueSpeicher = compressorNode.threshold.value;
                    compressorNode.threshold.value = 0;
                    EffektAn[0] = 0;
                }
                else {
                    console.log(EffektAn[0])
                    console.log("Kompressor bereits aus");
                }


                break;

            case 6: //Bass Distortion Aus
                if (EffektAn[1] == 1) {
                    console.log("Bass Distortion Aus")
                    bassValueSpeicher = document.querySelector("#distortionSlider").value;
                    distortionNode.curve = makeDistortionCurve(0);
                    EffektAn[1] = 0;
                }
                else {
                    console.log("Bass Distortion bereits aus");
                }
                break;

            case 7: // Stimmen Hall Effekt aus 
                if (EffektAn[2] == 1) {
                    console.log("Hall Aus")
                    voxValueSpeicher = voxHallGain.gain.value;
                    voxHallGain.gain.value = 0;
                    EffektAn[2] = 0;
                }
                else {
                    console.log("Hall Effekt bereits aus");
                }
                break;

            case 8: //
                if (EffektAn[3] == 1) {
                    console.log("Guitar Filter Aus")
                    guitarValueSpeicher[0]= filterNode.frequency.value;
                    guitarValueSpeicher[1] = filterNode.detune.value;
                    guitarValueSpeicher[2] = filterNode.Q.value;
                    guitarValueSpeicher[3] = filterNode.gain.value;
                    guitarValueSpeicher[4] = filterNode.type;
                    console.log(guitarValueSpeicher);

                    filterNode.frequency.value = (0);
                    filterNode.detune.value = (0);
                    filterNode.Q.value = (0);
                    filterNode.gain.value = (0);
                    filterNode.type = "peaking"

                    EffektAn[3] = 0;
                }
                else {
                    console.log("Guitar EQ bereits aus");
                }
                break;
        }
        break;
        // Bei meinem Midi Controller ist 176 (in HEX: B0) die Potis 
    case 176:

        //Switch für die Abrage nach der Velocity. Diese steuert anschließend die Lautsärke der Spuren 
        //Gain Nodes gehen von 0 bis 1
        switch (event.data[1]) { 
            case 1: // Drum Volume
            console.log("Drum Volume")
            drumGain.gain.value = (event.data[2] / 127);
            document.querySelector("#drumGainOutput").innerHTML = (Math.round(event.data[2] / 127 * 100))/ 100  + " %";
            drumGainSlider.value = (Math.round(event.data[2] / 127 * 100));
                break;

            case 2: // Bass Volume
            console.log("Bass Volume")
            bassGain.gain.value = (event.data[2] / 127);
            document.querySelector("#bassGainOutput").innerHTML = (Math.round(event.data[2] / 127 * 100))/ 100  + " %";
            bassGainSlider.value = (Math.round(event.data[2] / 127 * 100));
                break;

            case 3: // Stimme Volume
            console.log("Vox Volume")
            voxGain.gain.value = (event.data[2] / 127);  
            document.querySelector("#voxGainOutput").innerHTML = (Math.round(event.data[2] / 127 * 100))/ 100  + " %";
            voxGainSlider.value = (Math.round(event.data[2] / 127 * 100));
                break;

            case 4: // Gitarre Volume
            console.log("Guitar Volume")
            guitarGain.gain.value = (event.data[2] / 127);  
            document.querySelector("#guitarGainOutput").innerHTML = (Math.round(event.data[2] / 127 * 100))/ 100  + " %";
            guitarGainSlider.value = (Math.round(event.data[2] / 127 * 100));
                break;

        }
        break;

    }
}


