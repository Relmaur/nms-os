---
title: "Upgrade bonus"
category: "mechanics"
kind: "mechanic"
summary: "Upgrade Bonus is a page on game mechanics."
pageId: 6004
revId: 1220965
revTimestamp: "2025-02-13T15:52:32Z"
version: "WorldsOne"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Upgrade_bonus"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{},"recipes":[]}
---

# Upgrade bonus

**Upgrade Bonus** is a page on game mechanics.

## Summary

Based on where upgrades are positioned on the inventory page of a [[starship]], [[exo-suit]], or [[multi-tool]], additional bonuses may be awarded.

Every technology in the game belongs to a hardcoded "family". When technologies of the same "family" are placed adjacent to one another, the technologies will gain a colored border around them to indicate that it is benefiting from the adjacency bonus.

## Bonus Calculation

The adjacency bonus is calculated for *every* side of *every* technology, and added to total additively, before the tool/ship's class bonus is calculated. It is calculated by multiplying:
- The hidden "bonus power" stat of the technology in possession of the side
- The hidden "bonus multiplier" stat of the technology the side is facing towards.
For an example, [[Emergency Warp Unit]], [[Cadmium Drive]], [[Emeril Drive]], and [[Indium Drive]] all have 0 bonus power, meaning a cluster of those 4 exclusively will yield a 0 extra hyperdrive range bonus no matter how you arrange them. This holds true even if you arrange them in a 2x2 square in an attempt to maximize the number of boosted sides. When you introduce an upgrade module with 100ly hyperdrive range bonus into the cluster, however, you can start collecting the bonuses, as the upgrade module has 5% of its 100ly, 5ly, as its bonus power. When you surround the upgrade module with the 4 technologies into a cross, you get 5ly from adjacency to Cadmium, Emeril, and Indium Drives. Even though both situations had 4 adjacent sides in total, the second one provides 20.5ly more bonus because you placed the upgrade module in the center. The Emergency Warp Unit is the only hyperdrive technology to offer 6% links instead of 5%. Most modules offer a 6% bonus between each other for a total of 12% (Multiplier 1.25).

To maximize the bonuses obtained from adjacency, place your strongest technology (usually upgrade modules) in the smallest cluster possible, then surround them with the rest of the modules into a square (or as close to it as possible).

Since the introduction of supercharge, only the tech-inventory accepts technology. Thus any pattern considerations outside of a basic pattern are removed.

## Supercharge

Supercharge replaced the old double module placement of inventory and tech-slots and offers bonuses to the base abilities of parts placed inside. Most parts without inherent abilities have no effect and should not be placed in supercharged slots.

The higher base stat of a supercharged technology is used for link symbiosis. For example, a 125% hyperdrive range would gain an additional 5% of those 125% in fuel efficiency and range, effectively making it 6.25%.

Supercharge-bonuses seem to have a range and are not multipliers, thus components bonuses can vary from 25-30% for maneuver of pulse drives. It was tested for modules 7% (getting 26% to 33%) to 14% (getting 28% to 44%) and 16% (getting 29% to 45%). It likely caps out at 20% getting 30% to 50%. Better modules still get better results! To find out all ranges, it is proposed to check C and S modules.

For some bonuses given by base technology, like the Deflector Shield, there seems to exist an inverse supercharge bonus. As such for new pilots and travellers, supercharging their core-tech over their modules can be a difference of +20% Shield Strength, while a high end ship only gets about 5%. Since any supercharged shield at best reaches +38% Shield strength (with +8% from supercharge), a basic ship will always profit more, while an endgame ship will prefer the S-Module. They both converge.

### Difference from Pre-Waypoint

Even with all three modules placed in supercharged slots and surrounded by boosts on all sides, the final result for hyperdrives is still less than the former six modules, effectively causing an enforced tech-crunch on the galaxy. The final boost together would roughly equate in the best case in plus 75% + 12x1.25% = 88.25%. Thus six modules have become 3.88 modules in the optimal case. This levels the playing field between high-tech freighters and high-tech ships again, as ships constantly out-jumped the mobile bases.

