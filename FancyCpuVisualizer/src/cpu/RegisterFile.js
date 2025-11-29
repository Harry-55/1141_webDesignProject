// src/cpu/RegisterFile.js
import { Register } from './Register.js';

export class RegisterFile {
  constructor() {
    this.registers = Array.from({ length: 32 }, () => new Register());
    this.readAddr1 = 0;
    this.readAddr2 = 0;
    this.writeData = 0;
    this.writeAddr = 0;
    this.readData1 = 0;
    this.readData2 = 0;
  }
  setReadAddresses(addr1, addr2) {
    this.readAddr1 = addr1;
    this.readAddr2 = addr2;
  }
  evaluateRead() {
    this.readData1 = this.registers[this.readAddr1].read();
    this.readData2 = this.registers[this.readAddr2].read();
    if (this.readAddr1 === 0) this.readData1 = 0;
    if (this.readAddr2 === 0) this.readData2 = 0;
  }
  setWriteData(addr, data) {
    this.writeAddr = addr;
    this.writeData = data;
  }
  latch(regWriteEnable) {
    if (regWriteEnable && this.writeAddr !== 0) {
      this.registers[this.writeAddr].setInput(this.writeData);
      this.registers[this.writeAddr].latch(true);
    }
  }
}