import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, ScanLine, AlertCircle } from 'lucide-react';

interface WebcamScannerProps {
  onCapture: (imageDataUrl: string) => void;
  isArabic: boolean;
  isProcessing: boolean;
}

export const WebcamScanner: React.FC<WebcamScannerProps> = ({
  onCapture,
  isArabic,
  isProcessing,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        isArabic
          ? 'تعذر الوصول إلى الكاميرا. يرجى السماح بصلاحية الكاميرا من إعدادات المتصفح.'
          : 'Could not access camera. Please allow camera permissions.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImage(dataUrl);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleConfirmCapture = () => {
    if (previewImage) {
      onCapture(previewImage);
    }
  };

  const handleRetake = () => {
    setPreviewImage(null);
  };

  return (
    <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            {isArabic ? 'التقاط مباشر بالكاميرا' : 'Camera Document Scanner'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isArabic
              ? 'وجّه الكاميرا نحو الصفحة أو المعادلة واضغط زر الالتقاط.'
              : 'Point your camera at equations or pages and tap the shutter.'}
          </p>
        </div>

        {!previewImage && (
          <button
            onClick={toggleCamera}
            className="min-h-[44px] px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
            title={isArabic ? 'تبديل الكاميرا' : 'Switch Camera'}
          >
            <RefreshCw className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            {isArabic ? 'تبديل' : 'Flip'}
          </button>
        )}
      </div>

      {cameraError ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          <p className="text-sm font-medium">{cameraError}</p>
          <button
            onClick={startCamera}
            className="min-h-[48px] px-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-2xl active:scale-[0.98] transition-all"
          >
            {isArabic ? 'إعادة المحاولة' : 'Retry Permission'}
          </button>
        </div>
      ) : previewImage ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-video bg-black flex items-center justify-center">
            <img src={previewImage} alt="Captured scan" className="max-h-full max-w-full object-contain" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              onClick={handleRetake}
              disabled={isProcessing}
              className="min-h-[48px] px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isArabic ? 'إعادة الالتقاط' : 'Retake Photo'}
            </button>
            <button
              onClick={handleConfirmCapture}
              disabled={isProcessing}
              className="min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <ScanLine className="w-5 h-5" />
              {isArabic ? 'مسح الصورة الآن' : 'Scan Captured Photo'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-video bg-zinc-950 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Clean Android Viewfinder Corner Guides */}
            <div className="absolute inset-6 pointer-events-none">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br-lg" />
            </div>

            <div className="absolute bottom-3 inset-x-4 flex justify-center pointer-events-none">
              <span className="bg-black/65 backdrop-blur-sm text-white text-xs font-medium px-3.5 py-1.5 rounded-xl">
                {isArabic ? 'ضع الورقة أو المعادلة داخل الإطار' : 'Align equation inside frame'}
              </span>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center pt-1">
            <button
              onClick={captureFrame}
              disabled={isProcessing}
              aria-label={isArabic ? 'التقاط صورة' : 'Capture photo'}
              className="flex items-center justify-center w-[68px] h-[68px] rounded-full bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white shadow-lg active:scale-90 transition-transform disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full border-2 border-white/90 dark:border-slate-950/90 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-950" />
              </div>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
