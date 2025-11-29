// src/cpu/VisualMapping.js

export class VisualMapping {
  constructor() {
    // [核心] 這是你唯一的控制面板
    // 左邊是 "訊號名稱"，右邊是 "要亮的 SVG ID 陣列"
    this.map = {
      // --- PC 相關 ---
      PCRead: ['PC', 'PCtoInstOrPCadderPath', 'PCcurrentPath'],
      PCWrite: ['PC', 'PCnextPath'],
      
      // --- PC Mux & Adder ---
      PCSource: ['PCMux', 'ControlToPCMUXPath', 'PCjumpPath'], // 简化：只要有 PCSource 就亮
      PCAdder: ['PCadder', 'PCcurADD4Path'], // 新增一个专门控制 PC+4 的讯号

      // --- 記憶體 ---
      InstMemory: ['InstMemory'],
      DECODE: ['ALUtoFlagPath', 'ControlToInstPath', 'InstMemory', 'ControlROM', 'INSTtoMainPath', 'InstBusToAnyway', 'PCjumpPath','RegWrite4to7','RegWrite0to3','RegWrite8to11','RegWritePath','RegWritePath_2'],
      MemRead: ['InstMemory', 'DataMemo', 'ALUtoDataMemoPath', 'ControlToDataEnPath'],
      MemWrite: ['DataMemo', 'ALUtoDataMemoPath', 'ControlToDataEnPath', 'ControlToDataWriteAddrPath', 'RegToDataPath'],
      
      // --- 暫存器 ---
      RegRead: ['Register', 'R1readAddr', 'R2readAddr'],
      RegWrite: ['Register', 'RegDataMUX', 'ControlToRegWrite', 'RegWrite4to7', 'RegWrite0to3', 'RegWrite8to11', 'RegWritePath', 'RegWritePath_2','Line 23'],
      
      // --- ALU ---
      ALUOp: ['ALU','PC'], // PC -> ALU
      ALUSrcA_1: ['RegToALUpathD1'], // Reg -> ALU
      
      ALUSrcB_0: [], // 4 -> ALU (通常不画线)
      ALUSrcB_1: ['RegToALUD2MUXPath'], // Reg -> ALU
      ALUSrcB_2: [], // Imm -> ALU

      // --- WriteBack Mux (MemToReg) ---
      MemToReg: ['RegWriteMUX', 'ControlToRegWritePath'],
      MemToReg_0: ['ALUtoRegDataPath'], // ALU -> Reg
      MemToReg_1: ['DataMemoToRegPath'], // Mem -> Reg
      
      // --- Control ROM ---
      ControlActive: [''] // 一个通用的 "控制单元在忙" 讯号
    };
  }

  getActiveIds(signals) {
    const activeIds = new Set();

    // 1. 基础映射：只要 signals[key] 为真，就点亮对应的 ID
    for (const [key, val] of Object.entries(signals)) {
      // 只要值不为 false/null/undefined/IDLE，就视为 "Active"
      const isActive = val === true || (typeof val === 'string' && val !== 'IDLE') || (typeof val === 'number' && val >= 0);

      if (isActive && this.map[key]) {
        this.map[key].forEach(id => activeIds.add(id));
      }
    }
    
    // 2. [手动扩展] 针对特定数值的映射 (为了更精准控制)
    // 例如：ALUSrcA=1 时，除了亮 ALUSrcA，还要亮 ALUSrcA_1 对应的线
    if (signals.InstMemory === 1) {
        this._addIds('InstMemory', activeIds);
    }
    if (signals.ALUSrcA === 1) this._addIds('ALUSrcA_1', activeIds);
    
    if (signals.ALUSrcB === 1) this._addIds('ALUSrcB_1', activeIds);
    
    if (signals.MemToReg === 0) this._addIds('MemToReg_0', activeIds);
    if (signals.MemToReg === 1) this._addIds('MemToReg_1', activeIds);
    
    // 只要有任何讯号，Control ROM 就亮
    if (activeIds.size > 0) this._addIds('ControlActive', activeIds);
    
    // PC+4 加法器特殊处理 (永远在 FETCH 时亮)
    if (signals.PCSource === 0 || signals.PCRead) this._addIds('PCAdder', activeIds);

    return activeIds;
  }
  
  _addIds(key, set) {
      if (this.map[key]) this.map[key].forEach(id => set.add(id));
  }
}