'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { FALLBACK_IMAGE_URL } from '@/lib/constants';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string;
  className?: string;
}

export default function ImageUpload({
  onImageUploaded,
  currentImageUrl = '',
  className = '',
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // إنشاء معاينة مباشرة عند اختيار ملف
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صحيح');
      return;
    }

    // التحقق من حجم الملف (5MB كحد أقصى)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setSelectedFile(file);
    setUploadError('');

    // إنشاء معاينة مباشرة
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // رفع الصورة تلقائياً
    uploadImage(file);
  };

  // رفع الصورة إلى السيرفر
  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع الصورة');
      }

      const data = await response.json();

      // إرسال الرابط إلى الـ parent component
      onImageUploaded(data.url);

      // تنظيف المعاينة المحلية
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(data.url);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('حدث خطأ أثناء رفع الصورة. جرب مرة أخرى.');

      // تنظيف المعاينة المحلية في حالة الخطأ
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // إعادة اختيار ملف
  const handleRetry = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // إزالة الصورة
  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadError('');
    onImageUploaded('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // تنظيف المعاينة المحلية عند unmount
  const cleanup = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // تنظيف عند تغيير الصورة
  if (
    previewUrl &&
    previewUrl.startsWith('blob:') &&
    currentImageUrl &&
    currentImageUrl !== previewUrl
  ) {
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl(currentImageUrl);
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* عنوان القسم */}
      <div>
        <label className="block text-lg font-bold text-black mb-2">
          صورة المنتج
        </label>
        <p className="text-sm text-gray-600">
          اختر صورة من جهازك (JPG, PNG, GIF - أقل من 5MB)
        </p>
      </div>

      {/* منطقة رفع الملف */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
            ${
              isUploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-yellow-400 hover:border-yellow-600 hover:bg-yellow-50'
            }
          `}
        >
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="text-gray-600 font-medium">جاري رفع الصورة...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl text-yellow-600">📷</div>
              <p className="text-gray-700 font-medium">
                {previewUrl ? 'انقر لتغيير الصورة' : 'انقر لاختيار صورة'}
              </p>
              <p className="text-sm text-gray-500">أو اسحب الصورة هنا</p>
            </div>
          )}
        </div>
      </div>

      {/* رسالة الخطأ */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{uploadError}</p>
          <button
            onClick={handleRetry}
            className="text-red-600 hover:text-red-800 text-sm font-medium mt-1"
          >
            جرب مرة أخرى
          </button>
        </div>
      )}

      {/* معاينة الصورة */}
      {(previewUrl || currentImageUrl) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-black">معاينة الصورة</h4>
            <button
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              إزالة الصورة
            </button>
          </div>

          <div className="relative w-full max-w-xs mx-auto">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
              <Image
                src={previewUrl || currentImageUrl}
                alt="معاينة المنتج"
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
                onError={() => {
                  // في حالة فشل تحميل الصورة، استخدم صورة افتراضية
                  setPreviewUrl(FALLBACK_IMAGE_URL);
                }}
              />
            </div>

            {/* مؤشر التحميل */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* معلومات الملف */}
          {selectedFile && (
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium">
                تم اختيار: {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                الحجم: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* معلومات إضافية */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-700 text-sm">
          💡 <strong>نصيحة:</strong> استخدم صور عالية الجودة بحجم 500×500 بكسل
          أو أكبر للحصول على أفضل نتيجة.
        </p>
      </div>
    </div>
  );
}
