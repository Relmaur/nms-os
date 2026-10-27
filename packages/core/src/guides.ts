// The six-book playbook: book metadata, the checklists inside the books, and how far along they are. Checklist ids
// are keys of nms_state.json → checklists, so renaming one loses that tick on every saved state.

export type BookKey = 'book1' | 'book2' | 'book3' | 'book4' | 'book5' | 'book6';

export interface Book {
  key: BookKey;
  numeral: string;
  color: string;
  title: string;
  blurb: string;
}

export const BOOKS: Book[] = [
  {
    key: 'book1',
    numeral: 'I',
    color: 'text-cyan-300',
    title: 'Cross-Save & First Hours',
    blurb: 'Cross-save setup, game modes and your first five hours'
  },
  {
    key: 'book2',
    numeral: 'II',
    color: 'text-emerald-300',
    title: 'Units & Nanites',
    blurb: 'The 4.29B Unit and Nanite wealth blueprint'
  },
  {
    key: 'book3',
    numeral: 'III',
    color: 'text-purple-300',
    title: 'Ship & Multi-Tool Meta',
    blurb: 'Supercharged slots, choosing a flagship, Multi-Tool archetypes'
  },
  {
    key: 'book4',
    numeral: 'IV',
    color: 'text-amber-300',
    title: 'Self-Sufficient Base',
    blurb: 'Hotspots, farms and an automated, cozy base'
  },
  {
    key: 'book5',
    numeral: 'V',
    color: 'text-sky-300',
    title: 'Expeditions & Porting',
    blurb: 'Community expeditions and carrying items home'
  },
  {
    key: 'book6',
    numeral: 'VI',
    color: 'text-red-300',
    title: 'Endgame Pillars',
    blurb: 'Seven pillars of post-wealth progression'
  }
];

export interface CheckItem {
  id: string;
  title: string;
  desc: string;
}

export type ChecklistKey = 'milestones' | 'crosssave' | 'roadmap' | 'expedition' | 'endgame';

// Which book each checklist sits in (the Guides list counts per book).
export const CHECKLIST_BOOK: Record<ChecklistKey, BookKey> = {
  milestones: 'book1',
  crosssave: 'book1',
  roadmap: 'book1',
  expedition: 'book5',
  endgame: 'book6'
};

