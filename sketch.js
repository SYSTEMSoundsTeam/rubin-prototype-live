/////////////////////////////////////

//const N = 10000; // Number of points

const range = 1000; // canvas size

let target_point = [0, 0]; // Target point coordinates
let target_pixel = [0, 0];
let points;
let point_size_scale = 20;
const n_frames_subset = 60; // Number of frames between making subset tree

let noiseOffset = Math.random() * 1000;
let speed = 0.5; // Constant speed for the target point
const noiseScale = 0.001; // Scale for Perlin noise
let speedSlider;
let directionX = 1;
let directionY = 1;

let bgImage;

let isPlaying = false; // Variable to control play/pause state
let playPauseButton;
let prevMouseX, prevMouseY;
let inputBox;
let average_n = 5; // Default size of the averaging window
// let nearestPoint;

let osc; // Oscillator
let synth;
let audioContext;
let sampler;
let ps; //point searcher

let midiMin = 48;
let midiMax = 84;
let start_note = 60;
let instruments = ["harp", "piano", "guitar"];

let audioBuffers = {}; // Object to store multiple audio buffers

let imageScale = 1; // Default scale factor (1 = original size)
let dot_size = 5 * imageScale; //size for plotting points (for testing)
let point_data;
let image_filename = "picture_10_15_v21_cee_2440";
let last_nearest_point_id = -1;
let last_freq = -1;

let sampleMode = "circle"; // 'pixels' or 'stars' or 'circle'
let animations = []; // Array to store active circle animations
let showPoints = false; // Whether to show the points or not
let showPixelInfo = false; // Whether to show the pixel info or not
let isPixelPlaying = true;
let arePointsPlaying = true;

function preload() {
  bgImage = loadImage("./assets/" + image_filename + ".jpg"); // Replace with the path to your image
  //load star data
  point_data = loadJSON("./data/" + image_filename + "_peaks.json"); //JSON data of star positions and sizes

  // Load all audio files using loadAudio
  const audioPromises = [];

  for (let instrument of instruments) {
    for (let i = midiMin; i <= midiMax; i++) {
      audioPromises.push(
        loadAudio(`${instrument}_${i}`, `./sounds/${instrument}/${i}.mp3`)
      );
    }
  }

  // Wait for all audio files to load
  Promise.all(audioPromises)
    .then(() => {
      console.log("All audio files loaded");
    })
    .catch((error) => {
      console.error("Error loading audio files:", error);
    });
}

function setup() {
  userStartAudio(); // Ensures the audio context is started

  const canvas = createCanvas(range, range); // Create a canvas of size range x range
  canvas.parent("canvas-container"); // Attach the canvas to the HTML element with id 'canvas-container'
  background(255);
  //current_fr = frameRate().toFixed(0);
  bgImage.loadPixels(); // Load the pixel data of the background image
  target_point = [
    Math.floor(Math.random() * bgImage.width),
    Math.floor(Math.random() * bgImage.height),
  ];
  target_pixel = image2canvas(target_point[0], target_point[1]); //should always be center of canvas!

  points = makePoints(point_data);
  ps = new PointSearcher(points);
  ps.makeSubset(target_pixel, (radius = 200)); //update subset points (can pass a radius)

  // Create a pixel synth and sampler
  synth = new PixelSynth("sine");
  synth.start();
  sampler = new SamplePlayer();

  // if (audioContext.state !== 'running') {
  //     audioContext.resume().then(() => {
  //         console.log('Audio context resumed');
  //     });
  // }
}

