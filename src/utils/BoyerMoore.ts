type needleType = string | Uint8Array | ArrayBuffer;
type haystackType = ArrayBuffer | Uint8Array;

// Implementation of Boyer-Moore substring search ported from page 772 of
// Algorithms Fourth Edition (Sedgewick, Wayne)
// http://algs4.cs.princeton.edu/53substring/BoyerMoore.java.html
/*
USAGE:
   // needle should be ASCII string, ArrayBuffer, or Uint8Array
   // haystack should be an ArrayBuffer or Uint8Array

   const boyerMoore = new BoyerMoore(needle);
   const indexes = boyerMoore.findIndexes(haystack);
*/

export class BoyerMoore {
  private search: ((txtBuffer: needleType, start?: number, end?: number) => number );
  private skip: number;

  constructor(needle: needleType) {
    [this.search, this.skip] = this.boyerMoore(needle);
  }

  public findIndexIn(haystack: haystackType): number {
    return this.search(haystack);
  }

  public findIndexes(haystack: haystackType): number[] {
    const indexes: number[] = [];
    for (let i = this.search(haystack); i !== -1; i = this.search(haystack, i + this.skip)) {
      indexes.push(i);
    }
    return indexes;
  }

  private asUint8Array(input: Uint8Array | string | ArrayBuffer): Uint8Array {
    if (input instanceof Uint8Array) {
      return input;
    } else if (typeof(input) === 'string') {
      // This naive transform only supports ASCII patterns. UTF-8 support
      // not necessary for the intended use case here.
      const uint8Array: Uint8Array = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        if (charCode > 127) {
          throw new TypeError('Only ASCII patterns are supported');
        }
        uint8Array[i] = charCode;
      }
      return uint8Array;
    } else {
      // Assume that it's already something that can be coerced.
      return new Uint8Array(input);
    }
  }

  private boyerMoore(patternBuffer): [((txtBuffer: needleType, start?: number, end?: number) => number ), number] {
    const pattern = this.asUint8Array(patternBuffer);
    const patternLength: number = pattern.length;
    if (patternLength === 0) {
      throw new TypeError('patternBuffer must be at least 1 byte long');
    }
    // radix
    const radix: number = 256;
    const rightmost_positions: Int32Array = new Int32Array(radix);
    // position of the rightmost occurrence of the byte a13 in the pattern
    for (let c: number = 0; c < radix; c++) {
      // -1 for bytes not in pattern
      rightmost_positions[c] = -1;
    }
    for (let j: number = 0; j < patternLength; j++) {
      // rightmost position for bytes in pattern
      rightmost_positions[pattern[j]] = j;
    }

    function boyerMooreSearch(txtBuffer: needleType, start: number = 0, end?: number): number {
      // Return offset of first match, -1 if no match.
      const text = this.asUint8Array(txtBuffer);

      if (end === undefined) {
        end = text.length;
      }
      const right: Int32Array = rightmost_positions;
      const lastIndex: number = end - patternLength;
      const lastPatIndex: number = patternLength - 1;
      let skip;
      for (let i: number = start; i <= lastIndex; i += skip) {
        skip = 0;
        for (let j = lastPatIndex; j >= 0; j--) {
          const char: number = text[i + j];
          if (pattern[j] !== char) {
            skip = Math.max(1, j - right[char]);
            break;
          }
        }
        if (skip === 0) {
          return i;
        }
      }
      return -1;
    }

    return [boyerMooreSearch, pattern.byteLength];
  }
}


