// import { DATA_CLASS } from "@/constants/classes";

// const labels: string[] = DATA_CLASS

// export const renderBoxes = (canvasRef: HTMLCanvasElement, boxes_data: Float32Array, scores_data: number[], classes_data: number[], ratios: number[]) => {
//   const ctx = canvasRef.getContext("2d")!;
//   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

//   const colors = new Colors();

//   const font = `${Math.max(
//     Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
//     14
//   )}px Arial`;
//   ctx.font = font;
//   ctx.textBaseline = "top";

//   for (let i = 0; i < scores_data.length; ++i) {
//     const klass = labels[classes_data[i]];
//     const color = colors.get(classes_data[i]);
//     const score = (scores_data[i] * 100).toFixed(1);

//     let [x1, y1, x2, y2] = boxes_data.slice(i * 4, (i + 1) * 4);
//     x1 *= ratios[0];
//     x2 *= ratios[0];
//     y1 *= ratios[1];
//     y2 *= ratios[1];
//     const width = x2 - x1;
//     const height = y2 - y1;

//     ctx.fillStyle = Colors.hexToRgba(color, 0.2) as string;
//     ctx.fillRect(x1, y1, width, height);

//     ctx.strokeStyle = color;
//     ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
//     ctx.strokeRect(x1, y1, width, height);

//     ctx.fillStyle = color;
//     const textWidth = ctx.measureText(klass + " - " + score + "%").width;
//     const textHeight = parseInt(font, 10); // base 10
//     const yText = y1 - (textHeight + ctx.lineWidth);
//     ctx.fillRect(
//       x1 - 1,
//       yText < 0 ? 0 : yText, // handle overflow label box
//       textWidth + ctx.lineWidth,
//       textHeight + ctx.lineWidth
//     );

//     ctx.fillStyle = "#ffffff";
//     ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 0 : yText);
//   }
// };



import { DATA_CLASS } from "@/constants/classes";

const labels: string[] = DATA_CLASS;

export const renderBoxes = (canvasRef: HTMLCanvasElement, boxes_data: Float32Array, scores_data: number[], classes_data: number[], displayRatios: number[]) => {
  const ctx = canvasRef.getContext("2d")!;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clear the canvas

  const colors = new Colors();

  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";

  for (let i = 0; i < scores_data.length; ++i) {
    const klass = labels[classes_data[i]];
    const color = colors.get(classes_data[i]);
    const score = (scores_data[i] * 100).toFixed(1);

    // Adjust for scaling
    let [x1, y1, x2, y2] = boxes_data.slice(i * 4, (i + 1) * 4);
    x1 *= displayRatios[0];
    x2 *= displayRatios[0];
    y1 *= displayRatios[1];
    y2 *= displayRatios[1];
    const width = x2 - x1;
    const height = y2 - y1;

    // Draw bounding box
    ctx.fillStyle = Colors.hexToRgba(color, 0.2) as string;
    ctx.fillRect(x1, y1, width, height);

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
    ctx.strokeRect(x1, y1, width, height);

    // Draw label background and text
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(klass + " - " + score + "%").width;
    const textHeight = parseInt(font, 10); 
    const yText = y1 - (textHeight + ctx.lineWidth);
    ctx.fillRect(
      x1 - 1,
      yText < 0 ? 0 : yText, // prevents text overflow
      textWidth + ctx.lineWidth,
      textHeight + ctx.lineWidth
    );

    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 0 : yText);
  }
};
class Colors {

  palette: string[]
  n: number

  constructor() {
    this.palette = [
      "#FF3838",
      "#FF9D97",
      "#FF701F",
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
    ];
    this.n = this.palette.length;
  }

  get = (i: number) => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex: string, alpha: number): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${[parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].join(
        ", "
      )}, ${alpha})`
      : null;
  };
}
