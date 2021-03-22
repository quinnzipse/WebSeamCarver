// This code assumes a RGBA colorspace. However, I'm not sure if that's fair to assume in an HTMLCanvasElement.
import NumberFormat = Intl.NumberFormat;

const NUM_BANDS = 4;
let seams = [];
let _maxEnergy = -1;

/**
 * Crops the image by a certain amount trying to preserve objects.
 *
 * @param image_data Image to crop.
 * @param width Amount to crop by.
 */
export function cropXBy(image_data: ImageData, width: number) {
  const MAX_STEPS = 50;

  seams = [];
  let edges, energyMap;
  let progress = 0;
  let step = Math.ceil(width / MAX_STEPS);
  for (let i = 0; i < width; i++) {

    if (i % step === 0) {
      let process_in_percent = (progress * 100).toFixed(0);
      console.log("Progress:",  process_in_percent + "%");
      progress += step / width;
    }

    edges = detectEdges(image_data);
    energyMap = getEnergyMap(edges);
    let seam = findSeam(energyMap);

    seams.push(seam);

    image_data = removeSeam(image_data, seam);
  }

  return image_data;
}

/**
 * Extends the image in width by a specified amount.
 *
 * @param image_data Image to stretch.
 * @param i Amount to expand the width (in pixels).
 * @return Stretched image.
 */
function extendXBy(image_data: ImageData, i: number) {
  let output: ImageData = copyImage(image_data), edges, energyMap;
  seams = [];

  while (i > 0) {

    edges = detectEdges(image_data);
    energyMap = getEnergyMap(edges);
    let seam = findSeam(energyMap);

    drawSeam(image_data, seam);
    seams.push(seam);

    i--;
  }

  output = addSeams(output, seams);

  return output;
}

/**
 * Deep copies an image and returns the new ImageData.
 * @param image_data Image to copy.
 * @return Copy of image.
 */
function copyImage(image_data: ImageData) {
  let output = new ImageData(image_data.width, image_data.height);

  output.data.set(image_data.data);

  return output;
}

/**
 * Sets the image to only the brightness band in hsv.
 * @param image_data ImageData of the image you'd like to make greyscale.
 */
function brightExtract(image_data: ImageData) {
  // Create the destination image.
  let output = new ImageData(image_data.width, image_data.height);

  // For each pixel...
  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < image_data.width; x++) {
      // Extract the brightness band.
      let brightness = Math.floor(getHSBFromPackedRGB(getPixel(image_data, x, y))[2] * 255);
      setGreyPixel(output, x, y, brightness);
    }
  }

  return output;
}

/**
 * Detects edges and returns the output imageData
 *
 * @param image_data
 * @return output image data
 */
function detectEdges(image_data: ImageData) {
  let output = new ImageData(image_data.width, image_data.height);

  // For each pixel...
  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < image_data.width; x++) {

      // Get the right and left brightnesses.
      let right = getHSBFromPackedRGB(getPixel(image_data, x + 1, y));
      let left = getHSBFromPackedRGB(getPixel(image_data, x - 1, y));

      // Get the top and bottom brightnesses.
      let top = getHSBFromPackedRGB(getPixel(image_data, x, y - 1));
      let bottom = getHSBFromPackedRGB(getPixel(image_data, x, y + 1));

      // b is 0...1 so I will scale it to 8 bits.
      let xDiff = Math.abs(left[2] * 255 - right[2] * 255);
      let yDiff = Math.abs(top[2] * 255 - bottom[2] * 255);
      let xHueDiff = (Math.abs((left[0] - 180)) - Math.abs(right[0] - 180)) ** 2;
      let yHueDiff = (Math.abs((top[0] - 180)) - Math.abs(bottom[0] - 180)) ** 2;

      // Combine these two to get the final edge value.
      let bright_strength = Math.floor(Math.sqrt(xDiff ** 2 + yDiff ** 2));
      let hue_strength = Math.floor(Math.sqrt(xHueDiff + yHueDiff));

      // set that pixel to the output image data.
      setGreyPixel(output, x, y, bright_strength + hue_strength * .01);
      setGreyPixel(output, x, y, bright_strength);

    }
  }

  return output;
}

