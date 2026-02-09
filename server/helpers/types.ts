/**
 * Type definitions for bouquet generation
 */

// 2D coordinate point
export interface Point {
  x: number;
  y: number;
}

// Individual slot in the bouquet layout
export interface FlowerSlot {
  position: Point; // Where the flower center should be placed
  angle: number; // Position angle from binding point (degrees)
  tilt: number; // Rotation/tilt of the flower itself (degrees)
  scale: number; // Size multiplier
}

// Complete layout template for a bouquet
export interface LayoutTemplate {
  flowerCount: number;
  bindingPoint: Point;
  slots: FlowerSlot[];
  viewBox: { width: number; height: number };
}

// Parsed SVG data
export interface FlowerSVG {
  content: string; // SVG inner content
  width: number;
  height: number;
  rotation?: number;
  stemBase: Point; // Stem base point in original SVG coordinates (rotation pivot for bouquet arrangement)
}
