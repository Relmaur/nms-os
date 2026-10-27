# Your own articles

Hand-written articles go in `wiki/custom/<category>/<Slug>.md`, where `<category>` is one of
`resources`, `products`, `cooking`, `fish`, `building`, `technology`, `places`, `missions`,
`galaxies` or `updates`. They show in the Codex as "Your articles" and are never part of the
wiki match: everything else under `wiki/<category>/` is mirrored from the No Man's Sky Wiki by
`pnpm sync:wiki`.

After adding or editing a file, run `pnpm index:wiki` to pick it up in the Codex.
