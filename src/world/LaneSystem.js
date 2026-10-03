// Maps lane indices to world x positions and clamps lane changes.
export class LaneSystem {
  constructor(config) {
    this.count = config.lanes.laneCount;
    this.width = config.lanes.laneWidth;
    this.centerLane = Math.floor(this.count / 2);
    this.roadWidth = this.count * this.width;
  }

  xOf(lane) {
    return (lane - (this.count - 1) / 2) * this.width;
  }

  isValid(lane) {
    return lane >= 0 && lane < this.count;
  }
}
