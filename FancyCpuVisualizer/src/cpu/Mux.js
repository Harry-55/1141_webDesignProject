// src/cpu/Mux.js
export class Mux {
  constructor() {
    this.output = 0;
  }
  evaluate(select, ...inputs) {
    this.output = inputs[select] || 0;
    return this.output;
  }
}