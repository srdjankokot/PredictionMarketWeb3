'use client';

import { useRef, useState, type DragEvent } from 'react';

export function ImageUpload({
  value,
  fallback,
  adminAddress,
  onChange,
  onError,
}: {
  value: string | null;
  fallback: string;
  adminAddress: string;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-wallet-address': adminAddress },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onChange(data.imageUrl as string);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition ${
        dragOver ? 'border-brand tint-brand' : ''
      }`}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface text-2xl">
          {fallback}
        </div>
      )}
      <div className="text-sm">
        <p className="font-medium text-ink">{uploading ? 'Uploading…' : 'Drag & drop or click'}</p>
        <p className="text-xs text-muted">JPG/PNG/WebP · max 2MB · cropped to square</p>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="mt-1 text-xs text-no hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
