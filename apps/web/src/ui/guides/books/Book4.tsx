// Book 4: ported as written from the vanilla page (the hand-written playbook; see docs/STATE.md).

export function Book4() {
  return (
    <>
      <div className="hud-card rounded-2xl p-6 border-l-4 border-l-amber-400">
        <span className="text-xs font-mono uppercase text-amber-400">
          Book IV of VI • Automated Sanctuary Engineering
        </span>
        <h1 className="font-display text-2xl font-bold text-white mt-1">
          The Ultimate Self-Sufficient & Cozy Base Blueprint
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
            1. Scouting the "Golden Triangle" Site
          </h2>
          <p className="text-xs text-slate-300">
            Use your <strong>Survey Device</strong> on a <strong>Paradise, Bountiful, or Bioluminescent</strong> planet
            to find 3 hotspots within 300u–600u:
          </p>
          <ul className="space-y-2 text-xs text-slate-200">
            <li className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-cyan-300">⚡ 1. Electromagnetic Power Hotspot:</strong> Infinite 24/7 power with
              zero solar panels or batteries.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-emerald-300">🫧 2. Oxygen Gas Hotspot:</strong> Fuels your Refiner Alchemy Chamber
              to multiply almost every survival material in the game.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-purple-300">🪨 3. Mineral Hotspot / Curious Deposit:</strong>{' '}
              Paraffinium/Magnetised Ferrite for building, or Runaway Mould balls for 1,999 Nanites per 9,999 stack!
            </li>
          </ul>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200">
            <strong>Extending Base Radius (300u &rarr; 1,000u):</strong> Drop your Base Computer in the center. Walk
            toward a distant hotspot with your Build Menu open; right where it says <em>"Out of Base Range"</em>, take 2
            steps back and place a small floor plate or light post to push the boundary out by 50u!
          </div>
        </div>

        <div className="lg:col-span-7 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-emerald-300 border-b border-slate-800 pb-2.5">
            2. Wing 1: The Oxygen Alchemy Refiner Chamber
          </h2>
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Refiner chamber recipes (scrolls sideways)"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 px-2">Target Material</th>
                  <th className="py-2 px-2">Refiner Input Formula</th>
                  <th className="py-2 px-2">Ratio</th>
                  <th className="py-2 px-2">What It Automates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                <tr>
                  <td className="py-2 px-2 font-bold text-red-300">Condensed Carbon</td>
                  <td className="py-2 px-2 font-mono">1 Cond. Carbon + 2 Oxygen</td>
                  <td className="py-2 px-2 font-mono text-emerald-400 font-bold">1 &rarr; 6</td>
                  <td className="py-2 px-2">Infinite fuel & Stasis crafting</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-amber-300">Sodium Nitrate</td>
                  <td className="py-2 px-2 font-mono">1 Sodium Nitrate + 1 Oxygen</td>
                  <td className="py-2 px-2 font-mono text-emerald-400 font-bold">1 &rarr; 2</td>
                  <td className="py-2 px-2">Hazard Protection & shields</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-cyan-300">Ionised Cobalt</td>
                  <td className="py-2 px-2 font-mono">1 Ionised Cobalt + 2 Oxygen</td>
                  <td className="py-2 px-2 font-mono text-emerald-400 font-bold">1 &rarr; 6</td>
                  <td className="py-2 px-2">Infinite Ion Batteries (+ Ferrite)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-purple-300">Faecium (Yeast)</td>
                  <td className="py-2 px-2 font-mono">1 Faecium + 1 Oxygen</td>
                  <td className="py-2 px-2 font-mono text-emerald-400 font-bold">1 &rarr; 3</td>
                  <td className="py-2 px-2">Wild Yeast for Doughnuts</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-slate-200">Magnetised Ferrite</td>
                  <td className="py-2 px-2 font-mono">1 Pure Ferrite + 1 Oxygen</td>
                  <td className="py-2 px-2 font-mono text-emerald-400 font-bold">1 &rarr; 2</td>
                  <td className="py-2 px-2">Infinite building materials</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-amber-300 block">3. Wing 2: 4-Biodome "One-Click" Farm + Ranch</strong>
              <p className="text-slate-300">
                Click <em>"Harvest All Plants"</em> on the ceiling monitor of each Biodome:{' '}
                <strong>Dome 1 (Bakery):</strong> 8 Frostwort + 6 Echinocactus + 2 Gutrot. <strong>Dome 2:</strong> 8
                Mordite + 8 Fungal Mould. <strong>Dome 3:</strong> 16 NipNip Buds. <strong>Dome 4:</strong> 6 Star
                Bramble + 6 Solar Vine + 4 Gamma Weed. Place <strong>1 Automated Feeder + 1 Livestock Unit</strong>{' '}
                outside for automatic Fresh Milk!
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-cyan-300 block">4. Wing 3: Red Barrel & Green Crate Trick</strong>
              <p className="text-slate-300">
                Build <strong>5 Red Barrel Fabricators</strong> (AtlasPass v1) and{' '}
                <strong>5 Green Crate Fabricators</strong>. A Red Barrel's drop depends on its exact{' '}
                <code>(X,Y,Z)</code> spot—if it drops Antimatter Housing instead of a full <strong>Warp Cell</strong>,
                move it 1 foot over until it locks onto Warp Cells permanently!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
