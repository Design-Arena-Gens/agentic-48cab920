'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageFile {
  file: File;
  url: string;
}

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [duration, setDuration] = useState<number>(3);
  const [transition, setTransition] = useState<string>('fade');
  const [isCreating, setIsCreating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = imageFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragover');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const createVideo = async () => {
    if (images.length === 0 || !canvasRef.current) return;

    setIsCreating(true);
    setVideoUrl('');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsCreating(false);
    };

    mediaRecorder.start();

    const totalDuration = images.length * duration * 1000;
    const fps = 30;
    const frameDuration = 1000 / fps;
    const imageDuration = duration * 1000;
    const transitionDuration = 500;

    let currentTime = 0;
    const startTime = Date.now();

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const loadedImages = await Promise.all(
      images.map(img => loadImage(img.url))
    );

    const renderFrame = () => {
      currentTime = Date.now() - startTime;

      if (currentTime >= totalDuration) {
        mediaRecorder.stop();
        return;
      }

      const currentIndex = Math.floor(currentTime / imageDuration);
      const nextIndex = (currentIndex + 1) % images.length;
      const timeInCurrentImage = currentTime % imageDuration;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentImg = loadedImages[currentIndex];
      const nextImg = loadedImages[nextIndex];

      if (timeInCurrentImage < imageDuration - transitionDuration) {
        drawImageCover(ctx, currentImg, canvas.width, canvas.height);
      } else {
        const transitionProgress = (timeInCurrentImage - (imageDuration - transitionDuration)) / transitionDuration;

        if (transition === 'fade') {
          drawImageCover(ctx, currentImg, canvas.width, canvas.height);
          ctx.globalAlpha = transitionProgress;
          drawImageCover(ctx, nextImg, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        } else if (transition === 'slide') {
          const offset = canvas.width * transitionProgress;
          ctx.save();
          ctx.translate(-offset, 0);
          drawImageCover(ctx, currentImg, canvas.width, canvas.height);
          ctx.restore();
          ctx.save();
          ctx.translate(canvas.width - offset, 0);
          drawImageCover(ctx, nextImg, canvas.width, canvas.height);
          ctx.restore();
        } else if (transition === 'zoom') {
          const scale = 1 + transitionProgress * 0.3;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          ctx.globalAlpha = 1 - transitionProgress;
          drawImageCover(ctx, currentImg, canvas.width, canvas.height);
          ctx.restore();
          ctx.globalAlpha = transitionProgress;
          drawImageCover(ctx, nextImg, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }
      }

      setTimeout(renderFrame, frameDuration);
    };

    renderFrame();
  };

  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      drawHeight = canvasHeight;
      drawWidth = img.width * (canvasHeight / img.height);
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = img.height * (canvasWidth / img.width);
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'video.webm';
    a.click();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 أداة إنشاء الفيديو</h1>
        <p>قم بإنشاء فيديوهات رائعة من صورك في ثوانٍ</p>
      </div>

      <div className="upload-section">
        <div
          className="upload-area"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="upload-icon">📸</div>
          <div className="upload-text">اضغط أو اسحب الصور هنا</div>
          <div className="upload-subtext">يدعم جميع صيغ الصور (JPG, PNG, GIF, إلخ)</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {images.length > 0 && (
          <>
            <div className="images-preview">
              {images.map((img, index) => (
                <div key={index} className="image-item">
                  <img src={img.url} alt={`صورة ${index + 1}`} />
                  <button className="remove-btn" onClick={() => removeImage(index)}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="controls">
              <div className="control-group">
                <label>مدة كل صورة (ثانية)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>

              <div className="control-group">
                <label>نوع الانتقال</label>
                <select value={transition} onChange={(e) => setTransition(e.target.value)}>
                  <option value="fade">تلاشي</option>
                  <option value="slide">انزلاق</option>
                  <option value="zoom">تكبير</option>
                </select>
              </div>

              <button
                className="create-btn"
                onClick={createVideo}
                disabled={isCreating || images.length === 0}
              >
                {isCreating ? 'جاري الإنشاء...' : '🎥 إنشاء الفيديو'}
              </button>
            </div>
          </>
        )}
      </div>

      {isCreating && (
        <div className="loading">جاري إنشاء الفيديو</div>
      )}

      {videoUrl && (
        <div className="video-preview">
          <h2>✨ فيديوك جاهز!</h2>
          <div className="video-container">
            <video controls autoPlay loop className="video-canvas">
              <source src={videoUrl} type="video/webm" />
            </video>
          </div>
          <button className="download-btn" onClick={downloadVideo}>
            📥 تحميل الفيديو
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
