// Book 3: ported as written from the vanilla page (the owner's playbook, hand-written; see docs/STATE.md).

export function Book3() {
  return (
    <>
      <div className="hud-card rounded-2xl p-6 border-l-4 border-l-purple-400">
        <span className="text-xs font-mono uppercase text-purple-400">Book III of VI • Custom Hardware Schematics</span>
        <h1 className="font-display text-2xl font-bold text-white mt-1">
          Starship & Multi-Tool Meta (Ythgall, Defiance of Thought & Light Capacitor)
        </h1>
      </div>

      {/* 1. The 3 Golden Rules of Supercharged Slots */}
      <div className="hud-card rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
          1. The 3 Golden Rules of Supercharged Slots
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <strong className="text-purple-300 block mb-1">Rule 1: Strictly Tied to Class</strong> Every S-Class ship,
            Multi-Tool, or Freighter gets <strong>4 Supercharged Slots</strong> (A=3, B=2, C=1). Royal, Experimental,
            and Sentinel tools never get more than 4 slots; they have higher hidden base stat multipliers instead.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/40">
            <strong className="text-amber-300 block mb-1">Rule 2: Why "Defiance of Thought" Showed 0 SC Slots</strong>{' '}
            Supercharged slots spawn anywhere in the <strong>first 40 grid coordinates (Rows 1–4, Cols 1–10)</strong>.
            Because <em>Defiance of Thought</em> started with only <strong>3 Rows &times; 8 Cols (23 slots)</strong>{' '}
            unlocked, its SC slots rolled inside locked <strong>Cols 9–10</strong> or <strong>Row 4</strong>! Unlocking
            those slots reveals them immediately.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <strong className="text-cyan-300 block mb-1">Rule 3: Harmonic Camp Cabinet Lock</strong> Reloading a Save
            Beacon at the same Harmonic Camp <strong>never</strong> changes the cabinet's Class (a B-Class camp stays
            B-Class). Reloading on different planets only swaps the visual model between Sentinel Pistol and Sentinel
            Rifle.
          </div>
        </div>
      </div>

      {/* 2. Your Starships: Ythgall vs Aeron-ημ + Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
            2. Your S-Class Ships: Ythgall vs. Aeron-ημ
          </h2>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2">Metric</th>
                <th className="py-2 text-emerald-400">🥇 Ythgall (Keep Flagship)</th>
                <th className="py-2 text-amber-400">🥈 Aeron-ημ (Strip & Scrap)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr>
                <td className="py-2 font-semibold">SC Coordinates</td>
                <td className="py-2 font-mono text-purple-300 font-bold">R2C2, R2C3, R2C4 (3-in-a-Row!) + R3C8</td>
                <td className="py-2 font-mono text-slate-400">R3C1, R2C2, R2C4, R1C5 (Diagonal)</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Flat Edge Synergy</td>
                <td className="py-2 text-emerald-300 font-bold">Massive (3 shared edges)</td>
                <td className="py-2 text-red-300">Zero (Diagonals don't count)</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Why Screenshot DMG Differed</td>
                <td className="py-2">SC slots were empty (337.1)</td>
                <td className="py-2">Sentinel Cannon sat in R1C5 (387.1)</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Max Infra-Knife DPS</td>
                <td className="py-2 text-emerald-400 font-bold">90,000+ DPS</td>
                <td className="py-2">~35% lower ceiling</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-purple-300 border-b border-slate-800 pb-2.5">
            Optimal Infra-Knife Grid for Ythgall
          </h2>
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40">
              <span className="text-[10px] text-slate-400 block">R1, Col 2</span>{' '}
              <strong className="text-cyan-300">S-Class Infra Mod #3</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40">
              <span className="text-[10px] text-slate-400 block">R1, Col 3</span>{' '}
              <strong className="text-white">Q-Resonator (Tech)</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40">
              <span className="text-[10px] text-slate-400 block">R1, Col 4</span>{' '}
              <strong className="text-cyan-300">S-Class Infra Mod #2</strong>
            </div>
            <div className="p-3 rounded-xl sc-slot">
              <span className="text-[10px] text-purple-200 block">★ SC SLOT (R2, Col 2)</span>{' '}
              <strong className="text-white">S-Class Infra Mod #1</strong>
            </div>
            <div className="p-3 rounded-xl sc-slot">
              <span className="text-[10px] text-purple-200 block">★ SC SLOT (R2, Col 3)</span>{' '}
              <strong className="text-amber-300">MAIN INFRA-KNIFE</strong>
            </div>
            <div className="p-3 rounded-xl sc-slot">
              <span className="text-[10px] text-purple-200 block">★ SC SLOT (R2, Col 4)</span>{' '}
              <strong className="text-white">S-Class Infra Mod #2</strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Put your <strong>Luminance Engine (Pulse Drive)</strong> or <strong>Hyperdrive</strong> upgrade into
            Ythgall's 4th Supercharged slot at <code>Row 3, Col 8</code>!
          </p>
        </div>
      </div>

      {/* 3. Your Multi-Tools: Light Capacitor & Defiance of Thought */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-cyan-300 border-b border-slate-800 pb-2.5">
            3. Wiring "Light Capacitor 3-93F/33Q" (Scanner & Mining)
          </h2>
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40">
              <span className="text-[10px] text-slate-400 block">R1, Col 7</span>{' '}
              <strong className="text-cyan-300">S-Class Scanner Mod</strong>
            </div>
            <div className="p-3 rounded-xl sc-slot">
              <span className="text-[10px] text-purple-200 block">★ SC SLOT (R1, Col 8)</span>{' '}
              <strong className="text-amber-300">Best S-Class Scanner</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40">
              <span className="text-[10px] text-slate-400 block">R1, Col 9</span>{' '}
              <strong className="text-cyan-300">A-Class Scanner (from R3C6)</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">R2, Col 7</span>{' '}
              <strong className="text-white">Analysis Visor (from R1C2)</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">R2, Col 8</span>{' '}
              <strong className="text-white">Main Scanner Module</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">R2, Col 9</span>{' '}
              <strong className="text-white">Survey Device</strong>
            </div>
          </div>
          <p className="text-xs text-emerald-300">
            <strong>+88% Mining Yield Trick:</strong> Move your <strong>Optical Drill</strong> (from <code>R3C9</code>)
            onto the Supercharged slot at{' '}
            <strong>
              <code>Row 2, Col 4</code>
            </strong>{' '}
            surrounded by your green Mining Beam mods!
          </p>
        </div>

        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
            Multi-Tool Archetype Meta & "Defiance of Thought"
          </h2>
          <p className="text-xs text-slate-300">
            Upgrade <strong>Defiance of Thought</strong> (Sentinel Long-Rifle) to <strong>S-Class (50k Nanites)</strong>{' '}
            and expand Row 4 + Cols 9–10 using free Anomaly Expansion Slots. Sentinel Rifles have the{' '}
            <strong>highest base combat damage (+50%)</strong> AND let you install both the{' '}
            <strong>Hijacked Laser + Standard Mining Beam</strong> simultaneously for 2&times; mining speed and zero
            overheating!
          </p>
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Multi-Tool archetypes (scrolls sideways)"
          >
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-1.5">Archetype</th>
                  <th className="py-1.5">Damage</th>
                  <th className="py-1.5">Mining</th>
                  <th className="py-1.5">Scanner</th>
                  <th className="py-1.5">Best Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <td className="py-1.5 font-bold text-purple-300">Sentinel Rifle/Pistol</td>
                  <td>★ S+ (+50%)</td>
                  <td>Med (+15%)</td>
                  <td>High (+50%)</td>
                  <td>#1 Combat & Dual-Laser</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-cyan-300">Experimental / Royal</td>
                  <td>Med (+25%)</td>
                  <td>High (+30%)</td>
                  <td>★ S+ (+100%)</td>
                  <td>#1 Fauna Scanner</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-emerald-300">Atlantid (Runic)</td>
                  <td>Med (+20%)</td>
                  <td>★ S+ (+50%)</td>
                  <td>★ S+ (+100%)</td>
                  <td>#1 Pure Mining Speed</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-amber-300">Voltaic Staff</td>
                  <td>★ S+ (+50%)</td>
                  <td>Med (+20%)</td>
                  <td>High (+50%)</td>
                  <td>Tied #1 Heavy Combat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
