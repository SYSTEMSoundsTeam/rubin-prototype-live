/////////////////////////////////////

const canvas_size = 1000; // canvas size

let target_point = [0, 0]; // Target point coordinates
let target_pixel = [0, 0];
let points; //master array of all points
let point_size_scale = 20; //slacing factor for size of points
const n_frames_subset = 60; // Number of frames between making subset tree
let target_radius = 40; // Radius of the target circle in screen pixels
const subset_radius = 200; // Radius of the subset circle in screen pixels

let noiseOffset = Math.random() * 1000;
let speed = 0.5; // Constant speed for the target point
const noiseScale = 0.001; // Scale for Perlin noise

let directionX = 1;
let directionY = 1;

let bgImage;

let isPlaying = false; // Variable to control play/pause state
let prevMouseX, prevMouseY;
let average_n = 5; // Default size of the averaging window

let synth; //synth object for pixels
let audioContext;
let sampler; //sampler object for triggering audio
let ps; //point searcher

let midiMin = 48;
let midiMax = 84;
let start_note = 60;
let instruments = ["harp", "piano", "guitar"]; //instruemtns with premade samples

let audioBuffers = {}; // Object to store multiple audio buffers

let imageScale = 1; // Default scale factor (1 = original size, 1 screen pixel = 1 image pixel)
let dot_size = 5 * imageScale; //size for plotting points (for testing)
let point_data; //point data read from file
let image_filename = "picture_10_15_v21_cee_2440"; //image and data filename
let last_nearest_point_id = -1; //only used for 'nearest'
let last_freq = -1;

let sampleMode = "circle"; // 'pixels' or 'nearest' or 'circle'
let showPoints = false; // Whether to show the points or not
let showPixelInfo = false; // Whether to show the pixel info or not
let isPixelPlaying = true;
let arePointsPlaying = true;

let star_img;
let rubin_circle_full;
let rubin_circle_empty;
let hue_offset = 300;

let currentImage;
function preload() {
  bgImage = loadImage("./assets/" + image_filename + ".jpg"); // Load the background image
  point_data = loadJSON("./data/" + image_filename + "_peaks.json"); //JSON data of point positions, sizes, and colors
  star_img = loadImage("./assets/rubin-star.png"); // Load the star image
  rubin_circle_full = loadImage("./assets/rubin-circle-full.png"); // Load the full circle image
  rubin_circle_empty = loadImage("./assets/rubin-circle-empty.png"); // Load the empty circle image

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

  const canvas = createCanvas(canvas_size, canvas_size); // Create a canvas
  canvas.parent("canvas-container"); // Attach the canvas to the HTML element with id 'canvas-container'
  background(255);

  // Initialize currentImage based on dropdown value
  const imageSelect = document.getElementById("imageSelection");
  currentImage = imageSelect.value;

  bgImage.loadPixels(); // Load the pixel data of the background image
  target_point = [
    Math.floor(Math.random() * bgImage.width),
    Math.floor(Math.random() * bgImage.height),
  ]; // Random initial target point
  target_pixel = image2canvas(target_point[0], target_point[1]); //should always be center of canvas!

  points = makePoints(point_data);
  ps = new PointSearcher(points);
  ps.makeSubset(target_pixel, (radius = 200)); //update subset points (can pass a radius)

  // Create a pixel synth and sampler
  synth = new PixelSynth("sine");
  synth.start();
  sampler = new SamplePlayer();
}

function updateImageSelection(value) {
  currentImage = value;
}

