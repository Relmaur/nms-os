// The Traveller Card's own screen (#card; Home tab): the card large, tilt to inspect, tap or Flip for its back. Tilt
// follows the pointer, or the phone's motion where the browser gives it without asking; only the art and the class
// badge move. Reduced motion: no tilt, no pulses, and the flip is instant.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { goBack, useSection } from '../shell/section-store.ts';
import { Button } from '../parts/Button.tsx';
import { CardBack, CardFront } from './TravellerCard.tsx';
import { useTravellerCard } from './card-data.ts';

const STILL = '(prefers-reduced-motion: reduce)';

// -0.5 … 0.5 across the card, as CSS variables, so a pointer move doesn't re-render the card.
function setTilt(stage: HTMLElement | null, x: number, y: number) {
  const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));
  stage?.style.setProperty('--tilt-x', clamp(x).toFixed(3));
  stage?.style.setProperty('--tilt-y', clamp(y).toFixed(3));
}

export function CardScreen() {
  const { card, art, lyPerRegion, game } = useTravellerCard();
  const [flipped, setFlipped] = useState(false);
  const [still, setStill] = useState(() => matchMedia(STILL).matches);
  const stage = useRef<HTMLDivElement>(null);
  const shown = useSection() === 'card';

  useEffect(() => {
    const media = matchMedia(STILL);
    const change = () => {
      setStill(media.matches);
    };
    media.addEventListener('change', change);
    return () => {
      media.removeEventListener('change', change);
    };
  }, []);

  // The phone's motion, where it comes without a permission prompt (iOS asks, so it uses touch instead there).
  useEffect(() => {
    if (!shown || still) return;
    const tilt = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      setTilt(stage.current, (event.gamma / 30) * 0.5, ((event.beta - 45) / 30) * 0.5);
    };
    window.addEventListener('deviceorientation', tilt);
    return () => {
      window.removeEventListener('deviceorientation', tilt);
    };
  }, [shown, still]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt(
      stage.current,
      (event.clientX - rect.left) / rect.width - 0.5,
      (event.clientY - rect.top) / rect.height - 0.5
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-[env(safe-area-inset-top)]">
      <header className="w-full max-w-[380px] flex items-center justify-between gap-3 mt-4 lg:mt-0">
        <button
          type="button"
          onClick={() => {
            goBack('more');
          }}
          aria-label="Back"
          className="w-11 h-11 rounded-control bg-slate-ground border border-control-edge grid place-items-center text-ink hover:border-control-edge-hover"
        >
          <i className="ph-bold ph-caret-left text-lg" aria-hidden="true" />
        </button>
        <h1 className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-label">Traveller Card</h1>
        <span className="w-11" aria-hidden="true" />
      </header>

      <div
        ref={stage}
        id="travellerCard"
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          setTilt(stage.current, 0, 0);
        }}
        onClick={event => {
          // A tap on the card flips it; its own controls (the back's tabs) don't.
          if (!(event.target instanceof Element) || !event.target.closest('button')) setFlipped(!flipped);
        }}
        className="card-stage w-full max-w-[380px] aspect-[9/16] cursor-pointer select-none"
      >
        <div className={`card-flip relative w-full h-full ${flipped ? 'is-flipped' : ''}`}>
          <section
            aria-label="Traveller Card, front"
            aria-hidden={flipped}
            inert={flipped}
            className="card-side absolute inset-0"
          >
            <CardFront
              card={card}
              art={art}
              lyPerRegion={lyPerRegion}
              game={game}
              animate={shown && !still && !flipped}
            />
          </section>
          <section
            aria-label="Traveller Card, back"
            aria-hidden={!flipped}
            inert={!flipped}
            className="card-side card-side-back absolute inset-0"
          >
            <CardBack card={card} art={art} />
          </section>
        </div>
      </div>

      <p className="text-caption text-ink-muted">Tilt to inspect · tap to flip</p>
      <div className="w-full max-w-[380px] grid grid-cols-1">
        <Button
          icon="ph-arrows-clockwise"
          onClick={() => {
            setFlipped(!flipped);
          }}
        >
          {flipped ? 'Show the front' : 'Flip'}
        </Button>
      </div>
    </div>
  );
}
