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
    // for (let i = 0; i < image_data.data.length; i += 4) {
    //   image_data.data[i];
    // }
    getPixel(image_data, -1, -1);
}
function getPixel(image_data, x, y) {
    console.assert(x < image_data.width && x >= 0, "index out of bounds!");
    console.assert(y < image_data.height && y >= 0, "index out of bounds!");
    var NUM_BANDS = 4;
    var index = x * NUM_BANDS + image_data.width * y;
    return image_data.data[index];
}
