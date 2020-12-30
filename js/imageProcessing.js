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
    // convolveSeparable(pixel_data, [1, 1, 1], [-1, 0, 1]);
    // detectEdges(pixel_data);
    brightExtract(pixel_data);
    ctx.putImageData(pixel_data, 0, 0);
};
image.crossOrigin = "Anonymous";
image.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg';
/**
 * Given image_data and separable kernel as input, this will perform convolution.
 *
 * @param image_data
 * @param x_kernel
 * @param y_kernel
 */
function convolveSeparable(image_data, x_kernel, y_kernel) {
    // iterates over each pixel
    for (var x = 0; x < image_data.width; x++) {
        for (var y = 0; y < image_data.width; y++) {
        }
    }
}
/**
 * Sets the image to only the brightness band in hsv.
 * @param image_data ImageData of the image you'd like to make greyscale.
 */
function brightExtract(image_data) {
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < image_data.width; x++) {
            var brightness = Math.ceil(getHSBFromPackedRGB(getPixel(image_data, x, y))[2] * 255);
            setGreyPixel(image_data, x, y, brightness);
        }
    }
}
function detectEdges(image_data) {
    for (var y = 0; y < image_data.height / 5; y++) {
        for (var x = 0; x < image_data.width / 5; x++) {
            // For each pixel in the image....
            var right_pixel = getPixel(image_data, x + 1, y);
            console.log("R", right_pixel >> 16 & 0xff, "G", right_pixel >> 8 & 0xff, "B", right_pixel & 0xff);
            var right_hsb = getHSBFromPackedRGB(right_pixel);
            console.log("HSB", right_hsb);
            var left_pixel = getPixel(image_data, x - 1, y);
            var left_hsb = getHSBFromPackedRGB(left_pixel);
            // hsb is 0...1 so I will scale it to 8 bits.
            var edge_strength = Math.abs(right_hsb[2] - left_hsb[2]) * 255;
            if (edge_strength > 255 || edge_strength < 0) {
                console.warn("Abnormal Edge Strength!", edge_strength);
            }
            setGreyPixel(image_data, x, y, edge_strength);
        }
    }
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
function getPixel(image_data, x, y) {
    if (!(x < image_data.width && x >= 0)
        || !(y < image_data.height && y >= 0)) {
        console.warn("Index out of bounds! Zero Padding!");
        return 0;
    }
    var index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y);
    return image_data.data[index] << 16 | image_data.data[index + 1] << 8 | image_data.data[index + 2];
}
function setGreyPixel(image_data, x, y, grey_value) {
    for (var b = 0; b < NUM_BANDS; b++) {
        setBand(image_data, x, y, b, grey_value);
    }
}
function setBand(image_data, x, y, b, sample) {
    console.assert(x < image_data.width && x >= 0, "Pixel not set! Index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "Pixel not set! Index out of bounds!");
    console.assert(b < NUM_BANDS && b >= 0, "Pixel not set! Index out of bounds!");
    console.assert(sample >= 0 && sample <= 255, "Sample value out of bounds! " + sample);
    var index = (x * NUM_BANDS) + (image_data.width * NUM_BANDS * y) + b;
    image_data.data[index] = sample;
}
