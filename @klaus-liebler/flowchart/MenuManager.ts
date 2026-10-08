import { Html } from "@klaus-liebler/web-components/typescript/utils/common";

//Menueleiste nach dem WAI-ARIA-Muster "menubar" (https://www.w3.org/WAI/ARIA/apg/patterns/menubar/):
//- Klick oeffnet/schliesst ein Menue; ist eines offen, wechselt Ueberfahren eines anderen Titels dorthin
//- Tastatur: Pfeiltasten, Home/End, Enter/Leertaste, Escape; Klick ausserhalb schliesst
//- Tastenkuerzel (z.B. "Ctrl+O", "F5", "Shift+F5") werden angezeigt und global ausgeloest, solange
//  die Menueleiste sichtbar ist (in labathome sind mehrere Screens gleichzeitig im DOM)
//- Eintraege koennen abhaengig vom Zustand deaktiviert sein (enabled wird beim Oeffnen ausgewertet)

export interface MenuItemOptions {
    icon?: string;
    shortcut?: string;
    enabled?: () => boolean;
}

export class MenuSeparator { }

export class MenuItem {
    constructor(public readonly caption: string, public readonly handler: () => void, public readonly options: MenuItemOptions = {}) { }

    get Enabled() { return this.options.enabled ? this.options.enabled() : true; }
}

type Entry = MenuItem | MenuSeparator;

export class Menu {
    public button!: HTMLButtonElement;
    public popup!: HTMLDivElement;
    public itemElements: { item: MenuItem, el: HTMLButtonElement }[] = [];
    constructor(public readonly caption: string, public readonly entries: Entry[]) { }
}

function isMac() { return /Mac|iPhone|iPad/.test(navigator.platform); }

//"Ctrl+O" -> Anzeige "⌘O" auf dem Mac
function displayShortcut(shortcut: string) {
    return isMac() ? shortcut.replace("Ctrl+", "⌘").replace("Shift+", "⇧").replace("Alt+", "⌥") : shortcut;
}

function matchesShortcut(e: KeyboardEvent, shortcut: string) {
    const parts = shortcut.split("+");
    const key = parts.pop()!.toLowerCase();
    const want = { ctrl: parts.includes("Ctrl"), shift: parts.includes("Shift"), alt: parts.includes("Alt") };
    const ctrl = e.ctrlKey || e.metaKey;
    return e.key.toLowerCase() === key && ctrl === want.ctrl && e.shiftKey === want.shift && e.altKey === want.alt;
}

export class MenuManager {
    private openMenu: Menu | null = null;
    private bar!: HTMLDivElement;

    constructor(private menus: Array<Menu>) { }

    public get Bar() { return this.bar; }

    public Render(subcontainer: HTMLDivElement): HTMLDivElement {
        this.bar = <HTMLDivElement>Html(subcontainer, "div", ["role", "menubar", "aria-label", "Function block editor"], ["develop-toolbar"]);
        this.menus.forEach((m, index) => this.renderMenu(m, index));

        document.addEventListener("mousedown", (e) => {
            if (this.openMenu && !this.bar.contains(<Node>e.target)) this.close();
        });
        document.addEventListener("keydown", (e) => this.onGlobalKeydown(e));
        return this.bar;
    }

    private renderMenu(m: Menu, index: number) {
        const wrapper = Html(this.bar, "div", [], ["fc-menu-wrapper"]);
        m.button = <HTMLButtonElement>Html(wrapper, "button", ["type", "button", "role", "menuitem", "aria-haspopup", "true", "aria-expanded", "false", "tabindex", index == 0 ? "0" : "-1"], ["fc-menubar-button"], m.caption);
        m.popup = <HTMLDivElement>Html(wrapper, "div", ["role", "menu", "aria-label", m.caption], ["fc-menu"]);
        m.popup.hidden = true;

        for (const entry of m.entries) {
            if (entry instanceof MenuSeparator) {
                Html(m.popup, "div", ["role", "separator"], ["fc-menu-separator"]);
                continue;
            }
            const el = <HTMLButtonElement>Html(m.popup, "button", ["type", "button", "role", "menuitem", "tabindex", "-1"], ["fc-menu-item"]);
            Html(el, "span", ["aria-hidden", "true"], ["fc-menu-icon"], entry.options.icon ?? "");
            Html(el, "span", [], ["fc-menu-label"], entry.caption);
            if (entry.options.shortcut) {
                Html(el, "kbd", [], ["fc-menu-shortcut"], displayShortcut(entry.options.shortcut));
                el.setAttribute("aria-keyshortcuts", entry.options.shortcut.replace("Ctrl", "Control"));
            }
            el.onclick = () => this.activate(entry);
            el.onmouseenter = () => el.focus();
            el.onkeydown = (e) => this.onItemKeydown(e, m, el);
            m.itemElements.push({ item: entry, el });
        }

        m.button.onclick = () => this.openMenu == m ? this.close() : this.open(m, false);
        m.button.onmouseenter = () => { if (this.openMenu && this.openMenu != m) this.open(m, false); };
        m.button.onkeydown = (e) => this.onButtonKeydown(e, m);
    }