The change ultimately nerfed endgame entities and boosted early game entities with the use of the slots for those unable to afford many high tier modules.

## Listing

Following is a comprehensive list of the families, with their corresponding bonus stats.

**Note:** same color **does not** always mean the two are boosting each other! Test them next to each other and then by themselves!

### Exosuit

|   | Technology | Bonus Power | Bonus Multiplier |   |
| --- | --- | --- | --- | --- |
|   |   |   |   |   |
|   | [[Life Support]] | ? | ? |   |
| [[Oxygen Recycler]] | ? | ? |   |   |
| [[Life Support Upgrade]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Hazard Protection]] | ? | ? |   |
| [[Coolant Network]] | ? | ? |   |   |
| [[Thermic Layer]] | ? | ? |   |   |
| [[Toxin Suppressor]] | ? | ? |   |   |
| [[Radiation Deflector]] | ? | ? |   |   |
| [[Aeration Membrane]] | ? | ? |   |   |
| [[Shield Lattice]] | ? | ? |   |   |
| [[Life Support Upgrade]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Jetpack]] | ? | ? |   |
| [[Neural Stimulator]] | ? | ? |   |   |
| [[Rocket Boots]] | ? | ? |   |   |
| [[Efficient Water Jets]] | ? | ? |   |   |
| [[Airburst Engine]] | ? | ? |   |   |
| [[Movement System Upgrade]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Defence Systems Upgrade]] | ? | ? |   |
|   |   |   |   |   |
|   | [[Artemis' Translator]] | ? | ? |   |
| [[Simple Translator]] | ? | ? |   |   |
| [[Superior Translator]] | ? | ? |   |   |
| [[Advanced Translator]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Star Seed]] | ? | ? |   |
| [[Remembrance]] | ? | ? |   |   |

### Multi-Tool

|   | Technology | Bonus Power | Bonus Multiplier | Supercharged |   |
| --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   |
|   | [[Mining Beam]] | ? | ? | -10% Mining Speed <br> +25% Heat Dispersion |   |
| [[Advanced Mining Laser]] | ? | ? | +17% Mining Speed |   |   |
| [[Optical Drill]] | ? | ? | +28% Resources Mined |   |   |
| [[Mining Beam Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Scanner]] | ? | ? | +25% Scan Radius <br> +25% Recharge Time <br> (Note: recharge time and scan radius are not linked) |   |
| [[Waveform Recycler]] | ? | ? | -16% Recharge Time <br> +27% Scan Radius |   |   |
| [[Analysis Visor Upgrade]] | ? | ? | None |   |   |
| [[Survey Device]] | ? | ? | None |   |   |
|   |   |   |   |   |   |
|   | [[Boltcaster]] | ? | ? | +25% Damage <br> +16.67% Fire Rate <br> +20% Reload Speed <br> -15% Burst Cooldown <br> +16 Clip Size <br>+1 Shots Per Burst |   |
| [[Barrel Ioniser]] | ? | ? | -13% Recoil <br> -18% Burst Cooldown <br> +0.2 Shots Per Burst |   |   |
| [[Boltcaster Ricochet Module]] | ? | ? | None |   |   |
| [[Boltcaster Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Plasma Launcher]] | ? | ? | +25% Damage |   |
| [[Plasma Launcher Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Geology Cannon]] | ? | ? | +25% Damage <br> +15% Explosion Radius |   |
| [[Geology Cannon Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Neutron Cannon]] | ? | ? | +25% Damage <br> +2 Spheres Created <br> +20% Charge Time <br> +15% Ion Sphere Speed |   |
| [[P-Field Compressor]] | ? | ? | +0.5 Spheres Created <br> -18% Charging Speed <br> +7% Ion Sphere Speed |   |   |
| [[Neutron Cannon Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Blaze Javelin]] | ? | ? | +25% Damage <br> +20% Time to Full Power |   |
| [[Mass Accelerator]] | ? | ? | +3% Damage |   |   |
| [[Waveform Oscillator]] | ? | ? | +1 Second Stun Duration |   |   |
| [[Blaze Javelin Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Scatter Blaster]] | ? | ? | +25% Damage <br> +25% Fire Rate <br> +30% Reload Time <br> +20% Burst Cooldown <br> +2 Pellets Per Shot (from 8 to 10) |   |
| [[Shell Greaser]] | ? | ? | -17% Reload Time |   |   |
| [[Scatter Blaster Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Pulse Spitter]] | ? | ? | +25% Damage <br> +20% Fire Rate <br> +25% Reload Time <br> +20 Clip Size |   |
| [[Amplified Cartridges]] | ? | ? | +5 Clip Size |   |   |
| [[Impact Igniter]] | ? | ? | +20 Impact Fire Damage |   |   |
| [[Pulse Spitter Ricochet Module]] | ? | ? | None |   |   |
| [[Pulse Spitter Upgrade]] | ? | ? |   |   |   |

### Starship

|   | Technology | Bonus Power | Bonus Multiplier | Supercharged |   |
| --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   |
|   | [[Pulse Engine]] | Prevents 5.5% links of other modules | +4% Total Maneuver per link | +20% Total Maneuver <br>(worse than S-Rank) |   |
| [[Instability Drive]] | No Bonus | 0 | +14% Pulse Engine Fuel Efficiency |   |   |
| [[Sub-Light Amplifier]] | No Bonus | 0 | +33% Drive Power |   |   |
| [[Photonix Core]] | Bonus blocked if paired with base Engine | +5.5% Total Maneuver per link | +17% Pulse Engine Fuel Efficiency, +29% Boost, +27% Maneuverability |   |   |
| [[Flight Assist Override]] | Bonus blocked if paired with base Engine | +5.5% Total Maneuver per link | +27% Maneuverability |   |   |
| [[Pulse Engine Upgrade]] | Bonus blocked if paired with base Engine | +5.5% Total Maneuver per link | Pulse Drive Fuel Efficiency at base 20 around 16% <br> Boost up to 30% <br> Maneuver 25-30% |   |   |
|   |   |   |   |   |   |
|   | [[Hyperdrive]] | 5 ly per base tech link | 1 (5%) | 25 ly (S-Modules give more than double) |   |
| [[Cadmium Drive]] | Base Tech | 1 (5%) | None |   |   |
| [[Emeril Drive]] | Base Tech | 1 (5%) | None |   |   |
| [[Indium Drive]] | Base Tech | 1 (5%) | None |   |   |
| [[Emergency Warp Unit]] | Pseudo-Module | 1.25 (6%) | None (less damage?) |   |   |
| [[Hyperdrive Upgrade]] | Module | 1.25 (6%) | Warp Cell Efficiency up to 25% <br> Hyperdrive Range up to 25% |   |   |
|   |   |   |   |   |   |
|   | [[Launch Thruster]] | ? | ? | +4% Launch Cost <br> (Is it faster, more Boost? Else it is bad!) |   |
| [[Efficient Thrusters]] | ? | ? | -16% Launch Cost |   |   |
| [[Launch System Recharger]] | ? | ? | None (No faster recharge) |   |   |
| [[Launch System Upgrade]] | ? | ? | -16% Launch Cost <br> +27% Boost |   |   |
|   |   |   |   |   |   |
|   | [[Deflector Shield]] | +1 Strength per Dual Link <br> (0.2 with Ablative Armour) | ? | +20% Base Strength down to +5% <br> (worse the higher your overall stat) |   |
| [[Ablative Armour]] | +1.5 Strength per Dual Link | ? | Shield Strength +2% |   |   |
| [[Deflector Shield Upgrade]] | +2.5 Strength per Dual Link | ? | Shield Strength up to +8% |   |   |
|   |   |   |   |   |   |
|   | [[Photon Cannon]] | +5.5% per link | ? | +40% DMG <br> +20% Fire rate <br> +25% Heat Dispersion |   |
| [[Nonlinear Optics]] | +5.5% per link | ? | +29% Heat Dispersion |   |   |
| [[Photon Cannon Upgrade]] | ? | ? | ? |   |   |
|   |   |   |   |   |   |
|   | [[Rocket Launcher]] | 5.5% DMG per link | ? | 20%-60% DMG (scales with damage potential of the ship) <br> +25% Projectile Speed <br> (Effectively increases range by +25%) |   |
| [[Large Rocket Tubes]] | 5.5% per link | ? | +16% Heat Recovery |   |   |
|   |   |   |   |   |   |
|   | [[Phase Beam]] | Module links only count module link | ? | +25% down to +15% <br> (inverted with total DMG) <br> +20% Heat Dispersion |   |
| [[Fourier De-Limiter]] | 4% per dual link (with Phase Beam)<br> Module links only count module link | ? | +27% Heat Dispersion <br> +12% Shield Leech (total 62%) |   |   |
| [[Phase Beam Upgrade]] | +1.25% per link | ? | Damage up to +6%<br> Heat Dispersion up to +42-47% |   |   |
|   |   |   |   |   |   |
|   | [[Positron Ejector]] | ? | ? | +25% Damage <br> +10% Fire Rate <br> +25% Heat Dispersion <br> +50% Projectile Speed <br> (Effectively increases range by +50%) |   |
| [[Fragment Supercharger]] | ? | ? | +16% Accuracy <br> +32% Range |   |   |
| [[Positron Ejector Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Infra-Knife Accelerator]] | ? | ? | +25% Damage <br> +25% Fire Rate <br> +33% Heat Dispersion |   |
| [[Q-Resonator]] | ? | ? | increases to 4 shots (not clearly visible) |   |   |
| [[Infra-Knife Accelerator Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Cyclotron Ballista]] | ? | ? | +25% Damage <br> +20% Fire Rate <br> +25% Heat Dispersion |   |
| [[Dyson Pump]] | ? | ? | +27% Heat Dispersion |   |   |
| [[Cyclotron Ballista Upgrade]] | ? | ? | ? |   |   |

#### Living Ship

|   | Technology | Bonus Power | Bonus Multiplier |   |
| --- | --- | --- | --- | --- |
|   |   |   |   |   |
|   | [[Neural Assembly]] | ? | ? |   |
| [[Neural Assembly Node]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Pulsing Heart]] | ? | ? |   |
| [[Pulsing Heart Node]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Scream Suppressor]] | ? | ? |   |
| [[Scream Suppressor Node]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Singularity Cortex]] | 0 | 1 |   |
| [[Singularity Cortex Node]] | 5% of shown stat | 1.2 |   |   |
|   |   |   |   |   |
|   | [[Spewing Vents]] | ? | ? |   |
| [[Spewing Vents Node]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Grafted Eyes]] | ? | ? |   |
| [[Grafted Eyes Node]] | ? | ? |   |   |

