/**
 * Codificador QR propio (ISO/IEC 18004), sin dependencias: modo byte (UTF-8),
 * versiones 1–40 y niveles de corrección L/M/Q/H. Basado en el algoritmo de
 * referencia de Project Nayuki (MIT). Devuelve la matriz de módulos; el
 * dibujo (SVG) lo hace `app-qr-code`.
 */

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  version: number;
  size: number;
  mask: number;
  /** `modules[y][x]` = `true` si el módulo es oscuro. */
  modules: boolean[][];
}

const ECL_INDEX: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** Bits de formato del nivel de corrección. */
const ECL_FORMAT_BITS: Record<QrErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// prettier-ignore
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// prettier-ignore
const NUM_ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const getBit = (value: number, index: number): boolean => ((value >>> index) & 1) !== 0;

/** Módulos disponibles para datos + ECC (sin patrones de función) en una versión. */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Codewords de datos (sin ECC) para una versión y nivel. */
export function dataCodewords(version: number, ecl: QrErrorCorrection): number {
  const e = ECL_INDEX[ecl];
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[e][version] * NUM_ERROR_CORRECTION_BLOCKS[e][version]
  );
}

/** Bytes máximos en modo byte para una versión y nivel. */
export function byteCapacity(version: number, ecl: QrErrorCorrection): number {
  const countBits = version < 10 ? 8 : 16;
  return Math.floor((dataCodewords(version, ecl) * 8 - 4 - countBits) / 8);
}

// ------------------------------------------------------------ Reed-Solomon

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

export function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

export function reedSolomonRemainder(
  data: readonly number[],
  divisor: readonly number[],
): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMultiply(coef, factor)));
  }
  return result;
}

/** Bits de formato (15) ya con BCH y máscara XOR, para tests y dibujo. */
export function formatBits(ecl: QrErrorCorrection, mask: number): number {
  const data = (ECL_FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** Bits de versión (18) con BCH, para versiones ≥ 7. */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

// ------------------------------------------------------------ Matriz

class QrBuilder {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly isFunction: boolean[][];

  constructor(
    readonly version: number,
    private readonly ecl: QrErrorCorrection,
  ) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  build(codewords: number[], forcedMask: number | null): QrMatrix {
    this.drawFunctionPatterns();
    this.drawCodewords(this.addEccAndInterleave(codewords));
    let mask = forcedMask ?? 0;
    if (forcedMask === null) {
      let best = Infinity;
      for (let m = 0; m < 8; m++) {
        this.applyMask(m);
        this.drawFormatBits(m);
        const penalty = this.penalty();
        if (penalty < best) {
          best = penalty;
          mask = m;
        }
        this.applyMask(m); // XOR: deshace la máscara
      }
    }
    this.applyMask(mask);
    this.drawFormatBits(mask);
    return { version: this.version, size: this.size, mask, modules: this.modules };
  }

  private set(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  private drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(this.size - 4, 3);
    this.drawFinder(3, this.size - 4);
    const positions = this.alignmentPositions();
    const n = positions.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corner = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
        if (!corner) this.drawAlignment(positions[i], positions[j]);
      }
    }
    this.drawFormatBits(0);
    this.drawVersion();
  }

  private alignmentPositions(): number[] {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step = Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
    const result = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  private drawFinder(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.set(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignment(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private drawFormatBits(mask: number): void {
    const bits = formatBits(this.ecl, mask);
    for (let i = 0; i <= 5; i++) this.set(8, i, getBit(bits, i));
    this.set(8, 7, getBit(bits, 6));
    this.set(8, 8, getBit(bits, 7));
    this.set(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) this.set(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.set(8, this.size - 15 + i, getBit(bits, i));
    this.set(8, this.size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    const bits = versionBits(this.version);
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, bit);
      this.set(b, a, bit);
    }
  }

  private addEccAndInterleave(data: number[]): number[] {
    const e = ECL_INDEX[this.ecl];
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e][this.version];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e][this.version];
    const rawCodewords = Math.floor(rawDataModules(this.version) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const divisor = reedSolomonDivisor(blockEccLen);
    const blocks: number[][] = [];
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      const ecc = reedSolomonRemainder(dat, divisor);
      if (i < numShortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const result: number[] = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
      });
    }
    return result;
  }

  private drawCodewords(data: number[]): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break; // prettier-ignore
          case 1: invert = y % 2 === 0; break; // prettier-ignore
          case 2: invert = x % 3 === 0; break; // prettier-ignore
          case 3: invert = (x + y) % 3 === 0; break; // prettier-ignore
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; // prettier-ignore
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break; // prettier-ignore
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break; // prettier-ignore
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; // prettier-ignore
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  /** Penalización estándar (N1 rachas, N2 bloques 2×2, N3 patrones tipo buscador, N4 balance). */
  private penalty(): number {
    const size = this.size;
    const m = this.modules;
    let result = 0;
    const lines: boolean[][] = [];
    for (let y = 0; y < size; y++) lines.push(m[y]);
    for (let x = 0; x < size; x++) lines.push(m.map((row) => row[x]));
    const finderA = [true, false, true, true, true, false, true, false, false, false, false];
    const finderB = [false, false, false, false, true, false, true, true, true, false, true];
    for (const line of lines) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && line[i] === line[i - 1]) {
          run++;
        } else {
          if (run >= 5) result += 3 + (run - 5);
          run = 1;
        }
      }
      for (let i = 0; i + 11 <= size; i++) {
        let a = true;
        let b = true;
        for (let k = 0; k < 11 && (a || b); k++) {
          if (line[i + k] !== finderA[k]) a = false;
          if (line[i + k] !== finderB[k]) b = false;
        }
        if (a) result += 40;
        if (b) result += 40;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (m[y][x]) dark++;
        if (
          y + 1 < size &&
          x + 1 < size &&
          m[y][x] === m[y][x + 1] &&
          m[y][x] === m[y + 1][x] &&
          m[y][x] === m[y + 1][x + 1]
        ) {
          result += 3;
        }
      }
    }
    const percent = (dark * 100) / (size * size);
    result += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return result;
  }
}

/**
 * Codifica `text` (UTF-8, modo byte) en la versión mínima que lo admita.
 * Lanza un error si el texto excede la capacidad de la versión 40.
 */
export function encodeQr(
  text: string,
  ecl: QrErrorCorrection = 'M',
  options: { minVersion?: number; mask?: number } = {},
): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = Math.max(1, options.minVersion ?? 1);
  while (version <= 40 && bytes.length > byteCapacity(version, ecl)) version++;
  if (version > 40) throw new Error('El texto es demasiado largo para un código QR.');

  const capacityBits = dataCodewords(version, ecl) * 8;
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => append(b, 8));
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) append(pad, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  return new QrBuilder(version, ecl).build(codewords, options.mask ?? null);
}

/** Path SVG (un rectángulo por módulo oscuro, unidades = módulos, con margen). */
export function qrSvgPath(matrix: QrMatrix, margin = 4): string {
  const parts: string[] = [];
  matrix.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x + margin},${y + margin}h1v1h-1z`);
    }),
  );
  return parts.join('');
}
