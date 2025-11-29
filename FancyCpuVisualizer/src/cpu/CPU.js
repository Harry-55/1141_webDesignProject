// src/cpu/CPU.js
import { Clock } from './Clock.js';
import { ControlUnit } from './ControlUnit.js';
import { ALU } from './ALU.js';
import { Mux } from './Mux.js';
import { PC } from './PC.js';
import { RegisterFile } from './RegisterFile.js';
import { Memory } from './Memory.js';

export class MipsCPU {
  constructor() {
    // 1. 實例化所有 "硬體"
    this.controlUnit = new ControlUnit();
    this.pc = new PC();
    this.regFile = new RegisterFile();
    this.alu = new ALU();
    this.instMemory = new Memory();
    this.dataMemory = new Memory();
    
    // 實例化所有 "Muxes"
    this.aluSrcAMux = new Mux();
    this.aluSrcBMux = new Mux();
    this.memToRegMux = new Mux(); 
    
    // 2. 實例化 "時脈"
    this.clock = new Clock(this);
    
    // 3. 內部線路
    this.instruction = 0;
  }
  
  loadProgram(machineCodeArray) {
    console.log("CPU: 正在載入程式...", machineCodeArray);
    // 清空舊程式和狀態
    this.instMemory = new Memory();
    this.regFile = new RegisterFile();
    this.pc.output = 0; // 重置 PC
    
    // 載入新程式
    machineCodeArray.forEach((instruction, index) => {
      this.instMemory.data[index] = instruction;
    });
    
    // 預設 $t0 和 $t1 的值 (方便測試)
    this.regFile.registers[8].output = 10; // $t0
    this.regFile.registers[9].output = 5;  // $t1
    
    // 重置 FSM
    this.controlUnit.currentState = 'FETCH_1';
    console.log("CPU: 程式載入完畢。");
  }
  
  async initialize() {
    await this.controlUnit.loadROM();
    
    // [測試用] 預設 $t0 = 10, $t1 = 5
    this.regFile.registers[8].output = 10; // $t0
    this.regFile.registers[9].output = 5;  // $t1
    
    // [測試用] 載入 `add $t2, $t0, $t1` (opcode=0, rs=8, rt=9, rd=10, funct=0x20)
    // 000000 01000 01001 01010 00000 100000
    // 0x01295020
    this.instMemory.data[0] = 0x01295020; 
  }

  step() {
    this.clock.step();
  }

  evaluateCombinational() {
    const pcOut = this.pc.read();
    this.instruction = this.instMemory.read(pcOut);
    
    const opcode = (this.instruction >> 26) & 0x3F;
    const rs = (this.instruction >> 21) & 0x1F;
    const rt = (this.instruction >> 16) & 0x1F;
    const rd = (this.instruction >> 11) & 0x1F;
    const imm = this.instruction & 0xFFFF;

    this.controlUnit.evaluate(this.instruction);
    const signals = this.controlUnit.getSignals();

    this.regFile.setReadAddresses(rs, rt);
    this.regFile.evaluateRead();
    
    const aluInputA = this.aluSrcAMux.evaluate(
      signals.ALUSrcA,
      pcOut,
      this.regFile.readData1
    );
    const aluInputB = this.aluSrcBMux.evaluate(
      signals.ALUSrcB,
      4,
      this.regFile.readData2,
      imm
    );
    this.alu.evaluate(signals.ALUOp, aluInputA, aluInputB);
    
    const writeBackData = this.memToRegMux.evaluate(
      signals.MemToReg,
      this.alu.output,
      0 // (未來: 來自 Data Memory)
    );

    this.regFile.setWriteData(rd, writeBackData);
    this.pc.setInput(this.alu.output); // (目前只處理 PC+4)
  }

  latchSequential() {
    const signals = this.controlUnit.getSignals();
    this.controlUnit.latch();
    this.pc.latch(signals.PCWrite);
    this.regFile.latch(signals.RegWrite);
  }
}