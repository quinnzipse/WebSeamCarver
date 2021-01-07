import {ImgUtil} from "./imgUtil";

let canvas = document.getElementById('image') as HTMLCanvasElement,
  canvas2 = document.getElementById('originalImage') as HTMLCanvasElement,
  canvas3 = document.getElementById('edges') as HTMLCanvasElement;

let ctx = canvas.getContext('2d'),
  ctx2 = canvas2.getContext('2d'),
  ctx3 = canvas3.getContext('2d');

let image = new Image();
let seams = [];

image.onload = function () {
  canvas.height = image.height;
  canvas.width = image.width;

  canvas2.height = image.height;
  canvas2.width = image.width;

  canvas3.height = image.height;
  canvas3.width = image.width;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx2.drawImage(image, 0, 0, canvas2.width, canvas2.height);

  let pixel_data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // cropXBy(pixel_data, 50);

  let edge_img = detectEdges(pixel_data);
  ctx3.putImageData(edge_img, 0, 0);

  pixel_data = extendXBy(pixel_data, 240);

  canvas.width = pixel_data.width;

  ctx.putImageData(pixel_data, 0, 0);

  let img2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
  drawSeams(img2, seams);
  ctx2.putImageData(img2, 0, 0);
}

image.crossOrigin = "Anonymous";
image.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg';

/**
 * Crops the image by a certain amount trying to preserve objects.
 *
 * @param image_data Image to crop.
 * @param i Amount to crop by.
 */
function cropXBy(image_data: ImageData, i: number) {
  seams = [];
  let edges, energyMap;
  for (let i = 0; i < i; i++) {

    edges = detectEdges(image_data);
    energyMap = getEnergyMap(edges);
    let seam = findSeam(energyMap);

    seams.push(seam);

    image_data = removeSeam(image_data, seam);
  }
}

/**
 * Extends the image in width by a specified amount.
 *
 * @param image_data Image to stretch.
 * @param i Amount to expand the width (in pixels).
 * @return Stretched image.
 */
function extendXBy(image_data: ImageData, i: number) {
  let output: ImageData = ImgUtil.copyImage(image_data, ctx), edges, energyMap;
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
 * Sets the image to only the brightness band in hsv.
 * @param image_data ImageData of the image you'd like to make greyscale.
 */
function brightExtract(image_data: ImageData) {
  // Create the destination image.
  let output = ctx.createImageData(image_data.width, image_data.height);

  // For each pixel...
  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < image_data.width; x++) {
      // Extract the brightness band.
      let brightness = Math.floor(getHSBFromPackedRGB(ImgUtil.getPixel(image_data, x, y))[2] * 255);
      ImgUtil.setGreyPixel(output, x, y, brightness);
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
  let output = ctx.createImageData(image_data);

  // For each pixel...
  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < image_data.width; x++) {

      // Get the right and left brightnesses.
      let right = getHSBFromPackedRGB(ImgUtil.getPixel(image_data, x + 1, y));
      let left = getHSBFromPackedRGB(ImgUtil.getPixel(image_data, x - 1, y));

      // Get the top and bottom brightnesses.
      let top = getHSBFromPackedRGB(ImgUtil.getPixel(image_data, x, y - 1));
      let bottom = getHSBFromPackedRGB(ImgUtil.getPixel(image_data, x, y + 1));

      // b is 0...1 so I will scale it to 8 bits.
      let xDiff = Math.abs(left[2] * 255 - right[2] * 255);
      let yDiff = Math.abs(top[2] * 255 - bottom[2] * 255);
      let xHueDiff = (Math.abs((left[0] - 180)) - Math.abs(right[0] - 180)) ** 2;
      let yHueDiff = (Math.abs((top[0] - 180)) - Math.abs(bottom[0] - 180)) ** 2;

      // Combine these two to get the final edge value.
      let bright_strength = Math.floor(Math.sqrt(xDiff ** 2 + yDiff ** 2));
      let hue_strength = Math.floor(Math.sqrt(xHueDiff + yHueDiff));

      // set that pixel to the output image data.
      ImgUtil.setGreyPixel(output, x, y, bright_strength + hue_strength * .01);
      // ImgUtil.setGreyPixel(output, x, y, bright_strength);

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
    ImgUtil.setGreyPixel(image_data, seam[y], y, 255);
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
      ImgUtil.setGreyPixel(image_data, seam[y], y, 255);
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
  let output = ctx.createImageData(image_data.width - 1, image_data.height);

  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < output.width; x++) {
      let offset = x >= seam[y] ? 1 : 0;
      let pixel = ImgUtil.getPixel(image_data, x + offset, y)
      ImgUtil.setPixel(output, x, y, pixel);
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
  let output = ctx.createImageData(image_data.width + 1, image_data.height);

  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < output.width; x++) {
      let pixel = 0, offset = x > seam[y] ? 1 : 0;

      if (x === seam[y]) {

        ImgUtil.interpolatePixel(image_data, x, y);

      } else {
        pixel = ImgUtil.getPixel(image_data, x - offset, y);
      }

      ImgUtil.setPixel(output, x, y, pixel);
    }
  }

  return output;
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
  let output = ctx.createImageData(image_data.width + seams.length, image_data.height);

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
        ImgUtil.setPixel(output, x + seamIndex, y, ImgUtil.interpolatePixel(image_data, x, y));
        seamIndex++;
      }

      ImgUtil.setPixel(output, x + seamIndex, y, ImgUtil.getPixel(image_data, x, y));
    }
  }

  return output;
}
