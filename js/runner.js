/* Main-thread client for the Pyodide worker. */
export class Runner {
  constructor({ onOutput, onReady }) {
    this.onOutput = onOutput;
    this.onReady = onReady;
    this.pending = null;
    this.start();
  }

  start() {
    this.worker = new Worker(new URL("./worker.js", import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.type === "ready") this.onReady();
      else if (data.type === "out") this.onOutput(data.text, data.stream);
      else if (data.type === "done") this.settle("resolve", data.result);
      else if (data.type === "fatal") this.settle("reject", new Error(data.message));
    };
  }

  settle(kind, value) {
    const p = this.pending;
    this.pending = null;
    if (p) p[kind](value);
  }

  run(code, inputs, debug) {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker.postMessage({ type: "run", code, inputs, debug });
    });
  }

  /** Kills the running program and boots a fresh interpreter. */
  stop() {
    this.worker.terminate();
    this.settle("reject", new Error("stopped"));
    this.start();
  }
}
