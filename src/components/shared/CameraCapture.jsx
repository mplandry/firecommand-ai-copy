/**
 * CameraCapture — reusable photo capture component
 *
 * On mobile: native camera via <label> wrapping input (works on iOS Safari)
 * On desktop: live webcam panel with snap button
 *
 * Props:
 *   onCapture(files: File[])  — called with captured images
 *   label     string          — button label (default "Take Photo")
 *   multiple  bool            — allow multiple captures (default false)
 *   variant   'button'|'tile' — visual style (default 'button')
 *   inputId   string          — unique id if multiple instances on same page
 */
import React, { useRef, useState, useEffect, useCallback, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, RotateCcw, Loader2 } from 'lucide-react';

function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ── Desktop webcam panel ──────────────────────────────────────────────────────
function WebcamPanel({ onCapture, onClose, multiple }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [snapped, setSnapped] = useState([]);
  const [facingMode, setFacingMode] = useState('user');
  const [error, setError] = useState('');

  const startCamera = useCallback(async (facing) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setReady(true);
          } catch {
            setReady(true);
          }
        };
      }
    } catch {
      setError('Camera access denied. Grant camera permission in your browser settings, then try again.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const flip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (!multiple) {
      onCapture([dataURLtoFile(dataUrl, `photo-${Date.now()}.jpg`)]);
      onClose();
    } else {
      setSnapped(prev => [...prev, dataUrl]);
    }
  };

  const confirmAll = () => {
    onCapture(snapped.map((d, i) => dataURLtoFile(d, `photo-${Date.now()}-${i}.jpg`)));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-bold">Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={flip} className="p-1.5 text-muted-foreground hover:text-foreground rounded" title="Flip">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm font-mono text-red-400">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {!ready && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <p className="text-xs font-mono text-muted-foreground">Starting camera…</p>
                </div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {!error && (
          <div className="px-4 py-5 flex items-center justify-center bg-card border-t border-border">
            <button
              onClick={snap}
              disabled={!ready}
              className="w-20 h-20 rounded-full bg-white border-4 border-primary shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-primary" />
            </button>
          </div>
        )}

        {snapped.length > 0 && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <div className="flex gap-2 flex-wrap">
              {snapped.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSnapped(p => p.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-white"
                  ><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <Button onClick={confirmAll} className="w-full gap-2">
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
  const uid = useId();
  const inputId = `camera-capture-${uid}`;
  const [showWebcam, setShowWebcam] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onCapture(files);
    e.target.value = '';
  };

  // Mobile: <label> directly triggers the input — no JS click needed (works on iOS)
  // Desktop: open webcam panel
  if (isMobile) {
    return (
      <>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={multiple}
          className="sr-only"
          onChange={handleFileChange}
        />
        {variant === 'tile' ? (
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-lg p-5 hover:border-primary/70 hover:bg-primary/5 transition-colors w-full cursor-pointer"
          >
            <Camera className="w-6 h-6 text-primary" />
            <span className="text-sm font-mono font-semibold text-foreground">{label}</span>
            <span className="text-[10px] font-mono text-muted-foreground">Opens device camera</span>
          </label>
        ) : (
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-border bg-background hover:bg-secondary cursor-pointer font-mono transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {label}
          </label>
        )}
      </>
    );
  }

  // Desktop — webcam panel
  return (
    <>
      {variant === 'tile' ? (
        <button
          type="button"
          onClick={() => setShowWebcam(true)}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-lg p-5 hover:border-primary/70 hover:bg-primary/5 transition-colors w-full cursor-pointer"
        >
          <Camera className="w-6 h-6 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">{label}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Opens webcam</span>
        </button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowWebcam(true)} className="gap-1.5 text-xs">
          <Camera className="w-3.5 h-3.5" /> {label}
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
