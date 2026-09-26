'use client';

import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';
import { eventPosterError } from '@/lib/event-poster';

export default function EventPosterIntake({ file, onFile, onText, disabled }: {
  file: File | null; onFile: (file: File | null) => void; onText: (text: string) => void; disabled: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const [extracted, setExtracted] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; void workerRef.current?.terminate(); };
  }, []);
  useEffect(() => {
    setExtracted('');
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const readPoster = async () => {
    if (!file || reading) return;
    setReading(true); setMessage('Reading the poster on this device…');
    let worker: Worker | null = null;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng');
      if (!mounted.current) return;
      workerRef.current = worker;
      const result = await worker.recognize(file);
      if (!mounted.current) return;
      setExtracted(result.data.text.trim().slice(0, 10000));
      setMessage('Check the extracted text against the image. Stylised lettering may be misread; confirm the year, venue and time.');
    } catch {
      if (mounted.current) setMessage('Couldn’t read this poster. You can type its details into the draft and keep the image attached.');
    } finally {
      if (worker) await worker.terminate().catch(() => undefined);
      workerRef.current = null;
      if (mounted.current) setReading(false);
    }
  };

  return <div className="mb-4 rounded-2xl border border-violet-200/15 bg-violet-300/[0.04] p-4">
    <label className="block text-sm font-bold text-white">Attach an event poster
      <input aria-label="Event poster" disabled={disabled || reading} type="file" accept="image/jpeg,image/png" className="mt-3 block w-full text-xs text-white/60"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          const error = eventPosterError(selected);
          setMessage(error ?? '');
          if (!error) onFile(selected);
          event.target.value = '';
        }} />
    </label>
    <p className="mt-2 text-xs text-white/45">JPG or PNG · up to 4 MB. Use a public event flyer and crop out private messages. The image becomes a public source file when you build the draft.</p>
    {preview ? <div className="mt-3">
      {/* A local object URL is intentionally used for the operator's preview. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="Selected event poster for review" className="max-h-72 max-w-full rounded-xl object-contain" />
      <button type="button" disabled={disabled || reading} onClick={() => void readPoster()} className="mr-4 min-h-11 text-xs font-bold text-cyan-100">{reading ? 'Reading…' : 'Read text from poster'}</button>
      <button type="button" disabled={disabled || reading} onClick={() => onFile(null)} className="min-h-11 text-xs text-white/60">Remove poster</button>
    </div> : null}
    {message ? <p role="status" className="mt-2 text-xs text-amber-100/75">{message}</p> : null}
    {extracted ? <div className="mt-3">
      <textarea aria-label="Extracted poster text" value={extracted} onChange={(event) => setExtracted(event.target.value)} maxLength={10000} className="min-h-32 w-full rounded-xl bg-black/40 p-3 text-sm text-white" />
      <button disabled={disabled || reading} className="min-h-11 text-xs font-bold text-cyan-100" onClick={() => onText(extracted)}>Add this text to the draft</button>
    </div> : null}
  </div>;
}
