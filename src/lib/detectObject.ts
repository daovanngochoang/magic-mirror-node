// import * as tf from "@tensorflow/tfjs";
// import { renderBoxes } from "./boxRender";

// export interface ModelConfig {
//   modelPath: string;
//   maxDetections?: number;
//   iouThreshHold?: number;
//   scoreThreshHold?: number;
//   classes?: string[];
//   inputHeight: number;
//   inputWidth: number;
// }

// export class ObjectDetectionModel {
//   private model: tf.GraphModel | null;
//   public readonly config: Required<ModelConfig>;

//   constructor(config: Required<ModelConfig>) {
//     this.config = config;
//     this.model = null;
//   }

//   private warmupModel(): void {
//     const dummyInput = tf.ones(this.model!.inputs[0].shape!);
//     this.model!.execute(dummyInput);
//   }

//   public async loadModel(): Promise<void> {
//     try {
//       this.model = await tf.loadGraphModel(this.config.modelPath);
//       this.warmupModel();
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       throw new Error(`Failed to load model: ${errorMessage}`);
//     }
//   }

//   private prepareInput(dataSource: HTMLVideoElement) {
//     let ratioX: number = 1;
//     let ratioY: number = 1;

//     const inputData: tf.Tensor4D = tf.tidy(() => {
//       const image = tf.browser.fromPixels(dataSource);
//       const [h, w] = image.shape.slice(0, 2);

//       const maxSize = Math.max(w, h);
//       const imgPadded = image.pad([
//         [0, maxSize - h],
//         [0, maxSize - w],
//         [0, 0],
//       ]);

//       ratioX = maxSize / w;
//       ratioY = maxSize / h;

//       return tf.image.resizeBilinear(
//         imgPadded as tf.Tensor4D,
//         [this.config.inputWidth, this.config.inputHeight]
//       ).div(255.0).expandDims(0);
//     });
//     return [inputData, ratioX, ratioY];
//   }

//   public async detect(dataSource: HTMLVideoElement, canvas: HTMLCanvasElement, callback: () => Promise<void>) {
//     tf.engine().startScope();
//     const [inputData, ratioX, ratioY] = this.prepareInput(dataSource);
//     const prediction: tf.Tensor = this.model!.predict(inputData as tf.Tensor) as tf.Tensor;

//     const result = prediction.squeeze();
//     const transposed = result.transpose();

//     const boxes = tf.tidy(() => {
//       const centerX = transposed.slice([0, 0], [-1, 1]);
//       const centerY = transposed.slice([0, 1], [-1, 1]);
//       const w = transposed.slice([0, 2], [-1, 1]);
//       const h = transposed.slice([0, 3], [-1, 1]);

//       const x1 = tf.sub(centerX, tf.div(w, 2));
//       const y1 = tf.sub(centerY, tf.div(h, 2));
//       const x2 = tf.add(x1, w);
//       const y2 = tf.add(y1, h);

//       return tf.concat([x1, y1, x2, y2], 1);
//     });

//     const [scores, classes] = tf.tidy(() => {
//       const rawScores = transposed.slice([0, 4], [-1, this.config.classes.length]).squeeze();
//       return [rawScores.max(1), rawScores.argMax(1)];
//     });

//     const nms = await tf.image.nonMaxSuppressionAsync(
//       boxes as tf.Tensor2D,
//       scores,
//       this.config.maxDetections,
//       this.config.iouThreshHold,
//       this.config.scoreThreshHold
//     );

//     const boxes_data = boxes.gather(nms, 0).dataSync();
//     const classes_data = classes.gather(nms, 0).dataSync();
//     const scores_data = scores.gather(nms, 0).dataSync();

//     renderBoxes(canvas, boxes_data as Float32Array, scores_data, classes_data, [ratioX, ratioY]);

//     tf.dispose([prediction, transposed, boxes, scores, classes, nms]);

//     callback();

//     tf.engine().endScope();
//   }

//   public async detectVideoFrame(source: HTMLVideoElement, canvas: HTMLCanvasElement) {
//     const detectSingleFrame = async () => {
//       if (source.videoWidth === 0 && source.srcObject === null) {
//         const ctx = canvas.getContext("2d")!;
//         ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//         return;
//       }

//       await this.detect(source, canvas, async () => {
//         requestAnimationFrame(detectSingleFrame);
//       });
//     };
//     await detectSingleFrame();
//   }
// }



import * as tf from "@tensorflow/tfjs";
import { renderBoxes } from "./boxRender";
import { DATA_CLASS, EXCLUDE_CLASSES_INDEXES, INCLUDE_CLASSES, INCLUDE_CLASSES_INDEXES } from "@/constants/classes";

export interface ModelConfig {
  modelPath: string;
  maxDetections?: number;
  iouThreshHold?: number;
  scoreThreshHold?: number;
  classes?: string[];
  inputHeight: number;
  inputWidth: number;
}

export class ObjectDetectionModel {
  private model: tf.GraphModel | null;
  public readonly config: Required<ModelConfig>;
  private detectedCount: Map<string, number> = new Map()
  private maxCount: number = 0;
  private callback: (obName: string) => Promise<void>;

