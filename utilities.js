function generateRandomPoints(N, x_range, y_range) {
  const points = [];
  for (let i = 0; i < N; i++) {
    let x = Math.floor(Math.random() * x_range);
    let y = Math.floor(Math.random() * y_range);
    let size = Math.floor(Math.random() * dot_size) + 2;
    // let imageX = x / width * bgImage.width;
    // let imageY = y / height * bgImage.height;

    let color = getAverageRGBValues(x, y, average_n);
    points.push({ point: [x, y], id: i, color: color, size: size });
  }
  return points;
}

function makePoints(point_data) {
  const points = [];
  for (let i = 0; i < point_data.x.length; i++) {
    let pd = point_data;
    points.push({
      point: [pd.x[i], pd.y[i]],
      id: pd.id[i],
      color_br: pd.color_br[i],
      color: { r: pd.color_r[i], g: pd.color_g[i], b: pd.color_b[i] },
      size: pd.size_norm[i] * point_size_scale,
      type: pd.type[i],
    });
  }
  return points;
}

function drawPoints(points, color) {
  if (points[0] && points.length > 0) {
    noFill();
    stroke(color.r, color.g, color.b);
    for (let point of points) {
      let point_i = image2canvas(point.point[0], point.point[1]);
      ellipse(
        point_i[0],
        point_i[1],
        2 * point.size * dot_size,
        2 * point.size * dot_size
      );
    }
  }
}

function onCanvas() {
  return (
    mouseIsPressed &&
    mouseX >= 0 &&
    mouseX <= width &&
    mouseY >= 0 &&
    mouseY <= height
  );
}

function areArrowsPressed() {
  return (
    keyIsDown(LEFT_ARROW) ||
    keyIsDown(RIGHT_ARROW) ||
    keyIsDown(UP_ARROW) ||
    keyIsDown(DOWN_ARROW)
  );
}

function keyPressed(event) {
  if (key === " ") {
    togglePlayPause();
    event.preventDefault(); // Prevent default behavior
  }
  if (areArrowsPressed()) {
    event.preventDefault(); // Prevent default scrolling behavior
  }
}

function keyReleased(event) {
  if (areArrowsPressed()) {
    event.preventDefault(); // Prevent default scrolling behavior
  }
}

function updateTargetPoint() {
  // Handle mouse interaction regardless of isPlaying
  if (onCanvas()) {
    if (prevMouseX !== undefined && prevMouseY !== undefined) {
      let dx = mouseX - prevMouseX;
      let dy = mouseY - prevMouseY;
      target_point[0] -= dx;
      target_point[1] -= dy;
    }
    prevMouseX = mouseX;
    prevMouseY = mouseY;
  } else {
    prevMouseX = undefined;
    prevMouseY = undefined;

    if (isPlaying && !areArrowsPressed()) {
      // Perlin noise for the target point direction
      const angle = map(noise(noiseOffset), 0, 1, -PI, PI);
      let dx = speed * cos(angle);
      let dy = speed * sin(angle);

      // Reverse direction if the target point touches a boundary
      if (
        target_point[0] + directionX * dx < 0 ||
        target_point[0] + directionX * dx > bgImage.width
      ) {
        directionX *= -1; // Reverse direction in X
      }
      if (
        target_point[1] + directionY * dy < 0 ||
        target_point[1] + directionY * dy > bgImage.height
      ) {
        directionY *= -1; // Reverse direction in Y
      }

      target_point[0] += directionX * dx;
      target_point[1] += directionY * dy;

      // Update noise offset
      noiseOffset += noiseScale;

      // // Ensure the target point stays within the image
      // target_point[0] = constrain(target_point[0], 0, bgImage.width);
      // target_point[1] = constrain(target_point[1], 0, bgImage.height);
    }
  }
  // Handle keyboard interactions all the time
  let dx = 0;
  let dy = 0;

  if (keyIsDown(LEFT_ARROW)) dx -= 1;
  if (keyIsDown(RIGHT_ARROW)) dx += 1;
  if (keyIsDown(UP_ARROW)) dy -= 1;
  if (keyIsDown(DOWN_ARROW)) dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx /= Math.SQRT2; // Normalize diagonal movement
    dy /= Math.SQRT2;
  }

  target_point[0] += dx * directionX * speed;
  target_point[1] += dy * directionY * speed;

  // Constrain the target_pixel to stay within the canvas
  target_point[0] = constrain(target_point[0], 0, bgImage.width);
  target_point[1] = constrain(target_point[1], 0, bgImage.height);
}

