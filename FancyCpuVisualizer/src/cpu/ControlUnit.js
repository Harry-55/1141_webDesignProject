// src/cpu/ControlUnit.js

export class ControlUnit {
  constructor() {
    this.rom = new Map();
    this.currentState = 'FETCH_1';
    this.nextState = 'FETCH_1';
    this.controlSignals = {};
    
    this.defaultSignals = {
      PCRead: false,
      PCWrite: false,
      MemRead: false,
      MemWrite: false,
      RegRead: false,
      RegWrite: false,
      IorD: undefined,    
      ALUSrcA: undefined, 
      ALUSrcB: undefined, 
      MemToReg: undefined, 
      PCSource: undefined,
      
      ALUOp: 'IDLE' 
    };
  }

  async loadROM() {
    // ... (loadROM 保持不變) ...
    try {
      const response = await fetch('/ControlROM.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const romData = await response.json();
      this.rom = new Map(Object.entries(romData));
      console.log("Control ROM 載入成功!");
    } catch (err) {
      console.error("Control ROM 載入失敗:", err);
    }
  }

  evaluate(instruction) {
    const opcode = (instruction >> 26) & 0x3F;
    const funct = instruction & 0x3F;

    const microInstruction = this.rom.get(this.currentState);
    if (!microInstruction) {
      console.error(`未知的 FSM 狀態: ${this.currentState}`);
      this.controlSignals = { ...this.defaultSignals }; // 發生錯誤時回傳預設值
      return;
    }
    
    // [關鍵修復]
    // 先鋪上 "預設值"，再蓋上 "ROM 設定"
    // 這樣 DECODE 階段的 MemRead 就會被強制覆蓋為 false，而不是 undefined
    this.controlSignals = { 
      ...this.defaultSignals, 
      ...microInstruction.signals 
    };
    
    // --- 以下狀態分派邏輯保持不變 ---
    let next = microInstruction.nextState;
    
    if (next === "DISPATCH_OP") {
      if (opcode === 0) { // R-Type (ADD, SUB)
        next = "EXECUTE_R_TYPE";
      } else {
        next = "FETCH_1"; 
      }
    }
    
    if (this.controlSignals.ALUOp === "FUNC") {
      if (funct === 0x20) { // add
        this.controlSignals.ALUOp = "ADD";
      } else if (funct === 0x22) { // sub
        this.controlSignals.ALUOp = "SUB";
      } else {
        this.controlSignals.ALUOp = "IDLE";
      }
    }
    
    this.nextState = next;
  }

  latch() {
    this.currentState = this.nextState;
  }
  
  getSignals() {
    return this.controlSignals;
  }
}