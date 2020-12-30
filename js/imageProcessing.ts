// This code assumes a RGBA colorspace. However, I'm not sure if that's fair to assume in an HTMLCanvasElement.
const NUM_BANDS = 4;

let canvas = document.getElementById('image') as HTMLCanvasElement;
let canvas2 = document.getElementById('originalImage') as HTMLCanvasElement;

let ctx = canvas.getContext('2d');
let ctx2 = canvas2.getContext('2d');

let image = new Image();

image.onload = function () {
  canvas.height = image.height * .8;
  canvas.width = image.width * .8;

  canvas2.height = image.height * .8;
  canvas2.width = image.width * .8;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx2.drawImage(image, 0, 0, canvas2.width, canvas2.height);

  let pixel_data = ctx.getImageData(0, 0, canvas.width, canvas.height);


  // convolveSeparable(pixel_data, [1, 1, 1], [-1, 0, 1]);
  // brightExtract(pixel_data);

  let edges = detectEdges(pixel_data);

  ctx.putImageData(edges, 0, 0);
}

image.crossOrigin = "Anonymous";
image.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg';

/**
 * Given image_data and separable kernel as input, this will perform convolution.
 *
 * @param image_data
 * @param x_kernel
 * @param y_kernel
 */
function convolveSeparable(image_data: ImageData, x_kernel: number[], y_kernel: number[]) {
  // iterates over each pixel
  for (let x = 0; x < image_data.width; x++) {
    for (let y = 0; y < image_data.width; y++) {

    }
  }

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
      let brightness = Math.floor(getHSBFromPackedRGB(getPixel(image_data, x, y))[2] * 255);
      setGreyPixel(output, x, y, brightness);
    }
  }

  return output;
}

function detectEdges(image_data: ImageData) {
  let output = ctx.createImageData(image_data.width, image_data.height);

  // For each pixel...
  for (let y = 0; y < image_data.height; y++) {
    for (let x = 0; x < image_data.width; x++) {

      // Get the right and left brightnesses.
      let right_brightness = getHSBFromPackedRGB(getPixel(image_data, x + 1, y))[2];
      let left_brightness = getHSBFromPackedRGB(getPixel(image_data, x - 1, y))[2];

      // Get the top and bottom brightnesses.
      let top_brightness = getHSBFromPackedRGB(getPixel(image_data, x, y - 1))[2];
      let bottom_brightness = getHSBFromPackedRGB(getPixel(image_data, x, y + 1))[2];

      // b is 0...1 so I will scale it to 8 bits.
      let xDiff = Math.abs(left_brightness * 255 - right_brightness * 255);
      let yDiff = Math.abs(top_brightness * 255 - bottom_brightness * 255);

      // Combine these two to get the final edge value.
      let edge_strength = Math.floor(Math.sqrt(xDiff ** 2 + yDiff ** 2));

      // set that pixel to the output image data.
      setGreyPixel(output, x, y, edge_strength);

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
  console.assert(x < image_data.width && x >= 0, "index out of bounds!");
  console.assert(y < image_data.height && y >= 0, "index out of bounds!");
  console.assert(b < NUM_BANDS && b >= 0, "index out of bounds!");

  return image_data.data[(x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b];
}

/**
 * Get's the packed RGB value
 *
 * @param image_data Image Data to get the pixel from.
 * @param x x-coordinate
 * @param y y-coordinate
 * @return packed rgb value. Excludes alpha channel.
 */
function getPixel(image_data: ImageData, x: number, y: number) {
  if (!(x < image_data.width && x >= 0)
    || !(y < image_data.height && y >= 0)) {
    console.warn("Index out of bounds! Zero Padding!");
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

  console.assert(image_data.width > x && x >= 0 &&
    y >= 0 && image_data.height > y, "Index out of bounds!");

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
  console.assert(x < image_data.width && x >= 0, "Pixel not set! Index out of bounds!");
  console.assert(y < image_data.height && y >= 0, "Pixel not set! Index out of bounds!");
  console.assert(b < NUM_BANDS && b >= 0, "Pixel not set! Index out of bounds!");
  console.assert(sample >= 0 && sample <= 255, "Sample value out of bounds! " + sample);

  let index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b;
  image_data.data[index] = sample;
}
