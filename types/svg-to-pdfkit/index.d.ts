declare module 'svg-to-pdfkit' {
  function SVGtoPDF(
    doc: unknown,
    svg: string,
    x: number,
    y: number,
    options?: {
      width?: number;
      height?: number;
      preserveAspectRatio?: string;
      /** Assume width/height are PDF points (pt), not SVG pixels. Default false. */
      assumePt?: boolean;
    },
  ): void;
  export = SVGtoPDF;
}