/**
 * Converts a packed representation of a RGB value into an array of HSB values.
 * @param packedRGB 24-bit value containing 8 bits for each r, g, and b band.
 * @return an array of three numbers representing hue (0-360), saturation (0-1), and brightness (0-1)
 */
function getHSBFromPackedRGB(packedRGB: number) {
  return getHSBFromRGB(packedRGB >> 16 & 0xff, packedRGB >> 8 & 0xff, packedRGB & 0xff);
}

/**
 * Converts an r, g, and b into their corresponding hsb values.
 * @param r 8-bit red value
 * @param g 8-bit green value
 * @param b 8-bit blue value
 * @return an array of three numbers representing hue (0-360), saturation (0-1), and brightness (0-1)
 */
function getHSBFromRGB(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  let cMax = Math.max(r, g, b), cMin = Math.min(r, g, b),
    diff = cMax - cMin, hsb = [0, 0, 0];

  // Hue calculation
  if (cMax !== 0 || cMin !== 0) {
    switch (cMax) {
      case r:
        hsb[0] = (60 * ((g - b) / diff) + 360) % 360;
        break;
      case g:
        hsb[0] = (60 * ((b - r) / diff) + 120) % 360;
        break;
      case b:
        hsb[0] = (60 * ((r - g) / diff) + 240) % 360;
        break;
    }
  }

  // Saturation Calculation
  if (cMax !== 0) {
    hsb[1] = (diff / cMax);
  }

  // brightness calculation
  hsb[2] = cMax;

  return hsb;
}

function getBand(image_data: ImageData, x: number, y: number, b: number) {
  // console.assert(x < image_data.width && x >= 0, "index out of bounds!");
  // console.assert(y < image_data.height && y >= 0, "index out of bounds!");
  // console.assert(b < NUM_BANDS && b >= 0, "index out of bounds!");

  return image_data.data[(x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b];
}

/**
 * Get's the packed RGB value from a specific from a zero-padded x, y.
 *
 * @param image_data Image Data to get the pixel from.
 * @param x x-coordinate
 * @param y y-coordinate
 * @return packed rgb value. Excludes alpha channel.
 */
function getPixel(image_data: ImageData, x: number, y: number) {
  if (!(x < image_data.width && x >= 0)
    || !(y < image_data.height && y >= 0)) {
    // console.warn("Index out of bounds! Zero Padding!");
    return 0;
  }

  let index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y);

  return image_data.data[index] << 16 | image_data.data[index + 1] << 8 | image_data.data[index + 2];
}

/**
 * Sets the greyscale value to the location in the image specified.
 *
 * @param image_data Image data to set greyscale value of.
 * @param x
 * @param y
 * @param grey_value clamped 8-bit grey value
 */
function setGreyPixel(image_data: ImageData, x: number, y: number, grey_value: number) {

  // console.assert(image_data.width > x && x >= 0 &&
  //   y >= 0 && image_data.height > y, "Index out of bounds!");

  // Set the values. Make sure alpha stays 255.
  setBand(image_data, x, y, 0, grey_value);
  setBand(image_data, x, y, 1, grey_value);
  setBand(image_data, x, y, 2, grey_value);
  setBand(image_data, x, y, 3, 255);
}

/**
 * Sets a specific band R, G, B, or Alpha of the image at a specific point.
 *
 * @param image_data Image Data of image to modify.
 * @param x x-coordinate
 * @param y y-coordinate
 * @param b band to modify
 * @param sample clamped, 8-bit value.
 */
function setBand(image_data: ImageData, x: number, y: number, b: number, sample: number) {
  // console.assert(x < image_data.width && x >= 0, "Pixel not set! Index out of bounds!");
  // console.assert(y < image_data.height && y >= 0, "Pixel not set! Index out of bounds!");
  // console.assert(b < NUM_BANDS && b >= 0, "Pixel not set! Index out of bounds!");
  // console.assert(sample >= 0 && sample <= 255, "Sample value out of bounds! " + sample);

  let index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b;
  image_data.data[index] = sample;
}

/**
 * Sets an 24-bit RGB pixel of an image.
 * @param image_data Image to set pixel in.
 * @param x x-coordinate.
 * @param y y-coordinate.
 * @param pixel 24bit RGB packed value.
 */
