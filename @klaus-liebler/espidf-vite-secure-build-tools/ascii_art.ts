import * as figlet from "figlet"
export function createAsciiArt(text: string) {
    return figlet.textSync(text)
}
