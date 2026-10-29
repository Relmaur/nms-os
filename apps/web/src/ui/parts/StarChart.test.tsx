import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { OrbitPlanet } from '@atlas/core/orbit';
import { OrbitDiagram, PlanetMarker, StarMark } from './StarChart.tsx';

const p = (name: string, family: string | null, base = false): OrbitPlanet => ({ name, family, size: 1, base });
const FIVE = [
  p('Buya 90/K4', 'toxic', true),
  p('II', 'hot'),
  p('III', 'radioactive'),
  p('IV', 'frozen'),
  p('V', 'exotic')
];

test('the diagram is one image with a sentence, drawing every logged planet and ringing the base', () => {
  const { container } = render(
    <OrbitDiagram
      name="Masdalri Junction"
      seed={['Euclid', '0123456789AB']}
      star="yellow"
      planets={FIVE}
      width={356}
      height={150}
      size="L"
      starX={28}
    />
  );
  screen.getByRole('img', { name: 'Masdalri Junction: a yellow star with 5 planets; your base is on Buya 90/K4.' });
  expect(container.querySelectorAll('[fill="var(--color-biome-toxic)"]')).toHaveLength(1);
  expect(container.querySelectorAll('[stroke="var(--color-scanner-cyan-glow)"]')).toHaveLength(1); // the base ring
  expect(container.textContent).toContain('BASE · BUYA 90/K4');
  expect(container.querySelectorAll('.orbit-drift')).toHaveLength(5); // L drifts
  expect(container.querySelectorAll('.star-corona')).toHaveLength(1);
});

test('what is not logged is dashed, never a guessed colour', () => {
  const { container } = render(
    <OrbitDiagram
      name="Dissonant System #1"
      seed={['Euclid', 'sys-1']}
      star=""
      planets={[p('Moor', null)]}
      total={3}
      width={356}
      height={110}
      size="L"
    />
  );
  screen.getByRole('img', { name: 'Dissonant System #1: a star (colour not logged) with 3 planets (1 logged).' });
  expect(container.querySelectorAll('[stroke-dasharray="3 3"]')).toHaveLength(1); // the unknown star
  expect(container.querySelectorAll('[stroke-dasharray="2 3"]')).toHaveLength(2); // two unlogged planets
  expect(container.querySelectorAll('[stroke-dasharray="3 5"]')).toHaveLength(2); // on dashed orbits
  expect(container.querySelector('[fill^="var(--color-star-"]')).toBeNull();
  expect(container.querySelectorAll('[fill="var(--color-control-edge-hover)"]')).toHaveLength(1); // biome unknown
});

test('the list strip (M) is still: one line, no arcs, no labels', () => {
  const { container } = render(
    <OrbitDiagram
      name="Masdalri Junction"
      seed={['Euclid', '0123456789AB']}
      star="blue"
      planets={FIVE}
      width={356}
      height={74}
      size="M"
    />
  );
  expect(container.querySelectorAll('.orbit-drift')).toHaveLength(0);
  expect(container.querySelector('text')).toBeNull();
  expect(container.querySelector('path[stroke-dasharray="2 4"]')).not.toBeNull();
});

test('the marks stand alone: decorative unless given a name', () => {
  const { container } = render(
    <>
      <StarMark colour="purple" label="Purple star" />
      <StarMark colour="" />
      <PlanetMarker family="lush" base />
    </>
  );
  screen.getByRole('img', { name: 'Purple star' });
  expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  // Grain filters get ids a url() can reference.
  container.querySelectorAll('filter').forEach(filter => {
    expect(filter.id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