function setPixel(image_data: ImageData, x: number, y: number, pixel: number) {
  // console.assert(x < image_data.width && x >= 0, "Pixel not set! Index out of bounds!");
  // console.assert(y < image_data.height && y >= 0, "Pixel not set! Index out of bounds!");

  let index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y);

  image_data.data[index] = (pixel >> 16) & 0xff;
  image_data.data[index + 1] = (pixel >> 8) & 0xff;
  image_data.data[index + 2] = pixel & 0xff;
  image_data.data[index + 3] = 255;
}

/**
 * Given a collection of edges from detectEdges, create an edge map.
 *
 * @param image_data ImageData of edges
 * @return edgeMap
 */
function getEnergyMap(image_data: ImageData) {
  let energyArray = [];

  // Initialize the bottom row.
  let energyX = [];
  for (let x = 0; x < image_data.width; x++) {
    let energy: number = getBand(image_data, x, image_data.height - 1, 0);
    energyX.push(energy);
    _maxEnergy = Math.max(_maxEnergy, energy);
  }
  energyArray.push(energyX);

  for (let y = image_data.height - 2; y >= 0; y--) {
    energyX = [];
    for (let x = 0; x < image_data.width; x++) {

      let bestPath: number = findLowestEnergy(energyArray, x);
      let energy: number = getBand(image_data, x, y, 0);

      energyX.push(energy + bestPath);
      _maxEnergy = Math.max(_maxEnergy, energy + bestPath);
    }

    energyArray.unshift(energyX);
  }

  return energyArray;
}

/**
 * Finds the lowest, connected energy value from the top of the energy map.
 * Useful when building an energy map.
 *
 * @param energy_map map used to calculate lowest energy.
 * @param x x-coordinate to stay connected to.
 * @return lowest energy that is connected to x and is in row y.
 */
function findLowestEnergy(energy_map: number[][], x: number) {
  let mid = energy_map[0][x], right, left;

  if (x - 1 < 0) {
    left = Number.MAX_VALUE;
  } else {
    left = energy_map[0][x - 1];
  }

  if (x + 1 == energy_map[0].length) {
    right = Number.MAX_VALUE;
  } else {
    right = energy_map[0][x + 1];
  }

  return Math.min(mid, right, left);
}

/**
 * Creates a visual for a given energy map.
 *
 * @param energy_map the map to generate an image for.
 */
function generateEnergyMapImg(energy_map: number[][]) {
  let output: ImageData = new ImageData(energy_map[0].length, energy_map.length);

  for (let y = 0; y < energy_map.length; y++) {
    for (let x = 0; x < energy_map[0].length; x++) {
      setGreyPixel(output, x, y, energy_map[y][x] / (_maxEnergy / 255));
    }
  }

  return output;
}

/**
 * Finds a connected column of pixels with the least amount of energy.
 *
 * @param energy_map energy map to generate seam from.
 * @return lowest energy, connected column through the image.
 */
function findSeam(energy_map: number[][]) {
  let seam: number[] = [];

  let bestX: number[] = [];
  bestX.push(0);

  for (let x = 1; x < energy_map[0].length; x++) {
    let diff = energy_map[0][bestX[0]] - energy_map[0][x];

    if (diff > 0) {
      // new min, set a new array.
      bestX = [];
      bestX.push(x);

    } else if (diff === 0) {
      // add to the existing array.
      bestX.push(x);
    }

  }

  // Randomly pick the starting point from the smallest elements.
  let random_index = Math.floor(Math.random() * bestX.length);
  seam.push(bestX[random_index]);

  for (let y = 1; y < energy_map.length; y++) {
    seam.push(findNextX(energy_map, seam[y - 1], y));
  }

  return seam;
}

/**
 * Calculates the lowest energy, connected x-coordinate to be included in a seam.
 *
 * @param energy_map energy values to use in calculation.
 * @param prevX previous x-coordinate to maintain connectedness.
 * @param y y-coordinate to search in energy_map.
 * @return connected x-coordinate with least amount of energy.
 */
