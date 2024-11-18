import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DATA_CLASS, INCLUDE_CLASSES } from '@/constants/classes';
import { useToast } from '@/hooks/use-toast';
import { ObjectDetectionModel } from '@/lib/detectObject';
import { Camera } from 'lucide-react';
import "./WebcamStream.css";
import { MODEL_FILE_PATH } from '@/constants/constants';

const WebcamStream: React.FC<{ initiallyActive?: boolean; videoPath?: string }> = ({
  initiallyActive = false,
  videoPath,
}) => {
  const camRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCamOpen, setCamOpen] = useState(false);
  const [isLoaded, setLoaded] = useState(false);
  const [isDetecting, setDetecting] = useState(false);
  const [learnedObjects, setLearnedObjects] = useState<string[]>([]);
  const [currentObject, setCurrentObject] = useState<string | null>(null);
  const [previousObject, setPreviousObject] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<'Welcome' | 'Learning' | 'Game'>('Welcome');
  const [showHints, setShowHints] = useState(false);
  const { toast } = useToast();

  const [model] = useState<ObjectDetectionModel>(
    new ObjectDetectionModel(
      {
        inputWidth: 640,
        inputHeight: 640,
        maxDetections: 50,
        iouThreshHold: 0.4,
        scoreThreshHold: 0.6,
        classes: DATA_CLASS,
        modelPath: MODEL_FILE_PATH,
      },
      20,
      INCLUDE_CLASSES,
      async (obName: string) => {
        // Stop webcam, play detected object's video, and restart webcam
        stopWebcam(); // Stop the webcam
        if (videoRef.current) {
          videoRef.current.src = `${window.location.href}${videoPath}/${obName.toLowerCase()}.mp4`; // Set video source
          console.log(videoRef.current.src);
          videoRef.current.style.display = "block";
          camRef.current!.style.display = "none"
          videoRef.current.play();

          if (videoRef.current) {
            videoRef.current.onended = () => {
              if (videoRef.current) {
                videoRef.current.style.display = "none"; // Hide video when it ends
                videoRef.current.src = ""; // Clear video source
                camRef.current!.style.display = "block"
                startWebcam(); // Restart the webcam
              }
            };
          }

        }
      },

      (detectedClasses: string[]) => {
        setLearnedObjects((prev) => {
          const newClasses = detectedClasses.filter((cls) => !prev.includes(cls));
          return [...prev, ...newClasses];
        });
      }

    )
  );

  const constraints = {
    audio: false,
    video: {
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      facingMode: 'environment',
    },
  };

  const startWebcam = async (): Promise<void> => {
    try {
      const camVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (camRef.current) {
        camRef.current.srcObject = camVideoStream;
        camRef.current.style.display = 'block';
      }
      setCamOpen(true);
    } catch {
      toast({
        title: 'Cannot open webcam',
        description: 'Failed to access webcam. Please ensure you have granted camera permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopWebcam = (): void => {
    if (camRef.current && camRef.current.srcObject) {
      (camRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      camRef.current.srcObject = null;
      setCamOpen(false);
    }
  };

  const handleLearnObject = (object: string) => {
    setLearnedObjects((prev) => {
      if (!prev.includes(object) && object !== 'person') {
        toast({ title: 'Learned New Object', description: `Learned: ${object}`, variant: 'info' });
        return [...prev, object];
      }
      return prev;
    });
  };


  const switchToLearningMode = () => {
    setMode('Learning');
    setDetecting(true); // Enable detection
    toast({ title: 'Learning Mode Activated', description: 'Show objects to learn.', variant: 'info' });
  };

  const switchToGameMode = () => {
    if (learnedObjects.length === 0) {
      toast({
        title: 'No Objects Learned',
        description: 'Please learn objects first in Learning Mode.',
        variant: 'warning',
      });
    } else {
      setMode('Game');
      setDetecting(false); // Disable detection during game mode
      chooseNextObject();
      toast({ title: 'Game Mode Activated', description: 'Identify learned objects.', variant: 'info' });
    }
  };
  const toggleHints = () => setShowHints((prev) => !prev);

  const chooseNextObject = () => {
    const availableObjects = learnedObjects.filter(
      (obj) => obj !== currentObject && obj !== previousObject
    );
    if (availableObjects.length > 0) {
      const nextObject = availableObjects[Math.floor(Math.random() * availableObjects.length)];
      setCurrentObject(nextObject);
      toast({ title: 'Identify This Object', description: `Find: ${nextObject}`, variant: 'info' });
    }
  };

  const skipObject = () => {
    setPreviousObject(currentObject);
    setCurrentObject(null);
    chooseNextObject();
  };

  const verifyObject = (detectedObjects: string[]) => {
    if (currentObject && detectedObjects.includes(currentObject)) {
      setScore((prev) => prev + 1);
      toast({ title: 'Correct!', description: `You identified: ${currentObject}`, variant: 'success' });
      setPreviousObject(currentObject);
      setCurrentObject(null);
      chooseNextObject();
    }
  };

  const detectFrame = async () => {
    if (!camRef.current || !canvasRef.current || !isDetecting) return;

    const detectedObjects: string[] = [];
    await model.detectVideoFrame(camRef.current, canvasRef.current);

    if (mode === 'Learning') {
      detectedObjects.forEach(handleLearnObject);
    } else if (mode === 'Game') {
      verifyObject(detectedObjects);
    }

    if (isDetecting) {
      requestAnimationFrame(detectFrame);
    }
  };



  useEffect(() => {
    startWebcam();
    model
      .loadModel()
      .then(() => {
        setLoaded(true);
        if (initiallyActive) startWebcam();
      })
      .catch((e) =>
        toast({
          description: `${e}`,
          title: 'Load Model Error',
          variant: 'destructive',
        })
      );

    return () => stopWebcam();
  }, [initiallyActive]);

  useEffect(() => {
    if (isDetecting) {
      detectFrame();
    }
  }, [isDetecting]);

  if (!isLoaded) {
    return <div>Loading Model...</div>;
  }

  return (
    <div className="fullscreen-container">
    {/* Header Section */}
    <div className="header">
      <div className="header-left">
        <span className="header-title">Magic Mirror</span>
      </div>
      <div className="header-center">
        <h2>Magic Mirror</h2>
        <p>Mode: {mode}</p>
        <p>Score: {score}</p>
      </div>
      <div className="header-right">
        <Button onClick={switchToLearningMode} className="control-button">Learning Mode</Button>
        <Button onClick={switchToGameMode} className="control-button">Game Mode</Button>
        <Button onClick={toggleHints} className="control-button">
          {showHints ? 'Hide Hints' : 'Show Hints'}
        </Button>
        <Button onClick={stopWebcam} variant="destructive" className="control-button">Quit</Button>
      </div>
    </div>
  
    {/* Main Content: Video and Sidebar */}
    <div className="content-container">
      {/* Video Section */}
      <div className="video-container">
        <video
          ref={camRef}
          autoPlay
          muted
          onPlay={async () => await detectFrame()}
          className="video-feed"
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ display: 'none' }}
          className="video-feed"
        />
        <canvas className="overlay-canvas" width={640} height={640} ref={canvasRef} />
      </div>
  
      {/* Sidebar Section */}
      <div className="learned-objects-section">
        <h3>Learned Objects</h3>
        {learnedObjects.length > 0 ? (
          <ul className="learned-objects-list">
            {learnedObjects.map((object, index) => (
              <li key={index} className="learned-object-item">
                {object}
              </li>
            ))}
          </ul>
        ) : (
          <p>No objects learned yet.</p>
        )}
      </div>
    </div>
  </div>
  

  );
};

export default WebcamStream;
