import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PhoneOff, CameraOff, Video, VideoOff } from "lucide-react";

interface VideoCallScreenProps {
  onEnd: () => void;
  seconds: number;
  onVideoReady?: () => void;
}

const VideoCallScreen = ({ onEnd, seconds, onVideoReady }: VideoCallScreenProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Enter fullscreen to hide browser chrome
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    }
    requestAnimationFrame(() => setFadeIn(true));

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Wait for next render so videoRef is mounted
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraOn, startCamera, stopCamera]);

  // Re-attach stream to video element when cameraOn becomes true
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (modelVideoRef.current) {
      modelVideoRef.current.play().catch(() => {});
    }
  }, []);

  const handleEnd = useCallback(() => {
    // Exit fullscreen before ending
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    stopCamera();
    onEnd();
  }, [onEnd, stopCamera]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col h-screen max-w-lg mx-auto bg-black relative overflow-hidden transition-opacity duration-1000 ease-out",
        fadeIn ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Model video area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={modelVideoRef}
          src="/videos/bruninha-call.mp4"
          autoPlay
          loop
          playsInline
          muted
          className="w-full h-full object-cover"
          onCanPlay={() => { modelVideoRef.current?.play().catch(() => {}); onVideoReady?.(); }}
        />
        {/* Overlay with name and timer */}
        <div className="absolute top-4 left-0 right-0 text-center" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <h2 className="text-white text-lg font-semibold drop-shadow-lg">Bruninha 🔥</h2>
          <p className="text-white/80 text-xs font-mono mt-1 drop-shadow-lg">{formatTime(seconds)}</p>
        </div>
      </div>

      {/* User camera PIP */}
      <div className="absolute bottom-32 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 bg-gray-900 shadow-2xl">
        {cameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <CameraOff className="w-7 h-7 text-white/40" />
            <span className="text-white/30 text-[10px]">Câmera off</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="absolute bottom-0 left-0 right-0 pb-10 pt-6 flex justify-center gap-6 bg-gradient-to-t from-black/90 to-transparent"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${
            cameraOn ? "bg-white/20" : "bg-white/10 border border-white/20"
          }`}
        >
          {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
        <button
          onClick={handleEnd}
          className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-white shadow-lg"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallScreen;