function draw() {
  background(0);
  drawImage();

  //////////////////FINDING NEIGHBOURS///////////////////////////////////////////////////////
  if (frameCount % n_frames_subset === 0) {
    ps.makeSubset(target_point, (radius = subset_radius / imageScale)); //update subset points (can pass a radius)
  }
  ps.findNeighbours(target_point, (radius = target_radius / imageScale)); //find nearest neighbours from within subset (can pass a radius)

  // Update and draw animations
  if (arePointsPlaying) {
    ps.updateAndDrawAnimations();
  }

  /////////////////////////MOVING VIEWER///////////////////////////////////////////
  // The speed is updated by the HTML slider's oninput event
  updateTargetPoint(); //based on Perlin random walk (auto) or mouse dragging (manual)

  /////////////////////SONIFICATION////////////////////////////////////////////////
  // Retrieve the RGB values of the pixel in the background image at the target point
  let rgbValues = getAverageRGBValues(
    target_point[0],
    target_point[1],
    average_n,
    (useWeighting = true)
  );

  if (isPixelPlaying) {
    if (!isPlaying && mouseIsPressed) {
      //manual mode
      // Update the synth while the mouse is being dragged
      synth.update(onCanvas() ? rgbValues : { r: 0, g: 0, b: 0 });
    } else if (!isPlaying && !mouseIsPressed && !areArrowsPressed()) {
      // Stop the synth or perform some other action
      synth.updateOsc(0, 0);
    } else {
      // Update the synth normally when isPlaying is true
      synth.update(rgbValues); //automatic mode (or manual mode while in automatic mode)
    }
  } else {
    synth.updateOsc(0, 0);
  }

  // if (isPixelPlaying) {
  //   if (isPlaying || mouseIsPressed) {
  //     synth.update(isPlaying || onCanvas() ? rgbValues : { r: 0, g: 0, b: 0 });
  //       } else if (!areArrowsPressed()) {
  //         synth.updateOsc(0, 0);}
  //     } else {
  //       synth.updateOsc(0, 0);
  // }

  if (arePointsPlaying) {
    if (sampleMode === "pixels") {
      //trigger sound when the target pixel's note changes
      let freqData = map(rgbValues.b, 0, 255, 0, 1); // Map to note pitches (should rescale all color data first or refercne a premade b-r image)

      if (freqData !== last_freq) {
        let brightness = (rgbValues.r + rgbValues.g + rgbValues.b) / 3; // Calculate brightness as the average of r, g, b
        // Map one channel to a musical note
        let amplitude = map(brightness, 0, 255, 0, 1); // Map brightness to a range of 0 to 1
        sampler.playSample(freqData, amplitude, "harp");
        last_freq = freqData;
      }
    } else if (sampleMode === "nearest") {
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
  // draw the trigger circle in white

  let minBrightness = 50; // Minimum brightness value (0–255)
  let currentBrightness = (rgbValues.r + rgbValues.g + rgbValues.b) / 3;

  let r, g, b;
  let brightness_boost = 1.2;
  let brightness_scaleFactor = 1; // Default scale factor (1 = no scaling)
  // If the brightness is below the minimum, scale the RGB values
  if (currentBrightness < minBrightness) {
    brightness_scaleFactor = minBrightness / currentBrightness;
  }
  r = min(rgbValues.r * brightness_scaleFactor * brightness_boost, 255);
  g = min(rgbValues.g * brightness_scaleFactor * brightness_boost, 255);
  b = min(rgbValues.b * brightness_scaleFactor * brightness_boost, 255);

  // Only draw the circle when the star image is selected
  if (currentImage === "star") {
    noFill();
    stroke(r, g, b, 200);
    strokeWeight(2);
    ellipse(
      target_pixel[0],
      target_pixel[1],
      2 * target_radius,
      2 * target_radius
    );
    stroke(0);
    strokeWeight(1);
  }

  // Calculate the current brightness (average of RGB values)
  if (currentImage === "star" || currentImage === "rubin-star") {
    tint(r, g, b, 200); // Apply the tint with adjusted brightness
  }

  let scaleFactor = 0.5; // Example scale factor (50% of original size)
  let img;
  let img2;

  switch (currentImage) {
    case "star":
      img = star_img;
      break;
    case "full":
      img = rubin_circle_full;
      break;
    case "empty":
      img = rubin_circle_empty;
      break;
    case "rubin-star":
      img = star_img;
      img2 = rubin_circle_empty;
      break;
  }
  image(
    img,
    target_pixel[0] - (img.width * scaleFactor) / 2,
    target_pixel[1] - (img.height * scaleFactor) / 2,
    img.width * scaleFactor,
    img.height * scaleFactor
  );
  noTint();
  if (currentImage === "rubin-star") {
    image(
      img2,
      target_pixel[0] - (img2.width * scaleFactor) / 2,
      target_pixel[1] - (img2.height * scaleFactor) / 2,
      img2.width * scaleFactor,
      img2.height * scaleFactor
    );
  }

  if (showPoints) {
    drawPoints(points, { r: 0, g: 0, b: 255 }); // Plot subset points in yellow
    drawPoints(ps.subsetPoints, { r: 255, g: 255, b: 0 }); // Plot subset points in yellow
    drawPoints(ps.nearestNeighbours, { r: 255, g: 165, b: 0 }); // Plot nearest neighbors in orange
    drawPoints([ps.nearestPoint], { r: 255, g: 0, b: 0 }); // Draw the nearest point in red
  }

  if (showPixelInfo) {
    // Display the color of the RGB values as a square
    fill(rgbValues.r, rgbValues.g, rgbValues.b);
    rect(10, height - 80, 40, 40);
    fill(255);
    text(
      `RGB: (${rgbValues.r},${rgbValues.g},${rgbValues.b})`,
      60,
      height - 45
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
    text(
      `Hue: ${rgbToHue(rgbValues.r, rgbValues.g, rgbValues.b).toFixed(
        2
      )}, offset: ${hue_offset.toFixed(2)}`,
      60,
      height - 25
    );

    //text(`imageX, imageY: (${imageX.toFixed(2)}, ${imageY.toFixed(2)})`, 10, height - 110);

    // Display the color of the nearest point
    if (ps.nearestPoint) {
      let point_color = ps.nearestPoint.color;
      fill(point_color.r, point_color.g, point_color.b);
      rect(10, height - 170, 40, 40);
      text(
        `Nearest Point: (${ps.nearestPoint.point[0].toFixed(
          2
        )}, ${ps.nearestPoint.point[1].toFixed(2)})`,
        60,
        height - 157
      );

      text(
        `RGB: (${point_color.r}, ${point_color.g}, ${point_color.b})`,
        60,
        height - 135
      );
    }
  }
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
