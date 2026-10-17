/* Simple output terminal with inline input() support. */
export class Terminal {
  constructor(el) {
    this.el = el;
    this.inputWrap = null;
    this.resolveInput = null;
    el.addEventListener("click", () => {
      if (!window.getSelection().toString()) this.inputWrap?.firstChild.focus();
    });
  }

  clear() {
    this.cancelInput();
    this.el.textContent = "";
  }

  write(text, stream = "stdout") {
    const span = document.createElement("span");
    span.textContent = text;
    if (stream !== "stdout") span.className = stream;
    this.el.insertBefore(span, this.inputWrap);
    this.el.scrollTop = this.el.scrollHeight;
  }

  /** Shows an inline text box; resolves with the line typed, or null if cancelled. */
  readLine() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.addEventListener("input", () => { input.style.width = Math.max(14, input.value.length + 2) + "ch"; });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const value = input.value;
        this.removeInput();
        resolve(value);
      });
      this.inputWrap = document.createElement("span");
      this.inputWrap.appendChild(input);
      this.el.appendChild(this.inputWrap);
      this.resolveInput = resolve;
      this.el.scrollTop = this.el.scrollHeight;
      input.focus();
    });
  }

  cancelInput() {
    const resolve = this.resolveInput;
    this.removeInput();
    if (resolve) resolve(null);
  }

  removeInput() {
    this.inputWrap?.remove();
    this.inputWrap = null;
    this.resolveInput = null;
  }
}
