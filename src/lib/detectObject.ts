import * as tf from '@tensorflow/tfjs';
import { SCAVENGER_CLASSES } from '../constants/gg_classes';

const PREPROCESS_DIVISOR = tf.scalar(255 / 2);
const VIDEO_PIXELS = 224; // Model input size (224x224)

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
  private detectedCount: Map<string, number> = new Map();
  private maxCount: number = 0;
  private onRate: (obName: string) => Promise<void>;

  constructor(
    config: Required<ModelConfig>,
    maxCount: number = 20,
    callback: (obName: string) => Promise<void>
  ) {
    this.config = config;
    this.model = null;
    this.maxCount = maxCount;
    this.onRate = callback;
  }

  /**
   * Load the frozen model
   */
  async load(): Promise<void> {
    this.model = await tf.loadGraphModel(this.config.modelPath);
    console.log("Model loaded successfully");
  }

  /**
   * Preprocess the video frame for prediction
   */
  private preprocessInput(videoElement: HTMLVideoElement): tf.Tensor {
    return tf.tidy(() => {
      // Get the pixels from the video element
      const pixels = tf.browser.fromPixels(videoElement);
  
      // Normalize the pixel values to the range [0, 1] and cast to float32
      const normalizedPixels = pixels.div(255).cast('float32');
  
      // Calculate the center of the video and cropping indices
      const centerHeight = Math.floor(normalizedPixels.shape[0] / 2);
      const beginHeight = Math.floor(centerHeight - (VIDEO_PIXELS / 2));
      const centerWidth = Math.floor(normalizedPixels.shape[1] / 2);
      const beginWidth = Math.floor(centerWidth - (VIDEO_PIXELS / 2));
  
      // Crop the pixels based on calculated indices
      const pixelsCropped = normalizedPixels.slice([beginHeight, beginWidth, 0], [VIDEO_PIXELS, VIDEO_PIXELS, 3]);
  
      // Return the cropped and normalized pixels
      return pixelsCropped;
    });
  }

  /**
   * Warm up the model by running a dummy input
   */
  warmupModel(): void {
    const dummyInput = tf.ones([1, VIDEO_PIXELS, VIDEO_PIXELS, 3]);
    this.predict(dummyInput); // Call predict to initialize tensors
    tf.dispose(dummyInput);
  }

  /**
   * Predict the class probabilities for the input tensor
   */
  predict(input: tf.Tensor): tf.Tensor1D {
    const reshapedInput = input.reshape([1, this.config.inputHeight, this.config.inputWidth, 3]);
    const prediction = this.model!.predict(reshapedInput) as tf.Tensor;
    return prediction.squeeze() as tf.Tensor1D;
  }

  /**
   * Get the top K classes from the predictions
   */
  getTopKClasses(predictions: tf.Tensor1D, topK: number) {
    const values = predictions.dataSync();
    const indices = Array.from(values.keys());

    const sorted = indices
      .map((index) => ({ index, value: values[index] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topK);

    return sorted.map(({ index, value }) => ({
      label: SCAVENGER_CLASSES[index],
      value,
    }));
  }

  /**
   * Run prediction on a single video frame and return top K results
   */
  async detect(videoElement: HTMLVideoElement): Promise<any> {
    return tf.tidy(() => {
      const inputTensor = this.preprocessInput(videoElement);
      const prediction = this.predict(inputTensor);
      const topK = this.getTopKClasses(prediction, 5); // Get top 5 predictions
      tf.dispose([inputTensor, prediction]);
      return topK;
    });
  }

  /**
   * Continuously process video frames and call the callback with predictions
   */
  async detectVideoFrame(videoElement: HTMLVideoElement, callback: (result: any) => void) {
    const processFrame = async () => {
      if (!videoElement || videoElement.videoWidth === 0) {
        return; // Skip processing if the video is not ready
      }

      const predictions = await this.detect(videoElement);

      // Log the object with the highest score
      if (predictions.length > 0) {
        const highestScore = predictions[0]; // The first item is the highest
        console.log("Highest Score Object:", highestScore.label, "with score:", highestScore.value);
      }

      callback(predictions);

      // Continue processing on the next animation frame
      requestAnimationFrame(processFrame);
    };

    processFrame(); // Start the frame processing
  }
}
