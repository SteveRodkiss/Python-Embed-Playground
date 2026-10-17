# Python Playground

An embeddable Python editor for students: Monaco editor + Pyodide, with an output terminal and a step-through debugger. Pure HTML/CSS/JS, no build step.

```
index.html        page (entry point)
css/styles.css    styles
js/main.js        wiring, run/debug/stop logic
js/editor.js      Monaco setup
js/runner.js      talks to the Pyodide worker
js/worker.js      Web Worker hosting Pyodide
js/terminal.js    output terminal + inline input()
js/debugger.js    debugger UI (variables, next line, output so far)
py/runtime.py     Python-side runner and tracer
```

## Publish and embed

1. Push to GitHub, then **Settings → Pages** → deploy from the `main` branch root.
2. In Google Sites: **Insert → Embed → By URL**, paste `https://<user>.github.io/<repo>/`. Or use **Embed code**:

```html
<iframe src="https://<user>.github.io/<repo>/" width="100%" height="700" style="border:0"></iframe>
```

Optional URL parameter: `?theme=light` (default is dark).

## Notes

- **Debug** records up to 3000 steps, then lets you step forward/back, play automatically, or drag the slider. Changed variables are highlighted. The editor is read-only while the Debugger tab is open.
- **input()**: the program re-runs with the answers so far (random is seeded so it repeats identically). Avoid relying on the clock in programs that use input().
- **Stop** kills the worker, so endless loops can always be interrupted.
- Needs internet access to load Monaco and Pyodide from jsDelivr. To run locally, serve the folder (e.g. `python -m http.server`); opening `index.html` via `file://` won't work.
- Code is autosaved to `localStorage` when the browser allows it.
