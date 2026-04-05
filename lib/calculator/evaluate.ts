/**
 * Safe scientific expression evaluator (no eval/Function).
 * Supports + - * / ^, parentheses, unary minus, and common math functions.
 */

export type AngleMode = 'deg' | 'rad';

function skipWs(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i]!)) i++;
  return i;
}

function parseNumber(s: string, i: number): { value: number; next: number } | null {
  let j = skipWs(s, i);
  if (j >= s.length) return null;
  const start = j;
  if (s[j] === '.') {
    j++;
  } else if (/\d/.test(s[j]!)) {
    while (j < s.length && /\d/.test(s[j]!)) j++;
    if (j < s.length && s[j] === '.') {
      j++;
      while (j < s.length && /\d/.test(s[j]!)) j++;
    }
  } else {
    return null;
  }
  const raw = s.slice(start, j);
  if (raw === '.' || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error('Invalid number');
  return { value, next: j };
}

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  exp: Math.exp,
};

function parseIdent(s: string, i: number): { name: string; next: number } | null {
  let j = skipWs(s, i);
  if (j >= s.length || !/[a-z]/i.test(s[j]!)) return null;
  const start = j;
  while (j < s.length && /[a-z]/i.test(s[j]!)) j++;
  return { name: s.slice(start, j).toLowerCase(), next: j };
}

export function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid factorial');
  if (n !== Math.floor(n)) throw new Error('Factorial requires integer');
  if (n > 170) throw new Error('Overflow');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export class ExpressionParser {
  private s: string;
  private i: number;
  private readonly angleMode: AngleMode;

  constructor(expression: string, angleMode: AngleMode) {
    this.s = expression.trim();
    this.i = 0;
    this.angleMode = angleMode;
  }

  parse(): number {
    this.i = skipWs(this.s, 0);
    if (this.i >= this.s.length) return 0;
    const v = this.parseAddSub();
    this.i = skipWs(this.s, this.i);
    if (this.i < this.s.length) throw new Error('Unexpected character');
    return v;
  }

  private trigWrap(fn: (x: number) => number, x: number): number {
    const rad = this.angleMode === 'deg' ? (x * Math.PI) / 180 : x;
    return fn(rad);
  }

  private invTrigWrap(fn: (x: number) => number, x: number): number {
    const y = fn(x);
    return this.angleMode === 'deg' ? (y * 180) / Math.PI : y;
  }

  private parseAddSub(): number {
    let v = this.parseMulDiv();
    while (true) {
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length) break;
      const c = this.s[this.i];
      if (c === '+') {
        this.i++;
        v += this.parseMulDiv();
      } else if (c === '-') {
        this.i++;
        v -= this.parseMulDiv();
      } else break;
    }
    return v;
  }

  private parseMulDiv(): number {
    let v = this.parsePow();
    while (true) {
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length) break;
      const c = this.s[this.i];
      if (c === '*') {
        this.i++;
        v *= this.parsePow();
      } else if (c === '/') {
        this.i++;
        const d = this.parsePow();
        if (d === 0) throw new Error('Division by zero');
        v /= d;
      } else if (c === '%') {
        this.i++;
        v = v % this.parsePow();
      } else break;
    }
    return v;
  }

  private parsePow(): number {
    let v = this.parseUnary();
    this.i = skipWs(this.s, this.i);
    if (this.i < this.s.length && this.s[this.i] === '^') {
      this.i++;
      const right = this.parsePow();
      v = Math.pow(v, right);
    }
    return v;
  }

  private parseUnary(): number {
    this.i = skipWs(this.s, this.i);
    if (this.i < this.s.length && this.s[this.i] === '-') {
      this.i++;
      return -this.parseUnary();
    }
    if (this.i < this.s.length && this.s[this.i] === '+') {
      this.i++;
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.i = skipWs(this.s, this.i);
    if (this.i >= this.s.length) throw new Error('Unexpected end');

    if (this.s[this.i] === '(') {
      this.i++;
      const v = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return v;
    }

    const num = parseNumber(this.s, this.i);
    if (num) {
      this.i = num.next;
      return num.value;
    }

    const id = parseIdent(this.s, this.i);
    if (!id) throw new Error('Invalid expression');

    if (id.name === 'pi') {
      this.i = id.next;
      return Math.PI;
    }
    if (id.name === 'e') {
      this.i = id.next;
      return Math.E;
    }

    this.i = skipWs(this.s, id.next);
    if (this.i >= this.s.length || this.s[this.i] !== '(') {
      throw new Error(`Unknown symbol: ${id.name}`);
    }
    this.i++;

    let arg: number;
    if (id.name === 'log') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return Math.log10(arg);
    }
    if (id.name === 'ln') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return Math.log(arg);
    }
    if (id.name === 'fact') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return factorial(arg);
    }

    if (id.name === 'sin') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.trigWrap(Math.sin, arg);
    }
    if (id.name === 'cos') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.trigWrap(Math.cos, arg);
    }
    if (id.name === 'tan') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.trigWrap(Math.tan, arg);
    }
    if (id.name === 'asin') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.invTrigWrap(Math.asin, arg);
    }
    if (id.name === 'acos') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.invTrigWrap(Math.acos, arg);
    }
    if (id.name === 'atan') {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return this.invTrigWrap(Math.atan, arg);
    }

    const fn = FUNCS[id.name];
    if (fn) {
      arg = this.parseAddSub();
      this.i = skipWs(this.s, this.i);
      if (this.i >= this.s.length || this.s[this.i] !== ')') throw new Error('Missing )');
      this.i++;
      return fn(arg);
    }

    throw new Error(`Unknown function: ${id.name}`);
  }
}

export function evaluateExpression(expression: string, angleMode: AngleMode): number {
  const trimmed = expression.trim();
  if (!trimmed) return 0;
  const p = new ExpressionParser(trimmed, angleMode);
  return p.parse();
}
