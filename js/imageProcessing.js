// This code assumes a RGBA colorspace. However, I'm not sure if that's fair to assume in an HTMLCanvasElement.
var NUM_BANDS = 4;
var canvas = document.getElementById('image');
var canvas2 = document.getElementById('originalImage');
var ctx = canvas.getContext('2d');
var ctx2 = canvas2.getContext('2d');
var image = new Image();
image.onload = function () {
    canvas.height = image.height * .8;
    canvas.width = image.width * .8;
    canvas2.height = image.height * .8;
    canvas2.width = image.width * .8;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx2.drawImage(image, 0, 0, canvas2.width, canvas2.height);
    var pixel_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var edges = detectEdges(pixel_data);
    var energyMap = getEnergyMap(edges);
    ctx.putImageData(energyMap, 0, 0);
};
image.crossOrigin = "Anonymous";
image.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg';
/**
 * Sets the image to only the brightness band in hsv.
 * @param image_data ImageData of the image you'd like to make greyscale.
 */
function brightExtract(image_data) {
    // Create the destination image.
    var output = ctx.createImageData(image_data.width, image_data.height);
    // For each pixel...
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < image_data.width; x++) {
            // Extract the brightness band.
            var brightness = Math.floor(getHSBFromPackedRGB(getPixel(image_data, x, y))[2] * 255);
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
function detectEdges(image_data) {
    var output = ctx.createImageData(image_data.width, image_data.height);
    // For each pixel...
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < image_data.width; x++) {
            // Get the right and left brightnesses.
            var right_brightness = getHSBFromPackedRGB(getPixel(image_data, x + 1, y))[2];
            var left_brightness = getHSBFromPackedRGB(getPixel(image_data, x - 1, y))[2];
            // Get the top and bottom brightnesses.
            var top_brightness = getHSBFromPackedRGB(getPixel(image_data, x, y - 1))[2];
            var bottom_brightness = getHSBFromPackedRGB(getPixel(image_data, x, y + 1))[2];
            // b is 0...1 so I will scale it to 8 bits.
            var xDiff = Math.abs(left_brightness * 255 - right_brightness * 255);
            var yDiff = Math.abs(top_brightness * 255 - bottom_brightness * 255);
            // Combine these two to get the final edge value.
            var edge_strength = Math.floor(Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)));
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
function getHSBFromPackedRGB(packedRGB) {
    return getHSBFromRGB(packedRGB >> 16 & 0xff, packedRGB >> 8 & 0xff, packedRGB & 0xff);
}
/**
 * Converts an r, g, and b into their corresponding hsb values.
 * @param r 8-bit red value
 * @param g 8-bit green value
 * @param b 8-bit blue value
 * @return an array of three numbers representing hue (0-360), saturation (0-1), and brightness (0-1)
 */
function getHSBFromRGB(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var cMax = Math.max(r, g, b), cMin = Math.min(r, g, b), diff = cMax - cMin, hsb = [0, 0, 0];
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
function getBand(image_data, x, y, b) {
    console.assert(x < image_data.width && x >= 0, "index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "index out of bounds!");
    console.assert(b < NUM_BANDS && b >= 0, "index out of bounds!");
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
function getPixel(image_data, x, y) {
    if (!(x < image_data.width && x >= 0)
        || !(y < image_data.height && y >= 0)) {
        console.warn("Index out of bounds! Zero Padding!");
        return 0;
    }
    var index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y);
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
function setGreyPixel(image_data, x, y, grey_value) {
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
function setBand(image_data, x, y, b, sample) {
    console.assert(x < image_data.width && x >= 0, "Pixel not set! Index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "Pixel not set! Index out of bounds!");
    console.assert(b < NUM_BANDS && b >= 0, "Pixel not set! Index out of bounds!");
    console.assert(sample >= 0 && sample <= 255, "Sample value out of bounds! " + sample);
    var index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b;
    image_data.data[index] = sample;
}
/**
 * Given a collection of edges from detectEdges, create an edge map.
 *
 * @param image_data ImageData of edges
 * @return edgeMap
 */
function getEnergyMap(image_data) {
    var energyArray = [];
    var max = -1;
    // Initialize the bottom row.
    var energyX = [];
    for (var x = 0; x < image_data.width; x++) {
        var energy = getBand(image_data, x, image_data.height - 1, 0);
        energyX.push(energy);
        Math.max(max, energy);
    }
    energyArray.push(energyX);
    for (var y = image_data.height - 2; y >= 0; y--) {
        energyX = [];
        for (var x = 0; x < image_data.width; x++) {
            var bestPath = findLowestEnergy(energyArray, x, y);
            var energy = getBand(image_data, x, y, 0);
            energyX.push(energy + bestPath);
            max = Math.max(max, energy + bestPath);
        }
        energyArray.unshift(energyX);
    }
    return energyArray;
}
function findLowestEnergy(energy_map, x, y) {
    var mid = energy_map[0][x], right, left;
    if (x < 0) {
        left = Number.MAX_VALUE;
    }
    else {
        left = energy_map[0][x - 1];
    }
    if (x == energy_map[0].length) {
        right = Number.MAX_VALUE;
    }
    else {
        right = energy_map[0][x + 1];
    }
    return Math.min(mid, right, left);
}
