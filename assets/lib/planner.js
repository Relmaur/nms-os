// Recipe planner over the wiki dataset (wiki/game-data.json): expands crafting and cooking recipes down
// to raw materials. Pure: the catalog and the chosen alternatives are passed in (docs/calculators.md).

export const PLAN_TYPES = ['craft', 'cook']; // refining is a way to obtain raw materials, not a production step
export const PLAN_MAX_DEPTH = 14;

// Current pages win over obsolete ones with the same title; removed pages are left out.
export function makeCatalog(data) {
    const byTitle = new Map();
    data.items.filter(item => !item.removed)
        .sort((a, b) => Boolean(a.obsolete) - Boolean(b.obsolete))
        .forEach(item => { if (!byTitle.has(item.title.toLowerCase())) byTitle.set(item.title.toLowerCase(), item); });
    return { byTitle, aliases: data.aliases || {}, pages: data.items.filter(item => !item.removed).length };
}

// Exact title, case-insensitive, or an old name the wiki redirects ("Rigogen" -> "Kelp Sac").
export function findItem(catalog, name) {
    if (!catalog || !name) return undefined;
    const lower = String(name).trim().toLowerCase();
    const alias = Object.keys(catalog.aliases).find(key => key.toLowerCase() === lower);
    return catalog.byTitle.get(lower) || (alias ? catalog.byTitle.get(catalog.aliases[alias].toLowerCase()) : undefined);
}

export function planRecipes(catalog, item) {
    return item.recipes.filter(recipe => PLAN_TYPES.includes(recipe.type) && !recipe.obsolete
        && findItem(catalog, recipe.outputs[0]?.name) === item
        && !recipe.inputs.some(input => findItem(catalog, input.name) === item)); // "X + Wild Yeast -> Wild Yeast" multipliers aren't steps
}

// `choices` maps an item title to the index of the alternative recipe to use (default: the first).
export function expandPlan(catalog, name, qty, choices = {}, depth = 0, path = new Set()) {
    const item = findItem(catalog, name);
    const title = item?.title || String(name);
    const recipes = item && depth < PLAN_MAX_DEPTH && !path.has(title) ? planRecipes(catalog, item) : [];
    const node = { title, item, qty, recipes, children: [] };
    if (!recipes.length) return node;
    const index = Math.min(choices[title] || 0, recipes.length - 1);
    const recipe = recipes[index];
    const perBatch = recipe.outputs[0].qty || 1;
    const batches = Math.ceil(qty / perBatch); // a craft that yields 20 still needs whole batches
    const next = new Set(path).add(title);
    return {
        ...node, recipe, index, batches, makes: batches * perBatch,
        children: recipe.inputs.map(input => expandPlan(catalog, input.name, (Number(input.qty) || 1) * batches, choices, depth + 1, next))
    };
}

export function collectRaw(node, totals = new Map()) {
    if (!node.recipe) {
        const entry = totals.get(node.title) || { item: node.item, qty: 0 };
        entry.qty += node.qty;
        totals.set(node.title, entry);
    } else {
        node.children.forEach(child => collectRaw(child, totals));
    }
    return totals;
}

export const countSteps = node => node.recipe ? 1 + node.children.reduce((sum, child) => sum + countSteps(child), 0) : 0;
