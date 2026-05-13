'use client'

import React, { useState, useRef, useCallback } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function VideoRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data])
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access camera or microphone.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const downloadVideo = useCallback(() => {
    if (recordedChunks.length === 0) return
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    document.body.appendChild(a)
    a.style.display = 'none'
    a.href = url
    a.download = `Flow Media-recording-${Date.now()}.webm`
    a.click()
    window.URL.revokeObjectURL(url)
  }, [recordedChunks])

  return (
    <div className="glass-panel p-6 max-w-2xl mx-auto flex flex-col items-center gap-6">
      <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden relative border border-white/10">
        {!stream && recordedChunks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Camera Preview
          </div>
        )}
        
        {/* Live Preview */}
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className={cn(
            "w-full h-full object-cover",
            (!stream || !isRecording) && "hidden"
          )}
        />

        {/* Playback */}
        {!isRecording && recordedChunks.length > 0 && (
          <video 
            src={URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' }))}
            controls
            className="w-full h-full object-cover"
          />
        )}

        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wider">REC</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
          >
            Stop Recording
          </button>
        )}

        {!isRecording && recordedChunks.length > 0 && (
          <button
            onClick={downloadVideo}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-semibold transition-all"
          >
            Download Video
          </button>
        )}
      </div>
    </div>
  )
}

