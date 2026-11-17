// Startseite: je Arbeitsbereich eine Kachel (Symbol, Titel, Beschreibung), nach Gruppen geordnet wie im
// Umschalter der Shell. Ersetzt den leeren DefaultScreenController als "Home".
import { html, TemplateResult } from "lit-html";
import { icon } from "@klaus-liebler/ui-shell/shell/icons.ts";
import { openWorkspace } from "@klaus-liebler/ui-shell/shell/ribbon.ts";
import type { ScreenWorkspace } from "../app_controller";
import { IAppManagement } from "../utils/interfaces";
import { ScreenController } from "./screen_controller";

export class OverviewScreenController extends ScreenController {
    constructor(
        appManagement: IAppManagement,
        private readonly workspaces: () => readonly ScreenWorkspace[],
        private readonly intro: TemplateResult<1> | null = null,
    ) {
        super(appManagement);
    }

    public Template = () => {
        const others = this.workspaces().filter((w) => w.controller !== this);
        const groups = [...new Set(others.map((w) => w.group))];
        return html`
            ${this.intro ?? ""}
            ${groups.map((g) => html`
                <h3 class="ws-tiles-group">${g}</h3>
                <div class="ws-tiles">
                    ${others.filter((w) => w.group === g).map((w) => html`
                        <button class="ws-tile" @click=${() => openWorkspace(w.path)} title=${w.description || w.title}>
                            ${icon(w.icon, 40)}
                            <span class="ws-tile-title">${w.title}</span>
                            ${w.description ? html`<span class="ws-tile-desc">${w.description}</span>` : ""}
                        </button>`)}
                </div>`)}`;
    };

    OnMessage(_namespaceId: number, _messageTypeId: number, _view: DataView): void {}
    OnCreate(): void {}
    protected OnFirstStart(): void {}
    protected OnRestart(): void {}
    OnPause(): void {}
}
