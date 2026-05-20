/**
 * CameraCapture — reusable photo capture component
 *
 * Props:
 *   onCapture(files: File[])  — called with one or more captured/selected images
 *   label     string          — button label (default "Take Photo")
 *   multiple  bool            — allow multiple captures (default false)
 *   variant   'button'|'tile' — visual style (default 'button')
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Check, RotateCcw, Loader2 } from 'lucide-react';

function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ── Live webcam panel (desktop) ───────────────────────────────────────────────
function WebcamPanel({ onCapture, onClose, multiple }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [snapped, setSnapped] = useState([]); // array of dataURLs
  const [facingMode, setFacingMode] = useState('environment'); // 'environment'=rear, 'user'=front
  const [error, setError] = useState('');

  const startCamera = useCallback(async (facing) => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (e) {
      setError('Camera access denied or unavailable. Use the file upload option instead.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const flipCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (!multiple) {
      // Immediately confirm single photo
      const file = dataURLtoFile(dataUrl, `photo-${Date.now()}.jpg`);
      onCapture([file]);
      onClose();
    } else {
      setSnapped(prev => [...prev, dataUrl]);
    }
  };

  const removeSnap = (i) => setSnapped(prev => prev.filter((_, j) => j !== i));

  const confirmAll = () => {
    const files = snapped.map((d, i) => dataURLtoFile(d, `photo-${Date.now()}-${i}.jpg`));
    onCapture(files);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-bold text-foreground">Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={flipCamera}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60 transition-colors"
              title="Flip camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video feed */}
        <div className="relative bg-black aspect-video">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm font-mono text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {/* Snap button */}
        {!error && (
          <div className="px-4 py-4 flex items-center justify-center gap-4 bg-card border-t border-border">
            <button
              onClick={snap}
              disabled={!ready}
              className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-lg hover:bg-primary/10 transition-colors disabled:opacity-40 flex items-center justify-center"
              title="Take photo"
            >
              <Camera className="w-6 h-6 text-primary" />
            </button>
          </div>
        )}

        {/* Snapped previews (multi-photo mode) */}
        {snapped.length > 0 && (
          <div className="px-4 pb-4 space-y-3 border-t border-border">
            <div className="flex gap-2 flex-wrap pt-3">
              {snapped.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt={`Snap ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeSnap(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white"
                  ><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <Button onClick={confirmAll} className="w-full gap-2 text-sm">
              <Check className="w-4 h-4" /> Use {snapped.length} Photo{snapped.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function CameraCapture({
  onCapture,
  label = 'Take Photo',
  multiple = false,
  variant = 'button',
}) {
  const [showWebcam, setShowWebcam] = useState(false);
  const mobileInputRef = useRef(null);

  // Detect mobile — camera input with capture attr is better on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleMobileCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onCapture(files);
    e.target.value = ''; // reset so same photo can be retaken
  };

  const handleClick = () => {
    if (isMobile) {
      mobileInputRef.current?.click();
    } else {
      setShowWebcam(true);
    }
  };

  return (
    <>
      {/* Hidden native camera input for mobile */}
      <input
        ref={mobileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={handleMobileCapture}
      />

      {variant === 'tile' ? (
        <button
          onClick={handleClick}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-lg p-5 hover:border-primary/70 hover:bg-primary/5 transition-colors w-full cursor-pointer"
        >
          <Camera className="w-6 h-6 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">{label}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Opens device camera</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          className="gap-1.5 text-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          {label}
        </Button>
      )}

      {showWebcam && (
        <WebcamPanel
          onCapture={onCapture}
          onClose={() => setShowWebcam(false)}
          multiple={multiple}
        />
      )}
    </>
  );
}
