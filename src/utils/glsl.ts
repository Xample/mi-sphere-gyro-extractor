// language=GLSL
export function glsl(literals: TemplateStringsArray, ...placeholders: any[]): string {
  let result: string = '';

  // interleave the literals with the placeholders
  for (let i: number = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }

  // add the last literal
  result += literals[literals.length - 1];
  return result;
}
