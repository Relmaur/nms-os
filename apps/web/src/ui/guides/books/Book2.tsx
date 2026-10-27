// Book 2: the money and Nanite playbook (hand-written; see docs/STATE.md). General on purpose: a player's own
// plan belongs in a note pinned to this book.

export function Book2() {
  return (
    <>
      <div className="hud-card rounded-2xl p-6 border-l-4 border-l-emerald-400">
        <span className="text-xs font-mono uppercase text-emerald-400">Book II of VI • Post-Nerf Economic Engine</span>
        <h1 className="font-display text-2xl font-bold text-white mt-1">
          The "Zero-to-Hero" 4.29B Unit & Nanite Wealth Blueprint
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Maximum hard-coded wallet limit:{' '}
          <span className="font-mono text-emerald-300 font-bold">4,294,967,295 Units</span> (32-bit unsigned integer
          cap).
        </p>
      </div>

      {/* Immediate 15-Minute Recovery Plan */}
      <div className="hud-card rounded-2xl p-5 border border-amber-500/40 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-display font-bold text-base text-amber-300 flex items-center gap-2">
            <i className="ph-fill ph-lightning text-amber-400 text-xl" aria-hidden="true" />
            Immediate 15-Minute Recovery Gameplan
          </h2>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            +50M to 300M Units Fast
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="font-mono text-amber-400 font-bold">STEP 1: SCRAP YOUR SPARE S-CLASS SHIP</div>
            <p className="text-slate-300">
              Fly into any Space Station in your flagship. Use Quick Menu (<code>X</code>) &rarr;{' '}
              <em>Summon Vehicles</em> &rarr; <em>Switch Docked Starship</em> to select the spare. Hover over all tech
              modules and press{' '}
              <strong>
                <code>X</code> (Store Technology)
              </strong>{' '}
              to keep them as grey boxes. Melt the empty hull at the Starship Outfitting Terminal for Units +{' '}
              <strong>Storage Augmentations</strong> for your flagship!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="font-mono text-cyan-400 font-bold">STEP 2: NEVER BUY MT SLOTS WITH UNITS</div>
            <p className="text-slate-300">
              Buying Multi-Tool slots with Units drains tens of millions per slot! Instead, claim cheap C/B-Class
              Multi-Tools or harmonic spares and scrap them at the <strong>Multi-Tool Decommissioning Terminal</strong>{' '}
              on the <strong>Space Anomaly</strong> (left of the teleporter, by Tethys) for{' '}
              <strong>free Multi-Tool Expansion Slots</strong>!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="font-mono text-emerald-400 font-bold">STEP 3: WHY SCANS PAY SO LITTLE</div>
            <p className="text-slate-300">
              Even with S-Class Scanner mods, a scanner Multi-Tool caps around <strong>180k–450k Units</strong> per
              creature on its own. To hit <strong>10M–33M Units per scan</strong>, you MUST put{' '}
              <strong>Anomalous Doughnuts</strong> inside your Exosuit's <strong>Nutrient Ingestor</strong> and click{' '}
              <em>"Begin Ingestion"</em> (+6,443% compounding Fauna multiplier)!
            </p>
          </div>
        </div>
      </div>

      {/* Phase 1 & 2: Infinite Sentinel Ship Salvage + Troubleshooting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 hud-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-purple-300 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i className="ph-duotone ph-flying-saucer text-purple-400 text-xl" aria-hidden="true" />
            Phase 2: Infinite Sentinel Interceptor Salvage (25M–50M U / Ship)
          </h2>
          <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
            <li>
              <strong>The "On-Foot Peek" Trick for Echo Locators:</strong> Do <strong>NOT</strong> shoot Dissonance
              Resonators from your starship! 80% drop <em>Inverted Mirrors</em> and only 20% drop{' '}
              <strong>Echo Locators</strong>. Land, walk right up to the tripod drill with your weapon holstered
              (Corrupted Sentinels ignore you until you fire), and read its HUD label. Only shoot when it says{' '}
              <strong>Echo Locator</strong>!
            </li>
            <li>
              <strong>Harmonic Camp Capacity & Infinite Loop:</strong> Pop the Echo Locator, drop a{' '}
              <strong>Save Beacon</strong> at the Harmonic Camp, and input the 3 math register glyphs. Each camp cycles
              through <strong>3 to 6 crash sites</strong> in its local radius. Once it repeats a site, fly to the other
              side of the planet and use another Echo Locator for a fresh camp!
            </li>
            <li>
              <strong>Duplicating a Natural S-Class Crash Site:</strong> Drop a <strong>Base Computer 50u away</strong>{' '}
              (not directly on the scorched dirt), turn <strong>Multiplayer OFF</strong>, and claim/scrap the ship.
              Every few days after warping around other systems, that exact S-Class ship respawns at your Base Computer!
            </li>
          </ol>
        </div>

        <div className="lg:col-span-5 hud-card rounded-2xl p-5 space-y-3 border border-purple-500/30">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i className="ph-duotone ph-brain text-purple-400 text-xl" aria-hidden="true" />
            Fix: When the Hyaline Brain Won't Probe
          </h2>
          <p className="text-xs text-slate-300">
            If pressing <em>"Probe Subconscious"</em> (<code>E</code> / <code>X</code>) on the Hyaline Brain zooms out
            briefly and does nothing, verify these 3 rules:
          </p>
          <ul className="space-y-2 text-xs text-slate-200">
            <li className="p-2.5 rounded-xl bg-slate-900 border border-purple-500/30">
              <strong className="text-purple-300">1. Hold 3 Radiant Shards + 1 Inverted Mirror (#1 Culprit):</strong>{' '}
              The Hyaline Brain silently refuses to mark the Ancient Monolith unless you currently hold at least{' '}
              <strong>3 Radiant Shards AND 1 Inverted Mirror</strong> in your pockets!
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-cyan-300">2. Click the Ship's Broken Brain Slot:</strong> Open the crashed ship
              and click directly on the damaged <em>Harmonic Brain / Pilot Interface</em> slot to pin the quest.
            </li>
            <li className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-emerald-300">3. Check Mission Log / Probe in Space:</strong> Highlight the{' '}
              <em>Salvage Site</em> quest in <code>Pause &rarr; Log</code> (abandon duplicate salvage quests) or probe
              while floating in low orbit.
            </li>
          </ul>
        </div>
      </div>

      {/* Two-Vendor Outlaw Station Nanite Flip & Anomalous Doughnut Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="hud-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-emerald-300 border-b border-slate-800 pb-2.5">
            The Two-Vendor Outlaw Station Loop (Units &rarr; 25,000+ Nanites)
          </h2>
          <a
            href="#outlaw"
            className="text-xs font-medium text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5"
          >
            <i className="ph-bold ph-skull" aria-hidden="true" /> Track your stations and plan the next run →
          </a>
          <p className="text-xs text-slate-300">
            Regular upgrade vendors only accept Nanites. To buy Nanites using <strong>Units</strong>, visit an{' '}
            <strong>Outlaw (Pirate) Station</strong> and use both vendors:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 font-mono text-xs space-y-2 text-slate-200">
            <div className="text-amber-300 font-bold">[VENDOR #1: CONTRABAND AGENT] (Sitting by tent/crates)</div>
            <div>
              1. Spend <strong>UNITS (~75,000 U each)</strong> to buy all <em>"Suspicious Packet (Tech)"</em> and{' '}
              <em>"Suspicious Packet (Arms)"</em>.
            </div>
            <div>
              2. Open your inventory and{' '}
              <strong>
                UNPACK (<code>E</code>/<code>X</code>)
              </strong>{' '}
              every packet into unopened X-Class Upgrade Modules!
            </div>
            <div className="text-emerald-400 font-bold pt-1">
              [VENDOR #2: UPGRADE MERCHANT] (Next to Multi-Tool booth)
            </div>
            <div>
              3. Click <em>"Buy Upgrade Modules"</em> &rarr; Switch to the <strong>"SELL" tab</strong> at the top-left
              of the screen!
            </div>
            <div>
              4. Sell the unpacked X-Class modules for <strong>300 to 500 NANITES each</strong>! (75 packets = ~25,000+
              Nanites in 15 mins).
            </div>
          </div>
        </div>

        <div className="hud-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-amber-300 border-b border-slate-800 pb-2.5">
            Phase 3: Complete Anomalous Doughnut Recipe Tree
          </h2>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 font-mono text-xs space-y-1.5 text-slate-200">
            <div>
              <span className="text-cyan-300">Frost Crystal</span> &rarr; Glass Grains &rarr;{' '}
              <strong className="text-white">Refined Flour</strong>
            </div>
            <div>
              <span className="text-cyan-300">Faecium</span> &rarr; <strong className="text-white">Wild Yeast</strong>
            </div>
            <div>
              Refined Flour + Wild Yeast &rarr; <strong className="text-amber-300">Dough</strong>
            </div>
            <div>
              <span className="text-cyan-300">Fresh Milk</span> &rarr; Cream &rarr; Churned Butter &rarr;{' '}
              <strong className="text-white">Clarified Oil</strong>
            </div>
            <div>
              <span className="text-cyan-300">Cactus Flesh</span> &rarr; Cactus Nectar &rarr;{' '}
              <strong className="text-white">Processed Sugar</strong>
            </div>
            <div>
              Dough + Clarified Oil + Processed Sugar &rarr; <strong className="text-amber-300">Lumpy Doughnut</strong>
            </div>
            <div>
              <span className="text-purple-300">Hexaberry</span> (Exotic Planets) + Processed Sugar &rarr;{' '}
              <strong className="text-purple-300">Anomalous Jam</strong>
            </div>
            <div className="pt-1 border-t border-slate-800 text-emerald-300 font-bold">
              Lumpy Doughnut + Anomalous Jam &rarr; ★ ANOMALOUS DOUGHNUT ★
            </div>
          </div>
          <p className="text-[11px] text-amber-200">
            <strong>Execution:</strong> Do NOT eat from Cargo! Load into the Exosuit <strong>Nutrient Ingestor</strong>{' '}
            tech slot and click <em>"Begin Ingestion"</em> for 10M–33M Units per creature scan.
          </p>
        </div>
      </div>

      {/* Phase 4: Stasis Device & Split Gold Mines */}
      <div className="hud-card rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-bold text-base text-cyan-300 border-b border-slate-800 pb-2.5">
          Phase 4: Stasis Device Megafactory (15.6M U Each) & Split-Network Gold Mines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="font-mono text-cyan-300 font-bold">STASIS DEVICE FORMULA (312M U / Batch of 20)</div>
            <p>
              <strong>Quantum Processor</strong> (Circuit Board + Superconductor) + <strong>Cryogenic Chamber</strong>{' '}
              (Living Glass + Cryo-Pump) + <strong>Iridesite</strong> (Aronium + Magno-Gold + Grantine).
            </p>
            <p className="text-slate-400">
              Raw Batch of 20 Needs: 8,000 Radon, 8,000 Sulphurine, 8,000 Nitrogen, 8,000 Frost Crystal, 4,000 Gamma
              Root, 1,000 Faecium, 4,000 Star Bulb, 2,000 Cactus Flesh, 4,000 Solanium.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="font-mono text-amber-300 font-bold">BYPASSING THE 1,000/HR GOLD EXTRACTOR NERF</div>
            <p>
              Any single connected pipeline exceeding <strong>1,000 mineral/hr</strong> suffers severe diminishing
              returns. Stack <strong>3–4 Mineral Extractors</strong> on the hotspot center wired to{' '}
              <strong>Supply Pipe A &rarr; Depot Row A</strong>. Stack another 3–4 Extractors directly above them wired
              to an <strong>isolated Supply Pipe B &rarr; Depot Row B</strong> so pipes and depots never touch!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
