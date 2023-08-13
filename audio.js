let context = new AudioContext();

// Buffer zum einmaligen Befüllen. Diese Buffer werden immer wieder in die BufferNode geladen, beim Starten eines Songs 
let bassBuffer = [];
let drumBuffer = [];
let voxBuffer = [];
let guitarBuffer = [];


// Gain Nodes für die Spuren
let bassGain = context.createGain();
let drumGain = context.createGain();
let voxGain = context.createGain();
let guitarGain = context.createGain();

// Hall Nodes. Hall node ist eine extra Spur 
let voxHallGain = context.createGain();
let hallNode = context.createConvolver();

// Distortion Node für Bass
let distortionNode = context.createWaveShaper();

//Kompressor für Drums 
let compressorNode = context.createDynamicsCompressor();

// Filter für Guitar
let filterNode = context.createBiquadFilter();

// HTML Elemente laden
let songSelect = document.querySelector("#songSelection");
let playStop = document.querySelector("#playPauseButton");
let hallSelect = document.querySelector("#hallSelect");

let drumGainSlider = document.querySelector("#drumGainSlider");
let bassGainSlider = document.querySelector("#bassGainSlider");
let voxGainSlider = document.querySelector("#voxGainSlider");
let voxHallGainSlider = document.querySelector("#voxHallGainSlider");
let guitarGainSlider = document.querySelector("#guitarGainSlider");

let isPlaying = 0;

// Variablen zur Speicherung der Effekte
let drumValueSpeicher = 0;
let voxValueSpeicher = 0;
let guitarValueSpeicher = [0, 0, 0, 0, "lowpass"];
let bassValueSpeicher = 0;

let EffektAn = [1, 1, 1, 1];

// Initialisierung beim Starten des Programms 
getSongData("devilsWorld"); // default Song
loadImpulseResponse("room"); // Standard mäßig einen Hall laden 

distortionNode.curve = makeDistortionCurve(0); // Distortion Kurve berechnen
distortionNode.oversample = "4x";               // Oversample setzen 

// Setzen der Effekte, damit diese Standard Mäßig aktiviert sind 
compressorNode.threshold.value = -45;


filterNode.frequency.value = (2000);
filterNode.detune.value = (0);
filterNode.Q.value = (0);
filterNode.gain.value = (0);
filterNode.type = "lowpass"

 // Variablen
 bassGain.gain.value = 0.5;
 drumGain.gain.value = 0.5;
 voxGain.gain.value = 0.5;
 voxHallGain.gain.value = 0;
 guitarGain.gain.value = 0.5;



// Event Listener

// Start Stopp
playStop.addEventListener("click", function(e) {
    StopButton();
})

// Start und Stopp sind aufgeteilt um über die Midi Befehle einzelnd auf Start und Stopp zuzugreifen

function StopButton () {   
        stopSong ();
};

function startSong () {
    if (isPlaying == 0) {
        playSong();


        sourceBassBufferNode.start(context.currentTime);
        sourceDrumBufferNode.start(context.currentTime);
        sourceVoxBufferNode.start(context.currentTime);
        sourceVoxHallBufferNode.start(context.currentTime);
        sourceGuitarBufferNode.start(context.currentTime);


        playStop.innerHTML = "Stop"
        isPlaying = 1;
    }
}

function stopSong () {
    sourceBassBufferNode.stop();
    sourceDrumBufferNode.stop();
    sourceVoxBufferNode.stop();
    sourceVoxHallBufferNode.stop();
    sourceGuitarBufferNode.stop();

    playStop.innerHTML = "Start";

    isPlaying = 0;

}

// Distortion Amount aus Slider laden 
document.querySelector("#distortionSlider").addEventListener("input", function() {
    document.querySelector("#distortionOutput").innerHTML = this.value;
    distortionNode.curve = makeDistortionCurve(this.value);
});

// Hall Auswahl durch HTML Liste
hallSelect.addEventListener("change", function (e) {
    let name = e.target.options[e.target.selectedIndex].value;
    loadImpulseResponse(name);
});

