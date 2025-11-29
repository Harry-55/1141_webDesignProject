// src/cpu/Clock.js

export class Clock {
  constructor(cpu) {
    this.cpu = cpu; 
  }

  step() {
    // 1. [Tick] 計算當前狀態 (例如 WRITEBACK) 的訊號
    // 這是為了確保 latch 能抓到正確的資料
    this.cpu.evaluateCombinational();
    
    // 2. [Tock] 時脈邊緣觸發，更新元件狀態 (變為 FETCH)
    this.cpu.latchSequential();

    // 3. [關鍵修復] 再次計算組合邏輯！
    // 這是為了讓 UI 能顯示「新狀態 (FETCH)」對應的「新訊號」
    // 模擬真實電路中，Latch 後電流立刻流動的現象
    this.cpu.evaluateCombinational();
  }
}