function findNextX(energy_map: number[][], prevX: number, y: number) {
  // get each number to the left, right, and middle of the last.
  let left: number = energy_map[y][prevX - 1],
    mid: number = energy_map[y][prevX],
    right: number = energy_map[y][prevX + 1];

  // check the bounds.
  if (isNaN(left)) left = Number.MAX_VALUE;
  if (isNaN(right)) right = Number.MAX_VALUE;

  // get the min.
  let min = Math.min(mid, left, right);

  // push the min index into the seams array.
  switch (min) {
    case left:
      return prevX - 1;
    case right:
      return prevX + 1;
    case mid:
      return prevX;
  }
}

/**
 * Draw a seam onto an image.
 *
 * @param image_data The image to be drawn on.
 * @param seam The seam to draw.
 */
function drawSeam(image_data: ImageData, seam: number[]) {
  for (let y = 0; y < image_data.height; y++) {
    setGreyPixel(image_data, seam[y], y, 255);
  }
}

/**
 * Draw multiple seams onto an image. Does not account for offsetting.
 *
 * @param image_data The image to be drawn on.
 * @param seams The seams to display
 */
function drawSeams(image_data: ImageData, seams: number[][]) {
  for (let seam of seams) {
    for (let y = 0; y < image_data.height; y++) {
      setGreyPixel(image_data, seam[y], y, 255);
    }
  }
}

/**
 * Removes the seam from the image.
 *
 * @param image_data Image to remove seam from.
 * @param seam Array of x-coordinates to remove.
 * @return image_data with seam removed.
 */
function removeSeam(image_data: ImageData, seam: number[]) {
  let output = new ImageData(image_data.width - 1, image_data.height);

  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < output.width; x++) {
      let offset = x >= seam[y] ? 1 : 0;
      let pixel = getPixel(image_data, x + offset, y)
      setPixel(output, x, y, pixel);
    }
  }

  return output;
}

/**
 * Adds a column to the image_data of the image, averaging the pixels to the left and right.
 *
 * @param image_data Image to add a seam to.
 * @param seam An array of x-coordinates to add pixels to in image.
 * @return Modified image.
 */
function addSeam(image_data: ImageData, seam: number[]) {
  let output = new ImageData(image_data.width + 1, image_data.height);

  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < output.width; x++) {
      let pixel = 0, offset = x > seam[y] ? 1 : 0;

      if (x === seam[y]) {

        interpolatePixel(image_data, x, y);

      } else {
        pixel = getPixel(image_data, x - offset, y);
      }

      setPixel(output, x, y, pixel);
    }
  }

  return output;
}

/**
 * Averages each band of the pixel to the left and right of the designated x,y.
 *
 * @param image_data Image to interpolate from.
 * @param x x-coordinate to interpolate.
 * @param y y-coordinate to interpolate.
 * @return new pixel that belongs at x,y of image_data.
 */
function interpolatePixel(image_data: ImageData, x: number, y: number) {
  // Average each band!
  let pixel = Math.floor((getBand(image_data, x - 1, y, 0)
    + getBand(image_data, x + 1, y, 0)) / 2) << 16;
  pixel |= Math.floor((getBand(image_data, x - 1, y, 1)
    + getBand(image_data, x + 1, y, 1)) / 2) << 8;
  pixel |= Math.floor((getBand(image_data, x - 1, y, 2)
    + getBand(image_data, x + 1, y, 2)) / 2);

  return pixel;
}

/**
 * Adds a new column of pixels to the image at each seam.
 *
 * @see addSeam
 * @param image_data Image to expand.
 * @param seams Array of seams to stretch the image at.
 * @return Modified image.
 */
function addSeams(image_data: ImageData, seams: number[][]) {
  let output = new ImageData(image_data.width + seams.length, image_data.height);

  // TODO: Need to duplicate image_data to output!!

  for (let y = 0; y < image_data.height; y++) {
    let xPos = [];
    for (let x = 0; x < seams.length; x++) {
      xPos.push(seams[x][y]);
    }
    xPos.sort((n1, n2) => n1 - n2);

    console.log(xPos);

    let seamIndex = 0;
    for (let x = 0; x < image_data.width; x++) {
      while (seamIndex < xPos.length && xPos[seamIndex] === x) {
        setPixel(output, x + seamIndex, y, interpolatePixel(image_data, x, y));
        seamIndex++;
      }

      setPixel(output, x + seamIndex, y, getPixel(image_data, x, y));
    }
  }

  return output;
}
