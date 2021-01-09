// TODO: Think about assertions.
export class ImgUtil {
  public static NUM_BANDS = 4;

  /**
   * Sets an 24-bit RGB pixel of an image.
   * @param image_data Image to set pixel in.
   * @param x x-coordinate.
   * @param y y-coordinate.
   * @param pixel 24bit RGB packed value.
   */
  public static setPixel(image_data: ImageData, x: number, y: number, pixel: number) {
    if (x < 0 || x >= image_data.width || y < 0 || y >= image_data.height) return;

    let index = (x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y);

    image_data.data[index] = (pixel >> 16) & 0xff;
    image_data.data[index + 1] = (pixel >> 8) & 0xff;
    image_data.data[index + 2] = pixel & 0xff;
    image_data.data[index + 3] = 255;
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
  public static setBand(image_data: ImageData, x: number, y: number, b: number, sample: number) {
    if (x < 0 || x >= image_data.width || y < 0 || y >= image_data.height) return;

    let index = (x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y) + b;
    image_data.data[index] = sample;
  }

  /**
   * Sets the greyscale value to the location in the image specified.
   *
   * @param image_data Image data to set greyscale value of.
   * @param x x-coordinate
   * @param y y-coordinate
   * @param grey_value clamped 8-bit grey value
   */
  public static setGreyPixel(image_data: ImageData, x: number, y: number, grey_value: number) {
    if (x < 0 || x >= image_data.width || y < 0 || y >= image_data.height) return;

    // Set the values. Make sure alpha stays 255.
    ImgUtil.setBand(image_data, x, y, 0, grey_value);
    ImgUtil.setBand(image_data, x, y, 1, grey_value);
    ImgUtil.setBand(image_data, x, y, 2, grey_value);
    ImgUtil.setBand(image_data, x, y, 3, 255);
  }

  /**
   * Deep copies an image and returns the new ImageData.
   * @param image_data Image to copy.
   * @param ctx Context in which to create new image.
   * @return Copy of image.
   */
  public static copyImage(image_data: ImageData, ctx: CanvasRenderingContext2D) {
    let output = ctx.createImageData(image_data);

    output.data.set(image_data.data);

    return output;
  }

  /**
   * Gets a sample from an image.
   *
   * @throws Index out of bounds if x,y,or b aren't in range.
   * @param image_data Image to retrieve sample from.
   * @param x x-coordinate
   * @param y y-coordinate
   * @param b RGBA band [0-4]
   * @return Sample at given location in the array.
   */
  public static getBand(image_data: ImageData, x: number, y: number, b: number) {
    if (x < 0 || x >= image_data.width
      || y < 0 || y >= image_data.height
      || b < 0 || b > ImgUtil.NUM_BANDS)
      throw "Index Out Of Bounds!";

    return image_data.data[(x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y) + b];
  }

  /**
   * Get's the packed RGB value from a specific from a zero-padded x, y.
   *
   * @param image_data Image Data to get the pixel from.
   * @param x x-coordinate
   * @param y y-coordinate
   * @return If x,y are in bounds, returns packed rgb value. Otherwise, 0.
   */
  public static getPixel(image_data: ImageData, x: number, y: number) {
    if (!(x < image_data.width && x >= 0)
      || !(y < image_data.height && y >= 0)) {
      return 0;
    }

    let index = (x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y);

    return image_data.data[index] << 16 | image_data.data[index + 1] << 8 | image_data.data[index + 2];
  }

  /**
   * Converts an r, g, and b into their corresponding hsb values.
   * @param r 8-bit red value
   * @param g 8-bit green value
   * @param b 8-bit blue value
   * @return an array of three numbers representing hue (0-360), saturation (0-1), and brightness (0-1)
   */
  public static getHSBFromRGB(r: number, g: number, b: number) {
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

  /**
   * Converts a packed representation of a RGB value into an array of HSB values.
   * @param packedRGB 24-bit value containing 8 bits for each r, g, and b band.
   * @return an array of three numbers representing hue (0-360), saturation (0-1), and brightness (0-1)
   */
  public static getHSBFromPackedRGB(packedRGB: number) {
    return this.getHSBFromRGB(packedRGB >> 16 & 0xff, packedRGB >> 8 & 0xff, packedRGB & 0xff);
  }

  /**
   * Averages each band of the pixel to the left and right of the designated x,y.
   *
   * @param image_data Image to interpolate from.
   * @param x x-coordinate to interpolate.
   * @param y y-coordinate to interpolate.
   * @return new pixel that belongs at x,y of image_data.
   */
  public static interpolatePixel(image_data: ImageData, x: number, y: number) {
    // Average each band!
    let pixel = Math.floor((ImgUtil.getBand(image_data, x - 1, y, 0)
      + ImgUtil.getBand(image_data, x + 1, y, 0)) / 2) << 16;
    pixel |= Math.floor((ImgUtil.getBand(image_data, x - 1, y, 1)
      + ImgUtil.getBand(image_data, x + 1, y, 1)) / 2) << 8;
    pixel |= Math.floor((ImgUtil.getBand(image_data, x - 1, y, 2)
      + ImgUtil.getBand(image_data, x + 1, y, 2)) / 2);

    return pixel;
  }
}
