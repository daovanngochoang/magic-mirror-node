import { Button } from '@/components/ui/button';
import { DATA_CLASS, INCLUDE_CLASSES } from '@/constants/classes';
import { MODEL_FILE_PATH } from '@/constants/constants';
import { useToast } from '@/hooks/use-toast';
import { ObjectDetectionModel } from '@/lib/detectObject';
import React, { useEffect, useRef, useState } from 'react';
import "./WebcamStream.css";

const WebcamStream: React.FC<{ initiallyActive?: boolean; videoPath?: string }> = ({
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
  const [detectedClasses, setDetectedClasses] = useState<string[]>([])
  const { toast } = useToast();
  const showVideo = async (obName: string) => {
    // Stop webcam, play detected object's video, and restart webcam
    stopWebcam(); // Stop the webcam
    if (videoRef.current) {
      videoRef.current.src = `${window.location.href}${videoPath}/${obName.toLowerCase()}.mp4`; // Set video source
      videoRef.current.style.display = "block";
      camRef.current!.style.display = "none"
      videoRef.current.play();

      if (videoRef.current) {
        videoRef.current.onended = async () => {
          if (videoRef.current) {
            videoRef.current.style.display = "none"; // Hide video when it ends
            videoRef.current.src = ""; // Clear video source
            camRef.current!.style.display = "block"
            await startWebcam();
          }
        };
      }
    }
  }

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
      showVideo,
      (detectedClasses: string[]) => {
        setDetectedClasses(detectedClasses)
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
    setMode('Welcome');
    try {
      const camVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (camRef.current && !camRef.current.srcObject) {
        camRef.current.srcObject = camVideoStream;
        camRef.current.style.display = 'block';
      }
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
        return [...prev, object];
      }
      return prev;
    });
    toast({ title: 'Learned New Object', description: `Learned: ${object}` });
  };


  const switchToLearningMode = () => {
    setMode('Learning');
    setDetecting(true); // Enable detection
    toast({ title: 'Learning Mode Activated', description: 'Show objects to learn.' });
    setDetectedClasses([])
  };

  const switchToGameMode = () => {
    if (learnedObjects.length === 0) {
      toast({
        title: 'No Objects Learned',
        description: 'Please learn objects first in Learning Mode.',
        variant: 'destructive',
      });
    } else {
      setMode('Game');
      setDetecting(true); // Disable detection during game mode
      chooseNextObject();
      setDetectedClasses([])
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
      toast({ title: 'Identify This Object', description: `Find: ${nextObject}` });

      if (INCLUDE_CLASSES.includes(nextObject)) {
        showVideo(nextObject)
      }
    }
  };

  const verifyObject = (detectedObjects: string[]) => {
    if (currentObject && detectedObjects.includes(currentObject)) {
      setScore((prev) => prev + 1);
      toast({ title: 'Correct!', description: `You identified: ${currentObject}` });
      setPreviousObject(currentObject);
      setCurrentObject(null);
      chooseNextObject();
    }
  };


  useEffect(() => {
    startWebcam();
    model
      .loadModel()
      .then(() => {
        setLoaded(true);
      })
      .catch((e) =>
        toast({
          description: `${e}`,
          title: 'Load Model Error',
          variant: 'destructive',
        })
      );

    return () => stopWebcam();
  }, []);


  const runDetect = () => {
    if (isDetecting) {
      model.detectVideoFrame(camRef.current!, canvasRef.current!);
    }
  }

  useEffect(() => {
    runDetect()
  }, [isDetecting]);


  useEffect(() => {
    if (detectedClasses.length) {
      if (mode === "Learning") {
        detectedClasses.forEach((c) => {
          handleLearnObject(c)
        })
      }
      else if (mode === "Game") {
        verifyObject(detectedClasses)
      }
    }
  }, [detectedClasses])



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
          <Button onClick={startWebcam} className="control-button" disabled={isCamOpen}>
            Open Camera
          </Button>
          <Button onClick={switchToLearningMode} className="control-button">Learning Mode</Button>
          <Button onClick={switchToGameMode} className="control-button">Game Mode</Button>
          <Button onClick={toggleHints} className="control-button">
            {showHints ? 'Hide Hints' : 'Show Hints'}
          </Button>
          <Button onClick={() => {
            stopWebcam();
            setDetecting(false); // Explicitly stop detecting when Quit is clicked
            setLearnedObjects([]);
          }}
            variant="destructive"
            className="control-button">
            Quit
          </Button>        </div>
      </div>

      {/* Main Content: Video and Sidebar */}
      <div className="content-container">
        {/* Video Section */}
        <div className="video-container">
          <video
            ref={camRef}
            autoPlay
            onPlay={runDetect}
            muted
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
