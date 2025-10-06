import { useRef, useEffect } from 'react'

interface VideoPlayerProps {
  cameraId: string
  onError?: (error: Error) => void
}

const VideoPlayer = ({ cameraId, onError }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    // Use WebRTC port (8889) instead of HLS port (8888)
    const mediamtxUrl = (import.meta as any).env.VITE_MEDIAMTX_URL || 'http://localhost:8889'
    const whepUrl = `${mediamtxUrl.replace(/\/$/, '')}/${cameraId}/whep`

    pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    const startStream = async () => {
      try {
        const pc = pcRef.current
        if (!pc) return

        // Add transceiver for video
        pc.addTransceiver('video', { direction: 'recvonly' })
        
        // Handle incoming track
        pc.ontrack = (event) => {
          console.log('Received track:', event.track.kind)
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0]
          }
        }

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState)
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            onError?.(new Error(`ICE connection ${pc.iceConnectionState}`))
          }
        }

        // Create and set local offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // Wait for ICE gathering to complete (optional but recommended)
        if (pc.iceGatheringState !== 'complete') {
          await new Promise<void>((resolve) => {
            const checkState = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', checkState)
                resolve()
              }
            }
            pc.addEventListener('icegatheringstatechange', checkState)
            // Timeout after 3 seconds
            setTimeout(resolve, 3000)
          })
        }

        // Send offer to MediaMTX
        const resp = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription?.sdp || ''
        })

        if (!resp.ok) {
          const errorText = await resp.text()
          throw new Error(`WHEP failed: ${resp.status} - ${errorText}`)
        }

        // Set remote answer
        const answerSdp = await resp.text()
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp
        }))

        console.log('Stream started successfully for camera:', cameraId)
      } catch (error) {
        console.error(`Error starting stream for camera ${cameraId}:`, error)
        onError?.(error as Error)
      }
    }

    startStream()

    return () => {
      const pc = pcRef.current
      if (pc) {
        try {
          pc.getTransceivers().forEach((t) => {
            if (t.stop) t.stop()
          })
          pc.close()
        } catch (error) {
          console.error('Error cleaning up peer connection:', error)
        }
        pcRef.current = null
      }
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [cameraId, onError])

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      {/* Optional: Add loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-white text-sm opacity-50">Loading stream...</div>
      </div>
    </div>
  )
}

export default VideoPlayer