### Exocraft

|   | Technology | Bonus Power | Bonus Multiplier | Supercharged |   |
| --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   |
|   | [[Drift Suspension]] | ? | ? | +75% Forwards Grip <br> -14% Angular Grip |   |
| [[Grip Boost Suspension]] | ? | ? | -11% Forwards Grip <br> +53% Angular Grip |   |   |
| [[Hi-Slide Suspension]] | ? | ? | -11% Forwards Grip <br> -14% Angular Grip |   |   |
|   |   |   |   |   |   |
|   | [[Exocraft Signal Booster]] | ? | ? |   |   |
| [[Advanced Signal Booster]] | ? | ? |   |   |   |
| [[Exocraft Signal Booster Upgrade Tau]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Fusion Engine]] | ? | ? | +25% Top Speed |   |
| [[Fusion Engine Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Exocraft Boost Module]] | ? | ? | ~15% Boost Power +33% Tank Size |   |
| [[Exocraft Boosters Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Exocraft Mining Laser]] | ? | ? | +25% Mining Laser Power |   |
| [[Advanced Exocraft Laser]] | ? | ? | +16% Mining Laser Power <br> +25% Advanced Exocraft Mining Laser <br> (Note: this does nothing) |   |   |
| [[Exocraft Mining Laser Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Exocraft Mounted Cannon]] | ? | ? | +20% Damage <br> +25% Fire Rate <br> +20% Weapon Efficiency |   |
| [[Exocraft Mounted Cannon Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Exocraft Radar]] | ? | ? | None |   |
| [[Radar Amplifier]] | ? | ? | +25% Scan <br> (Note: this does nothing) |   |   |
| [[Radar Power Resonator]] | ? | ? | +25% Scan <br> (Note: this does nothing) |   |   |

