import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, ScanLine, X } from 'lucide-react';

interface ImageDropzoneProps {
  onImageSelect: (imageDataUrl: string) => void;
  isArabic: boolean;
  isProcessing: boolean;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onImageSelect,
  isArabic,
  isProcessing,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setSelectedImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleClear = () => {
    setSelectedImage(null);
  };

  const handleConfirmProcess = () => {
    if (selectedImage) {
      onImageSelect(selectedImage);
    }
  };

  return (
    <section className="w-full bg-white dark:bg-[#151D1C] rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-zinc-800">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          {isArabic ? 'مسح صورة من الجهاز' : 'Scan Image File'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isArabic
            ? 'اختر صورة من المعرض أو اسحبها هنا لاستخراج النصوص والمعادلات.'
            : 'Pick a photo from your gallery or drop an image to extract text and equations.'}
        </p>
      </div>

      {!selectedImage ? (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-2xl px-5 py-10 sm:py-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/30'
              : 'border-stone-300 dark:border-zinc-700 bg-stone-50/70 dark:bg-[#0E1413] hover:border-teal-600/70 dark:hover:border-teal-500/70'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/70 flex items-center justify-center mb-4 text-teal-700 dark:text-teal-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 text-center">
            {isArabic ? 'اضغط لاختيار صورة من الهاتف أو الجهاز' : 'Tap to choose an image or drop here'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 text-center">
            {isArabic ? 'PNG · JPG · WEBP · صور الكتب والسبورة' : 'PNG · JPG · WEBP · Notes & Textbooks'}
          </p>
          <span className="min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center justify-center active:scale-[0.98] transition-all">
            {isArabic ? 'اختيار من المعرض' : 'Choose from Gallery'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-[#0A0F0E] aspect-video flex items-center justify-center p-2">
            <img
              src={selectedImage}
              alt="Selected document"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/90 dark:bg-zinc-900/90 text-slate-700 dark:text-slate-200 border border-stone-200 dark:border-zinc-700 active:scale-95 transition-all"
              title={isArabic ? 'إزالة الصورة' : 'Remove Image'}
              aria-label={isArabic ? 'إزالة الصورة' : 'Remove Image'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              onClick={handleClear}
              className="min-h-[48px] px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-sm font-semibold active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {isArabic ? 'تغيير الصورة' : 'Change Image'}
            </button>

            <button
              onClick={handleConfirmProcess}
              disabled={isProcessing}
              className="min-h-[48px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <ScanLine className="w-5 h-5" />
              {isArabic ? 'بدء المسح الآن' : 'Scan Document'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
