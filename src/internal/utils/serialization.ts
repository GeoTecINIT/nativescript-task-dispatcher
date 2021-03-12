import devalue from "devalue";

export function serialize(data: any): string {
  return devalue(preprocessData(data));
}

export function deserialize(serializedData: string): any {
  const evaluateJS = eval; // Mute TSLint, eval usage is justified here
  return evaluateJS(`(${serializedData})`);
}

export function flatten(data: any): any {
  return deserialize(serialize(data));
}

function preprocessData(data: any): any {
  if (Array.isArray(data)) {
    return data.map((elem) => preprocessData(elem));
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    return { ...data };
  }
  return data;
}
