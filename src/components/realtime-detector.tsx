// WebcamStream.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DATA_CLASS } from '@/constants/classes';
import { useToast } from '@/hooks/use-toast';
import { ObjectDetectionModel } from '@/lib/detectObject';
import { Camera } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface WebcamStreamProps {
  initiallyActive?: boolean;
}

// Type for webcam constraints
interface WebcamConstraints {
  audio: boolean,
  video: {
    width?: number;
    height?: number;
    facingMode: 'user' | 'environment';
  };
}



const WebcamStream: React.FC<WebcamStreamProps> = ({
  initiallyActive = false,
}) => {
  // Refs and state with proper typing
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isCamOpen, setCamOpen] = useState(false)
  const [isLoaded, setLoaded] = useState<boolean>(false)
  const { toast } = useToast()

  const [model,] = useState<ObjectDetectionModel>(new ObjectDetectionModel(
    {
      inputWidth: 640,
      inputHeight: 640,
      maxDetections: 100,
      iouThreshHold: 0.5,
      scoreThreshHold: 0.5,
      classes: DATA_CLASS,
      modelPath: "modeljs/model.json"
    }
  ))
  // Define webcam constraints
  const constraints: WebcamConstraints = {
    audio: false,
    video: {
      width: model.config.inputWidth,
      height: model.config.inputHeight,
      facingMode: "environment"
    }
  };

  // Function to start the webcam
  const startWebcam = async (): Promise<void> => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      setCamOpen(true)
    } catch {
      const errorMessage = 'Failed to access webcam. Please make sure you have granted camera permissions.';
      toast({
        title: "Cannot open webcam",
        description: errorMessage,
        variant: "destructive"

      })
    }
  };

  // Function to stop the webcam
  const stopWebcam = (): void => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => {
        track.stop();
      });
      videoRef.current.srcObject = null;

      setCamOpen(false)
    }

  };

  // Cleanup on component unmount
  useEffect(() => {
    model.loadModel().then(() => {
      setTimeout(() => {
        setLoaded(true)
        // Start webcam if initially active
        if (initiallyActive) {
          startWebcam();
        }
      }, 1000)
    }).catch(
      (e) =>
        toast(
          {
            description: `${e}`,
            title: "Load Model Error",
            variant: "destructive"
          }
        )
    )


    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef!.current!.srcObject as MediaStream).getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [initiallyActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoaded) {
    return (
      <>
        <div className="w-full flex justify-center content-center items-center h-96">
          <div role="status" className="flex flex-col items-center">
            <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
            <span>Loading Model...</span>
          </div>
        </div >
      </>
    )
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Webcam
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 flex flex-col justify-center items-center rounded-lg">
        <div className="relative z-0 rounded-lg bg-slate-100 ">
          <video
            ref={videoRef}
            autoPlay
            muted
            onPlay={async () => await model.detectVideoFrame(videoRef.current!, canvasRef.current!)}
            className="w-[640px] h-[640px] rounded-lg"
          />
          <canvas className='absolute z-30 top-0 left-0 rounded-lg' width={640} height={640} ref={canvasRef} />
        </div>

        <div className="flex justify-center gap-4">
          {!isCamOpen ? (
            <Button
              onClick={startWebcam}
              className="w-32"
            >
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopWebcam}
              variant="destructive"
              className="w-32"
            >
              Stop Camera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebcamStream;
