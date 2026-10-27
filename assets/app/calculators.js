// Calculators on the wiki mirror (wiki/game-data.json): recipe planner, base value, mineral extractors.
// Every number shown is wiki data, arithmetic on it, or an input the player sets (docs/calculators.md).
import { escapeHtml } from '../lib/util.js';
import * as planner from '../lib/planner.js';
import { showToast } from './ui.js';

const findItem = name => planner.findItem(gameData, name);
const planRecipes = item => planner.planRecipes(gameData, item);
const expandPlan = (name, qty) => planner.expandPlan(gameData, name, qty, planChoices);
const { makeCatalog, collectRaw, countSteps } = planner;

const PLAN_PRESETS = ['Stasis Device', 'Fusion Ignitor', 'Circuit Board', 'Living Glass', 'Anomalous Doughnut'];
const VALUE_DEFAULTS = ['Radiant Shard', 'Inverted Mirror', 'Hyaline Brain']; // Sentinel salvage
const RECIPE_MACHINE = { craft: 'Crafted', cook: 'Nutrient Processor' };

let gameData = null; // makeCatalog() + { verification }
let gameDataPromise = null;
let planItem = 'Stasis Device';
const planChoices = {}; // item title -> index of the alternative recipe in use
let valueRows = VALUE_DEFAULTS.map(title => ({ title, qty: 1 }));

export function loadGameData() {
    gameDataPromise ??= Promise.all([
        fetch('wiki/game-data.json').then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),
        fetch('wiki/verification.json', { cache: 'no-store' }).then(res => res.ok ? res.json() : null).catch(() => null)
    ]).then(([data, verification]) => {
        gameData = { ...makeCatalog(data), verification };
        fillCalculatorOptions();
        renderCalculators();
    }).catch(() => {
        gameDataPromise = null;
        document.getElementById('calcSource').textContent = 'The wiki data couldn’t be loaded. Open the app from the live site or run npm start (it isn’t available when index.html is opened as a file).';
    });
    return gameDataPromise;
}

const currentItems = () => [...gameData.byTitle.values()].filter(item => !item.obsolete);
const formatQty = n => Number(n).toLocaleString();
function formatUnits(n) {
    return n >= 1e6 ? `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}M` : Math.round(n).toLocaleString();
}

function codexLink(item, label = item?.title) {
    return item
        ? `<a href="wiki/#/a/${encodeURIComponent(item.path)}" class="text-white hover:text-cyan-200 underline decoration-slate-600 underline-offset-2">${escapeHtml(label)}</a>`
        : `<span class="text-slate-200">${escapeHtml(label)}</span>`;
}

