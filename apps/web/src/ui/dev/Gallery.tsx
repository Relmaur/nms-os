// Dev only (dev/components.html, never built): every shared component of the redesign in its states, at phone
// width, so they can be checked on a real device while screens are still being rebuilt. The data is the design's
// example system, not anyone's log.
import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { OrbitPlanet } from '@atlas/core/orbit';
import { STAR_CLASSES, type StarClass } from '@atlas/core/systems-model';
import '../../styles.css';
import { Button, IconButton } from '../parts/Button.tsx';
import { ArmButton, HoldToActivate, SlideToActivate } from '../parts/Gesture.tsx';
import { BIOME_FAMILIES } from '@atlas/core/facts';
import { OrbitDiagram, PlanetMarker, StarMark } from '../parts/StarChart.tsx';

const p = (name: string, family: string | null, size = 1, base = false): OrbitPlanet => ({ name, family, size, base });
const FIVE = [
  p('Buya 90/K4', 'toxic', 1, true),
  p('II', 'hot', 0.6),
  p('III', 'radioactive', 1.1),
  p('IV', 'frozen', 0.95),
  p('V', 'exotic', 0.85)
];
const SEED: [string, string] = ['Euclid', '0123456789AB'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-label uppercase text-ink-label mt-4">{title}</h2>
      <div className="rounded-card bg-panel-glass border border-hairline p-card flex flex-col gap-card-row">
        {children}
      </div>
    </section>
  );
}

function Gallery() {
  const [log, setLog] = useState('Nothing yet');
  const [live, setLive] = useState(false);
  const did = (what: string) => () => {
    setLog(`${what} · ${new Date().toLocaleTimeString()}`);
  };
  return (
    <main className="max-w-[390px] mx-auto px-gutter pt-header-top pb-10 text-ink">
      <h1 className="font-display text-screen-title text-ink-bright">Components</h1>
      <p className="text-sub text-ink-muted mt-title-sub">Dev only. Last action: {log}</p>

      <Section title="Tap buttons">
        <Button variant="primary" icon="ph-floppy-disk" wide onClick={did('Primary')}>
          Save changes
        </Button>
        <Button variant="primary" wide loading="Saving…">
          Save changes
        </Button>
        <Button variant="primary" wide disabled>
          Save changes
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={did('Secondary')}>Open system</Button>
          <Button variant="jump" icon="ph-timer" onClick={did('Jump')}>
            Open timers
          </Button>
          <Button variant="ghost" onClick={did('Ghost')}>
            All systems
          </Button>
          <Button variant="danger" icon="ph-link-break" onClick={did('Danger')}>
            Unpair
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="L">
            L · 48
          </Button>
          <Button variant="primary" size="M">
            M · 42
          </Button>
          <Button variant="primary" size="S">
            S · 34
          </Button>
          <IconButton icon="ph-plus" label="Add" onClick={did('Icon')} />
        </div>
      </Section>

      <Section title="Gesture buttons">
        <SlideToActivate
          label="Warped somewhere new"
          action="log a new system"
          result="Logged · Euclid"
          onActivate={did('Slide')}
        />
        <SlideToActivate
          label="Warped somewhere new"
          action="log a new system"
          disabled="Log a system first"
          onActivate={did('Slide')}
        />
        <HoldToActivate
          label="Hold to start session"
          hint="Counts systems, visits and timers until you stop"
          onActivate={() => {
            setLive(true);
            did('Hold')();
          }}
          done={live ? { label: 'Session live', hint: '00:00:01 · tap the bar to stop' } : undefined}
        />
        {live && (
          <Button
            onClick={() => {
              setLive(false);
            }}
          >
            Reset the hold
          </Button>
        )}
        <ArmButton label="Delete the cloud copy" armedLabel="Tap again to delete" onConfirm={did('Arm confirmed')} />
      </Section>

      <Section title="Star marks">
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(STAR_CLASSES) as StarClass[]).map(colour => (
            <StarMark key={colour} colour={colour} r={8} label={`${STAR_CLASSES[colour].label} star`} />
          ))}
          <StarMark colour="" r={8} label="Star not logged" />
        </div>
      </Section>

      <Section title="Planet markers">
        <div className="flex flex-wrap items-center gap-3">
          {BIOME_FAMILIES.map(family => (
            <PlanetMarker key={family} family={family} size={22} />
          ))}
          <PlanetMarker family={null} size={22} />
          <PlanetMarker family="frozen" size={22} base />
        </div>
      </Section>

      <Section title="Orbit diagram · L (Home)">
        <OrbitDiagram
          name="Masdalri Junction"
          seed={SEED}
          star="yellow"
          planets={FIVE}
          width={356}
          height={150}
          size="L"
          starX={28}
        />
      </Section>
      <Section title="Orbit diagram · XL (System detail)">
        <OrbitDiagram
          name="Masdalri Junction"
          seed={SEED}
          star="yellow"
          planets={FIVE}
          width={390}
          height={300}
          size="XL"
          numerals
        />
      </Section>
      <Section title="Orbit diagram · M (Systems list)">
        <OrbitDiagram
          name="Masdalri Junction"
          seed={SEED}
          star="yellow"
          planets={FIVE}
          width={356}
          height={74}
          size="M"
        />
      </Section>
      <Section title="States">
        <OrbitDiagram
          name="One planet"
          seed={SEED}
          star="blue"
          planets={[p('Hjalmar', 'frozen', 1, true)]}
          width={356}
          height={110}
          size="L"
        />
        <OrbitDiagram
          name="3 of 5 logged"
          seed={SEED}
          star="red"
          planets={FIVE.slice(0, 3)}
          total={5}
          labels={false}
          width={356}
          height={110}
          size="L"
        />
        <OrbitDiagram
          name="Star not logged"
          seed={['Euclid', 'DISS00000001']}
          star=""
          planets={[]}
          total={3}
          width={356}
          height={110}
          size="L"
        />
      </Section>
    </main>
  );
}

const root = document.getElementById('galleryRoot');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Gallery />
    </StrictMode>
  );