  constructor(
    config: Required<ModelConfig>,
    maxCount: number = 20,
    mainClasses: string[] = INCLUDE_CLASSES,
    callback: (obName: string) => Promise<void>
  ) {
    this.config = config;
    this.model = null;
    this.maxCount = maxCount;
    this.callback = callback

    for (const c of mainClasses) {
      this.detectedCount.set(c.toLowerCase(), 0)
    }
  }

  private warmupModel(): void {
    const dummyInput = tf.ones(this.model!.inputs[0].shape!);
    this.model!.execute(dummyInput);
  }

  private reset(): void {
    for (const k of this.detectedCount.keys()) {
      this.detectedCount.set(k, 0)
    }
  }

  private rate(): string | null {
    const keys = Array.from(this.detectedCount.keys())
    const value = Array.from(this.detectedCount.values())
    if (Math.max(...value) > this.maxCount) {
      const maxIdx = tf.tensor(value).argMax()
      const idx = maxIdx.dataSync().at(0)!
      return keys[idx]
    }
    return null
  }

  private updateCount(obName: string) {
    obName = obName.toLowerCase()
    if (this.detectedCount.has(obName)) {
      const cls = this.detectedCount.get(obName)!
      this.detectedCount.set(obName, cls + 1)
    }
  }


  public async loadModel(): Promise<void> {
    try {
      this.model = await tf.loadGraphModel(this.config.modelPath);
      this.warmupModel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load model: ${errorMessage}`);
    }
  }

  private prepareInput(dataSource: HTMLVideoElement) {
    let ratioX: number = 1;
    let ratioY: number = 1;

    const inputData: tf.Tensor4D = tf.tidy(() => {
      const image = tf.browser.fromPixels(dataSource);
      const [h, w] = image.shape.slice(0, 2);

      const maxSize = Math.max(w, h);
      const imgPadded = image.pad([
        [0, maxSize - h],
        [0, maxSize - w],
        [0, 0],
      ]);

      ratioX = maxSize / w;
      ratioY = maxSize / h;

      return tf.image.resizeBilinear(
        imgPadded as tf.Tensor4D,
        [this.config.inputWidth, this.config.inputHeight]
      ).div(255.0).expandDims(0);
    });
    return [inputData, ratioX, ratioY];
  }

  public async detect(dataSource: HTMLVideoElement, canvas: HTMLCanvasElement, callback: () => Promise<void>) {
    tf.engine().startScope();
    const [inputData, ratioX, ratioY] = this.prepareInput(dataSource);
    const prediction: tf.Tensor = this.model!.predict(inputData as tf.Tensor) as tf.Tensor;

    const result = prediction.squeeze();
    const transposed = result.transpose();

    const boxes = tf.tidy(() => {
      const centerX = transposed.slice([0, 0], [-1, 1]);
      const centerY = transposed.slice([0, 1], [-1, 1]);
      const w = transposed.slice([0, 2], [-1, 1]);
      const h = transposed.slice([0, 3], [-1, 1]);

      const x1 = tf.sub(centerX, tf.div(w, 2));
      const y1 = tf.sub(centerY, tf.div(h, 2));
      const x2 = tf.add(x1, w);
      const y2 = tf.add(y1, h);

      return tf.concat([x1, y1, x2, y2], 1);
    });

    const [scores, classes] = tf.tidy(() => {
      const rawScores = transposed.slice([0, 4], [-1, this.config.classes.length]).squeeze();
      return [rawScores.max(1), rawScores.argMax(1)];
    });

    const nms = await tf.image.nonMaxSuppressionAsync(
      boxes as tf.Tensor2D,
      scores,
      this.config.maxDetections,
      this.config.iouThreshHold,
      this.config.scoreThreshHold
    );

    const classesRaw = classes.gather(nms, 0)
    const mask = tf.all(tf.notEqual(classesRaw.reshape([-1, 1]), EXCLUDE_CLASSES_INDEXES), 1);
    const filteredClasses = await tf.booleanMaskAsync(classesRaw, mask);
    const indices = await tf.whereAsync(mask)
    const boxesData = (boxes.gather(nms, 0)).gather(indices, 0).dataSync();
    const classesData = filteredClasses.dataSync();
    const scoresData = (scores.gather(nms, 0)).gather(indices, 0).dataSync();

    if (scoresData.length > 0) {
      const highestScore = tf.topk(scoresData, 1)
      const highestScoreIdx = highestScore.indices
      const highestClass = classesData[highestScoreIdx.dataSync()[0]]
      this.updateCount(DATA_CLASS[highestClass])
    }

    renderBoxes(canvas, boxesData as Float32Array, scoresData, classesData, [ratioX, ratioY]);

    tf.dispose([prediction, transposed, boxes, scores, classes, nms]);

    callback();

    tf.engine().endScope();
  }

  public async detectVideoFrame(source: HTMLVideoElement, canvas: HTMLCanvasElement) {
    const detectSingleFrame = async () => {
      if ((source.videoWidth === 0 && source.srcObject === null)) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
      }
      if (this.rate()) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        await this.callback(this.rate()!)
        this.reset()
        return;
      }
      await this.detect(source, canvas, async () => {
        requestAnimationFrame(detectSingleFrame);
      });
    };
    await detectSingleFrame();
  }
}
