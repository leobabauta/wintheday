'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Full-screen viewer for a chat attachment. Portalled to <body> because the
// coach thread lives inside an `overflow-hidden` card, which would otherwise
// clip a fixed overlay rendered in place.
export default function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Only ever mounted in response to a tap, so there is no server pass to
  // guard against beyond the defensive check.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center animate-lightbox-in"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-3 w-10 h-10 rounded-full bg-white/12 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform"
        style={{ top: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-[6px]"
      />
    </div>,
    document.body
  );
}
