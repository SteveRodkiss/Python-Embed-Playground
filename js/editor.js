/* Loads Monaco from the CDN and creates the editor. */
const MONACO_BASE = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

export async function createEditor(container, { code, theme, fontSize }) {
  await loadScript(`${MONACO_BASE}/vs/loader.js`);

  // Monaco's workers live on another origin, so bootstrap them through a data: URL.
  window.MonacoEnvironment = {
    getWorkerUrl: () =>
      "data:text/javascript;charset=utf-8," +
      encodeURIComponent(
        `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};importScripts('${MONACO_BASE}/vs/base/worker/workerMain.js');`
      ),
  };

  window.require.config({ paths: { vs: `${MONACO_BASE}/vs` } });
  await new Promise((resolve) => window.require(["vs/editor/editor.main"], resolve));

  return window.monaco.editor.create(container, {
    value: code,
    language: "python",
    theme: theme === "light" ? "vs" : "vs-dark",
    fontSize,
    automaticLayout: true,
    minimap: { enabled: false },
    glyphMargin: true,
    scrollBeyondLastLine: false,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: "on",
  });
}
