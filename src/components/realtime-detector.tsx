import { Button } from '@/components/ui/button';
import { DATA_CLASS, INCLUDE_CLASSES } from '@/constants/classes';
import { MODEL_FILE_PATH } from '@/constants/constants';
import { useToast } from '@/hooks/use-toast';
import { ObjectDetectionModel } from '@/lib/detectObject';
import React, { useEffect, useRef, useState } from 'react';
import "./WebcamStream.css";
import {camera, VIDEO_PIXELS} from '../lib/camera';

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
  // const [detectedClasses, setDetectedClasses] = useState<string[]>([])
  const [ratedClass, setRatedClass] = useState<string | null>(null)
  const { toast } = useToast();
  //timer section
  const [timer, setTimer] = useState(20); // Countdown timer state
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Timer reference to clear interval

  const showVideo = async (obName: string) => {
    if (INCLUDE_CLASSES.includes(obName)) {
      stopWebcam(); // Stop the webcam
      if (videoRef.current) {
        videoRef.current.src = `${window.location.href}${videoPath}/${obName.toLowerCase()}.mp4`; // Set video source
        videoRef.current.style.display = "block";
        camera.camRef.current!.style.display = "none"
        videoRef.current.play();

        if (videoRef.current) {
          videoRef.current.onended = async () => {
            if (videoRef.current) {
              videoRef.current.style.display = "none";
              videoRef.current.src = "";
              camera.camRef.current!.style.display = "block"
              await camera.setupCamera;
            }
          };
        }
      }
    }
  }

  const [model] = useState<ObjectDetectionModel>(
    new ObjectDetectionModel(
      {
        inputWidth: 224,
        inputHeight: 224,
        maxDetections: 50,
        iouThreshHold: 0.3,
        scoreThreshHold: 0.7,
        classes: DATA_CLASS,
        modelPath: MODEL_FILE_PATH,
      },
      20,
      // INCLUDE_CLASSES,
      async (obName: string) => {
        setRatedClass(obName)
      },
      // (detectedClasses: string[]) => {
      //   setDetectedClasses(detectedClasses)
      // }
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

  // const startWebcam = async (): Promise<void> => {
  //   try {
  //     const camVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
  //     if (camera.camRef.current && !camera.camRef.current.srcObject) {
  //       camera.camRef.current.srcObject = camVideoStream;
  //       camera.camRef.current.style.display = 'block';
  //     }
  //   } catch {
  //     toast({
  //       title: 'Cannot open webcam',
  //       description: 'Failed to access webcam. Please ensure you have granted camera permissions.',
  //       variant: 'destructive',
  //     });
  //   }
  // };

  const stopWebcam = (): void => {
    if (camera.camRef.current && camera.camRef.current.srcObject) {
      (camera.camRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      camera.camRef.current.srcObject = null;
      setCamOpen(false);
    }
  };

  const switchToLearningMode = () => {
    setMode('Learning');
    setDetecting(true); // Enable detection
    toast({ title: 'Learning Mode Activated', description: 'Show objects to learn.' });
    // setDetectedClasses([])
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
      // setDetectedClasses([])
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
      toast({ title: `Find: ${nextObject} `, duration: Infinity });

      if (INCLUDE_CLASSES.includes(nextObject)) {
        showVideo(nextObject)
      }
      resetTimer(); // Reset the timer for the new object
    }
  };
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current); // Clear any existing timer
    setTimer(20); // Reset the timer to 20 seconds
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!); // Clear timer when it reaches 0
          chooseNextObject(); // Move to the next object
          return 0;
        }
        return prev - 1; // Decrement the timer
      });
    }, 1000); // Decrease timer every second
  };
  const verifyObject = (detectedObject: string) => {
    if (currentObject && detectedObject === currentObject) {
      setScore((prev) => prev + 1);
      toast({
        title: 'Correct!',
        description: `You identified: ${currentObject}`,
        className: 'toast-correct',
      });
      setPreviousObject(currentObject);
      setCurrentObject(null);
      clearInterval(timerRef.current!); // Stop the timer
      setTimeout(() => {
        chooseNextObject();
      }, 2000);
    }
  };
  useEffect(() => {
    if (mode !== 'Game') {
      if (timerRef.current) clearInterval(timerRef.current); // Stop timer if not in GameMode
    }
  }, [mode]);

  useEffect(() => {
    model
      .load()
      .then(() => {
        model.warmupModel();
        setLoaded(true);
        camera.setupCamera();
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
    if (isDetecting && camera.camRef.current) {
      model.detectVideoFrame(camera.camRef.current, (predictions) => {
        console.log('Predictions:', predictions);
      }, 2000);
    }
  };
  useEffect(() => {
    runDetect()
  }, [isDetecting]);


  // useEffect(() => {
  //   if (detectedClasses.length) {
  //     if (mode === "Learning") {
  //       setLearnedObjects((prev) => {
  //         const newClasses = detectedClasses.filter((cls) => !prev.includes(cls));
  //         return [...prev, ...newClasses];
  //       });
  //     }
  //     else if (mode === "Game") {
  //       verifyObject(detectedClasses)
  //     }
  //   }
  // }, [detectedClasses, detectedClasses.length, mode])


  const skipObject = () => {
    toast({ title: 'Skipped!', description: `You skipped: ${currentObject}` });
    chooseNextObject();
  };

  useEffect(() => {
    console.log(mode, ratedClass)
    if (mode === "Learning" && ratedClass !== null) {
      setLearnedObjects((prev) => {
        // Check if the object already exists in the list
        if (!prev.includes(ratedClass)) {
          return [...prev, ratedClass];
        }
        return prev; // Return the same list if the object is already present
      });
      if (INCLUDE_CLASSES.includes(ratedClass)) {
        showVideo(ratedClass); // Show video if it exists
      } else {
        console.log(`Object ${ratedClass} does not have a video.`);
      }
      showVideo(ratedClass)
    }
    else if (mode === "Game" && ratedClass !== null) {
      verifyObject(ratedClass)
    }
    else {
      runDetect()
    }

    setRatedClass(null)
  }, [ratedClass, mode])



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
          {mode === 'Game' && <p>Time Left: {timer}s</p>}
        </div>
        <div className="header-right">
          <Button onClick={() => {
            setMode("Welcome")
            camera.setupCamera()
          }} className="control-button" disabled={isCamOpen}>
            Open Camera
          </Button>
          <Button onClick={switchToLearningMode} className="control-button">Learning Mode</Button>
          <Button onClick={switchToGameMode} className="control-button">Game Mode</Button>
          <Button onClick={skipObject} className="control-button" disabled={mode !== 'Game'}>
            Skip
          </Button>
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
            ref={camera.camRef}
            autoPlay
            onPlay={runDetect}
            muted
            playsInline 
            disablePictureInPicture
            className="video-feed"
          />
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline 
            disablePictureInPicture
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
              {learnedObjects.map((object, index) => {
                const isNew = index === learnedObjects.length - 1;
                return (
                  <li
                    key={index}
                    className={`learned-object-item ${isNew ? 'new-object' : ''}`}
                  >
                    {object}
                  </li>
                );
              })}
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
