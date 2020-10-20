import * as sj from "serialize-javascript";

export function serialize(data: any): string {
  return sj(data, { ignoreFunctions: true });
}

export function deserialize(serializedData: string): any {
  const evaluateJS = eval; // Mute TSLint, eval usage is justified here
  return evaluateJS(`(${serializedData})`);
}

export function flatten(data: any): any {
  return deserialize(serialize(data));
}