function updateAveragingWindow() {
  let value = parseInt(this.value());
  if (!isNaN(value) && value > 0) {
    average_n = value;
  }
}

function updateAveragingWindowFromDropdown(value) {
  let numValue = parseInt(value);
  if (!isNaN(numValue) && numValue > 0) {
    average_n = numValue;
  }
}

function updateTargetRadiusDropdown(value) {
  let numValue = parseInt(value);
  if (!isNaN(numValue) && numValue > 0) {
    target_radius = numValue;
  }
}

function updateSpeed(value) {
  let numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue > 0) {
    speed = numValue;
  }
}

function getAverageRGBValues(x, y, n, useWeighting = true) {
  let r = 0,
    g = 0,
    b = 0;
  let totalWeight = 0;
  let count = 0;

  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      let px = floor(x + i);
      let py = floor(y + j);

      if (px >= 0 && px < bgImage.width && py >= 0 && py < bgImage.height) {
        let index = (py * bgImage.width + px) * 4;
        let red = bgImage.pixels[index];
        let green = bgImage.pixels[index + 1];
        let blue = bgImage.pixels[index + 2];

        if (useWeighting) {
          // Calculate brightness as the sum of R, G, and B
          let brightness = red + green + blue;

          // Accumulate weighted RGB values
          r += red * brightness;
          g += green * brightness;
          b += blue * brightness;

          // Accumulate total weight
          totalWeight += brightness;
        } else {
          // Accumulate unweighted RGB values
          r += red;
          g += green;
          b += blue;

          // Increment count for unweighted average
          count++;
        }
      }
    }
  }

  if (useWeighting) {
    // Normalize the weighted sum by the total weight
    if (totalWeight > 0) {
      r = floor(r / totalWeight);
      g = floor(g / totalWeight);
      b = floor(b / totalWeight);
    } else {
      r = g = b = 0; // Default to black if no valid pixels
    }
  } else {
    // Normalize the unweighted sum by the count
    if (count > 0) {
      r = floor(r / count);
      g = floor(g / count);
      b = floor(b / count);
    } else {
      r = g = b = 0; // Default to black if no valid pixels
    }
  }

  return { r, g, b };
}

function rgbToHue(r, g, b) {
  // Normalize RGB values to the range 0–1
  r /= 255;
  g /= 255;
  b /= 255;

  // Find the maximum and minimum values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;

  // Calculate Hue based on the max channel
  if (delta === 0) {
      hue = 0; // Grayscale
  } else if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
      hue = 60 * (((b - r) / delta) + 2);
  } else if (max === b) {
      hue = 60 * (((r - g) / delta) + 4);
  }

  // Ensure Hue is in the range 0–360
  if (hue < 0) {
      hue += 360;
  }

  return hue;
}

function mapHueToRange(hue, offset = 300) {
  // Add the offset and wrap the hue to the range [0, 360)
  let shiftedHue = (hue - offset + 360) % 360;

  // Normalize the shifted hue to the range [0, 1]
  return shiftedHue / 360;
}

