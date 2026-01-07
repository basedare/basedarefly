'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function SubmitEvidence() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a video (MP4, WebM, MOV) or image (JPEG, PNG, GIF).');
      return;
    }

    // Validate file size (max 120MB)
    const maxSize = 120 * 1024 * 1024; // 120MB
    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size is 120MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploaded(false);

    // Create preview
    if (selectedFile.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(selectedFile);
      video.onloadedmetadata = () => {
        setPreview(video.src);
      };
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploaded(true);
      // TODO: Handle successful upload (e.g., save file URL to state, trigger verification, etc.)
      console.log('File uploaded successfully:', data);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setUploaded(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!uploaded && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div 
      className={`group relative h-full bg-white/5 border-2 border-dashed transition-all duration-300 overflow-hidden rounded-3xl ${
        isDragging 
          ? 'border-cyan-400 bg-cyan-500/10' 
          : uploaded 
            ? 'border-green-500/50 bg-green-500/5' 
            : error
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-white/10 hover:border-cyan-400/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* SCANNING LASER EFFECT */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-opacity duration-300 ${
        isDragging || uploading ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'
      }`} />
      
      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        {uploaded ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-green-400 uppercase tracking-wider mb-1">Evidence Submitted</h3>
              <p className="text-xs font-mono text-gray-400 max-w-[200px]">
                Your proof is being verified by zkML
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="px-4 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Remove & Upload New
            </button>
          </>
        ) : preview ? (
          <>
            <div className="relative w-full max-w-xs mb-4">
              {file?.type.startsWith('video/') ? (
                <video 
                  src={preview} 
                  className="w-full rounded-xl border border-white/10"
                  controls
                />
              ) : (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full rounded-xl border border-white/10"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur-sm rounded-full border border-white/10 hover:bg-red-500/20 hover:border-red-500 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="w-full space-y-3">
              <div className="text-left">
                <p className="text-xs font-mono text-gray-400 mb-1">File: {file?.name}</p>
                <p className="text-[10px] font-mono text-gray-500">
                  Size: {(file ? file.size / (1024 * 1024) : 0).toFixed(2)} MB
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={uploading || !!error}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Submit Evidence
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border transition-all duration-300 ${
              isDragging 
                ? 'scale-110 border-cyan-400 bg-cyan-500/10' 
                : 'border-white/10 group-hover:scale-110 group-hover:border-cyan-400'
            }`}>
              {uploading ? (
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              ) : (
                <Upload className={`w-6 h-6 transition-colors ${
                  isDragging ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'
                }`} />
              )}
        </div>
        <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                {isDragging ? 'Drop File Here' : 'Submit Evidence'}
              </h3>
          <p className="text-xs font-mono text-gray-500 max-w-[200px]">
                {isDragging 
                  ? 'Release to upload' 
                  : 'DRAG VIDEO FILE HERE OR CLICK TO BROWSE SECURE STORAGE'
                }
          </p>
        </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono max-w-[200px]">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
        <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
          zkML Verification Ready
        </div>
          </>
        )}
      </div>

      {/* CORNER ACCENTS */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white/20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white/20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white/20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/20" />
    </div>
  );
}
