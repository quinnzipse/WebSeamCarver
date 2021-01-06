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

    let index = (x * ImgUtil.NUM_BANDS) + (image_data.width * ImgUtil.NUM_BANDS * y);

    image_data.data[index] = (pixel >> 16) & 0xff;
    image_data.data[index + 1] = (pixel >> 8) & 0xff;
    image_data.data[index + 2] = pixel & 0xff;
    image_data.data[index + 3] = 255;
  }

}
