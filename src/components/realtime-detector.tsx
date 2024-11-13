import { Button } from '@/components/ui/button';
import { DATA_CLASS, INCLUDE_CLASSES } from '@/constants/classes';
import { useToast } from '@/hooks/use-toast';
import { ObjectDetectionModel } from '@/lib/detectObject';
import { Camera } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import "./WebcamStream.css";

interface WebcamStreamProps {
  initiallyActive?: boolean;
  videoPath?: string
}

const WebcamStream: React.FC<WebcamStreamProps> = ({ initiallyActive = false, videoPath }) => {
  const camRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCamOpen, setCamOpen] = useState(false);
  const [isLoaded, setLoaded] = useState<boolean>(false);
  const { toast } = useToast();



  const [model] = useState<ObjectDetectionModel>(new ObjectDetectionModel(
    {
      inputWidth: 640,
      inputHeight: 640,
      maxDetections: 50,
      iouThreshHold: 0.4,
      scoreThreshHold: 0.4,
      classes: DATA_CLASS,
      modelPath: "model_yolov8s-oiv7_js/model.json",
    },
    20,
    INCLUDE_CLASSES,
    async (obName: string) => {
      stopWebcam();
      videoRef.current!.src = `${window.location.href}${videoPath}/${obName.toLowerCase()}.mp4`; // set video source
      videoRef.current!.addEventListener("ended", () => {
        videoRef.current!.src = ""; // restore video source
        videoRef.current!.style.display = "none";
      }) // add ended video listener
      videoRef.current!.style.display = "block";
    }));

  const constraints = {
    audio: false,
    video: {
      width: 1280, // Higher resolution for better capture
      height: 720,
      facingMode: "environment"
    }
  };

  const startWebcam = async (): Promise<void> => {
    try {
      const camVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (camRef.current) {
        camRef.current.srcObject = camVideoStream;
        camRef.current.style.display = "block";
      }
      setCamOpen(true);
    } catch {
      toast({
        title: "Cannot open webcam",
        description: 'Failed to access webcam. Please make sure you have granted camera permissions.',
        variant: "destructive"
      });
    }
  };

  const stopWebcam = (): void => {
    if (camRef.current && camRef.current.srcObject) {
      (camRef.current.srcObject as MediaStream).getTracks().forEach((track) => {
        track.stop();
      });
      camRef.current.srcObject = null;
      camRef.current!.style.display = "none";
      setCamOpen(false);
    }
  };

  useEffect(() => {
    model.loadModel().then(() => {
      setLoaded(true);
      if (initiallyActive) {
        startWebcam();
      }
    }).catch((e) => toast({
      description: `${e}`,
      title: "Load Model Error",
      variant: "destructive"
    }));

    return () => {
      stopWebcam();
    };
  }, [initiallyActive]);

  if (!isLoaded) {
    return (
      <div className="loading-container">
        <div role="status" className="loading">
          <svg aria-hidden="true" className="loading-icon" viewBox="0 0 100 101">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span>Loading Model...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen-container">
      <div className="header">
        <Camera className="header-icon" />
        <span className="header-title">Webcam</span>
      </div>

      <div className="video-container">
        <video
          ref={camRef}
          autoPlay
          muted
          onPlay={async () => await model.detectVideoFrame(camRef.current!, canvasRef.current!)}
          className="video-feed"
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          className="video-feed"
        />

        <canvas className="overlay-canvas" width={640} height={640} ref={canvasRef} />
      </div>

      <div className="button-container">
        {!isCamOpen ? (
          <Button onClick={startWebcam} className="control-button">Start Camera</Button>
        ) : (
          <Button onClick={stopWebcam} variant="destructive" className="control-button">Stop Camera</Button>
        )}
      </div>
    </div>
  );
};

export default WebcamStream;
