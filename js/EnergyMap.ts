import {ImgUtil} from "./imgUtil";

export class EnergyMap {

  private _maxEnergy = -1;

  /**
   * Given a collection of edges from detectEdges, create an edge map.
   *
   * @param image_data ImageData of edges
   * @return edgeMap
   */
  public getEnergyMap(image_data: ImageData) {
    let energyArray = [];

    // Initialize the bottom row.
    let energyX = [];
    for (let x = 0; x < image_data.width; x++) {
      let energy: number = ImgUtil.getBand(image_data, x, image_data.height - 1, 0);
      energyX.push(energy);
      this._maxEnergy = Math.max(this._maxEnergy, energy);
    }
    energyArray.push(energyX);

    for (let y = image_data.height - 2; y >= 0; y--) {
      energyX = [];
      for (let x = 0; x < image_data.width; x++) {

        let bestPath: number = findLowestEnergy(energyArray, x);
        let energy: number = ImgUtil.getBand(image_data, x, y, 0);

        energyX.push(energy + bestPath);
        this._maxEnergy = Math.max(this._maxEnergy, energy + bestPath);
      }

      energyArray.unshift(energyX);
    }

    return energyArray;
  }

  /**
   * Creates a visual for a given energy map.
   *
   * @param energy_map the map to generate an image for.
   * @return ImageData representing the mapped energy map.
   */
  public generateEnergyMapImg(energy_map: number[][]) {
    let output: ImageData = ctx.createImageData(energy_map[0].length, energy_map.length);

    for (let y = 0; y < energy_map.length; y++) {
      for (let x = 0; x < energy_map[0].length; x++) {
        ImgUtil.setGreyPixel(output, x, y, energy_map[y][x] / (this._maxEnergy / 255));
      }
    }

    return output;
  }

  /**
   * Finds the lowest, connected energy value from the top of the energy map.
   * Useful when building an energy map.
   *
   * @param energy_map map used to calculate lowest energy.
   * @param x x-coordinate to stay connected to.
   * @return lowest energy that is connected to x and is in row y.
   */
  public findLowestEnergy(energy_map: number[][], x: number) {
    let mid = energy_map[0][x], right, left;

    if (x - 1 < 0) {
      left = Number.MAX_VALUE;
    } else {
      left = energy_map[0][x - 1];
    }

    if (x + 1 == energy_map[0].length) {
      right = Number.MAX_VALUE;
    } else {
      right = energy_map[0][x + 1];
    }

    return Math.min(mid, right, left);
  }
}