function draw() {
  background(0);
  drawImage();

  //////////////////FINDING NEIGHBOURS///////////////////////////////////////////////////////
  //ps.radius_neighbours = (50 / imageScale) * (bgImage.width / range);
  if (frameCount % n_frames_subset === 0) {
    //this should dedepnd on speed (also need to deal with manual mode)
    ps.makeSubset(target_point, (radius = 200 / imageScale)); //update subset points (can pass a radius)
  }
  ps.findNeighbours(target_point, (radius = 50 / imageScale)); //find nearest neightbours from within subset (can pass a radius)

  // Update and draw animations
  if (arePointsPlaying) { 
    ps.updateAndDrawAnimations();
  }

  if (showPoints) {
    drawPoints(points, { r: 0, g: 0, b: 255 }); // Plot subset points in yellow
    drawPoints(ps.subsetPoints, { r: 255, g: 255, b: 0 }); // Plot subset points in yellow
    drawPoints(ps.nearestNeighbours, { r: 255, g: 165, b: 0 }); // Plot nearest neighbors in orange
    drawPoints([ps.nearestPoint], { r: 255, g: 0, b: 0 }); // Draw the nearest point in red
  }

  /////////////////////////MOVING VIEWER///////////////////////////////////////////
  // The speed is now updated by the HTML slider's oninput event

  updateTargetPoint(); //based on Perlin random walk (auto) or mous dragging (manual)

  /////////////////////SONIFICATION////////////////////////////////////////////////

  // Retrieve the RGB values of the pixel in the background image behind the target point
  let rgbValues = getAverageRGBValues(target_point[0], target_point[1], average_n, (useWeighting = true));

  if (!isPlaying && mouseIsPressed && isPixelPlaying) { //manual mode 
    // Update the synth while the mouse is being dragged
    synth.update(onCanvas() ? rgbValues : { r: 0, g: 0, b: 0 });
    
    } else if (!isPlaying && !mouseIsPressed) {
        // Stop the synth or perform some other action
        synth.updateOsc(0, 0);
    } else {
        // Update the synth normally when isPlaying is true
        synth.update(rgbValues); //automatic mode (or manual mode while in automatic mode)
    }
  

  if (arePointsPlaying) {
    if (sampleMode === "pixels") {
      //trigger sound when the target pixel's note changes
      if (freqData !== last_freq) {
        let brightness = (rgbValues.r + rgbValues.g + rgbValues.b) / 3; // Calculate brightness as the average of r, g, b
        // Map one channel to a musical note
        let freqData = map(rgbValues.b, 0, 255, 0, 1); // Map to note pitches (should rescale all color data first or refercne a premade b-r image)
        let amplitude = map(brightness, 0, 255, 0, 1); // Map brightness to a range of 0 to 1
        sampler.playSample(freqData, amplitude, "harp");
        last_freq = freqData;
      }
    } else if (sampleMode === "stars") {
      //trigger sound when a new nearest point is found
      if (ps.nearestPoint && ps.nearestPoint.id !== last_nearest_point_id) {
        sampler.triggerPoints(ps.nearestPoint);
        last_nearest_point_id = ps.nearestPoint.id;
      } else if (!ps.nearestPoint) {
        last_nearest_point_id = -1;
      }
    } else if (sampleMode === "circle") {
      //trigger sound when a new point enters the circle
    if (ps.newNearestNeighbours && ps.newNearestNeighbours.length > 0) {
      let pointsToTrigger = ps.newNearestNeighbours.slice(0, 8); // Limit to at most 5 points
      sampler.triggerPoints(pointsToTrigger);
    }
    }
  }
  //////////////////////////DIAGNOSTICS//////////////////////////////////////////
  // Display the frame rate
  //resetMatrix(); //undo the transformations

  // draw the triger circle in white
  noFill();
  stroke(255);
  strokeWeight(2);
  ellipse(range / 2, range / 2, 2 * 50, 2 * 50);
  stroke(0);
  strokeWeight(1);

  if (showPixelInfo) {
    // Display the color of the RGB values as a square
    fill(rgbValues.r, rgbValues.g, rgbValues.b);
    rect(10, height - 80, 40, 40);
    fill(255);
    text(
      `RGB: (${rgbValues.r},${rgbValues.g},${rgbValues.b})`,
      60,
      height - 40
    );

    // Display the target point coordinates
    fill(255);
    textSize(16);
    text(
      `Target Pixel: (${target_point[0].toFixed(2)}, ${target_point[1].toFixed(
        2
      )})`,
      60,
      height - 65
    );
    //text(`imageX, imageY: (${imageX.toFixed(2)}, ${imageY.toFixed(2)})`, 10, height - 110);

    // Display the color of the nearest point
    if (ps.nearestPoint) {
      let point_color = ps.nearestPoint.color;
      fill(point_color.r, point_color.g, point_color.b);
      rect(10, height - 170, 40, 40);
      text(
        `Nearest Point Color: R=${point_color.r}, G=${point_color.g}, B=${point_color.b}`,
        60,
        height - 150
      );
    }

    // if (frameCount % 10 === 0) {
    //     current_fr = frameRate().toFixed(0);
    // }
  }
  // if (mouseIsPressed) {
  //     fill(0, 255, 0); // Green color when playing
  //     text("Synth is playing", 10, 20);
  // } else {
  //     fill(255, 0, 0); // Red color when stopped
  //     text("Synth is stopped", 10, 20);
  // }
  
}

function mousePressed() {
  // Example: Play a specific audio buffer when the mouse is pressed with a random volume
  const randomNote = Math.floor(Math.random() * (midiMax - midiMin)) + midiMin; // Random number between 48 and 96
  const randomVolume = Math.random(); // Random volume between 0.0 and 1.0
  //console.log('mouse pressed');
  sampler.playAudio(`harp_${randomNote}`, 0); // Needed to start audio context for Safari sometimes????

  //   if (!synth.isPlaying) {
  //         synth.start(); // Start the synth
  //         //isPlaying = true; // Update the play state
  //     }
}

// function mousePressed() {
//     if (!synth.isPlaying) {
//         synth.start(); // Start the synth
//         //isPlaying = true; // Update the play state
//     }
// }

// function mouseReleased() {
//     if (synth.isPlaying) {
//         synth.stop(); // Stop the synth
//         //isPlaying = false; // Update the play state
//     }
// }


// let mouseMoveTimeout; // Timeout to detect when the mouse stops moving

// function mouseMoved() {
//     if (!isPlaying) {
//         if (!synth.isPlaying) {
//             synth.start(); // Start the synth
//         }
    
//         // Clear any existing timeout to stop the synth
//         clearTimeout(mouseMoveTimeout);
    
//         // Set a timeout to stop the synth if the mouse stops moving
//         mouseMoveTimeout = setTimeout(() => {
//             if (synth.isPlaying) {
//                 synth.stop(); // Stop the synth
//             }
//         }, 200); // Stop the synth after 200ms of no mouse movement
//     }
    
// }