function fillCalculatorOptions() {
    const options = list => list.sort((a, b) => a.title.localeCompare(b.title)).map(item => `<option value="${escapeHtml(item.title)}">`).join('');
    document.getElementById('planItemOptions').innerHTML = options(currentItems().filter(item => planRecipes(item).length));
    document.getElementById('valueItemOptions').innerHTML = options(currentItems().filter(item => item.value > 0));
    const minerals = currentItems().filter(item => item.category === 'resources' && item.value > 0).sort((a, b) => a.title.localeCompare(b.title));
    document.getElementById('mineMineral').innerHTML = minerals.map(item => `<option ${item.title === 'Gold' ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('');
    document.getElementById('planPresets').innerHTML = PLAN_PRESETS.map(findItem).filter(Boolean).map(item => `
        <button data-title="${escapeHtml(item.title)}" onclick="setPlanItem(this.dataset.title)" class="tag-filter">${escapeHtml(item.title)}</button>`).join('');
}

function renderCalculators() {
    const v = gameData.verification;
    document.getElementById('calcSource').innerHTML = `Using ${gameData.pages.toLocaleString()} wiki pages${v?.status === 'match'
        ? `, verified against the wiki on ${new Date(v.checkedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : ''}. <a href="wiki/" class="text-emerald-300 hover:text-emerald-200">Open the Codex →</a>`;
    renderPlanner();
    renderValue();
    renderExtractors();
}

// ---------------------------------------------------------------------------
// Recipe planner: expands crafting and cooking recipes down to raw materials
// ---------------------------------------------------------------------------
function setPlanItem(value) {
    const item = findItem(value);
    if (!item) return;
    if (!planRecipes(item).length) {
        showToast(`${item.title} has no crafting or cooking recipe on the wiki.`);
        return;
    }
    planItem = item.title;
    renderPlanner();
}

function cycleRecipe(title) {
    const item = findItem(title);
    const count = item ? planRecipes(item).length : 0;
    if (count < 2) return;
    planChoices[title] = ((planChoices[title] || 0) + 1) % count;
    renderPlanner();
}

function renderPlanNode(node) {
    const machine = node.recipe
        ? `<span class="text-xs text-slate-400">${RECIPE_MACHINE[node.recipe.type]}${node.recipe.blueprint ? ' · blueprint' : ''}${node.makes > node.qty ? ` · makes ${formatQty(node.makes)}` : ''}</span>`
        : '<span class="text-xs text-emerald-300/90">raw</span>';
    const alternatives = node.recipes.length > 1
        ? `<button data-title="${escapeHtml(node.title)}" onclick="cycleRecipe(this.dataset.title)" class="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-slate-700 hover:border-cyan-400/60 text-[11px] text-slate-300 hover:text-cyan-200" title="Switch to another recipe"><i class="ph-bold ph-arrows-clockwise"></i>Recipe ${node.index + 1} of ${node.recipes.length}</button>`
        : '';
    return `
        <li>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5">
                <span class="font-mono text-xs tabular-nums text-cyan-200">${formatQty(node.qty)}×</span>
                <span class="text-sm">${codexLink(node.item, node.title)}</span>
                ${machine}${alternatives}
            </div>
            ${node.children.length ? `<ul class="ml-2 pl-3 border-l border-slate-800 space-y-0.5">${node.children.map(renderPlanNode).join('')}</ul>` : ''}
        </li>`;
}

function renderPlanner() {
    if (!gameData) return;
    const result = document.getElementById('planResult');
    const item = findItem(planItem);
    const qty = Math.max(1, Math.min(9999, Math.round(Number(document.getElementById('planQty').value)) || 1));
    document.getElementById('planItem').value = item?.title || '';
    document.querySelectorAll('#planPresets [data-title]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.title === item?.title)));
    if (!item) { result.innerHTML = '<p class="text-sm text-slate-400">Pick an item to plan.</p>'; return; }

    const tree = expandPlan(item.title, qty);
    const raw = [...collectRaw(tree).entries()].sort((a, b) => b[1].qty - a[1].qty);
    const rawValue = raw.reduce((sum, [, entry]) => sum + (entry.item?.value || 0) * entry.qty, 0);
    const unpriced = raw.filter(([, entry]) => !entry.item?.value).length;
    const productValue = (item.value || 0) * qty;

    result.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-4">
                <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt class="text-slate-400">Base value of ${formatQty(qty)} × ${escapeHtml(item.title)}</dt><dd class="font-mono tabular-nums text-right text-white">${item.value ? `${formatUnits(productValue)} Units` : 'not on the wiki'}</dd>
                    <dt class="text-slate-400">Raw materials at base value</dt><dd class="font-mono tabular-nums text-right text-white">${formatUnits(rawValue)} Units${unpriced ? `<span class="block text-[11px] text-slate-400">${unpriced} without a value</span>` : ''}</dd>
                    <dt class="text-slate-400">Crafting and cooking steps</dt><dd class="font-mono tabular-nums text-right text-white">${countSteps(tree)}</dd>
                </dl>
                <div>
                    <h3 class="panel-heading mb-2">Raw materials</h3>
                    <table class="w-full text-sm">
                        <thead><tr class="text-left text-xs text-slate-400"><th class="font-medium pb-1.5">Material</th><th class="font-medium pb-1.5 text-right">Amount</th><th class="font-medium pb-1.5 text-right hidden sm:table-cell">Base value</th></tr></thead>
                        <tbody class="divide-y divide-slate-800">${raw.map(([title, entry]) => `
                            <tr><td class="py-1.5 pr-3">${codexLink(entry.item, title)}</td><td class="py-1.5 text-right font-mono tabular-nums text-cyan-200">${formatQty(entry.qty)}</td><td class="py-1.5 text-right font-mono tabular-nums text-slate-300 hidden sm:table-cell">${entry.item?.value ? formatUnits(entry.item.value * entry.qty) : '–'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <h3 class="panel-heading mb-2">Steps</h3>
                <ul class="space-y-0.5">${renderPlanNode(tree)}</ul>
            </div>
        </div>
        <p class="text-xs text-slate-400 mt-4">From the wiki’s recipes for ${codexLink(item)} and its ingredients (wiki revision ${item.revId}). Raw means the wiki lists no crafting or cooking recipe; it may still be refinable.</p>`;
}

// ---------------------------------------------------------------------------
// Base value of a set of items
// ---------------------------------------------------------------------------
function addValueRow() {
    const input = document.getElementById('valueAdd');
    const item = findItem(input.value);
    if (!item || !item.value) { showToast(item ? `${item.title} has no value on the wiki.` : 'Pick an item from the list.'); return; }
    const existing = valueRows.find(row => row.title === item.title);
    if (existing) existing.qty += 1; else valueRows.push({ title: item.title, qty: 1 });
    input.value = '';
    renderValue();
}

function setValueQty(index, value) {
    valueRows[index].qty = Math.max(0, Math.round(Number(value)) || 0);
    renderValueTotal();
}

function removeValueRow(index) {
    valueRows.splice(index, 1);
    renderValue();
}

function renderValue() {
    if (!gameData) return;
    document.getElementById('valueRows').innerHTML = valueRows.map((row, i) => {
        const item = findItem(row.title);
        return `
        <li class="flex items-center gap-2">
            <span class="flex-1 min-w-0 truncate text-sm">${codexLink(item, row.title)} <span class="text-xs text-slate-400">${item?.value ? `${formatUnits(item.value)} each` : 'no value'}</span></span>
            <input type="number" inputmode="numeric" min="0" value="${row.qty}" oninput="setValueQty(${i}, this.value)" aria-label="How many ${escapeHtml(row.title)}" class="w-20 h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-right text-base sm:text-sm text-white font-mono">
            <button onclick="removeValueRow(${i})" aria-label="Remove ${escapeHtml(row.title)}" class="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"><i class="ph-bold ph-x"></i></button>
        </li>`;
    }).join('') || '<li class="text-sm text-slate-400">Add items to total them up.</li>';
    renderValueTotal();
}

function renderValueTotal() {
    const total = valueRows.reduce((sum, row) => sum + (findItem(row.title)?.value || 0) * row.qty, 0);
    document.getElementById('valueTotal').innerHTML = valueRows.length ? `Total: <strong class="font-mono text-amber-200">${formatUnits(total)} Units</strong>` : '';
}

// ---------------------------------------------------------------------------
// Mineral extractors
// ---------------------------------------------------------------------------
function renderExtractors() {
    if (!gameData) return;
    const mineral = findItem(document.getElementById('mineMineral').value);
    const count = Math.max(1, Math.round(Number(document.getElementById('mineCount').value)) || 1);
    const rate = Number(document.getElementById('mineRate').value);
    const out = document.getElementById('mineResult');
    if (!mineral) { out.textContent = ''; return; }
    if (!(rate > 0)) {
        out.innerHTML = `${codexLink(mineral)} is worth ${formatUnits(mineral.value)} Units each. Enter your extractor’s hourly rate to see the yield.`;
        return;
    }
    const perHour = count * rate;
    out.innerHTML = `<strong class="font-mono text-white">${formatQty(perHour)}</strong> ${codexLink(mineral)} per hour, worth <strong class="font-mono text-emerald-300">${formatUnits(perHour * mineral.value)} Units</strong> (${formatUnits(perHour * mineral.value * 24)} a day) at the base value of ${formatUnits(mineral.value)} each.`;
}

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { setPlanItem, cycleRecipe, renderPlanner, addValueRow, setValueQty, removeValueRow, renderExtractors });