// Song Auswahl durch HTML Liste
songSelect.addEventListener("change", function (e) {
    let song = e.target.options[e.target.selectedIndex].value;
    getSongData(song);
});

// Gain Slider
drumGainSlider.addEventListener("input", function(e) {
    drumGain.gain.value = this.value / 100;
    document.querySelector("#drumGainOutput").innerHTML = this.value  + " %";
});

bassGainSlider.addEventListener("input", function(e) {
    bassGain.gain.value = this.value / 100;
    document.querySelector("#bassGainOutput").innerHTML = this.value  + " %";
});

voxGainSlider.addEventListener("input", function(e) {
    voxGain.gain.value = this.value / 100;
    document.querySelector("#voxGainOutput").innerHTML = this.value  + " %";
});

voxHallGainSlider.addEventListener("input", function(e) {
    voxHallGain.gain.value = this.value / 100;
    document.querySelector("#voxHallGainOutput").innerHTML = this.value  + " %";
});

guitarGainSlider.addEventListener("input", function(e) {
    guitarGain.gain.value = this.value / 100;
    document.querySelector("#guitarGainOutput").innerHTML = this.value  + " %";
});



// Impulsantwort laden
function loadImpulseResponse(name) {
    fetch("/impulseResponses/" + name + ".wav")
        .then(response => response.arrayBuffer())
        .then(undecodedAudio => context.decodeAudioData(undecodedAudio))
        .then(audioBuffer => {
            if (hallNode) {hallNode.disconnect();}

            hallNode = context.createConvolver();
            hallNode.buffer = audioBuffer;
            hallNode.normalize = true;

            // Convolver Node muss nach Ändern wieder neu verbunden werden
            voxHallGain.connect(hallNode);
            hallNode.connect(context.destination)
        })
        .catch(console.error);
}





// Distortionkurve berechnen
function makeDistortionCurve(amount) {    
    let n_samples = 44100,
        curve = new Float32Array(n_samples);
    
    for (var i = 0; i < n_samples; ++i ) {
        var x = i * 2 / n_samples - 1;
        curve[i] = (Math.PI + amount) * x / (Math.PI + (amount * Math.abs(x)));
    }
    
    return curve;
};


// Kompressor 
for (let i = 0; i < document.getElementsByClassName("compressorSlider").length; i++) {
    document.getElementsByClassName("compressorSlider")[i].addEventListener("mousemove", changeCompressorParameter)
}

function changeCompressorParameter() {
    switch (this.id) {
        case "thresholdSlider":
            compressorNode.threshold.value = (this.value - 100);
            document.querySelector("#thresholdOutput").innerHTML = (this.value - 100) + " dB";
            break;
        case "ratioSlider":
            compressorNode.ratio.value = (this.value / 5);
            document.querySelector("#ratioOutput").innerHTML = (this.value / 5) + " dB";
            break;
        case "kneeSlider":
            compressorNode.knee.value = (this.value / 2.5);
            document.querySelector("#kneeOutput").innerHTML = (this.value / 2.5) + " degree";
            break;
        case "attackSlider":
            compressorNode.attack.value = (this.value / 1000);
            document.querySelector("#attackOutput").innerHTML = (this.value / 1000) + " sec";
            break;
        case "releaseSlider":
            compressorNode.release.value = (this.value / 1000);
            document.querySelector("#releaseOutput").innerHTML = (this.value / 1000) + " sec";
            break;
    }
}

// EQ für Guitar 
for (var i = 0; i < document.getElementsByClassName("filterSlider").length; i++) {
    document.getElementsByClassName("filterSlider")[i].addEventListener('mousemove', changeFilterParameter, false);
}

filterSelectList.addEventListener("change", function (e) {
    filterNode.type = filterSelectList.options[filterSelectList.selectedIndex].value;
});

