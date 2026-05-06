"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Midia } from "@/lib/types";

export function AnuncioGallery({ midias }: { midias: Midia[] }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(
    () => setCurrent(i => (i - 1 + midias.length) % midias.length),
    [midias.length]
  );
  const next = useCallback(
    () => setCurrent(i => (i + 1) % midias.length),
    [midias.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (midias.length === 0) return null;

  const midia = midias[current];

  return (
    <div className="space-y-2">
      {/* ── Visualizador principal ── */}
      <div
        className="relative h-64 sm:h-96 rounded-2xl overflow-hidden bg-gray-900 select-none"
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchStartX.current === null) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
          touchStartX.current = null;
        }}
      >
        {midia.tipo === "foto" ? (
          <Image
            key={midia.url}
            src={midia.url}
            alt=""
            fill
            className="object-cover"
            priority={current === 0}
          />
        ) : (
          <video
            key={midia.url}
            src={midia.url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        )}

        {/* Setas de navegação */}
        {midias.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Próximo"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Contador */}
        {midias.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            {current + 1}/{midias.length}
          </div>
        )}

        {/* Dots */}
        {midias.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {midias.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Ir para ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnails ── */}
      {midias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {midias.map((m, i) => (
            <Thumbnail
              key={m.id}
              midia={m}
              active={i === current}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumbnail({
  midia,
  active,
  onClick,
}: {
  midia: Midia;
  active: boolean;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => midia.tipo === "video" && videoRef.current?.play()}
      onMouseLeave={() => {
        if (midia.tipo === "video" && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
      className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
        active
          ? "border-green-500 ring-1 ring-green-400 scale-105"
          : "border-transparent opacity-60 hover:opacity-100"
      }`}
    >
      {midia.tipo === "foto" ? (
        <Image src={midia.url} alt="" fill className="object-cover" />
      ) : (
        <>
          <video
            ref={videoRef}
            src={midia.url}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </>
      )}
    </button>
  );
}
