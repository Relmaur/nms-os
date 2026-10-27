// Small calculators: Harmonic Camp register expressions, extractor yield, and a haul's base value (pure).

// Register expressions are plain arithmetic: + - * / (also × ÷), parentheses and decimals. Parsed by hand rather
// than evaluated as code, so nothing typed can run. Anything else reads "?".
export function evaluateRegister(expr: string): number | '?' {
  const tokens =
    expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .match(/\d+\.?\d*|\.\d+|[-+*/()]|\S/g) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const expression = (): number => {
    let value = term();
    while (peek() === '+' || peek() === '-') value = tokens[pos++] === '+' ? value + term() : value - term();
    return value;
  };
  const term = (): number => {
    let value = factor();
    while (peek() === '*' || peek() === '/') value = tokens[pos++] === '*' ? value * factor() : value / factor();
    return value;
  };
  const factor = (): number => {
    const token = tokens[pos++];
    if (token === '-') return -factor();
    if (token === '+') return factor();
    if (token === '(') {
      const value = expression();
      if (tokens[pos++] !== ')') throw new Error('unclosed');
      return value;
    }
    if (token !== undefined && /^(\d|\.\d)/.test(token)) return Number(token);
    throw new Error('unexpected');
  };
  try {
    if (!tokens.length) return 0;
    const value = expression();
    return pos === tokens.length && Number.isFinite(value) ? Number(value.toPrecision(12)) : '?';
  } catch {
    return '?';
  }
}

export const formatQty = (n: number): string => n.toLocaleString();

// Unit amounts as the game shows them: millions shortened ("15.6M"), smaller ones in full.
export function formatUnits(n: number): string {
  return n >= 1e6
    ? `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`
    : Math.round(n).toLocaleString();
}

// Extractor output depends on the deposit, so the hourly rate is the player's input; the value is the wiki's.
export function extractorYield(count: number, ratePerHour: number, unitValue: number) {
  const perHour = count * ratePerHour;
  return { perHour, unitsPerHour: perHour * unitValue, unitsPerDay: perHour * unitValue * 24 };
}

export function haulValue(rows: { qty: number; value: number | undefined }[]): number {
  return rows.reduce((sum, row) => sum + (row.value ?? 0) * row.qty, 0);
}
