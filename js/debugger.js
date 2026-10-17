/* Step-through debugger UI. Replays a recorded list of steps. */
export class DebuggerView {
  constructor(editor) {
    this.editor = editor;
    this.decorations = editor.createDecorationsCollection();
    this.$ = (id) => document.getElementById(id);
    this.session = null; // { code, steps, transcript, error }
    this.index = 0;
    this.active = false; // debugger tab visible
    this.timer = null;

    this.$("dbg-first").onclick = () => this.goTo(0);
    this.$("dbg-back").onclick = () => this.goTo(this.index - 1);
    this.$("dbg-next").onclick = () => this.goTo(this.index + 1);
    this.$("dbg-last").onclick = () => this.goTo(this.session ? this.session.steps.length - 1 : 0);
    this.$("dbg-play").onclick = () => (this.timer ? this.pause() : this.play());
    this.$("dbg-slider").oninput = (e) => { this.pause(); this.goTo(Number(e.target.value)); };
    this.render();
  }

  load(code, result) {
    this.pause();
    this.session = { code, steps: result.steps, transcript: result.transcript, error: result.error };
    this.$("dbg-slider").max = result.steps.length - 1;
    this.index = 0;
    this.render();
  }

  /** Called when the debugger tab is shown or hidden. */
  setActive(active) {
    this.active = active;
    if (!active) this.pause();
    if (active && this.session && this.editor.getValue() !== this.session.code) this.session = null;
    this.editor.updateOptions({ readOnly: active && !!this.session });
    this.render();
  }

  clear() {
    this.pause();
    this.session = null;
    this.editor.updateOptions({ readOnly: false });
    this.render();
  }

  goTo(i) {
    if (!this.session) return;
    this.index = Math.max(0, Math.min(i, this.session.steps.length - 1));
    this.render();
  }

  play() {
    if (!this.session) return;
    if (this.index >= this.session.steps.length - 1) this.index = 0;
    this.$("dbg-play").textContent = "⏸ Pause";
    this.timer = setInterval(() => {
      if (this.index >= this.session.steps.length - 1) return this.pause();
      this.goTo(this.index + 1);
    }, 700);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.$("dbg-play").textContent = "▶▶ Auto";
  }

  render() {
    const s = this.session;
    const has = !!s;
    this.$("dbg-empty").classList.toggle("hidden", has);
    document.querySelector(".dbg-body").classList.toggle("hidden", !has);
    for (const id of ["dbg-first", "dbg-back", "dbg-next", "dbg-last", "dbg-play", "dbg-slider"]) {
      this.$(id).disabled = !has;
    }
    if (!has) {
      this.$("dbg-count").textContent = "–";
      this.decorations.clear();
      return;
    }

    const step = s.steps[this.index];
    const prev = this.index > 0 ? s.steps[this.index - 1] : null;
    this.$("dbg-slider").value = this.index;
    this.$("dbg-count").textContent = `Step ${this.index + 1} / ${s.steps.length}`;
    this.$("dbg-back").disabled = this.index === 0;
    this.$("dbg-next").disabled = this.index === s.steps.length - 1;

    this.renderVariables(step, prev);
    this.renderNextLine(step, s);
    this.$("dbg-output").textContent = s.transcript.slice(0, step.out);

    if (this.active && step.line) {
      this.decorations.set([{
        range: new window.monaco.Range(step.line, 1, step.line, 1),
        options: { isWholeLine: true, className: "debug-line", glyphMarginClassName: "debug-arrow" },
      }]);
      this.editor.revealLineInCenterIfOutsideViewport(step.line);
    } else {
      this.decorations.clear();
    }
  }

  renderNextLine(step, s) {
    const box = this.$("dbg-next-line");
    box.classList.toggle("error", step.end === "error");
    if (step.line) {
      const text = s.code.split("\n")[step.line - 1] || "";
      box.textContent = `Line ${step.line}:  ${text.trim()}`;
    } else if (step.end === "error") {
      box.textContent = s.error || "The program stopped because of an error.";
    } else {
      box.textContent = "✔ The program has finished.";
    }
  }

  renderVariables(step, prev) {
    const root = this.$("dbg-vars");
    root.textContent = "";
    step.frames.forEach((frame, fi) => {
      const before = prev && prev.frames[fi] && prev.frames[fi].name === frame.name ? prev.frames[fi] : null;
      const old = new Map((before ? before.vars : []).map(([n, , v]) => [n, v]));

      const card = document.createElement("div");
      card.className = "frame";
      const head = document.createElement("div");
      head.className = "frame-head";
      head.textContent = frame.name;
      if (frame.line) {
        const at = document.createElement("span");
        at.textContent = `line ${frame.line}`;
        head.appendChild(at);
      }
      card.appendChild(head);

      if (!frame.vars.length) {
        const none = document.createElement("div");
        none.className = "none";
        none.textContent = "No variables yet";
        card.appendChild(none);
      } else {
        const table = document.createElement("table");
        for (const [name, type, value] of frame.vars) {
          const tr = document.createElement("tr");
          if (old.get(name) !== value) tr.className = "changed";
          const tdName = document.createElement("td");
          tdName.className = "name";
          tdName.textContent = name;
          const tdVal = document.createElement("td");
          tdVal.textContent = value;
          const t = document.createElement("span");
          t.className = "type";
          t.textContent = type;
          tdVal.appendChild(t);
          tr.append(tdName, tdVal);
          table.appendChild(tr);
        }
        card.appendChild(table);
      }
      root.appendChild(card);
    });
  }
}
