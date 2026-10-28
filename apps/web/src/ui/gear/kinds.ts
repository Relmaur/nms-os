// How each kind of gear is named and drawn, shared by the gear screens, Home and the header search.
import type { GearKind } from '@atlas/core/gear';

export const KINDS: Record<GearKind, { label: string; plural: string; icon: string; empty: string }> = {
  starship: {
    label: 'Starship',
    plural: 'Starships',
    icon: 'ph-rocket',
    empty: 'No starships yet. Add the one you fly: its slots and layout stay with it.'
  },
  multitool: {
    label: 'Multi-Tool',
    plural: 'Multi-Tools',
    icon: 'ph-crosshair',
    empty: 'No Multi-Tools yet. Add yours to keep its supercharged layout at hand.'
  },
  exosuit: {
    label: 'Exosuit',
    plural: 'Exosuit',
    icon: 'ph-person-simple',
    empty: 'Add your Exosuit to note what sits in its three supercharged slots.'
  }
};
