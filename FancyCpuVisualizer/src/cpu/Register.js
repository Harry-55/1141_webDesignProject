// src/cpu/Register.js
export class Register {
  constructor() {
    this.input = 0;
    this.output = 0;
  }
  setInput(data) {
    this.input = data;
  }
  latch(enable) {
    if (enable) {
      this.output = this.input;
    }
  }
  read() {
    return this.output;
  }
}