    private refreshEnabled(m: Menu) {
        for (const { item, el } of m.itemElements) {
            const enabled = item.Enabled;
            el.classList.toggle("disabled", !enabled);
            el.setAttribute("aria-disabled", `${!enabled}`);
        }
    }

    private open(m: Menu, focusFirstItem: boolean) {
        if (this.openMenu && this.openMenu != m) this.hide(this.openMenu);
        this.refreshEnabled(m);
        m.popup.hidden = false;
        m.button.setAttribute("aria-expanded", "true");
        m.button.classList.add("open");
        this.openMenu = m;
        this.setRovingFocus(m);
        if (focusFirstItem) this.focusItem(m, 0);
    }

    private hide(m: Menu) {
        m.popup.hidden = true;
        m.button.setAttribute("aria-expanded", "false");
        m.button.classList.remove("open");
    }

    public close(returnFocus = false) {
        if (!this.openMenu) return;
        const m = this.openMenu;
        this.hide(m);
        this.openMenu = null;
        if (returnFocus) m.button.focus();
    }

    private activate(item: MenuItem) {
        if (!item.Enabled) return;
        this.close();
        item.handler();
    }

    private setRovingFocus(m: Menu) {
        this.menus.forEach(x => x.button.tabIndex = x == m ? 0 : -1);
    }

    private focusItem(m: Menu, index: number) {
        const items = m.itemElements;
        if (items.length == 0) return;
        items[(index + items.length) % items.length].el.focus();
    }

    private switchMenu(m: Menu, delta: number, keepOpen: boolean) {
        const next = this.menus[(this.menus.indexOf(m) + delta + this.menus.length) % this.menus.length];
        if (keepOpen) this.open(next, true);
        else { this.setRovingFocus(next); next.button.focus(); }
    }

    private onButtonKeydown(e: KeyboardEvent, m: Menu) {
        switch (e.key) {
            case "ArrowDown": case "Enter": case " ": this.open(m, true); break;
            case "ArrowUp": this.open(m, false); this.focusItem(m, -1); break;
            case "ArrowRight": this.switchMenu(m, +1, this.openMenu != null); break;
            case "ArrowLeft": this.switchMenu(m, -1, this.openMenu != null); break;
            case "Escape": this.close(true); break;
            default: return;
        }
        e.preventDefault();
        e.stopPropagation();
    }

    private onItemKeydown(e: KeyboardEvent, m: Menu, el: HTMLButtonElement) {
        const index = m.itemElements.findIndex(x => x.el == el);
        switch (e.key) {
            case "ArrowDown": this.focusItem(m, index + 1); break;
            case "ArrowUp": this.focusItem(m, index - 1); break;
            case "Home": this.focusItem(m, 0); break;
            case "End": this.focusItem(m, -1); break;
            case "ArrowRight": this.switchMenu(m, +1, true); break;
            case "ArrowLeft": this.switchMenu(m, -1, true); break;
            case "Escape": this.close(true); break;
            case "Tab": this.close(); return;
            case "Enter": case " ": this.activate(m.itemElements[index].item); break;
            default: return;
        }
        e.preventDefault();
        e.stopPropagation();
    }

    private onGlobalKeydown(e: KeyboardEvent) {
        if (!this.bar.isConnected || this.bar.offsetParent === null) return; //Editor nicht sichtbar
        const target = <HTMLElement>e.target;
        if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
        if (document.querySelector("dialog[open]")) return;
        for (const m of this.menus) {
            for (const { item } of m.itemElements) {
                if (item.options.shortcut && matchesShortcut(e, item.options.shortcut)) {
                    e.preventDefault(); //auch bei deaktiviertem Eintrag: Ctrl+S soll nie den Browser-Speichern-Dialog oeffnen
                    this.activate(item);
                    return;
                }
            }
        }
    }
}
