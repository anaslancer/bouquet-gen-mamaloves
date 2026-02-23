declare module 'svg-to-pdfkit' {
  function SVGtoPDF(
    doc: unknown,
    svg: string,
    x: number,
    y: number,
    options?: { width?: number; height?: number; preserveAspectRatio?: string },
  ): void;
  export = SVGtoPDF;
}
