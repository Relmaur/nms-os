// Book 5: ported as written from the vanilla page (the owner's playbook, hand-written; see docs/STATE.md).
import { Checklist } from '../Checklist.tsx';

export function Book5() {
  return (
    <>
      <div className="hud-card rounded-2xl p-6 border-l-4 border-l-cyan-400">
        <span className="text-xs font-mono uppercase text-cyan-400">Book V of VI • Omega Terminus Protocol</span>
        <h1 className="font-display text-2xl font-bold text-white mt-1">
          The Complete Community Expeditions & Item Porting Manual
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
            1. The #1 Rule: Always Start from the Space Anomaly!
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200">
              <strong className="text-red-400 block">
                ❌ WRONG WAY: Main Title Screen ("New Game &rarr; Expedition")
              </strong>{' '}
              Creates an isolated save slot that CANNOT receive your main ships/items and CANNOT transfer cargo stacks
              or cloned ships back to your primary character!
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200">
              <strong className="text-emerald-400 block">✅ CORRECT WAY: Space Anomaly "Expedition Terminus"</strong>{' '}
              Load your main save (with <strong>Ythgall</strong> and <strong>Defiance of Thought</strong> equipped), fly
              into the Space Anomaly, and use the <strong>Expedition Terminus</strong> console behind the Nexus cube!
            </div>
          </div>

          <h3 className="font-display font-bold text-sm text-cyan-300 pt-2">
            2. Pre-Loading Your 8 Tech + 24 Cargo "Care Package"
          </h3>
          <Checklist group="expedition" className="space-y-2" />
        </div>

        <div className="lg:col-span-6 hud-card rounded-2xl p-5 space-y-4 border border-purple-500/30">
          <h2 className="font-display font-bold text-base text-purple-300 border-b border-slate-800 pb-2.5">
            3. Cloning Ythgall & Zero-Loss Extraction Protocol
          </h2>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-cyan-300 block mb-1">
                Cloning Ythgall & Defiance of Thought INTO the Event:
              </strong>{' '}
              Once you make 1 warp jump inside the Expedition and summon the Space Anomaly, visit the Terminus,
              refine/sell your packed Runaway Mould or Suspicious Packets for ~5,000 Nanites, and click{' '}
              <strong>"Copy Starship" (~2,800 Nanites)</strong> and <strong>"Copy Multi-Tool" (~2,200 Nanites)</strong>!
            </li>
            <li className="p-3 rounded-xl bg-slate-900 border border-amber-500/40">
              <strong className="text-amber-300 block mb-1">
                Trick #1: The Infinite Multi-Batch Mule (Before Clicking End!)
              </strong>{' '}
              Once you click <em>"End Expedition"</em>, the Terminus locks forever! If you have more than 24 Cargo
              stacks to bring home, load Batch #1 into the Terminus, open <code>Pause &rarr; Options</code> and click{' '}
              <strong>"Return to Primary Save"</strong> (do NOT click End Expedition!), empty the Terminus on your main
              save, resume the Expedition, and load Batch #2!
            </li>
            <li className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
              <strong className="text-emerald-300 block mb-1">
                Trick #2: Infinite Reward Ship & Photonix Core Duplication
              </strong>{' '}
              Equip the exclusive <strong>Expedition Reward Ship & Multi-Tool</strong> before clicking{' '}
              <em>"End Expedition"</em>. Back on your Main Save, click <strong>"Copy Starship"</strong> at the Terminus,
              strip its unique tech (<code>X</code>) and scrap/salvage the hull at the Space Station, then return to the
              Terminus to click <strong>"Copy Starship" again and again</strong>!
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