export const CHECKLISTS: Record<ChecklistKey, CheckItem[]> = {
  // The named keys of nms_state.json → checklists
  milestones: [
    {
      id: 'crossSaveLinked',
      title: 'Cross-Save Linked',
      desc: 'PC, Mac, Switch & iOS share one Hello Games Cloud save.'
    },
    {
      id: 'anomalyUnlocked',
      title: 'Space Anomaly Unlocked',
      desc: 'Summoned the Anomaly and opened the Iteration vendors.'
    },
    { id: 'harmonicCampUnlocked', title: 'Harmonic Camp Unlocked', desc: 'Solved a Dissonant System register puzzle.' },
    {
      id: 'sClassInterceptorSecured',
      title: 'S-Class Interceptor Secured',
      desc: 'An S-Class Interceptor claimed as your flagship.'
    },
    {
      id: 'sentinelRifleSecured',
      title: 'Sentinel Rifle Secured',
      desc: 'A Sentinel Multi-Tool claimed from a Harmonic Camp cabinet.'
    },
    {
      id: 'nutrientIngestorInstalled',
      title: 'Nutrient Ingestor Installed',
      desc: 'Required to eat Anomalous Doughnuts for the scanner buff.'
    },
    {
      id: 'anomalousDoughnutBatchCooked',
      title: 'Anomalous Doughnut Batch Cooked',
      desc: 'First batch ready for the fauna-scan Unit run.'
    },
    {
      id: 'capitalFreighterClaimed',
      title: 'Capital Freighter Claimed',
      desc: 'Won the second rescue battle for a free Capital Freighter.'
    },
    {
      id: 'oxygenAlchemyBaseBuilt',
      title: 'Oxygen Alchemy Base Built',
      desc: 'Oxygen hotspot feeding the refiner chamber (Book IV).'
    },
    {
      id: 'autophageUnlocked',
      title: 'Autophage Unlocked',
      desc: 'They Who Returned triggered after The Purge + Harmonic Camp.'
    }
  ],
  crosssave: [
    { id: 'cs1', title: 'Step 1: Log In to Hello Games Cloud', desc: 'Visit cloud.nomanssky.com and sign in.' },
    {
      id: 'cs2',
      title: 'Step 2: Link All Platform Accounts',
      desc: 'Connect Steam/Mac, Nintendo Switch, and Apple/iOS accounts.'
    },
    { id: 'cs3', title: 'Step 3: Enable Cross-Save Toggle', desc: 'Verify every connected platform is switched ON.' },
    {
      id: 'cs4',
      title: 'Step 4: Upload Primary Save Slot',
      desc: 'Click the Cloud Icon next to your main save slot in-game (max 5 slots).'
    },
    {
      id: 'cs5',
      title: 'Step 5: Verify Patch Parity Before Syncing',
      desc: 'Confirm version numbers match at the bottom-left of the title screen.'
    }
  ],
  roadmap: [
    {
      id: 'rm1',
      title: 'Hr 0–1: Planet Escape & Melee-Boost',
      desc: 'Gather Sodium/Oxygen; Sprint + Melee (Q/R) + Jetpack to fly 3x faster.'
    },
    {
      id: 'rm2',
      title: 'Hr 1–3: Rush the Space Anomaly',
      desc: 'Follow Awakenings until first warp jump and summon the Space Anomaly.'
    },
    {
      id: 'rm3',
      title: 'Hr 1–3: Unlock Nutrient Ingestor & Survey Device',
      desc: 'Purchase blueprints from Iteration: Selene & Eos on the Anomaly.'
    },
    {
      id: 'rm4',
      title: 'Ongoing: Double Exosuit Slots Per System',
      desc: 'Buy Slot #1 at the Space Station + Slot #2 inside the Space Anomaly.'
    },
    {
      id: 'rm5',
      title: 'Jump #5: Skip First System Freighter',
      desc: 'Avoid hitting friendly Freighter; answer radio (X); choose "Request Payment Instead".'
    },
    {
      id: 'rm6',
      title: 'Jump #10: Claim Free Capital Freighter',
      desc: 'Win second rescue battle (3 hrs + 5 warps) to claim a giant Capital Freighter 100% free.'
    },
    {
      id: 'rm7',
      title: 'Recovery: Strip & Scrap Your Spare S-Class Ship',
      desc: 'Store its tech (X), then scrap the hull for Units + Storage Augmentations.'
    },
    {
      id: 'rm8',
      title: 'Meta Gear: Wire Your Flagship & Multi-Tool',
      desc: 'Infra-Knife in the middle of three SC slots in a row; Optical Drill on a SC slot among Mining mods.'
    }
  ],
  expedition: [
    {
      id: 'ex1',
      title: 'Pack 8 Tech Slots at Anomaly Terminus',
      desc: '3x S-Class Scanner Mods, 1x Optical Drill, 3x Movement Mods, 1x Personal Refiner Mk 2.'
    },
    {
      id: 'ex2',
      title: 'Pack Nanite Seed (For Cloning Your Flagship)',
      desc: '2–3 stacks of 9,999 Runaway Mould OR 30 Unopened Suspicious Tech Packets (~6,000 Nanites).'
    },
    {
      id: 'ex3',
      title: 'Pack Unit Seed & Survival Stacks',
      desc: '10x Anomalous Doughnuts, 5x AI Valves, 9,999 Oxygen, Cond. Carbon, Ferrite, Batteries.'
    },
    {
      id: 'ex4',
      title: 'Equip Your Flagship & Main Multi-Tool Before Starting',
      desc: 'Ensure both are active so you can clone them inside the Expedition for ~5,000 Nanites.'
    },
    {
      id: 'ex5',
      title: 'Zero-Loss Extraction Before Clicking End',
      desc: 'Use "Return to Primary Save" to mule multiple batches; equip Reward Ship before ending!'
    }
  ],
  endgame: [
    {
      id: 'eg1',
      title: 'Pillar 1: Portal Mastery & Eissentam Reset',
      desc: 'Finish The Purge (16 Glyphs) and choose the Green Orb (equip junk ship/tool first).'
    },
    {
      id: 'eg2',
      title: 'Pillar 2: The Autophage Faction',
      desc: 'Complete The Purge + Unlock 1 Harmonic Camp + Warp to trigger They Who Returned.'
    },
    {
      id: 'eg3',
      title: 'Pillar 3: Purple Stars & Gas Giants',
      desc: 'Finish Atlas Path + Autophage to unlock the Atlantid Drive in In Stellar Multitudes.'
    },
    {
      id: 'eg4',
      title: 'Pillar 4: S-Class Pirate Dreadnought',
      desc: 'Blast 4 rear warp engines + 6 top deck laser cannons in Outlaw battle to force surrender.'
    },
    {
      id: 'eg5',
      title: 'Pillar 5: AI Minotaur & Laylaps Companion',
      desc: 'Claim a Planetary Settlement and complete A Trace of Metal.'
    },
    {
      id: 'eg6',
      title: 'Pillar 6: Custom S-Class Ship Foundry',
      desc: 'Salvage Cockpit, Wings & Thrusters and assemble with an S-Class Reactor Core.'
    },
    {
      id: 'eg7',
      title: 'Pillar 7: Starbirth (Void Egg Living Ship)',
      desc: 'Pulse in space with your Void Egg to complete the 5-day organic ship questline.'
    }
  ]
};

export interface Progress {
  done: number;
  total: number;
}

export interface GuideProgress extends Progress {
  pct: number;
  perBook: Partial<Record<BookKey, Progress>>;
}

export function guideProgress(checklists: Record<string, boolean>): GuideProgress {
  const perBook: Partial<Record<BookKey, Progress>> = {};
  let done = 0;
  let total = 0;
  // CHECKLISTS is typed Record<ChecklistKey, …>, so its keys are exactly ChecklistKey.
  for (const [key, items] of Object.entries(CHECKLISTS) as [ChecklistKey, CheckItem[]][]) {
    const book = (perBook[CHECKLIST_BOOK[key]] ??= { done: 0, total: 0 });
    const ticked = items.filter(item => checklists[item.id] === true).length;
    book.done += ticked;
    book.total += items.length;
    done += ticked;
    total += items.length;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, perBook };
}
