class WebcamHandler {
    private videoElement: HTMLVideoElement | null;
    private constraints: MediaStreamConstraints;

    constructor(videoElement: HTMLVideoElement | null, constraints?: MediaStreamConstraints) {
        this.videoElement = videoElement;
        this.constraints = constraints || {
            audio: false,
            video: { width: { ideal: 2560 }, height: { ideal: 1440 }, facingMode: 'environment' },
        };
    }

    async startWebcam(): Promise<void> {
        if (!this.videoElement) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.videoElement.srcObject = stream;
            this.videoElement.style.display = 'block';
        } catch (error) {
            throw new Error('Failed to access webcam: Please ensure camera permissions are granted.');
        }
    }

    stopWebcam(): void {
        if (!this.videoElement || !this.videoElement.srcObject) return;
        const stream = this.videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        this.videoElement.srcObject = null;
        this.videoElement.style.display = 'none';
    }
}
export default WebcamHandler; // Default export
