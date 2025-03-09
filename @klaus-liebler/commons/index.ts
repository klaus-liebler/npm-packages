//only functions / classes / interfaces that depend on NOTHING (no dependencies to node.js or to other libs)

export interface IStringBuilder {
    AppendLine(line: string): void;
}

export enum TimeGranularity{
  TEN_SECONDS,
  ONE_MINUTE,
  ONE_HOUR,
  ONE_DAY
}

declare global {
  interface Map<K, V> {
    getOrAdd(key: K, valueFactory: () => V): V;
    
  }
}
Map.prototype.getOrAdd = function <K, V>(this: Map<K, V>, key: K, valueFactory: () => V): V {
    if (this.has(key)) {
      return this.get(key) as V;
    }
    const value = valueFactory();
    this.set(key, value);
    return value;
  };

  export function uint8Array2HexString(d: Uint8Array) {
    var s = "";
    for (let index = 0; index < d.length; index++) {
      var xx = d[index].toString(16);
      if (xx.length == 1) s += "0" + xx;
      else s += xx;
    }
    return s;
  }
  
  export function numberArray2HexString(d: Array<number>) {
    var s = "";
    for (let index = 0; index < d.length; index++) {
      var xx = d[index].toString(16);
      if (xx.length == 1) s += "0" + xx;
      else s += xx;
    }
    return s;
  }

export interface Location2D {
    x: number;
    y: number;
}

export interface KeyValueTuple {
    key: string;
    value: any;
}

export class StringNumberTuple{
    public constructor(public s:string, public n:number){}
}

export enum Severity {
    SUCCESS,
    INFO,
    WARN,
    ERROR,
  }
  
  export function severity2symbol(severity: Severity): string {
    switch (severity) {
        case Severity.WARN:
        case Severity.ERROR: return "⚠";
        case Severity.INFO: return "🛈";
        case Severity.SUCCESS: return "👍";
    }
  }
  
  export function severity2class(severity: Severity): string {
    switch (severity) {
        case Severity.WARN: return "warn"
        case Severity.ERROR: return "error";
        case Severity.INFO: return "info";
        case Severity.SUCCESS: return "success";
    }
  }

  export const MyFavouriteDateTimeFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }

  export function ip4_2_string(ip: number | undefined): string {
    if (!ip) return "undefined";
    return `${(ip >> 0) & 0xFF}.${(ip >> 8) & 0xFF}.${(ip >> 16) & 0xFF}.${(ip >> 24) & 0xFF}`;
  }



export class SearchReplace {
    constructor(public search: string, public replaceFilePath: string) { }
}

export function X02(num: number | bigint, len = 2) {
    const str = num.toString(16);
    return "0".repeat(len - str.length) + str; }

export function EscapeToVariableName(n: string) {
    return (<any>(n.toLocaleUpperCase())).replaceAll(" ", "_");
}

export function EscapeToVariableName2(n: string) {
  return (<any>n).replaceAll(" ", "_").replaceAll("-", "_");
}

export function bigint2array(mc: number) {
    const ret = new Uint8Array(6);
    ret[5] = Number((mc) & 0xFF)
    ret[4] = Number((mc >> 8) & 0xFF);
    ret[3] = Number((mc >> 16) & 0xFF);
    ret[2] = Number((mc >> 24) & 0xFF);
    ret[1] = Number((mc >> 32) & 0xFF);
    ret[0] = Number((mc >> 40) & 0xFF);
    return ret;
}

export function uint8ArrayToBigInt(uint8Array:Uint8Array) {
  let result = 0n;
  for (let byte of uint8Array) {
      result = (result << 8n) + BigInt(byte);
  }
  return result;
}

export function strInterpolator(str:string, values_flat: any) {
  return str.replace(/\${(.*?)}/g, (_match, p1) => {
      if (p1.includes(".")) {
          const keyPath = p1.split(".");
          let currentObj = values_flat;
          for (let i = 0; i < keyPath.length; i++) {
              const key = keyPath[i];
              if (currentObj[key] !== void 0 && typeof currentObj[key] === "object") {
                  currentObj = currentObj[key];
              } else {
                  return currentObj[key] !== void 0 ? currentObj[key] : "";
              }
          }
      } else {
          return values_flat[p1] !== void 0 ? values_flat[p1] : "";
      }
  });
}

export function svgString2dataUrlBase64(svg:string){
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

export function ArrayBufferToHexString(buffer:ArrayBuffer) {
  // Erstellen Sie eine Uint8Array-Ansicht des ArrayBuffers.
  const byteArray = new Uint8Array(buffer);

  // Initialisieren Sie eine Variable zur Speicherung des Hex-Strings.
  let hexString = '';

  // Iterieren Sie über die ersten 16 Bytes des Arrays.
  for (let i = 0; i < 16; i++) {
    // Konvertieren Sie jedes Byte in einen zweistelligen Hex-Wert.
    const hex = byteArray[i].toString(16).padStart(2, '0');

    // Fügen Sie den Hex-Wert zur Hex-String-Liste hinzu.
    hexString += hex;
  }

  return hexString;
}

export class StringBuilderImpl implements IStringBuilder {

    constructor(initialValue: string | null = null) {
      if (initialValue) {
        this.AppendLine(initialValue);
      }
    }
  
    public get Code() {
      return this.code;
    }
    private code = "";
    public AppendLine(line: string): void {
      this.code += line + "\r\n";
    }
  
    public Clear(initialValue: string | null = null) {
      this.code = "";
      if (initialValue) {
        this.AppendLine(initialValue);
      }
    }
  }