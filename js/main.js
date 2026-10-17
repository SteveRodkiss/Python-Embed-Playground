import { createEditor } from "./editor.js";
import { Runner } from "./runner.js";
import { Terminal } from "./terminal.js";
import { DebuggerView } from "./debugger.js";

const DEFAULT_CODE = `# Welcome! Press Run to try this program.
name = "Python"
for i in range(3):
    print("Hello,", name, i)
`;

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked in iframe */ } },
};

const params = new URLSearchParams(location.search);
let theme = params.get("theme") || store.get("theme") || "dark";
let fontSize = Number(store.get("fontSize")) || 16;
document.documentElement.dataset.theme = theme;

const term = new Terminal($("terminal"));
let busy = false;
let pythonReady = false;

const runner = new Runner({
  onOutput: (text, stream) => term.write(text, stream),
  onReady: () => { pythonReady = true; updateUi(); },
});

const editor = await createEditor($("editor"), {
  code: store.get("code") ?? DEFAULT_CODE,
  theme,
  fontSize,
});
const dbg = new DebuggerView(editor);
const errorMarks = editor.createDecorationsCollection();

function updateUi() {
  $("btn-run").disabled = $("btn-debug").disabled = busy || !pythonReady;
  $("btn-stop").disabled = !busy;
  $("status").textContent = busy ? "Running…" : pythonReady ? "Ready" : "Loading Python…";
}

function showTab(name) {
  for (const t of ["output", "debugger"]) {
    $("tab-" + t).classList.toggle("active", t === name);
    $("panel-" + t).classList.toggle("hidden", t !== name);
  }
  dbg.setActive(name === "debugger");
}

async function execute(debug) {
  if (busy || !pythonReady) return;
  busy = true;
  updateUi();
  dbg.clear();
  errorMarks.clear();
  showTab("output");
  const code = editor.getValue();
  const inputs = [];

  try {
    for (;;) {
      term.clear();
      const result = await runner.run(code, inputs, debug);
      if (result.needInput) {
        const answer = await term.readLine();
        if (answer === null) throw new Error("stopped");
        inputs.push(answer);
        continue;
      }
      if (result.errorLine) {
        errorMarks.set([{
          range: new window.monaco.Range(result.errorLine, 1, result.errorLine, 1),
          options: { isWholeLine: true, className: "error-line" },
        }]);
      }
      if (debug) {
        dbg.load(code, result);
        showTab("debugger");
      }
      break;
    }
  } catch (err) {
    if (err.message === "stopped") term.write("\n[Program stopped]\n", "info");
    else term.write("\n" + err.message + "\n", "stderr");
  } finally {
    busy = false;
    updateUi();
  }
}

function stop() {
  if (!busy) return;
  pythonReady = false; // the worker restarts; onReady re-enables the buttons
  term.cancelInput();
  runner.stop();
}

$("btn-run").onclick = () => execute(false);
$("btn-debug").onclick = () => execute(true);
$("btn-stop").onclick = stop;
$("btn-clear").onclick = () => term.clear();
$("tab-output").onclick = () => showTab("output");
$("tab-debugger").onclick = () => showTab("debugger");

editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => execute(false));
editor.onDidChangeModelContent(() => {
  store.set("code", editor.getValue());
  errorMarks.clear();
});

function setFont(size) {
  fontSize = Math.max(10, Math.min(32, size));
  editor.updateOptions({ fontSize });
  store.set("fontSize", fontSize);
}
$("btn-font-up").onclick = () => setFont(fontSize + 2);
$("btn-font-down").onclick = () => setFont(fontSize - 2);
$("btn-theme").onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  window.monaco.editor.setTheme(theme === "light" ? "vs" : "vs-dark");
  store.set("theme", theme);
};

updateUi();
