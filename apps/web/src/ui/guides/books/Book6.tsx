// Book 6: ported as written from the vanilla page (the hand-written playbook; see docs/STATE.md).

export function Book6() {
  return (
    <>
      <div className="hud-card rounded-2xl p-5 space-y-4">
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="The seven endgame pillars (scrolls sideways)"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                <th className="py-2.5 px-3">Pillar</th>
                <th className="py-2.5 px-3">Questline / Trigger</th>
                <th className="py-2.5 px-3">Ultimate Reward</th>
                <th className="py-2.5 px-3">Exact Unlock Prerequisite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-300">1. Portal Mastery & Lush Reset</td>
                <td className="py-2.5 px-3">
                  <em>The Purge</em> & <em>Atlas Path</em>
                </td>
                <td className="py-2.5 px-3">
                  All 16 Glyphs, Star Seed & <strong>Eissentam (#10)</strong>
                </td>
                <td className="py-2.5 px-3">
                  Finish Artemis story; pick <strong>Green Orb</strong> (equip junk ship/tool first!)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-purple-300">2. Autophage Robot Faction</td>
                <td className="py-2.5 px-3">
                  <em>They Who Returned</em>
                </td>
                <td className="py-2.5 px-3">
                  <strong>Voltaic Staffs</strong>, Atlantid Rifles & Armor
                </td>
                <td className="py-2.5 px-3">
                  Complete <em>The Purge</em> + Unlock 1 Harmonic Camp + Warp in ship
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-300">3. Purple Stars & Gas Giants</td>
                <td className="py-2.5 px-3">
                  <em>In Stellar Multitudes</em>
                </td>
                <td className="py-2.5 px-3">
                  <strong>Atlantid Drive</strong>, Gas Giants & Deep Oceans
                </td>
                <td className="py-2.5 px-3">
                  Complete <em>Atlas Path</em> + <em>They Who Returned</em>, then pulse in space
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-red-400">4. Pirate Dreadnought Flagship</td>
                <td className="py-2.5 px-3">Outlaw Warp Battle</td>
                <td className="py-2.5 px-3">
                  <strong>S-Class Pirate Dreadnought Freighter</strong>
                </td>
                <td className="py-2.5 px-3">Own any normal Freighter, then warp into Outlaw Systems (3h + 5 jumps)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-300">5. AI Minotaur & Laylaps Drone</td>
                <td className="py-2.5 px-3">
                  <em>A Trace of Metal</em>
                </td>
                <td className="py-2.5 px-3">
                  <strong>Autonomous AI Combat Mech</strong> + Drone Buddy
                </td>
                <td className="py-2.5 px-3">Claim a Planetary Settlement & defend against first Sentinel attack</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-300">6. Custom S-Class Ship Foundry</td>
                <td className="py-2.5 px-3">Station Ship Fabricator</td>
                <td className="py-2.5 px-3">
                  <strong>Custom-Built S-Class Fighter/Hauler/Solar</strong>
                </td>
                <td className="py-2.5 px-3">Salvage Cockpit + Wings + Thrusters from donor ships + S-Reactor Core</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-purple-300">7. Living Ships & Organic Fleet</td>
                <td className="py-2.5 px-3">
                  <em>Starbirth</em> & Dream Aerial
                </td>
                <td className="py-2.5 px-3">
                  <strong>S-Class Living Ship</strong> & Organic Frigates
                </td>
                <td className="py-2.5 px-3">
                  Pulse in space with your <strong>Void Egg</strong> in inventory (5-day timer)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="hud-card rounded-2xl p-5 space-y-3 border border-red-500/30">
          <h2 className="font-display font-bold text-base text-red-300 border-b border-slate-800 pb-2">
            How to Force a Pirate Dreadnought to Surrender in 45 Seconds
          </h2>
          <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
            <li>
              <strong>Destroy the 4 Rear Warp Engines First:</strong> Fly directly underneath the rear stern of the
              Pirate Dreadnought (inside its shield bubble) and blast the <strong>4 glowing Warp Engines</strong> so it
              cannot escape.
            </li>
            <li>
              <strong>Destroy the 6 Top Deck Anti-Freighter Turrets:</strong> Fly straight up to the top dorsal trench
              and blast the <strong>6 Heavy Laser Cannons</strong> firing on the civilian fleet.
            </li>
            <li>
              <strong>Board & Claim for Free:</strong> The Dreadnought surrenders immediately! Land in its hangar, scan
              the wall with your Analysis Visor to check its Class, and either{' '}
              <strong>Claim the Dreadnought for Free</strong> or demand{' '}
              <strong>6.7M Units + Freighter Bulkheads</strong> from the Captain!
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}
