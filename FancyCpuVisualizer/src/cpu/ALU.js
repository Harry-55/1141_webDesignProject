// src/cpu/ALU.js
export class ALU {
  constructor() {
    this.output = 0;
  }
  evaluate(aluOp, inputA, inputB) {
    switch (aluOp) {
      case 'ADD':
        this.output = inputA + inputB;
        break;
      case 'SUB':
        this.output = inputA - inputB;
        break;
      default:
        this.output = 0;
    }
    this.output = this.output | 0; // 模擬 32-bit 溢位
    return this.output;
  }
}