function drawImage() {
  let sourceX = target_point[0] - width / 2 / imageScale;
  let sourceY = target_point[1] - height / 2 / imageScale;
  let sourceWidth = width / imageScale;
  let sourceHeight = height / imageScale;

  // Adjust the source rectangle if it goes out of bounds
  let adjustedSourceX = max(0, sourceX); // Ensure sourceX is not negative
  let adjustedSourceY = max(0, sourceY); // Ensure sourceY is not negative
  let adjustedSourceWidth = sourceWidth;
  let adjustedSourceHeight = sourceHeight;

  // Adjust the destination rectangle to account for out-of-bounds source
  let destX = 0;
  let destY = 0;
  let destWidth = width;
  let destHeight = height;

  if (sourceX < 0) {
    destX = -sourceX * imageScale; // Shift the destination rectangle
    adjustedSourceWidth += sourceX; // Reduce the source width
  }
  if (sourceY < 0) {
    destY = -sourceY * imageScale; // Shift the destination rectangle
    adjustedSourceHeight += sourceY; // Reduce the source height
  }

  // Ensure the source rectangle does not exceed the image bounds
  adjustedSourceWidth = min(
    adjustedSourceWidth,
    bgImage.width - adjustedSourceX
  );
  adjustedSourceHeight = min(
    adjustedSourceHeight,
    bgImage.height - adjustedSourceY
  );

  // Draw the portion of the image, scaled
  // Adjust the destination width and height to match the adjusted source dimensions
  destWidth = adjustedSourceWidth * imageScale;
  destHeight = adjustedSourceHeight * imageScale;

  // Draw the portion of the image, scaled
  image(
    bgImage,
    destX,
    destY,
    destWidth,
    destHeight, // Destination rectangle (canvas size)
    adjustedSourceX,
    adjustedSourceY,
    adjustedSourceWidth,
    adjustedSourceHeight // Source rectangle (portion of the image)
  );
}

function image2canvas(imageX, imageY) {
  // Map image coordinates to canvas coordinates
  let canvasX = (imageX - target_point[0]) * imageScale + width / 2;
  let canvasY = (imageY - target_point[1]) * imageScale + height / 2;
  return [canvasX, canvasY];
}

function canvas2image(canvasX, canvasY) {
  // Map canvas coordinates to image coordinates
  let imageX = (canvasX - width / 2) / imageScale + target_point[0];
  let imageY = (canvasY - height / 2) / imageScale + target_point[1];
  return [imageX, imageY];
}
function adjustImageScale(delta) {
  // Adjust imageScale by delta and constrain it to a reasonable range
  imageScale = constrain(imageScale + delta, 0.5, 5); // Min: 0.5, Max: 5
  //console.log(`imageScale: ${imageScale}`);

  dot_size = 5 * imageScale;
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  const playPauseImage = document.getElementById("play-pause-image");
  playPauseImage.src = isPlaying
    ? "./assets/icons/pause-icon.png"
    : "./assets/icons/play-icon.png";
  //updateSynthState();
}

function updateSynthState() {
  if (isPlaying && isPixelPlaying) {
    synth.start();
  } else {
    synth.stop();
  }
}

// Load audio file into a buffer and store it in the audioBuffers object
function loadAudio(name, url) {
  audioContext =
    audioContext || new (window.AudioContext || window.webkitAudioContext)();
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      audioBuffers[name] = buffer; // Store the buffer with a key
      //console.log(`Audio loaded: ${name}`);
    })
    .catch((error) => console.error(`Error loading audio (${name}):`, error));
}

function toggleShowPoints() {
  showPoints = !showPoints;
  const button = document.getElementById("togglePointsButton");
  button.textContent = showPoints ? "Hide Points" : "Show Points";
}

function toggleShowPixelInfo() {
  showPixelInfo = !showPixelInfo;
  const button = document.getElementById("togglePixelInfoButton");
  button.textContent = showPixelInfo ? "Hide Pixel Info" : "Show Pixel Info";
}

function togglePixelPlayer() {
  isPixelPlaying = !isPixelPlaying;
  //isPixelPlaying ? synth.start() : synth.stop();
  const button = document.getElementById("togglePixelPlayer");
  button.textContent = isPixelPlaying
    ? "Turn off Pixel Sound"
    : "Turn on Pixel Sound";
}

function togglePointsPlayer() {
  arePointsPlaying = !arePointsPlaying;
  ps.animations = [];
  const button = document.getElementById("togglePointsPlayer");
  button.textContent = arePointsPlaying
    ? "Turn off Point Sound"
    : "Turn on Point Sound";
}
