// Book 1: ported as written from the vanilla page (the hand-written playbook; see docs/STATE.md).
import { useAppState } from '../../useAppState.ts';

export function Book1() {
  const phase = useAppState().meta.currentPhase ?? '';
  return (
    <>
      <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href="https://cloud.nomanssky.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200 underline inline-flex items-center gap-1"
        >
          <i className="ph-bold ph-arrow-square-out" aria-hidden="true" /> cloud.nomanssky.com
        </a>
        {phase && (
          <span id="currentPhaseText" className="font-mono text-cyan-300">
            {phase}
          </span>
        )}
      </p>

      {/* 1. Cross-Save Checklist & Parity Checker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 hud-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="ph-duotone ph-cloud-check text-cyan-400 text-xl" aria-hidden="true" />
              1. Hello Games Cloud Cross-Save Checklist
            </h2>
            <span className="text-xs font-mono text-cyan-300">PC / Mac / Switch / iOS (Oct 28, 2026)</span>
          </div>
          <p className="text-xs text-slate-400">Tick these in Milestones, under Cross-save, at the top of this book.</p>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <i className="ph-fill ph-warning" aria-hidden="true" /> The Golden Rule of Cross-Play (Patch Parity):
            </div>
            <p>
              You cannot open a save file saved on a newer game patch using a device running an older patch. Because
              Nintendo Switch and iOS App Store certifications occasionally take 2–5 extra days compared to Steam,
              always check that your version numbers match at the bottom-left of the title screen after a major update!
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="ph-duotone ph-Sliders text-emerald-400 text-xl" aria-hidden="true" />
            Recommended QoL Custom Settings
          </h2>
          <p className="text-xs text-slate-300">
            Start in <strong>Normal Mode</strong> (for 9,999 cargo stack sizes and safe handheld play), then open{' '}
            <code className="text-cyan-300">Options &rarr; Difficulty</code> to configure:
          </p>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-cyan-300 block">1. Item Transfer Range &rarr; "Infinite"</strong> Pull crafting
              materials straight from your starship or Freighter storage containers anywhere on a planet without
              standing next to your ship.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-cyan-300 block">2. Sprint & Scanner Recharge &rarr; "Fast"</strong> Eliminates
              downtime during early planet exploration.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-purple-300 block">3. Multiplayer Toggle (`Options &rarr; Network`)</strong>{' '}
              <strong>100% Safe to toggle anytime!</strong> Flip Multiplayer <strong>OFF</strong> when claiming crashed
              S-Class ships or Multi-Tool cabinets so another player doesn't grab your spawn; flip it{' '}
              <strong>ON</strong> inside the Space Anomaly!
            </li>
          </ul>
        </div>
      </div>

      {/* 2. Complete Game Mode Comparison Table */}
      <div className="hud-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-bold text-base text-white">2. Complete Game Mode Comparison Table</h2>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Game mode comparison (scrolls sideways)"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                <th className="py-2.5 px-3">Feature / Mechanic</th>
                <th className="py-2.5 px-3 text-emerald-400">Normal (Recommended)</th>
                <th className="py-2.5 px-3 text-amber-400">Survival</th>
                <th className="py-2.5 px-3 text-red-400">Permadeath</th>
                <th className="py-2.5 px-3 text-cyan-400">Relaxed</th>
                <th className="py-2.5 px-3 text-purple-400">Community Expedition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Inventory Stack Size</td>
                <td className="py-2.5 px-3 font-mono text-emerald-300 font-bold">9,999 / slot</td>
                <td className="py-2.5 px-3 font-mono text-amber-300">250 – 500 / slot</td>
                <td className="py-2.5 px-3 font-mono text-red-300">250 – 500 / slot</td>
                <td className="py-2.5 px-3 font-mono">9,999 / slot</td>
                <td className="py-2.5 px-3 font-mono">9,999 / slot</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Death Penalty</td>
                <td className="py-2.5 px-3">Respawn; pick up Grave</td>
                <td className="py-2.5 px-3">Cargo destroyed; Tech breaks</td>
                <td className="py-2.5 px-3 font-bold text-red-400">Save permanently deleted</td>
                <td className="py-2.5 px-3">No penalty (Keep all)</td>
                <td className="py-2.5 px-3">Standard Grave recovery</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Crafting & Costs</td>
                <td className="py-2.5 px-3">Standard</td>
                <td className="py-2.5 px-3">Expensive</td>
                <td className="py-2.5 px-3">Expensive</td>
                <td className="py-2.5 px-3">Discounted</td>
                <td className="py-2.5 px-3">Fast-tracked via milestones</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Change Settings Later?</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">Yes</td>
                <td className="py-2.5 px-3">Yes (Except Permadeath)</td>
                <td className="py-2.5 px-3 text-red-400">Locked</td>
                <td className="py-2.5 px-3">Yes</td>
                <td className="py-2.5 px-3">Locked until Event ends</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. First 5 Hours Interactive Roadmap & Freighter Locked Bay Fix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="ph-duotone ph-rocket-launch text-purple-400 text-xl" aria-hidden="true" />
            3. The "First 5 Hours" Optimal Roadmap
          </h2>
          <p className="text-xs text-slate-400">
            Tick these in Milestones, under First five hours, at the top of this book.
          </p>
        </div>

        <div className="lg:col-span-5 hud-card rounded-2xl p-5 space-y-4 border border-red-500/30">
          <h2 className="font-display font-bold text-base text-red-300 flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="ph-duotone ph-lock-key text-red-400 text-xl" aria-hidden="true" />
            Troubleshooting: Locked Freighter Hangar Bays
          </h2>
          <p className="text-xs text-slate-300">
            After 3 cumulative hours and your 5th warp jump, you trigger a Freighter pirate rescue battle. If the
            Freighter bay doors stay red and locked after the fight:
          </p>
          <ol className="space-y-2.5 text-xs text-slate-200 list-decimal list-inside">
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-red-300">Zero Friendly Fire (#1 Culprit):</strong> If even a{' '}
              <em>single stray bullet</em> hits the friendly Freighter or its cargo pods during the dogfight, the
              Freighter flags you as hostile and locks its doors red! Hold fire when pirates cross the hull.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-cyan-300">Answer Your Ship Communicator (`X` / `Down D-Pad`):</strong> Right when
              the last pirate explodes, answer the Captain's radio call—the hangar doors stay red until he invites you
              aboard, turning them blue!
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <strong className="text-emerald-300">Free Capital Ship Upgrade Trick:</strong> Your 1st battle is always a
              smaller System Freighter. Choose <em>"Request Payment Instead"</em> (or skip it)—every subsequent battle
              (3 hrs + 5 jumps) spawns a massive <strong>Capital Freighter</strong> that is still{' '}
              <strong>100% FREE</strong>!
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}
