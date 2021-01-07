"use strict";
exports.__esModule = true;
var imgUtil_1 = require("./imgUtil");
var canvas = document.getElementById('image'), canvas2 = document.getElementById('originalImage'), canvas3 = document.getElementById('edges');
var ctx = canvas.getContext('2d'), ctx2 = canvas2.getContext('2d'), ctx3 = canvas3.getContext('2d');
var image = new Image();
var seams = [];
image.onload = function () {
    canvas.height = image.height;
    canvas.width = image.width;
    canvas2.height = image.height;
    canvas2.width = image.width;
    canvas3.height = image.height;
    canvas3.width = image.width;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx2.drawImage(image, 0, 0, canvas2.width, canvas2.height);
    var pixel_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // cropXBy(pixel_data, 50);
    var edge_img = detectEdges(pixel_data);
    ctx3.putImageData(edge_img, 0, 0);
    pixel_data = extendXBy(pixel_data, 240);
    canvas.width = pixel_data.width;
    ctx.putImageData(pixel_data, 0, 0);
    var img2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
    drawSeams(img2, seams);
    ctx2.putImageData(img2, 0, 0);
};
image.crossOrigin = "Anonymous";
image.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg';
/**
 * Crops the image by a certain amount trying to preserve objects.
 *
 * @param image_data Image to crop.
 * @param i Amount to crop by.
 */
function cropXBy(image_data, i) {
    seams = [];
    var edges, energyMap;
    for (var i_1 = 0; i_1 < i_1; i_1++) {
        edges = detectEdges(image_data);
        energyMap = getEnergyMap(edges);
        var seam = findSeam(energyMap);
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
function extendXBy(image_data, i) {
    var output = imgUtil_1.ImgUtil.copyImage(image_data, ctx), edges, energyMap;
    seams = [];
    while (i > 0) {
        edges = detectEdges(image_data);
        energyMap = getEnergyMap(edges);
        var seam = findSeam(energyMap);
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
function brightExtract(image_data) {
    // Create the destination image.
    var output = ctx.createImageData(image_data.width, image_data.height);
    // For each pixel...
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < image_data.width; x++) {
            // Extract the brightness band.
            var brightness = Math.floor(getHSBFromPackedRGB(imgUtil_1.ImgUtil.getPixel(image_data, x, y))[2] * 255);
            imgUtil_1.ImgUtil.setGreyPixel(output, x, y, brightness);
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
    var output = ctx.createImageData(image_data);
    // For each pixel...
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < image_data.width; x++) {
            // Get the right and left brightnesses.
            var right = getHSBFromPackedRGB(imgUtil_1.ImgUtil.getPixel(image_data, x + 1, y));
            var left = getHSBFromPackedRGB(imgUtil_1.ImgUtil.getPixel(image_data, x - 1, y));
            // Get the top and bottom brightnesses.
            var top_1 = getHSBFromPackedRGB(imgUtil_1.ImgUtil.getPixel(image_data, x, y - 1));
            var bottom = getHSBFromPackedRGB(imgUtil_1.ImgUtil.getPixel(image_data, x, y + 1));
            // b is 0...1 so I will scale it to 8 bits.
            var xDiff = Math.abs(left[2] * 255 - right[2] * 255);
            var yDiff = Math.abs(top_1[2] * 255 - bottom[2] * 255);
            var xHueDiff = Math.pow((Math.abs((left[0] - 180)) - Math.abs(right[0] - 180)), 2);
            var yHueDiff = Math.pow((Math.abs((top_1[0] - 180)) - Math.abs(bottom[0] - 180)), 2);
            // Combine these two to get the final edge value.
            var bright_strength = Math.floor(Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)));
            var hue_strength = Math.floor(Math.sqrt(xHueDiff + yHueDiff));
            // set that pixel to the output image data.
            imgUtil_1.ImgUtil.setGreyPixel(output, x, y, bright_strength + hue_strength * .01);
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
function findSeam(energy_map) {
    var seam = [];
    var bestX = [];
    bestX.push(0);
    for (var x = 1; x < energy_map[0].length; x++) {
        var diff = energy_map[0][bestX[0]] - energy_map[0][x];
        if (diff > 0) {
            // new min, set a new array.
            bestX = [];
            bestX.push(x);
        }
        else if (diff === 0) {
            // add to the existing array.
            bestX.push(x);
        }
    }
    // Randomly pick the starting point from the smallest elements.
    var random_index = Math.floor(Math.random() * bestX.length);
    seam.push(bestX[random_index]);
    for (var y = 1; y < energy_map.length; y++) {
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
function findNextX(energy_map, prevX, y) {
    // get each number to the left, right, and middle of the last.
    var left = energy_map[y][prevX - 1], mid = energy_map[y][prevX], right = energy_map[y][prevX + 1];
    // check the bounds.
    if (isNaN(left))
        left = Number.MAX_VALUE;
    if (isNaN(right))
        right = Number.MAX_VALUE;
    // get the min.
    var min = Math.min(mid, left, right);
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
function drawSeam(image_data, seam) {
    for (var y = 0; y < image_data.height; y++) {
        imgUtil_1.ImgUtil.setGreyPixel(image_data, seam[y], y, 255);
    }
}
/**
 * Draw multiple seams onto an image. Does not account for offsetting.
 *
 * @param image_data The image to be drawn on.
 * @param seams The seams to display
 */
function drawSeams(image_data, seams) {
    for (var _i = 0, seams_1 = seams; _i < seams_1.length; _i++) {
        var seam = seams_1[_i];
        for (var y = 0; y < image_data.height; y++) {
            imgUtil_1.ImgUtil.setGreyPixel(image_data, seam[y], y, 255);
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
function removeSeam(image_data, seam) {
    var output = ctx.createImageData(image_data.width - 1, image_data.height);
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < output.width; x++) {
            var offset = x >= seam[y] ? 1 : 0;
            var pixel = imgUtil_1.ImgUtil.getPixel(image_data, x + offset, y);
            imgUtil_1.ImgUtil.setPixel(output, x, y, pixel);
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
function addSeam(image_data, seam) {
    var output = ctx.createImageData(image_data.width + 1, image_data.height);
    for (var y = 0; y < image_data.height; y++) {
        for (var x = 0; x < output.width; x++) {
            var pixel = 0, offset = x > seam[y] ? 1 : 0;
            if (x === seam[y]) {
                imgUtil_1.ImgUtil.interpolatePixel(image_data, x, y);
            }
            else {
                pixel = imgUtil_1.ImgUtil.getPixel(image_data, x - offset, y);
            }
            imgUtil_1.ImgUtil.setPixel(output, x, y, pixel);
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
function addSeams(image_data, seams) {
    var output = ctx.createImageData(image_data.width + seams.length, image_data.height);
    for (var y = 0; y < image_data.height; y++) {
        var xPos = [];
        for (var x = 0; x < seams.length; x++) {
            xPos.push(seams[x][y]);
        }
        xPos.sort(function (n1, n2) { return n1 - n2; });
        console.log(xPos);
        var seamIndex = 0;
        for (var x = 0; x < image_data.width; x++) {
            while (seamIndex < xPos.length && xPos[seamIndex] === x) {
                imgUtil_1.ImgUtil.setPixel(output, x + seamIndex, y, imgUtil_1.ImgUtil.interpolatePixel(image_data, x, y));
                seamIndex++;
            }
            imgUtil_1.ImgUtil.setPixel(output, x + seamIndex, y, imgUtil_1.ImgUtil.getPixel(image_data, x, y));
        }
    }
    return output;
}
