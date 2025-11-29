// src/cpu/Memory.js
export class Memory {
  constructor(size = 1024) {
    this.data = new Array(size).fill(0);
  }
  read(address) {
    // 模擬 32-bit 位址 (4 bytes)
    const index = address >> 2; 
    return this.data[index] || 0;
  }
  latch(enable, address, writeData) {
    if (enable) {
      const index = address >> 2;
      this.data[index] = writeData;
    }
  }
}