#### Nautilon

|   | Technology | Bonus Power | Bonus Multiplier |   |
| --- | --- | --- | --- | --- |
|   |   |   |   |   |
|   | [[Humboldt Drive]] | ? | ? |   |
| [[Osmotic Generator]] | ? | ? |   |   |
| [[Humboldt Drive Upgrade]] | ? | ? |   |   |
|   |   |   |   |   |
|   | [[Nautilon Cannon]] | ? | ? |   |
| [[Nautilon Cannon Upgrade]] | ? | ? |   |   |

#### Minotaur

|   | Technology | Bonus Power | Bonus Multiplier | Supercharged |   |
| --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   |
|   | [[Daedalus Engine]] | ? | ? | None |   |
| [[Ariadne's Flame]] | ? | ? | +25% Boost Tank Size |   |   |
| [[Self-Greasing Servos]] | ? | ? |   |   |   |
| [[Minotaur Engine Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Environment Control Unit]] | ? | ? | None |   |
| [[Minotaur Radar Array]] | ? | ? | None |   |   |
| [[Minotaur AI Pilot]] | ? | ? | None |   |   |
|   |   |   |   |   |   |
|   | [[Minotaur Laser]] | ? | ? | +25% Mining Laser Power |   |
| [[Precision Minotaur Laser]] | ? | ? | +16% Mining Laser Power <br> +25% Advanced Exocraft Mining Laser <br> (Note: this does nothing) |   |   |
| [[Minotaur Laser Upgrade]] | ? | ? |   |   |   |
|   |   |   |   |   |   |
|   | [[Minotaur Cannon]] | ? | ? | +25% Damage <br> +25% Fire Rate +25% Weapon Efficiency |   |
| [[Precision Minotaur Laser]] | ? | ? | +16% Mining Laser Power <br> +25% Advanced Exocraft Mining Laser <br> (Note: this does nothing) |   |   |
| [[Minotaur Laser Upgrade]] | ? | ? |   |   |   |

### Freighter

|   | Technology | Bonus Power | Bonus Multiplier |   |
| --- | --- | --- | --- | --- |
|   |   |   |   |   |
|   | [[Freighter Hyperdrive]] | 0 | 1 |   |
| [[Amplified Warp Shielding]] | 2.5 ly | 1.2 |   |   |
| [[Chromatic Warp Shielding]] | 2.5 ly | 1.2 |   |   |
| [[Temporal Warp Computer]] | 2.5 ly | 1.2 |   |   |
| [[Warp Core Resonator]] | 10 ly | 1.2 |   |   |
| [[Plasmatic Warp Injector]] | 15 ly | 1.2 |   |   |
| [[Reality De-threader]] | 40 ly | 1.2 |   |   |

## Version Differences

- [[Update 4.05|Waypoint]]: Supercharged slots added to technology. Removal of general inventory, reducing the maximum equippable modules from 6 to 3