function changeFilterParameter() {
    switch (this.id) {
    case "frequencySlider":
        filterNode.frequency.value = (this.value);
        document.querySelector("#frequencyOutput").innerHTML = (this.value) + " Hz";
        break;
    case "detuneSlider":
        filterNode.detune.value = (this.value);
        document.querySelector("#detuneOutput").innerHTML = (this.value) + " cents";
        break;
    case "qSlider":
        filterNode.Q.value = (this.value);
        document.querySelector("#qOutput").innerHTML = (this.value) + " ";
        break;
    case "gainFilterSlider":
        filterNode.gain.value = (this.value);
        document.querySelector("#gainOutput").innerHTML = (this.value) + " dB";
        break;
    }
}


// Verschiedenen Spuren des Songs laden 
function getSongData (songName) {
    fetch("/audios/" + songName+ "/Bass.wav")
    .then(response => response.arrayBuffer())
    .then(undecodedAudio => context.decodeAudioData(undecodedAudio))
    .then(audioBuffer => {
        bassBuffer[0] = audioBuffer;
    })
    .catch(console.error);

    
    fetch("/audios/" + songName + "/Drums.wav")
    .then(response => response.arrayBuffer())
    .then(undecodedAudio => context.decodeAudioData(undecodedAudio))
    .then(audioBuffer => {
        drumBuffer[0] = audioBuffer;
    })
    .catch(console.error);

    fetch("/audios/" + songName + "/Vox.wav")
    .then(response => response.arrayBuffer())
    .then(undecodedAudio => context.decodeAudioData(undecodedAudio))
    .then(audioBuffer => {
        voxBuffer[0] = audioBuffer;
    })
    .catch(console.error);

    fetch("/audios/" + songName + "/Guitars.wav")
    .then(response => response.arrayBuffer())
    .then(undecodedAudio => context.decodeAudioData(undecodedAudio))
    .then(audioBuffer => {
        guitarBuffer[0] = audioBuffer;
    })
    .catch(console.error);
    
}

function playSong() {

    // Durch das weglasen von let/var werden die Buffer Nodes global und nicht nur in der Funktion definiert. 
    // Wichtig um von außerhalb auf die Nodes zuzugreifen
    //Außerdem muss bei jedem Starten die Node neu definiert werden. Eine Buffer Node kann nicht mehrmals neu gestartet werden
    sourceBassBufferNode = context.createBufferSource();
    sourceGuitarBufferNode = context.createBufferSource();
    sourceDrumBufferNode = context.createBufferSource();
    sourceVoxBufferNode = context.createBufferSource();
    sourceVoxHallBufferNode = context.createBufferSource();

    sourceBassBufferNode.buffer = bassBuffer[0];
    sourceDrumBufferNode.buffer = drumBuffer[0];
    sourceVoxBufferNode.buffer = voxBuffer[0];  
    sourceVoxHallBufferNode.buffer = voxBuffer[0];
    sourceGuitarBufferNode.buffer = guitarBuffer[0];

        // Guitar
        sourceGuitarBufferNode.connect(guitarGain);
        guitarGain.connect(filterNode);
        filterNode.connect(context.destination);
        
        //Drum -> Kompressor 
        sourceDrumBufferNode.connect(drumGain);
        drumGain.connect(compressorNode);
        compressorNode.connect(context.destination);
       
        // Bass -> Distortion 
        sourceBassBufferNode.connect(bassGain);
        bassGain.connect(distortionNode);
        distortionNode.connect(context.destination);

        // Verbindung der Hall Node 
        sourceVoxHallBufferNode.connect(voxHallGain);
        voxHallGain.connect(hallNode);
        hallNode.connect(context.destination);

        sourceVoxBufferNode.connect(voxGain);
        voxGain.connect(context.destination);

}


/* 
        Jede Spur 1 Effekt. 
        Insgesamt 4 Spuren 

        Stimme -> Hall
        Bass   -> Distortion
        Drum   -> Kompressor 
        Guitar -> EQ
        
*/



