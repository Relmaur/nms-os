// The live parts of the page: the app's own Traveller Card and galaxy chain, drawing the example traveller. Only the
// components that take everything as props are imported: the app's stores would read the visitor's real log, which
// shares this origin.
import { memo, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FactsFileSchema, getFact } from '@atlas/core/facts';
import { GalaxiesFileSchema } from '@atlas/core/location';
import { nextGalaxies } from '@atlas/core/map';
import { CardFront } from '../../web/src/ui/card/TravellerCard.tsx';
import { ChainChart } from '../../web/src/ui/map/ChainChart.tsx';
import factsFile from '../../../wiki/facts.json';
import galaxiesFile from '../../../wiki/galaxies.json';
import { exampleTraveller, type Stage } from './example.ts';

const facts = FactsFileSchema.parse(factsFile);
const { galaxies } = GalaxiesFileSchema.parse(galaxiesFile);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CARD_W = 380; // the card's natural size, as on its own screen: it scales as one piece so its type grows with it
const SCREEN_W = 390;

// How big the box is against a natural width, and whether it's on screen (the pulses rest when it isn't).
function useFit(natural: number) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const size = new ResizeObserver(() => {
      setScale(el.clientWidth / natural);
    });
    const view = new IntersectionObserver(([entry]) => {
      setSeen(entry?.isIntersecting ?? false);
    });
    size.observe(el);
    view.observe(el);
    return () => {
      size.disconnect();
      view.disconnect();
    };
  }, [natural]);
  return { box, scale, seen };
}

const LiveCard = memo(function LiveCard({ stage }: { stage: Stage }) {
  const [{ card, art }] = useState(() => exampleTraveller(stage, galaxies, facts));
  const { box, scale, seen } = useFit(CARD_W);
  return (
    <div ref={box} className="live-card" style={{ transform: `scale(${scale.toFixed(4)})` }}>
      <CardFront
        card={card}
        art={art}
        lyPerRegion={getFact(facts, 'region-light-years')?.value ?? null}
        game={facts.game ?? null}
        animate={seen && !still}
      />
    </div>
  );
});

function LiveMap() {
  const [{ card }] = useState(() => exampleTraveller('S', galaxies, facts));
  const { box, scale } = useFit(SCREEN_W);
  return (
    <div ref={box} className="live-map" style={{ transform: `scale(${scale.toFixed(4)})` }}>
      <ChainChart trip={card.trip} next={nextGalaxies(card.trip, galaxies)} />
    </div>
  );
}

export function mountLive() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-live-card]')) {
    const stage = el.dataset.liveCard as Stage; // written by hand in index.html, one of the three
    createRoot(el).render(<LiveCard stage={stage} />);
  }
  for (const el of document.querySelectorAll('[data-live-map]')) createRoot(el).render(<LiveMap />);
}
