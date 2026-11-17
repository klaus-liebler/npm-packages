# @klaus-liebler/ui-shell

Anwendungsfenster und Design-System der Weboberflächen von factory_in_a_box, sensact und labathome
(Lit). Bis 2026-11 als `@fiab/ui-shell` in factory_in_a_box (`web_packages/ui-shell`).

- `shell/app-shell.ts` – `<app-shell>`: Titelleiste (Logo, Schnellzugriff, Arbeitsbereich und Host,
  Verbindung, Glocke, Hell/Dunkel, Vollbild, Benutzer/Abmelden), Arbeitsbereich-Umschalter mit Ribbon,
  Arbeitsbereich, Statusleiste. `RegisterApp(path, title, icon, element, { group, description })` je
  Arbeitsbereich, dann `Start(config)`.
- `shell/workspace-app.ts` – `onShow()`/`onHide()` statt connected/disconnected (Elemente bleiben im DOM).
- `shell/status-bar.ts` – `setAppStatus(element, { text, kind, extra })`.
- `shell/ribbon.ts` – `setAppRibbon(element, tabs)`, `openWorkspace(path)`.
- `shell/dialogs.ts`, `shell/icons.ts` (`icon(name, size)`), `shell/router.ts` (History-API, optional Hash).
- `ui/base.css`, `ui/components.css`, `ui/tokens.css` – Grundstil; Dunkelmodus als seitenweite Invertierung
  (`html[data-theme="dark"]`), Ausnahmen invertieren sich zurück.

Keine Paket-Übersetzung: die Quellen werden direkt importiert (`"exports": {"./*": "./src/*"}`). Für
Verbraucher per `file:`-Link:

- `lit` als eigene Abhängigkeit und in `vite.config` `resolve.dedupe: ["lit", "lit-html", "@lit/reactive-element"]`,
  sonst landet lit zweimal im Bundle;
- `experimentalDecorators: true` in der tsconfig des Verbrauchers (Typprüfung der Decorators); übersetzt werden die
  Quellen mit der tsconfig dieses Pakets (`useDefineForClassFields: false`).

```
npm install
npm test          # vitest (happy-dom)
npm run typecheck
```
