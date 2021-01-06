"use strict";
exports.__esModule = true;
exports.ImgUtil = void 0;
var ImgUtil = /** @class */ (function () {
    function ImgUtil() {
    }
    /**
     * Sets an 24-bit RGB pixel of an image.
     * @param image_data Image to set pixel in.
     * @param x x-coordinate.
     * @param y y-coordinate.
     * @param pixel 24bit RGB packed value.
     */
    ImgUtil.setPixel = function (image_data, x, y, pixel) {
        var index = (x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y);
        image_data.data[index] = (pixel >> 16) & 0xff;
        image_data.data[index + 1] = (pixel >> 8) & 0xff;
        image_data.data[index + 2] = pixel & 0xff;
        image_data.data[index + 3] = 255;
    };
    ImgUtil.NUM_BANDS = 4;
    return ImgUtil;
}());
exports.ImgUtil = ImgUtil;
