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
    convolveSeparable(pixel_data, [1, 1, 1], [-1, 0, 1]);
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
 * Converts a packed representation of a RGB value into an array of HSB values.
 * @param packedRGB 24-bit value containing 8 bits for each r, g, and b band.
 */
function getHSBFromPackedRGB(packedRGB) {
    getHSBFromRGB(packedRGB >> 16 & 0xff, packedRGB >> 8 & 0xff, packedRGB & 0xff);
}
/**
 * Converts an r, g, and b into their corresponding hsb values.
 * @param r 8-bit red value
 * @param g 8-bit green value
 * @param b 8-bit blue value
 */
function getHSBFromRGB(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var cMax = Math.max(r, g, b), cMin = Math.min(r, g, b);
    var h = 0, s = 0, br = 0;
}
function getBand(image_data, x, y, b) {
    console.assert(x < image_data.width && x >= 0, "index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "index out of bounds!");
    console.assert(b < NUM_BANDS && b >= 0, "index out of bounds!");
    return image_data.data[(x * NUM_BANDS) + (image_data.width * y) + b];
}
function getPixel(image_data, x, y, b) {
    console.assert(x < image_data.width && x >= 0, "index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "index out of bounds!");
    console.assert(b < NUM_BANDS && b >= 0, "index out of bounds!");
    var index = (x * NUM_BANDS) + (image_data.width * y);
    return image_data.data[index] << 16 | image_data.data[index + 1] << 8 | image_data.data[index + 2];
}
