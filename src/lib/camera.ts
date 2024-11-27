export const VIDEO_PIXELS = 224;

export class Camera {
    private videoElement: HTMLVideoElement;
    private snapShotCanvas: HTMLCanvasElement;
    private aspectRatio: number;

    constructor(videoElement: HTMLVideoElement) {
        this.videoElement = videoElement;
        this.snapShotCanvas = document.createElement('canvas');
        this.aspectRatio =0;

    }

    async setupCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video':{ width: { ideal: 2560 }, height: { ideal: 1440 }, facingMode: 'environment' },
          });
          (<any>window).stream = stream;
          this.videoElement.srcObject = stream;
          return new Promise(resolve => {
            this.videoElement.onloadedmetadata = () => {
              resolve([this.videoElement.videoWidth,
                  this.videoElement.videoHeight]);
            };
          });
        }
    
        return null;
      }
      
      setupVideoDimensions(width: number, height: number) {
        this.aspectRatio = width / height;
    
        if (width >= height) {
          this.videoElement.height = VIDEO_PIXELS;
          this.videoElement.width = this.aspectRatio * VIDEO_PIXELS;
        } else {
          this.videoElement.width = VIDEO_PIXELS;
          this.videoElement.height = VIDEO_PIXELS / this.aspectRatio;
        }
      }
    
    // async startWebcam(): Promise<void> {
    //     if (!this.videoElement) return;
    //     try {
    //         const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    //         this.videoElement.srcObject = stream;
    //         this.videoElement.style.display = 'block';
    //     } catch (error) {
    //         throw new Error('Failed to access webcam: Please ensure camera permissions are granted.');
    //     }
    // }

    stopWebcam(): void {
        if (!this.videoElement || !this.videoElement.srcObject) return;
        const stream = this.videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        this.videoElement.srcObject = null;
        this.videoElement.style.display = 'none';
    }
}
