// The bottom tab bar below lg (the Codex page carries a static copy). Home, Systems and Outlaw have their own tab;
// every other section lives under More.
import { useEffect } from 'react';
import { useOutlawReady } from './counts.ts';
import { useSection } from './section-store.ts';

const OWN_TAB = new Set(['home', 'systems', 'outlaw']);

export function TabBar() {
  const section = useSection();
  const { ready } = useOutlawReady();
  const at = OWN_TAB.has(section) ? section : 'more';

  // Ready stations on the installed app's icon too (where the platform supports badges).
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    (ready ? navigator.setAppBadge(ready) : navigator.clearAppBadge()).catch(() => undefined);
  }, [ready]);

  const tab = (key: string, href: string, icon: string, label: string, badge?: number) => {
    const active = at === key;
    const glyph = <i className={`${active ? 'ph-fill' : 'ph-bold'} ${icon}`} aria-hidden="true" />;
    return (
      <a href={href} data-tab={key} aria-current={active ? 'page' : undefined} className="tab-item">
        {badge === undefined ? (
          glyph
        ) : (
          <span className="relative">
            {glyph}
            <span id="tabOutlawBadge" className={`tab-badge ${badge ? '' : 'hidden'}`}>
              {badge}
            </span>
          </span>
        )}
        <span>{label}</span>
      </a>
    );
  };
  return (
    <nav id="tabBar" aria-label="Primary" className="tab-bar lg:hidden">
      {tab('home', '#home', 'ph-house', 'Home')}
      {tab('systems', '#systems', 'ph-planet', 'Systems')}
      {tab('outlaw', '#outlaw', 'ph-skull', 'Outlaw', ready)}
      {tab('codex', 'wiki/', 'ph-books', 'Codex')}
      {tab('more', '#more', 'ph-dots-three-circle', 'More')}
    </nav>
  );
}
