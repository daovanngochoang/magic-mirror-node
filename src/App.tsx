// App.tsx
import { Bot } from 'lucide-react';
import './App.css';
import WebcamStream from './components/realtime-detector';

function App() {
  return (
    <>
      <div className="fullscreen-container">
        <WebcamStream />
        {/* <div className="overlay-content">
          <div className="header">
            <div className="icon-title">
              <Bot className="icon" />
              <div className="title">Real-time Object Detection</div>
            </div>
            <p className="subtitle">Live detection application on browser powered by TensorFlow.js and YOLOv8n</p>
          </div>
        </div> */}
      </div>
    </>
  );
}

export default App;
