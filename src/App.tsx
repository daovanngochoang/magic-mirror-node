import { Bot } from 'lucide-react'
import './App.css'
import WebcamStream from './components/realtime-detector'

function App() {
  return (
    <>
      <div className="w-full flex justify-center items-center">
        <div className='space-y-10'>
          <div>
            <div className='flex justify-center items-center gap-4'>
              <Bot className="w-8 h-8" />
              <div className='text-2xl font-semibold'>Real-time Object Detection</div>
            </div>
            <p>Live detection application on browser powered by Tensorflow js and Yolov8n</p>
          </div>
          <WebcamStream />
        </div>
      </div>
    </>
  )
}

export default App
