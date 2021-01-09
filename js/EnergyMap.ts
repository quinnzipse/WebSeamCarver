import {ImgUtil} from "./imgUtil";

export class EnergyMap {

  public static readonly directions = Object.freeze({"left": 0, "down": 1, "right": 2});

  private readonly max_energy: number;
  private readonly energy_map: number[][];
  public readonly energies: number[];
  public readonly direction_map: number[][];

  /**
   * Given a collection of edges from detectEdges, create an edge map.
   *
   * @param edges ImageData of edges
   * @return edgeMap
   */
  constructor(edges: ImageData) {
    this.energy_map = [];

    // Initialize the bottom row.
    let energyX = [];

    for (let x = 0; x < edges.width; x++) {
      let energy: number = ImgUtil.getBand(edges, x, edges.height - 1, 0);
      energyX.push(energy);

      this.max_energy = Math.max(this.max_energy, energy);
    }

    this.energy_map.push(energyX);

    for (let y = edges.height - 2; y >= 0; y--) {
      energyX = [];
      for (let x = 0; x < edges.width; x++) {

        let bestPath: number = this.findLowestEnergy(x);
        let energy: number = ImgUtil.getBand(edges, x, y, 0);

        energyX.push(energy + bestPath);
        this.max_energy = Math.max(this.max_energy, energy + bestPath);
      }

      this.energy_map.unshift(energyX);
    }
  }

  /**
   * Creates a visual for a given energy map.
   *
   * @param ctx
   * @return ImageData representing the mapped energy map.
   */
  public generateEnergyMapImg(ctx: CanvasRenderingContext2D) {
    let output: ImageData = ctx.createImageData(this.energy_map[0].length, this.energy_map.length);

    for (let y = 0; y < this.energy_map.length; y++) {
      for (let x = 0; x < this.energy_map[0].length; x++) {
        ImgUtil.setGreyPixel(output, x, y, this.energy_map[y][x] / (this.max_energy / 255));
      }
    }

    return output;
  }

  /**
   * Finds the lowest, connected energy value from the top of the energy map.
   * Useful when building an energy map.
   *
   * @param x x-coordinate to stay connected to.
   * @return lowest energy that is connected to x and is in row y.
   */
  public findLowestEnergy(x: number) {
    let mid = this.energy_map[0][x], right, left;

    if (x - 1 < 0) {
      left = Number.MAX_VALUE;
    } else {
      left = this.energy_map[0][x - 1];
    }

    if (x + 1 == this.energy_map[0].length) {
      right = Number.MAX_VALUE;
    } else {
      right = this.energy_map[0][x + 1];
    }

    return Math.min(mid, right, left);
  }
}
