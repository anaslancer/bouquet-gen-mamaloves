export interface Point {
  x: number;
  y: number;
}

export interface FlowerSlot {
  position: Point;
  rotation: number;
}

export interface LayoutTemplate {
  flowerCount: number;
  bindingPoint: Point;
  slots: FlowerSlot[];
  viewBox: { width: number; height: number };
}

export interface FlowerRegion {
  yMinPct: number;
  yMaxPct: number;
}

export interface FlowerSVG {
  content: string;
  width: number;
  height: number;
  transformCenter?: Point;
  baseRotation?: number;
  flowerRegion?: FlowerRegion;
}
