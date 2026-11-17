// Das Firmware-Log (ESP_LOGx) des Geraets im Browser, Namespace 'firmwarelog' (Webmanager-Plugin
// FirmwareLogPlugin, opt-in in der Firmware). Nach jedem Verbindungsaufbau wird die Historie angefordert;
// das Geraet schickt dann die noch gepufferten Zeilen und jede neue. Doppelte Zeilen (nach einem
// Wiederverbinden) fallen ueber die Sequenznummer heraus; startet die Nummer wieder von vorn, ist das
// Geraet neu gestartet (Trennzeile). Gehalten werden die letzten `max` Zeilen.
import { firmwarelog } from "@generated/wsprotocol_ts/ws-protocol";
import type { AppController } from "../app_controller";
import { IMessageListener } from "./interfaces";

export interface LogEntry {
  /** Sequenznummer des Geraets; -1 fuer Zeilen des Browsers (Trennzeile nach Neustart). */
  sequence: number;
  /** Wie esp_log_level_t: 1 Fehler, 2 Warnung, 3 Info, 4 Debug, 5 Verbose; 0 = Meldung des Browsers. */
  level: number;
  uptimeMs: number;
  tag: string;
  text: string;
}

export const LOG_LEVEL_LETTER = ["–", "E", "W", "I", "D", "V"];
export const LOG_LEVEL_NAMES = ["none", "error", "warn", "info", "debug", "verbose"];

export function isWarningOrError(e: LogEntry): boolean {
  return e.level === 1 || e.level === 2;
}

/** "1d 02:03:04.567" bzw. "02:03:04.567" */
export function formatUptime(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor(ms / 3_600_000) % 24;
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d ? d + "d " : ""}${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

export class FirmwareLog implements IMessageListener {
  private entries: LogEntry[] = [];
  private lastSequence = -1;
  private readonly listeners = new Set<(added: LogEntry[]) => void>();
  private pending: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** Hat das Geraet ueberhaupt geantwortet (Firmware mit FirmwareLogPlugin)? */
  public Supported: boolean | null = null;

  constructor(private readonly app: AppController, private readonly max = 5000) {
    app.RegisterNamespace(this, firmwarelog.NAMESPACE_ID);
    let wasOpen = false;
    app.OnConnectionChange(() => {
      const open = app.ConnectionState === "open";
      if (open && !wasOpen) this.RequestHistory();
      wasOpen = open;
    });
  }

  public get Entries(): readonly LogEntry[] {
    return this.entries;
  }

  /** listener(added) gebuendelt hoechstens alle 100 ms; gibt die Abmeldefunktion zurueck. */
  public Subscribe(listener: (added: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public Clear(): void {
    this.entries = [];
    this.emit([]);
  }

  public RequestHistory(): void {
    this.app.SendFrame(firmwarelog.NAMESPACE_ID, firmwarelog.RequestLogHistory.encode({}, 0));
  }

  /** esp_log_level_set(tag, level); tag "" oder "*" = alle. */
  public SetLevel(tag: string, level: firmwarelog.LogLevel): void {
    this.app.SendFrame(firmwarelog.NAMESPACE_ID, firmwarelog.RequestSetLogLevel.encode({ tag: tag === "*" ? "" : tag, level }, 0));
  }

  OnMessage(_namespaceId: number, messageTypeId: number, view: DataView): void {
    switch (messageTypeId) {
      case firmwarelog.NotifyLogMessage.TYPE_ID: {
        const m = firmwarelog.NotifyLogMessage.decode(view, 0);
        if (m.sequence <= this.lastSequence) return;
        this.lastSequence = m.sequence;
        this.add({ sequence: m.sequence, level: m.level, uptimeMs: m.uptimeMs, tag: m.tag, text: m.text });
        break;
      }
      case firmwarelog.ResponseLogHistory.TYPE_ID: {
        const r = firmwarelog.ResponseLogHistory.decode(view, 0);
        this.Supported = true;
        if (this.lastSequence >= 0 && r.nextSequence <= this.lastSequence) {
          this.lastSequence = -1;
          this.add({ sequence: -1, level: 0, uptimeMs: 0, tag: "", text: "— Gerät neu gestartet —" });
        }
        break;
      }
      default:
        break;
    }
  }

  private add(e: LogEntry): void {
    this.entries.push(e);
    if (this.entries.length > this.max) this.entries.splice(0, this.entries.length - this.max);
    this.pending.push(e);
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        const added = this.pending;
        this.pending = [];
        this.emit(added);
      }, 100);
    }
  }

  private emit(added: LogEntry[]): void {
    for (const l of this.listeners) l(added);
  }
}
