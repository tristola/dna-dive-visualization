import { useEffect, useRef, useState } from 'react';

const TRACK_URL = `${import.meta.env.BASE_URL}audio/lab-window-drift.mp3`;
const TARGET_VOLUME = 0.35;
const FADE_MS = 600;

/**
 * Subtle ambient audio. Starts paused — browsers block autoplay with sound
 * until the user has interacted with the page, and a music button is the
 * least surprising opt-in. Click to fade in, click again to fade out.
 */
export default function AudioToggle() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // Set volume + loop on mount.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = true;
    el.volume = 0;
  }, []);

  const fade = (el: HTMLAudioElement, to: number) => {
    const from = el.volume;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      el.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(tick);
      else if (to === 0) el.pause();
    };
    requestAnimationFrame(tick);
  };

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      fade(el, 0);
      setPlaying(false);
    } else {
      try {
        el.volume = 0;
        await el.play();
        fade(el, TARGET_VOLUME);
        setPlaying(true);
      } catch {
        // Autoplay was blocked or src 404 — keep button in idle state.
        setPlaying(false);
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src={TRACK_URL} preload="none" />
      <button
        className={`audio-toggle${playing ? ' playing' : ''}`}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Pause ambient music' : 'Play ambient music'}
        title={playing ? 'Pause ambient music' : 'Play ambient music'}
      >
        <span className="audio-icon" aria-hidden>
          {playing ? (
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M8 2 L4 5 H1 V11 H4 L8 14 Z"
                fill="currentColor"
              />
              <path
                d="M11 4 Q14 8 11 12"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M12.5 2.5 Q17 8 12.5 13.5"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M8 2 L4 5 H1 V11 H4 L8 14 Z"
                fill="currentColor"
              />
              <path d="M11 5 L15 11 M15 5 L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="audio-label">{playing ? 'Music' : 'Music'}</span>
      </button>
    </>
  );
}
