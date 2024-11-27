export const VIDEO_PIXELS = 224;
import { toast } from 'react-toastify';
import React from 'react'; // <-- This is required

export class Camera {
  camRef: React.RefObject<HTMLVideoElement>;
  snapShotCanvas: HTMLCanvasElement;
  aspectRatio: number;

  constructor() {
    // Initialize camRef as a React ref for HTMLVideoElement
    this.camRef = React.createRef();
    this.snapShotCanvas = document.createElement('canvas');
    this.aspectRatio = 0;
  }

  /**
   * Set up the camera stream and attach it to the camRef (HTMLVideoElement).
   */
  async setupCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 2560 },
            height: { ideal: 1440 },
            facingMode: 'environment',
          },
        });

        // Check if camRef is set, then initialize the video stream
        if (this.camRef.current && !this.camRef.current.srcObject) {
          // Attach the stream to the video element
          this.camRef.current.srcObject = stream;
          this.camRef.current.style.display = 'block'; // Make the video element visible
        }

        // Return promise to resolve video dimensions once metadata is loaded
        return new Promise((resolve) => {
          this.camRef.current!.onloadedmetadata = () => {
            resolve([this.camRef.current!.videoWidth, this.camRef.current!.videoHeight]);
          };
        });
      } catch (error) {
        console.error('Failed to access webcam', error);
        toast({
          title: 'Cannot open webcam',
          description: 'Failed to access webcam. Please ensure you have granted camera permissions.',
          variant: 'destructive',
        });
      }
    } else {
      console.error('getUserMedia is not supported by your browser');
    }
    return null;
  }

  /**
   * Setup video dimensions based on the aspect ratio of the video stream.
   * 
   * @param width - The width of the video stream
   * @param height - The height of the video stream
   */
  setupVideoDimensions(width: number, height: number) {
    this.aspectRatio = width / height;

    // Adjust the video element's dimensions based on the aspect ratio
    if (width >= height) {
      this.camRef.current!.height = VIDEO_PIXELS;
      this.camRef.current!.width = this.aspectRatio * VIDEO_PIXELS;
    } else {
      this.camRef.current!.width = VIDEO_PIXELS;
      this.camRef.current!.height = VIDEO_PIXELS / this.aspectRatio;
    }
  }

  /**
   * Stop the webcam and remove the stream from the video element.
   */
  stopWebcam(): void {
    if (!this.camRef.current || !this.camRef.current.srcObject) return;
    const stream = this.camRef.current.srcObject as MediaStream;
    stream.getTracks().forEach((track) => track.stop()); // Stop all tracks of the stream
    this.camRef.current.srcObject = null; // Remove the stream from the video element
    this.camRef.current.style.display = 'none'; // Hide the video element
  }
}

// Create a single instance of the Camera class
export let camera = new Camera();
