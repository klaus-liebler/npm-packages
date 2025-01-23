//only functions / classes / interfaces that depend on NOTHING (to dependencies to node.js or to other libs)

export interface IStringBuilder {
    AppendLine(line: string): void;
}


export class SearchReplace {
    constructor(public search: string, public replaceFilePath: string) { }
}

export function X02(num: number | bigint, len = 2) {
    const str = num.toString(16);
    return "0".repeat(len - str.length) + str; }

export function EscapeToVariableName(n: string) {
    return n.toLocaleUpperCase().replaceAll(" ", "_");
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

export function strInterpolator(str, values_flat: any) {
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