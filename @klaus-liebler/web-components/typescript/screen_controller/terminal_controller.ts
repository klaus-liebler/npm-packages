// Arbeitsbereich "Terminal": das Firmware-Log des Geraets (utils/firmware_log.ts) als Tabelle mit Filtern
// und eine Konsole fuer Befehle (help, loglevel, restart ...; Projekte koennen eigene ergaenzen).
// Befehle fuer das Log stehen im Ribbon der Shell, die Zeilenzahl in ihrer Statusleiste.
import { html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { setAppRibbon, type RibbonCommand } from "@klaus-liebler/ui-shell/shell/ribbon.ts";
import { setAppStatus } from "@klaus-liebler/ui-shell/shell/status-bar.ts";
import { firmwarelog, systeminfo } from "@generated/wsprotocol_ts/ws-protocol";
import { FirmwareLog, LogEntry, LOG_LEVEL_LETTER, LOG_LEVEL_NAMES, formatUptime } from "../utils/firmware_log";
import { IAppManagement } from "../utils/interfaces";
import { ScreenController } from "./screen_controller";

/** Ein Konsolenbefehl; out schreibt eine Zeile in die Konsole. */
export interface TerminalCommand {
    name: string;
    /** "loglevel <tag|*> <level>: ..." */
    help: string;
    run(args: string[], out: (line: string, kind?: ConsoleKind) => void): void | Promise<void>;
}

type ConsoleKind = "in" | "out" | "err";

const MAX_ROWS = 1000;
const MAX_CONSOLE_LINES = 200;

export class TerminalScreenController extends ScreenController {
    /** Hoechstes gezeigtes Level (1 nur Fehler ... 5 alles). */
    private maxLevel = 5;
    private search = "";
    private follow = true;
    private paused = false;
    private pausedAt = 0;
    private consoleLines: Array<{ text: string; kind: ConsoleKind }> = [];
    private readonly commands = new Map<string, TerminalCommand>();
    private readonly history: string[] = [];
    private historyPos = 0;
    private readonly logRef: Ref<HTMLDivElement> = createRef();
    private readonly consoleRef: Ref<HTMLDivElement> = createRef();
    private unsubscribe: (() => void) | null = null;
    private renderScheduled = false;

    constructor(appManagement: IAppManagement, private readonly log: FirmwareLog, commands: TerminalCommand[] = []) {
        super(appManagement);
        for (const c of [...this.builtinCommands(), ...commands]) this.commands.set(c.name, c);
    }

    // ---- Lebenszyklus -------------------------------------------------------------------------------
    OnCreate(): void {}

    protected OnFirstStart(): void {
        this.OnRestart();
        this.print("Befehle: help", "out");
    }

    protected OnRestart(): void {
        this.unsubscribe = this.log.Subscribe(() => this.scheduleRender());
        this.updateRibbon();
        this.scheduleRender();
    }

    OnPause(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    OnMessage(_namespaceId: number, _messageTypeId: number, _view: DataView): void {}

    // ---- Darstellung ---------------------------------------------------------------------------------
    private visibleEntries(): LogEntry[] {
        const needle = this.search.trim().toLowerCase();
        const all = this.paused ? this.log.Entries.slice(0, this.pausedAt) : this.log.Entries;
        const shown = all.filter((e) => e.level <= this.maxLevel &&
            (!needle || e.tag.toLowerCase().includes(needle) || e.text.toLowerCase().includes(needle)));
        return shown.length > MAX_ROWS ? shown.slice(shown.length - MAX_ROWS) : shown;
    }

    public Template = () => {
        const rows = this.visibleEntries();
        return html`
        <div class="term">
            <div class="term-toolbar">
                <input type="search" class="panel-input" placeholder="Filter: Tag oder Text" .value=${this.search}
                    @input=${(e: Event) => { this.search = (e.target as HTMLInputElement).value; this.scheduleRender(); }}>
                ${this.log.Supported === null && this.log.Entries.length === 0
                    ? html`<span class="term-hint">Noch keine Zeilen – die Firmware muss das FirmwareLogPlugin anmelden.</span>` : ""}
            </div>
            <div class="term-log" ${ref(this.logRef)}
                @scroll=${(e: Event) => { const el = e.target as HTMLElement; this.follow = el.scrollTop + el.clientHeight >= el.scrollHeight - 4; }}>
                <table class="term-table">
                    <tbody>
                        ${rows.map((e) => html`<tr class="term-l${e.level}">
                            <td class="term-time">${e.sequence < 0 ? "" : formatUptime(e.uptimeMs)}</td>
                            <td class="term-level">${LOG_LEVEL_LETTER[e.level] ?? "?"}</td>
                            <td class="term-tag">${e.tag}</td>
                            <td class="term-text">${e.text}</td></tr>`)}
                    </tbody>
                </table>
            </div>
            <div class="term-console">
                <div class="term-out" ${ref(this.consoleRef)}>
                    ${this.consoleLines.map((l) => html`<div class="term-${l.kind}">${l.text}</div>`)}
                </div>
                <form class="term-prompt" @submit=${(e: Event) => this.onSubmit(e)}>
                    <span>&gt;</span>
                    <input name="cmd" autocomplete="off" spellcheck="false" placeholder="Befehl, z. B. help"
                        @keydown=${(e: KeyboardEvent) => this.onKey(e)}>
                </form>
            </div>
        </div>`;
    };

    private scheduleRender(): void {
        if (this.renderScheduled) return;
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.renderScheduled = false;
            const el = this.WorkspaceElement;
            if (!el || el.hidden) return;
            render(this.Template(), el);
            const total = this.log.Entries.length;
            const shown = this.visibleEntries().length;
            const errors = this.log.Entries.filter((e) => e.level === 1).length;
            const warnings = this.log.Entries.filter((e) => e.level === 2).length;
            setAppStatus(el, {
                text: this.paused ? "angehalten" : this.log.Supported === null ? "warte auf Gerät" : "live",
                kind: this.paused ? "busy" : this.log.Supported === null ? "idle" : "ok",
                extra: html`<span class="sb-chip">${shown} / ${total} Zeilen</span>
                    ${errors ? html`<span class="sb-chip sb-warn">${errors} Fehler</span>` : ""}
                    ${warnings ? html`<span class="sb-chip">${warnings} Warnungen</span>` : ""}`,
            });
            if (this.follow && this.logRef.value) this.logRef.value.scrollTop = this.logRef.value.scrollHeight;
            if (this.consoleRef.value) this.consoleRef.value.scrollTop = this.consoleRef.value.scrollHeight;
        });
    }

    private updateRibbon(): void {
        const el = this.WorkspaceElement;
        if (!el) return;
        const level = (n: number, label: string, title: string): RibbonCommand => ({
            id: `level${n}`, label, title, icon: "filter", size: "small", active: this.maxLevel === n,
            run: () => { this.maxLevel = n; this.updateRibbon(); this.scheduleRender(); },
        });
        setAppRibbon(el, [{
            id: "log", label: "Log", groups: [
                { label: "Anzeige", commands: [
                    { id: "pause", label: this.paused ? "Weiter" : "Anhalten", icon: this.paused ? "run" : "pause", active: this.paused,
                      title: "Anzeige einfrieren (es wird weiter mitgeschrieben)", run: () => this.togglePause() },
                    { id: "clear", label: "Leeren", icon: "clear", run: () => { this.log.Clear(); this.pausedAt = 0; } },
                    { id: "export", label: "Speichern", icon: "download", title: "Log als Textdatei herunterladen", run: () => this.export() },
                ] },
                { label: "Filter", commands: [
                    level(1, "Fehler", "Nur Fehler"),
                    level(2, "Warnungen", "Fehler und Warnungen"),
                    level(3, "Info", "Ohne Debug/Verbose"),
                    level(5, "Alles", "Alle Zeilen"),
                ] },
                { label: "Gerät", commands: [
                    { id: "history", label: "Neu laden", icon: "refresh", title: "Puffer des Geräts erneut anfordern", run: () => this.log.RequestHistory() },
                ] },
            ],
        }]);
    }

    private togglePause(): void {
        this.paused = !this.paused;
        this.pausedAt = this.log.Entries.length;
        this.updateRibbon();
        this.scheduleRender();
    }

    private export(): void {
        const text = this.log.Entries.map((e) =>
            e.sequence < 0 ? e.text : `${formatUptime(e.uptimeMs)} ${LOG_LEVEL_LETTER[e.level]} ${e.tag}: ${e.text}`).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text + "\n"], { type: "text/plain" }));
        a.download = `firmware-log-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // ---- Konsole -------------------------------------------------------------------------------------
    private print(text: string, kind: ConsoleKind = "out"): void {
        this.consoleLines.push({ text, kind });
        if (this.consoleLines.length > MAX_CONSOLE_LINES) this.consoleLines.splice(0, this.consoleLines.length - MAX_CONSOLE_LINES);
        this.scheduleRender();
    }

    private onKey(e: KeyboardEvent): void {
        const input = e.target as HTMLInputElement;
        if (e.key === "ArrowUp" && this.historyPos > 0) {
            input.value = this.history[--this.historyPos];
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            this.historyPos = Math.min(this.historyPos + 1, this.history.length);
            input.value = this.history[this.historyPos] ?? "";
            e.preventDefault();
        }
    }

    private async onSubmit(e: Event): Promise<void> {
        e.preventDefault();
        const input = (e.target as HTMLFormElement).elements.namedItem("cmd") as HTMLInputElement;
        const line = input.value.trim();
        input.value = "";
        if (!line) return;
        this.history.push(line);
        this.historyPos = this.history.length;
        this.print(`> ${line}`, "in");
        const [name, ...args] = line.split(/\s+/);
        const cmd = this.commands.get(name.toLowerCase());
        if (!cmd) {
            this.print(`Unbekannter Befehl "${name}" – help zeigt alle.`, "err");
            return;
        }
        try {
            await cmd.run(args, (text, kind) => this.print(text, kind ?? "out"));
        } catch (err) {
            this.print(`Fehler: ${err}`, "err");
        }
    }

    private builtinCommands(): TerminalCommand[] {
        return [
            {
                name: "help", help: "help: alle Befehle",
                run: (_a, out) => { for (const c of this.commands.values()) out(c.help); },
            },
            {
                name: "cls", help: "cls: Konsole leeren",
                run: () => { this.consoleLines = []; this.scheduleRender(); },
            },
            {
                name: "clear", help: "clear: Log-Anzeige leeren",
                run: () => this.log.Clear(),
            },
            {
                name: "loglevel", help: `loglevel <tag|*> <${LOG_LEVEL_NAMES.join("|")}>: Log-Level im Gerät setzen (esp_log_level_set)`,
                run: (args, out) => {
                    const level = LOG_LEVEL_NAMES.indexOf((args[1] ?? "").toLowerCase());
                    if (args.length !== 2 || level < 0) {
                        out(`Aufruf: loglevel <tag|*> <${LOG_LEVEL_NAMES.join("|")}>`, "err");
                        return;
                    }
                    this.log.SetLevel(args[0], level as firmwarelog.LogLevel);
                    out(`Level von ${args[0]} -> ${LOG_LEVEL_NAMES[level]}`);
                },
            },
            {
                name: "history", help: "history: Puffer des Geräts erneut anfordern",
                run: (_a, out) => { this.log.RequestHistory(); out("angefordert"); },
            },
            {
                name: "restart", help: "restart: Gerät neu starten",
                run: (_a, out) => {
                    this.appManagement.SendFrame(systeminfo.NAMESPACE_ID, systeminfo.RequestRestart.encode({}, 0));
                    out("Neustart angefordert");
                },
            },
        ];
    }
}
