// src/registry.js
export const ChipRegistry = {
  'AND': { inputs: ['A', 'B'], outputs: ['OUT'] },
  'OR':  { inputs: ['A', 'B'], outputs: ['OUT'] },
  'NAND':{ inputs: ['A', 'B'], outputs: ['OUT'] },
  'NOT': { inputs: ['In'], outputs: ['OUT'] },

  // 🕒 時序元件：DFF
  'DFF': {
    inputs: ['In'],
    outputs: ['OUT'],
    // DFF 是基礎元件，沒有 components 結構
  },

  // 📦 1-Bit Register (暫存器)
  'BIT': {
    inputs: ['In', 'Load'],
    outputs: ['Out'],
    components: [
      { id: 'm1', type: 'MUX', x: 50, y: 50, value: 0 },
      { id: 'dff', type: 'DFF', x: 200, y: 75, value: 0 }
    ],
    wires: [
      // 1. Load 決定 MUX 選誰
      { from: 'Load', to: 'm1', toPin: 'Sel' },
      
      // 2. 如果 Load=1，選新的輸入 In (寫入)
      { from: 'In', to: 'm1', toPin: 'B' },
      
      // 3. 如果 Load=0，選 DFF 的舊輸出 (保持) -> 這就是迴圈！
      { from: 'dff', to: 'm1', toPin: 'A' },

      // 4. MUX 的結果送進 DFF (等待下個 Tick 更新)
      { from: 'm1', to: 'dff', toPin: 'In' }
    ],
    ioMapping: {
      inputs: {
        'In':   [{ id: 'm1', pin: 'B' }],
        'Load': [{ id: 'm1', pin: 'Sel' }]
      },
      outputs: { 'Out': 'dff' }, // BIT 的輸出就是 DFF 當下的值
      output: 'dff'
    }
  },
  'DMUX': {
    inputs: ['In', 'Sel'],
    outputs: ['a', 'b'],
    components: [
      { id: 'not', type: 'NOT', x: 50, y: 100, value: 0 },
      { id: 'and_a', type: 'AND', x: 200, y: 50, value: 0 },
      { id: 'and_b', type: 'AND', x: 200, y: 150, value: 0 }
    ],
    wires: [
      // 產生 Sel 的反訊號
      { from: 'Sel', to: 'not', toPin: 'In' },
      
      // 計算 a (In AND Not(Sel))
      { from: 'In', to: 'and_a', toPin: 'A' },
      { from: 'not', to: 'and_a', toPin: 'B' },
      
      // 計算 b (In AND Sel)
      { from: 'In', to: 'and_b', toPin: 'A' },
      { from: 'Sel', to: 'and_b', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'In':  [{id:'and_a',pin:'A'}, {id:'and_b',pin:'A'}],
        'Sel': [{id:'not',pin:'In'}, {id:'and_b',pin:'B'}]
      },
      // 🔴 請仔細檢查這裡：必須明確指向內部元件 ID
      outputs: { 'a': 'and_a', 'b': 'and_b' }
    }
  },

  'REGISTER_4_BIT': {
    inputs: ['In0', 'In1', 'In2', 'In3', 'Load'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      { id: 'b0', type: 'BIT', x: 50, y: 50, value: 0 },
      { id: 'b1', type: 'BIT', x: 50, y: 150, value: 0 },
      { id: 'b2', type: 'BIT', x: 50, y: 250, value: 0 },
      { id: 'b3', type: 'BIT', x: 50, y: 350, value: 0 }
    ],
    wires: [
      // === 共用 Load 訊號 ===
      { from: 'Load', to: 'b0', toPin: 'Load' },
      { from: 'Load', to: 'b1', toPin: 'Load' },
      { from: 'Load', to: 'b2', toPin: 'Load' },
      { from: 'Load', to: 'b3', toPin: 'Load' },
      
      // === 獨立資料輸入 ===
      { from: 'In0', to: 'b0', toPin: 'In' },
      { from: 'In1', to: 'b1', toPin: 'In' },
      { from: 'In2', to: 'b2', toPin: 'In' },
      { from: 'In3', to: 'b3', toPin: 'In' }
    ],
    ioMapping: {
      inputs: {
        'Load': [
          {id:'b0',pin:'Load'}, {id:'b1',pin:'Load'}, 
          {id:'b2',pin:'Load'}, {id:'b3',pin:'Load'}
        ],
        'In0': [{id:'b0',pin:'In'}], 
        'In1': [{id:'b1',pin:'In'}],
        'In2': [{id:'b2',pin:'In'}], 
        'In3': [{id:'b3',pin:'In'}]
      },
      outputs: {
        'Out0': 'b0', 
        'Out1': 'b1', 
        'Out2': 'b2', 
        'Out3': 'b3'
      }
    }
  },

  'RAM_4_4_BIT': {
    inputs: ['In0','In1','In2','In3', 'Load', 'Addr0', 'Addr1'],
    outputs: ['Out0','Out1','Out2','Out3'],
    components: [
      // === 1. 記憶體陣列 ===
      { id: 'r0', type: 'REGISTER_4_BIT', x: 300, y: 50, value: 0 },
      { id: 'r1', type: 'REGISTER_4_BIT', x: 300, y: 200, value: 0 },
      { id: 'r2', type: 'REGISTER_4_BIT', x: 300, y: 350, value: 0 },
      { id: 'r3', type: 'REGISTER_4_BIT', x: 300, y: 500, value: 0 },

      // === 2. Load 分發樹 (DMUX Tree) ===
      // 第一層：根據 Addr1 (高位) 分成 上半部/下半部
      { id: 'dmux_top', type: 'DMUX', x: 50, y: 250, value: 0 },
      // 第二層：根據 Addr0 (低位) 分成 0/1 和 2/3
      { id: 'dmux_01', type: 'DMUX', x: 150, y: 125, value: 0 },
      { id: 'dmux_23', type: 'DMUX', x: 150, y: 400, value: 0 },

      // === 3. 輸出選擇樹 (MUX Tree) ===
      // 第一層：r0 vs r1 (選出上半部結果)
      { id: 'mux_01', type: 'MUX_4_BIT', x: 550, y: 125, value: 0 },
      // 第一層：r2 vs r3 (選出下半部結果)
      { id: 'mux_23', type: 'MUX_4_BIT', x: 550, y: 425, value: 0 },
      // 第二層：上半部 vs 下半部 (最終輸出)
      { id: 'mux_out', type: 'MUX_4_BIT', x: 750, y: 275, value: 0 }
    ],
    wires: [
      // --- Load 分發邏輯 ---
      { from: 'Load', to: 'dmux_top', toPin: 'In' },
      { from: 'Addr1', to: 'dmux_top', toPin: 'Sel' }, // 高位決定上下

      { from: 'dmux_top', fromPin: 'a', to: 'dmux_01', toPin: 'In' }, // 上半部訊號
      { from: 'dmux_top', fromPin: 'b', to: 'dmux_23', toPin: 'In' }, // 下半部訊號
      
      { from: 'Addr0', to: 'dmux_01', toPin: 'Sel' }, // 低位決定奇偶
      { from: 'Addr0', to: 'dmux_23', toPin: 'Sel' },

      // 連接 DMUX 結果到各個 Register 的 Load
      { from: 'dmux_01', fromPin: 'a', to: 'r0', toPin: 'Load' },
      { from: 'dmux_01', fromPin: 'b', to: 'r1', toPin: 'Load' },
      { from: 'dmux_23', fromPin: 'a', to: 'r2', toPin: 'Load' },
      { from: 'dmux_23', fromPin: 'b', to: 'r3', toPin: 'Load' },

      // --- 數據輸入 (廣播) ---
      // 所有的 Register 都接收同樣的 In，但只有 Load=1 的那個會寫入
      { from: 'In0', to: 'r0', toPin: 'In0' }, { from: 'In1', to: 'r0', toPin: 'In1' }, { from: 'In2', to: 'r0', toPin: 'In2' }, { from: 'In3', to: 'r0', toPin: 'In3' },
      { from: 'In0', to: 'r1', toPin: 'In0' }, { from: 'In1', to: 'r1', toPin: 'In1' }, { from: 'In2', to: 'r1', toPin: 'In2' }, { from: 'In3', to: 'r1', toPin: 'In3' },
      { from: 'In0', to: 'r2', toPin: 'In0' }, { from: 'In1', to: 'r2', toPin: 'In1' }, { from: 'In2', to: 'r2', toPin: 'In2' }, { from: 'In3', to: 'r2', toPin: 'In3' },
      { from: 'In0', to: 'r3', toPin: 'In0' }, { from: 'In1', to: 'r3', toPin: 'In1' }, { from: 'In2', to: 'r3', toPin: 'In2' }, { from: 'In3', to: 'r3', toPin: 'In3' },

      // --- 輸出選擇邏輯 ---
      // mux_01: 選擇 r0 或 r1 (Addr0 控制)
      { from: 'Addr0', to: 'mux_01', toPin: 'Sel' },
      { from: 'r0', fromPin: 'Out0', to: 'mux_01', toPin: 'A0' }, { from: 'r0', fromPin: 'Out1', to: 'mux_01', toPin: 'A1' }, { from: 'r0', fromPin: 'Out2', to: 'mux_01', toPin: 'A2' }, { from: 'r0', fromPin: 'Out3', to: 'mux_01', toPin: 'A3' },
      { from: 'r1', fromPin: 'Out0', to: 'mux_01', toPin: 'B0' }, { from: 'r1', fromPin: 'Out1', to: 'mux_01', toPin: 'B1' }, { from: 'r1', fromPin: 'Out2', to: 'mux_01', toPin: 'B2' }, { from: 'r1', fromPin: 'Out3', to: 'mux_01', toPin: 'B3' },

      // mux_23: 選擇 r2 或 r3 (Addr0 控制)
      { from: 'Addr0', to: 'mux_23', toPin: 'Sel' },
      { from: 'r2', fromPin: 'Out0', to: 'mux_23', toPin: 'A0' }, { from: 'r2', fromPin: 'Out1', to: 'mux_23', toPin: 'A1' }, { from: 'r2', fromPin: 'Out2', to: 'mux_23', toPin: 'A2' }, { from: 'r2', fromPin: 'Out3', to: 'mux_23', toPin: 'A3' },
      { from: 'r3', fromPin: 'Out0', to: 'mux_23', toPin: 'B0' }, { from: 'r3', fromPin: 'Out1', to: 'mux_23', toPin: 'B1' }, { from: 'r3', fromPin: 'Out2', to: 'mux_23', toPin: 'B2' }, { from: 'r3', fromPin: 'Out3', to: 'mux_23', toPin: 'B3' },

      // mux_out: 選擇 上半部 或 下半部 (Addr1 控制)
      { from: 'Addr1', to: 'mux_out', toPin: 'Sel' },
      { from: 'mux_01', fromPin: 'Out0', to: 'mux_out', toPin: 'A0' }, { from: 'mux_01', fromPin: 'Out1', to: 'mux_out', toPin: 'A1' }, { from: 'mux_01', fromPin: 'Out2', to: 'mux_out', toPin: 'A2' }, { from: 'mux_01', fromPin: 'Out3', to: 'mux_out', toPin: 'A3' },
      { from: 'mux_23', fromPin: 'Out0', to: 'mux_out', toPin: 'B0' }, { from: 'mux_23', fromPin: 'Out1', to: 'mux_out', toPin: 'B1' }, { from: 'mux_23', fromPin: 'Out2', to: 'mux_out', toPin: 'B2' }, { from: 'mux_23', fromPin: 'Out3', to: 'mux_out', toPin: 'B3' }
    ],
    ioMapping: {
      inputs: {
        'Load':  [{id:'dmux_top', pin:'In'}],
        'Addr0': [{id:'dmux_01', pin:'Sel'}, {id:'dmux_23', pin:'Sel'}, {id:'mux_01', pin:'Sel'}, {id:'mux_23', pin:'Sel'}],
        'Addr1': [{id:'dmux_top', pin:'Sel'}, {id:'mux_out', pin:'Sel'}],
        'In0':   [{id:'r0',pin:'In0'}, {id:'r1',pin:'In0'}, {id:'r2',pin:'In0'}, {id:'r3',pin:'In0'}],
        'In1':   [{id:'r0',pin:'In1'}, {id:'r1',pin:'In1'}, {id:'r2',pin:'In1'}, {id:'r3',pin:'In1'}],
        'In2':   [{id:'r0',pin:'In2'}, {id:'r1',pin:'In2'}, {id:'r2',pin:'In2'}, {id:'r3',pin:'In2'}],
        'In3':   [{id:'r0',pin:'In3'}, {id:'r1',pin:'In3'}, {id:'r2',pin:'In3'}, {id:'r3',pin:'In3'}],
      },
      outputs: {
        'Out0': {id:'mux_out', pin:'Out0'},
        'Out1': {id:'mux_out', pin:'Out1'},
        'Out2': {id:'mux_out', pin:'Out2'},
        'Out3': {id:'mux_out', pin:'Out3'}
      }
    }
  },

    // 💻 4-Bit Program Counter (PC)
  // 邏輯：if(reset) 0; else if(load) in; else if(inc) out+1; else out;
  'PC_4_BIT': {
    inputs: ['In0', 'In1', 'In2', 'In3', 'inc', 'load', 'reset'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      // 1. 核心記憶體 (Register)
      { id: 'reg', type: 'REGISTER_4_BIT', x: 350, y: 150, value: 0 },
      
      // 2. 加法器 (用來計算 +1)
      { id: 'adder', type: 'ADDER_4_BIT', x: 550, y: 50, value: 0 },

      // 3. 用來產生 "1" 的訊號 (Hack: 未連接輸入的 NOT = 1)
      { id: 'const1', type: 'NOT', x: 500, y: 20, value: 0 },

      // 4. 三層 MUX (處理優先級)
      // MuxInc: 選擇 (維持原值) vs (加一值)
      { id: 'mux_inc', type: 'MUX_4_BIT', x: 750, y: 100, value: 0 },
      // MuxLoad: 選擇 (上面結果) vs (外部輸入值)
      { id: 'mux_load', type: 'MUX_4_BIT', x: 900, y: 200, value: 0 },
      // MuxReset: 選擇 (上面結果) vs (0)
      { id: 'mux_reset', type: 'MUX_4_BIT', x: 1050, y: 300, value: 0 }
    ],
    wires: [
      // === 0. 產生常數 1 (給 Adder 和 Register Load 使用) ===
      // const1 沒有輸入 -> 視為 0 -> NOT 後輸出 1
      // PC 的 Register 每個 Tick 都要更新，所以 Load 永遠設為 1
      { from: 'const1', to: 'reg', toPin: 'Load' },
      // Adder 的 B 輸入設為 0001 (只接 B0)
      { from: 'const1', to: 'adder', toPin: 'B0' },

      // === 1. 迴圈起點：從 Register 讀出當前值 ===
      // 送給 Adder 的 A (準備 +1)
      { from: 'reg', fromPin: 'Out0', to: 'adder', toPin: 'A0' },
      { from: 'reg', fromPin: 'Out1', to: 'adder', toPin: 'A1' },
      { from: 'reg', fromPin: 'Out2', to: 'adder', toPin: 'A2' },
      { from: 'reg', fromPin: 'Out3', to: 'adder', toPin: 'A3' },
      // 也要送給 MuxInc 的 A (如果不 Inc，就維持原值)
      { from: 'reg', fromPin: 'Out0', to: 'mux_inc', toPin: 'A0' },
      { from: 'reg', fromPin: 'Out1', to: 'mux_inc', toPin: 'A1' },
      { from: 'reg', fromPin: 'Out2', to: 'mux_inc', toPin: 'A2' },
      { from: 'reg', fromPin: 'Out3', to: 'mux_inc', toPin: 'A3' },

      // === 2. MuxInc (處理 inc 訊號) ===
      { from: 'inc', to: 'mux_inc', toPin: 'Sel' },
      // B 輸入來自 Adder 的結果 (S0..S3)
      { from: 'adder', fromPin: 'S0', to: 'mux_inc', toPin: 'B0' },
      { from: 'adder', fromPin: 'S1', to: 'mux_inc', toPin: 'B1' },
      { from: 'adder', fromPin: 'S2', to: 'mux_inc', toPin: 'B2' },
      { from: 'adder', fromPin: 'S3', to: 'mux_inc', toPin: 'B3' },

      // === 3. MuxLoad (處理 load 訊號) ===
      { from: 'load', to: 'mux_load', toPin: 'Sel' },
      // A 輸入來自上面的 mux_inc
      { from: 'mux_inc', fromPin: 'Out0', to: 'mux_load', toPin: 'A0' },
      { from: 'mux_inc', fromPin: 'Out1', to: 'mux_load', toPin: 'A1' },
      { from: 'mux_inc', fromPin: 'Out2', to: 'mux_load', toPin: 'A2' },
      { from: 'mux_inc', fromPin: 'Out3', to: 'mux_load', toPin: 'A3' },
      // B 輸入來自外部 In (跳轉目標)
      { from: 'In0', to: 'mux_load', toPin: 'B0' },
      { from: 'In1', to: 'mux_load', toPin: 'B1' },
      { from: 'In2', to: 'mux_load', toPin: 'B2' },
      { from: 'In3', to: 'mux_load', toPin: 'B3' },

      // === 4. MuxReset (處理 reset 訊號) ===
      { from: 'reset', to: 'mux_reset', toPin: 'Sel' },
      // A 輸入來自上面的 mux_load
      { from: 'mux_load', fromPin: 'Out0', to: 'mux_reset', toPin: 'A0' },
      { from: 'mux_load', fromPin: 'Out1', to: 'mux_reset', toPin: 'A1' },
      { from: 'mux_load', fromPin: 'Out2', to: 'mux_reset', toPin: 'A2' },
      { from: 'mux_load', fromPin: 'Out3', to: 'mux_reset', toPin: 'A3' },
      // B 輸入懸空 (=0, 重置)

      // === 5. 迴圈終點：寫回 Register ===
      { from: 'mux_reset', fromPin: 'Out0', to: 'reg', toPin: 'In0' },
      { from: 'mux_reset', fromPin: 'Out1', to: 'reg', toPin: 'In1' },
      { from: 'mux_reset', fromPin: 'Out2', to: 'reg', toPin: 'In2' },
      { from: 'mux_reset', fromPin: 'Out3', to: 'reg', toPin: 'In3' }
    ],
    ioMapping: {
      inputs: {
        'inc':   [{id:'mux_inc', pin:'Sel'}],
        'load':  [{id:'mux_load', pin:'Sel'}],
        'reset': [{id:'mux_reset', pin:'Sel'}],
        'In0':   [{id:'mux_load', pin:'B0'}],
        'In1':   [{id:'mux_load', pin:'B1'}],
        'In2':   [{id:'mux_load', pin:'B2'}],
        'In3':   [{id:'mux_load', pin:'B3'}]
      },
      outputs: {
        'Out0': {id:'reg', pin:'Out0'},
        'Out1': {id:'reg', pin:'Out1'},
        'Out2': {id:'reg', pin:'Out2'},
        'Out3': {id:'reg', pin:'Out3'}
      },
      output: 'reg'
    }
  },

  'XOR': {
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    components: [
      { id: 'n1', type: 'OR', x: 50, y: 50, value: 0 },
      { id: 'n2', type: 'NAND', x: 50, y: 150, value: 0 },
      { id: 'n3', type: 'AND', x: 200, y: 100, value: 0 }
    ],
    wires: [
      { from: 'n1', to: 'n3' }, { from: 'n2', to: 'n3' },
      { from: 'A', to: 'n1', toPin: 'A' }, { from: 'A', to: 'n2', toPin: 'A' },
      { from: 'B', to: 'n1', toPin: 'B' }, { from: 'B', to: 'n2', toPin: 'B' }
    ],
    ioMapping: {
      inputs: { 
        'A': [ { id: 'n1', pin: 'A' }, { id: 'n2', pin: 'A' } ], 
        'B': [ { id: 'n1', pin: 'B' }, { id: 'n2', pin: 'B' } ] 
      }, 
      output: 'n3'
    }
  },

  'MUX': {
    inputs: ['A', 'B', 'Sel'],
    outputs: ['OUT'],
    components: [
      { id: 'not1', type: 'NOT', x: 50, y: 150, value: 0 },
      { id: 'and1', type: 'AND', x: 200, y: 50, value: 0 },
      { id: 'and2', type: 'AND', x: 200, y: 200, value: 0 },
      { id: 'or1',  type: 'OR',  x: 350, y: 125, value: 0 }
    ],
    wires: [
      { from: 'Sel', to: 'not1', toPin: 'In' }, 
      { from: 'not1', to: 'and1', toPin: 'B' }, 
      { from: 'Sel', to: 'and2', toPin: 'B' },
      { from: 'A', to: 'and1', toPin: 'A' },
      { from: 'B', to: 'and2', toPin: 'A' },
      { from: 'and1', to: 'or1', toPin: 'A' },
      { from: 'and2', to: 'or1', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'A':   [{ id: 'and1', pin: 'A' }],
        'B':   [{ id: 'and2', pin: 'A' }],
        'Sel': [{ id: 'not1', pin: 'In' }, { id: 'and2', pin: 'B' }]
      },
      output: 'or1'
    }
  },

  'MUX_4_BIT': {
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Sel'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      { id: 'm0', type: 'MUX', x: 50, y: 50, value: 0 },
      { id: 'm1', type: 'MUX', x: 50, y: 150, value: 0 },
      { id: 'm2', type: 'MUX', x: 50, y: 250, value: 0 },
      { id: 'm3', type: 'MUX', x: 50, y: 350, value: 0 }
    ],
    wires: [
      { from: 'Sel', to: 'm0', toPin: 'Sel' }, { from: 'Sel', to: 'm1', toPin: 'Sel' },
      { from: 'Sel', to: 'm2', toPin: 'Sel' }, { from: 'Sel', to: 'm3', toPin: 'Sel' },
      { from: 'A0', to: 'm0', toPin: 'A' }, { from: 'B0', to: 'm0', toPin: 'B' },
      { from: 'A1', to: 'm1', toPin: 'A' }, { from: 'B1', to: 'm1', toPin: 'B' },
      { from: 'A2', to: 'm2', toPin: 'A' }, { from: 'B2', to: 'm2', toPin: 'B' },
      { from: 'A3', to: 'm3', toPin: 'A' }, { from: 'B3', to: 'm3', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'Sel': [{id:'m0',pin:'Sel'}, {id:'m1',pin:'Sel'}, {id:'m2',pin:'Sel'}, {id:'m3',pin:'Sel'}],
        'A0': [{id:'m0',pin:'A'}], 'B0': [{id:'m0',pin:'B'}],
        'A1': [{id:'m1',pin:'A'}], 'B1': [{id:'m1',pin:'B'}],
        'A2': [{id:'m2',pin:'A'}], 'B2': [{id:'m2',pin:'B'}],
        'A3': [{id:'m3',pin:'A'}], 'B3': [{id:'m3',pin:'B'}]
      },
      outputs: { 'Out0': 'm0', 'Out1': 'm1', 'Out2': 'm2', 'Out3': 'm3' }
    }
  },

  'NOT_4_BIT': {
    inputs: ['In0', 'In1', 'In2', 'In3'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      { id: 'n0', type: 'NOT', x: 50, y: 50, value: 0 },
      { id: 'n1', type: 'NOT', x: 50, y: 150, value: 0 },
      { id: 'n2', type: 'NOT', x: 50, y: 250, value: 0 },
      { id: 'n3', type: 'NOT', x: 50, y: 350, value: 0 }
    ],
    wires: [
      { from: 'In0', to: 'n0', toPin: 'In' }, { from: 'In1', to: 'n1', toPin: 'In' },
      { from: 'In2', to: 'n2', toPin: 'In' }, { from: 'In3', to: 'n3', toPin: 'In' }
    ],
    ioMapping: {
      inputs: {
        'In0': [{id:'n0',pin:'In'}], 'In1': [{id:'n1',pin:'In'}],
        'In2': [{id:'n2',pin:'In'}], 'In3': [{id:'n3',pin:'In'}]
      },
      outputs: { 'Out0': 'n0', 'Out1': 'n1', 'Out2': 'n2', 'Out3': 'n3' }
    }
  },

  'AND_4_BIT': {
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      { id: 'a0', type: 'AND', x: 50, y: 50, value: 0 },
      { id: 'a1', type: 'AND', x: 50, y: 150, value: 0 },
      { id: 'a2', type: 'AND', x: 50, y: 250, value: 0 },
      { id: 'a3', type: 'AND', x: 50, y: 350, value: 0 }
    ],
    wires: [
      { from: 'A0', to: 'a0', toPin: 'A' }, { from: 'B0', to: 'a0', toPin: 'B' },
      { from: 'A1', to: 'a1', toPin: 'A' }, { from: 'B1', to: 'a1', toPin: 'B' },
      { from: 'A2', to: 'a2', toPin: 'A' }, { from: 'B2', to: 'a2', toPin: 'B' },
      { from: 'A3', to: 'a3', toPin: 'A' }, { from: 'B3', to: 'a3', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'A0': [{id:'a0',pin:'A'}], 'B0': [{id:'a0',pin:'B'}],
        'A1': [{id:'a1',pin:'A'}], 'B1': [{id:'a1',pin:'B'}],
        'A2': [{id:'a2',pin:'A'}], 'B2': [{id:'a2',pin:'B'}],
        'A3': [{id:'a3',pin:'A'}], 'B3': [{id:'a3',pin:'B'}]
      },
      outputs: { 'Out0': 'a0', 'Out1': 'a1', 'Out2': 'a2', 'Out3': 'a3' }
    }
  },

  // 輔助：4輸入 OR 閘 (用來計算 zr flag)
  // Out = In0 | In1 | In2 | In3
  'OR_4WAY': {
    inputs: ['In0', 'In1', 'In2', 'In3'],
    outputs: ['Out'],
    components: [
      { id: 'or1', type: 'OR', x: 50, y: 50, value: 0 },
      { id: 'or2', type: 'OR', x: 50, y: 150, value: 0 },
      { id: 'or3', type: 'OR', x: 200, y: 100, value: 0 }
    ],
    wires: [
      { from: 'In0', to: 'or1', toPin: 'A' }, { from: 'In1', to: 'or1', toPin: 'B' },
      { from: 'In2', to: 'or2', toPin: 'A' }, { from: 'In3', to: 'or2', toPin: 'B' },
      { from: 'or1', to: 'or3', toPin: 'A' }, { from: 'or2', to: 'or3', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'In0': [{id:'or1', pin:'A'}], 'In1': [{id:'or1', pin:'B'}],
        'In2': [{id:'or2', pin:'A'}], 'In3': [{id:'or2', pin:'B'}]
      },
      output: 'or3'
    }
  },

  'HALF_ADDER': {
    inputs: ['A', 'B'],
    ioMapping: {
      inputs: { 
        'A': [ { id: 'xor0', pin: 'A' }, { id: 'and0', pin: 'A' } ], 
        'B': [ { id: 'xor0', pin: 'B' }, { id: 'and0', pin: 'B' } ] 
      },
      output: 'xor0', 
      outputs: { 'SUM': 'xor0', 'CARRY': 'and0' }
    },
    components: [
      { id: 'xor0', type: 'XOR', x: 200, y: 50, value: 0 },
      { id: 'and0', type: 'AND', x: 200, y: 200, value: 0 }
    ],
    wires: [
      { from: 'A', to: 'xor0', toPin: 'A' }, { from: 'A', to: 'and0', toPin: 'A' },
      { from: 'B', to: 'xor0', toPin: 'B' }, { from: 'B', to: 'and0', toPin: 'B' }
    ]
  },

  'FULL_ADDER': {
    inputs: ['A', 'B', 'Cin'],
    outputs: ['SUM', 'Cout'],
    components: [
      { id: 'ha1', type: 'HALF_ADDER', x: 50, y: 50, value: 0 },
      { id: 'ha2', type: 'HALF_ADDER', x: 400, y: 50, value: 0 },
      { id: 'or1', type: 'OR', x: 400, y: 250, value: 0 }
    ],
    wires: [
      { from: 'ha1', fromPin: 'SUM', to: 'ha2', toPin: 'A' },
      { from: 'ha1', fromPin: 'CARRY', to: 'or1' },
      { from: 'ha2', fromPin: 'CARRY', to: 'or1' },
      { from: 'A', to: 'ha1', toPin: 'A' },
      { from: 'B', to: 'ha1', toPin: 'B' },
      { from: 'Cin', to: 'ha2', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'A': [ { id: 'ha1', pin: 'A' } ], 
        'B': [ { id: 'ha1', pin: 'B' } ],
        'Cin': [ { id: 'ha2', pin: 'B' } ] 
      },
      output: 'ha2', 
      outputs: { 'SUM': 'ha2', 'Cout': 'or1' }
    }
  },

  'ADDER_4_BIT': {
    inputs: ['A0', 'B0', 'A1', 'B1', 'A2', 'B2', 'A3', 'B3'], 
    outputs: ['S0', 'S1', 'S2', 'S3', 'Cout'],
    components: [
      { id: 'fa0', type: 'FULL_ADDER', x: 50, y: 50, value: 0 },
      { id: 'fa1', type: 'FULL_ADDER', x: 350, y: 50, value: 0 },
      { id: 'fa2', type: 'FULL_ADDER', x: 650, y: 50, value: 0 },
      { id: 'fa3', type: 'FULL_ADDER', x: 950, y: 50, value: 0 }
    ],
    wires: [
      { from: 'fa0', fromPin: 'Cout', to: 'fa1', toPin: 'Cin' },
      { from: 'fa1', fromPin: 'Cout', to: 'fa2', toPin: 'Cin' },
      { from: 'fa2', fromPin: 'Cout', to: 'fa3', toPin: 'Cin' },
      { from: 'A0', to: 'fa0', toPin: 'A' }, { from: 'B0', to: 'fa0', toPin: 'B' },
      { from: 'A1', to: 'fa1', toPin: 'A' }, { from: 'B1', to: 'fa1', toPin: 'B' },
      { from: 'A2', to: 'fa2', toPin: 'A' }, { from: 'B2', to: 'fa2', toPin: 'B' },
      { from: 'A3', to: 'fa3', toPin: 'A' }, { from: 'B3', to: 'fa3', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'A0': [{id:'fa0',pin:'A'}], 'B0': [{id:'fa0',pin:'B'}],
        'A1': [{id:'fa1',pin:'A'}], 'B1': [{id:'fa1',pin:'B'}],
        'A2': [{id:'fa2',pin:'A'}], 'B2': [{id:'fa2',pin:'B'}],
        'A3': [{id:'fa3',pin:'A'}], 'B3': [{id:'fa3',pin:'B'}],
      },
      output: 'fa3',
      outputs: { 
        'S0': 'fa0', 'S1': 'fa1', 'S2': 'fa2', 
        'S3': { id: 'fa3', pin: 'SUM' }, 
        'Cout': { id: 'fa3', pin: 'Cout' } 
      }
    }
  },

  'ALU_4_BIT': {
    inputs: [
      'X0','X1','X2','X3', 
      'Y0','Y1','Y2','Y3',
      'zx', 'nx', 'zy', 'ny', 'f', 'no'
    ],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    
    components: [
      { id: 'mux_zx', type: 'MUX_4_BIT', x: 50, y: 50, value: 0 }, 
      { id: 'not_nx', type: 'NOT_4_BIT', x: 200, y: 50, value: 0 },
      { id: 'mux_nx', type: 'MUX_4_BIT', x: 350, y: 50, value: 0 },
      { id: 'mux_zy', type: 'MUX_4_BIT', x: 50, y: 350, value: 0 },
      { id: 'not_ny', type: 'NOT_4_BIT', x: 200, y: 350, value: 0 },
      { id: 'mux_ny', type: 'MUX_4_BIT', x: 350, y: 350, value: 0 },
      { id: 'alu_and', type: 'AND_4_BIT',   x: 600, y: 100, value: 0 },
      { id: 'alu_add', type: 'ADDER_4_BIT', x: 600, y: 300, value: 0 },
      { id: 'mux_f',   type: 'MUX_4_BIT',   x: 800, y: 200, value: 0 },
      { id: 'not_no', type: 'NOT_4_BIT', x: 950, y: 100, value: 0 },
      { id: 'mux_no', type: 'MUX_4_BIT', x: 1100, y: 200, value: 0 }
    ],

    wires: [
      { from: 'zx', to: 'mux_zx', toPin: 'Sel' },
      { from: 'X0', to: 'mux_zx', toPin: 'A0' }, { from: 'X1', to: 'mux_zx', toPin: 'A1' },
      { from: 'X2', to: 'mux_zx', toPin: 'A2' }, { from: 'X3', to: 'mux_zx', toPin: 'A3' },
      { from: 'mux_zx', fromPin:'Out0', to:'not_nx', toPin:'In0' }, { from: 'mux_zx', fromPin:'Out1', to:'not_nx', toPin:'In1' },
      { from: 'mux_zx', fromPin:'Out2', to:'not_nx', toPin:'In2' }, { from: 'mux_zx', fromPin:'Out3', to:'not_nx', toPin:'In3' },
      { from: 'nx', to: 'mux_nx', toPin: 'Sel' },
      { from: 'mux_zx', fromPin:'Out0', to:'mux_nx', toPin:'A0' }, { from: 'not_nx', fromPin:'Out0', to:'mux_nx', toPin:'B0' },
      { from: 'mux_zx', fromPin:'Out1', to:'mux_nx', toPin:'A1' }, { from: 'not_nx', fromPin:'Out1', to:'mux_nx', toPin:'B1' },
      { from: 'mux_zx', fromPin:'Out2', to:'mux_nx', toPin:'A2' }, { from: 'not_nx', fromPin:'Out2', to:'mux_nx', toPin:'B2' },
      { from: 'mux_zx', fromPin:'Out3', to:'mux_nx', toPin:'A3' }, { from: 'not_nx', fromPin:'Out3', to:'mux_nx', toPin:'B3' },
      { from: 'zy', to: 'mux_zy', toPin: 'Sel' },
      { from: 'Y0', to: 'mux_zy', toPin: 'A0' }, { from: 'Y1', to: 'mux_zy', toPin: 'A1' },
      { from: 'Y2', to: 'mux_zy', toPin: 'A2' }, { from: 'Y3', to: 'mux_zy', toPin: 'A3' },
      { from: 'mux_zy', fromPin:'Out0', to:'not_ny', toPin:'In0' }, { from: 'mux_zy', fromPin:'Out1', to:'not_ny', toPin:'In1' },
      { from: 'mux_zy', fromPin:'Out2', to:'not_ny', toPin:'In2' }, { from: 'mux_zy', fromPin:'Out3', to:'not_ny', toPin:'In3' },
      { from: 'ny', to: 'mux_ny', toPin: 'Sel' },
      { from: 'mux_zy', fromPin:'Out0', to:'mux_ny', toPin:'A0' }, { from: 'not_ny', fromPin:'Out0', to:'mux_ny', toPin:'B0' },
      { from: 'mux_zy', fromPin:'Out1', to:'mux_ny', toPin:'A1' }, { from: 'not_ny', fromPin:'Out1', to:'mux_ny', toPin:'B1' },
      { from: 'mux_zy', fromPin:'Out2', to:'mux_ny', toPin:'A2' }, { from: 'not_ny', fromPin:'Out2', to:'mux_ny', toPin:'B2' },
      { from: 'mux_zy', fromPin:'Out3', to:'mux_ny', toPin:'A3' }, { from: 'not_ny', fromPin:'Out3', to:'mux_ny', toPin:'B3' },
      { from: 'mux_nx', fromPin:'Out0', to:'alu_and', toPin:'A0' }, { from: 'mux_ny', fromPin:'Out0', to:'alu_and', toPin:'B0' },
      { from: 'mux_nx', fromPin:'Out1', to:'alu_and', toPin:'A1' }, { from: 'mux_ny', fromPin:'Out1', to:'alu_and', toPin:'B1' },
      { from: 'mux_nx', fromPin:'Out2', to:'alu_and', toPin:'A2' }, { from: 'mux_ny', fromPin:'Out2', to:'alu_and', toPin:'B2' },
      { from: 'mux_nx', fromPin:'Out3', to:'alu_and', toPin:'A3' }, { from: 'mux_ny', fromPin:'Out3', to:'alu_and', toPin:'B3' },
      { from: 'mux_nx', fromPin:'Out0', to:'alu_add', toPin:'A0' }, { from: 'mux_ny', fromPin:'Out0', to:'alu_add', toPin:'B0' },
      { from: 'mux_nx', fromPin:'Out1', to:'alu_add', toPin:'A1' }, { from: 'mux_ny', fromPin:'Out1', to:'alu_add', toPin:'B1' },
      { from: 'mux_nx', fromPin:'Out2', to:'alu_add', toPin:'A2' }, { from: 'mux_ny', fromPin:'Out2', to:'alu_add', toPin:'B2' },
      { from: 'mux_nx', fromPin:'Out3', to:'alu_add', toPin:'A3' }, { from: 'mux_ny', fromPin:'Out3', to:'alu_add', toPin:'B3' },
      { from: 'f', to: 'mux_f', toPin: 'Sel' },
      { from: 'alu_and', fromPin:'Out0', to:'mux_f', toPin:'A0' }, { from: 'alu_add', fromPin:'S0', to:'mux_f', toPin:'B0' },
      { from: 'alu_and', fromPin:'Out1', to:'mux_f', toPin:'A1' }, { from: 'alu_add', fromPin:'S1', to:'mux_f', toPin:'B1' },
      { from: 'alu_and', fromPin:'Out2', to:'mux_f', toPin:'A2' }, { from: 'alu_add', fromPin:'S2', to:'mux_f', toPin:'B2' },
      { from: 'alu_and', fromPin:'Out3', to:'mux_f', toPin:'A3' }, { from: 'alu_add', fromPin:'S3', to:'mux_f', toPin:'B3' },
      { from: 'mux_f', fromPin:'Out0', to:'not_no', toPin:'In0' },
      { from: 'mux_f', fromPin:'Out1', to:'not_no', toPin:'In1' },
      { from: 'mux_f', fromPin:'Out2', to:'not_no', toPin:'In2' },
      { from: 'mux_f', fromPin:'Out3', to:'not_no', toPin:'In3' },
      { from: 'no', to: 'mux_no', toPin: 'Sel' },
      { from: 'mux_f', fromPin:'Out0', to:'mux_no', toPin:'A0' }, { from: 'not_no', fromPin:'Out0', to:'mux_no', toPin:'B0' },
      { from: 'mux_f', fromPin:'Out1', to:'mux_no', toPin:'A1' }, { from: 'not_no', fromPin:'Out1', to:'mux_no', toPin:'B1' },
      { from: 'mux_f', fromPin:'Out2', to:'mux_no', toPin:'A2' }, { from: 'not_no', fromPin:'Out2', to:'mux_no', toPin:'B2' },
      { from: 'mux_f', fromPin:'Out3', to:'mux_no', toPin:'A3' }, { from: 'not_no', fromPin:'Out3', to:'mux_no', toPin:'B3' }
    ],
    ioMapping: {
      inputs: {
        'zx': [{id:'mux_zx', pin:'Sel'}],
        'nx': [{id:'mux_nx', pin:'Sel'}],
        'zy': [{id:'mux_zy', pin:'Sel'}],
        'ny': [{id:'mux_ny', pin:'Sel'}],
        'f':  [{id:'mux_f', pin:'Sel'}],
        'no': [{id:'mux_no', pin:'Sel'}],
        'X0': [{id:'mux_zx',pin:'A0'}], 'X1': [{id:'mux_zx',pin:'A1'}],
        'X2': [{id:'mux_zx',pin:'A2'}], 'X3': [{id:'mux_zx',pin:'A3'}],
        'Y0': [{id:'mux_zy',pin:'A0'}], 'Y1': [{id:'mux_zy',pin:'A1'}],
        'Y2': [{id:'mux_zy',pin:'A2'}], 'Y3': [{id:'mux_zy',pin:'A3'}]
      },
      outputs: {
        'Out0': {id:'mux_no', pin:'Out0'},
        'Out1': {id:'mux_no', pin:'Out1'},
        'Out2': {id:'mux_no', pin:'Out2'},
        'Out3': {id:'mux_no', pin:'Out3'}
      }
    }
  },

  'CPU_4_BIT': {
    // 輸入：記憶體值(inM), 指令數值(Instr), 控制位元(Op, a, c..., d..., j...), 重置
    inputs: [
      'inM0','inM1','inM2','inM3', 
      'Instr0','Instr1','Instr2','Instr3',
      'Op', 'a', 
      'c1','c2','c3','c4','c5','c6', 
      'd1','d2','d3', 
      'j1','j2','j3', 
      'reset'
    ],
    // 輸出：寫入M(outM), 寫入使能(writeM), 地址(addressM), PC值
    outputs: ['outM0','outM1','outM2','outM3', 'writeM', 'addr0','addr1','addr2','addr3', 'pc0','pc1','pc2','pc3'],
    
    components: [
      // === 1. A-Register 相關 ===
      // Mux1: 選擇 A指令數值 還是 ALU計算結果 (Op=0選Instr, Op=1選ALU)
      // 注意：Hack標準是 Op=0(A-instr) 選 Instr。這裡我們簡化：Op=0 直接載入 Instr
      { id: 'mux_a', type: 'MUX_4_BIT', x: 50, y: 100, value: 0 },
      // NotOp: 用於 A-Reg Load 邏輯 (Op=0 OR (Op=1 AND d1))
      { id: 'not_op', type: 'NOT', x: 50, y: 20, value: 0 },
      { id: 'and_load_a', type: 'AND', x: 200, y: 20, value: 0 }, // Op & d1
      { id: 'or_load_a', type: 'OR', x: 300, y: 50, value: 0 },   // !Op | (Op&d1)
      // A Register
      { id: 'reg_a', type: 'REGISTER_4_BIT', x: 400, y: 100, value: 0 },

      // === 2. D-Register 相關 ===
      { id: 'and_load_d', type: 'AND', x: 400, y: 300, value: 0 }, // Op & d2
      { id: 'reg_d', type: 'REGISTER_4_BIT', x: 550, y: 300, value: 0 },

      // === 3. ALU 輸入選擇 (A vs M) ===
      { id: 'mux_am', type: 'MUX_4_BIT', x: 600, y: 150, value: 0 }, // 選 A 或 M

      // === 4. ALU ===
      { id: 'alu', type: 'ALU_4_BIT', x: 800, y: 200, value: 0 },

      // === 5. WriteM 控制 ===
      { id: 'and_write_m', type: 'AND', x: 950, y: 350, value: 0 }, // Op & d3

      // === 6. Jump (PC Load) 邏輯 ===
      // 計算 zr (Zero Flag): 4-way OR 然後 NOT
      { id: 'or_zr', type: 'OR_4WAY', x: 950, y: 450, value: 0 },
      { id: 'not_zr', type: 'NOT', x: 1050, y: 450, value: 0 }, // zr flag
      
      // 計算 ng (Negative Flag): 直接取 ALU 輸出的最高位 (Out3)
      // 這裡直接連線，不需要元件

      // JEQ: j2 & zr
      { id: 'and_jeq', type: 'AND', x: 1150, y: 400, value: 0 },
      // JLT: j1 & ng
      { id: 'and_jlt', type: 'AND', x: 1150, y: 500, value: 0 },
      
      // JGT: j3 & !ng & !zr
      { id: 'not_ng', type: 'NOT', x: 1050, y: 550, value: 0 },
      { id: 'and_pos', type: 'AND', x: 1150, y: 600, value: 0 }, // !ng & !zr
      { id: 'and_jgt', type: 'AND', x: 1250, y: 600, value: 0 }, // j3 & isPos

      // 匯總 Jump: JEQ | JLT | JGT
      { id: 'or_j1', type: 'OR', x: 1300, y: 450, value: 0 },
      { id: 'or_j2', type: 'OR', x: 1400, y: 500, value: 0 }, // Jump Condition Met
      
      // 最終 Load PC: (Jump Met) AND (Op=1)
      { id: 'and_pc_load', type: 'AND', x: 1500, y: 450, value: 0 },

      // === 7. PC ===
      { id: 'pc', type: 'PC_4_BIT', x: 1400, y: 100, value: 0 }
    ],
    wires: [
      // --- A-Reg Control ---
      { from: 'Op', to: 'mux_a', toPin: 'Sel' },
      { from: 'Instr0', to: 'mux_a', toPin: 'A0' }, { from: 'Instr1', to: 'mux_a', toPin: 'A1' }, { from: 'Instr2', to: 'mux_a', toPin: 'A2' }, { from: 'Instr3', to: 'mux_a', toPin: 'A3' },
      // ALU feedback 連線稍後接

      { from: 'Op', to: 'not_op', toPin: 'In' },
      { from: 'Op', to: 'and_load_a', toPin: 'A' }, { from: 'd1', to: 'and_load_a', toPin: 'B' },
      { from: 'not_op', to: 'or_load_a', toPin: 'A' }, { from: 'and_load_a', to: 'or_load_a', toPin: 'B' },
      { from: 'or_load_a', to: 'reg_a', toPin: 'Load' },
      { from: 'mux_a', fromPin: 'Out0', to: 'reg_a', toPin: 'In0' }, { from: 'mux_a', fromPin: 'Out1', to: 'reg_a', toPin: 'In1' }, { from: 'mux_a', fromPin: 'Out2', to: 'reg_a', toPin: 'In2' }, { from: 'mux_a', fromPin: 'Out3', to: 'reg_a', toPin: 'In3' },

      // --- D-Reg Control ---
      { from: 'Op', to: 'and_load_d', toPin: 'A' }, { from: 'd2', to: 'and_load_d', toPin: 'B' },
      { from: 'and_load_d', to: 'reg_d', toPin: 'Load' },
      // ALU feedback 連線稍後接

      // --- ALU Inputs ---
      // X = D Register
      { from: 'reg_d', fromPin: 'Out0', to: 'alu', toPin: 'X0' }, { from: 'reg_d', fromPin: 'Out1', to: 'alu', toPin: 'X1' }, { from: 'reg_d', fromPin: 'Out2', to: 'alu', toPin: 'X2' }, { from: 'reg_d', fromPin: 'Out3', to: 'alu', toPin: 'X3' },
      
      // Y = Mux(A, M)
      { from: 'a', to: 'mux_am', toPin: 'Sel' }, // 'a' bit selects
      { from: 'reg_a', fromPin: 'Out0', to: 'mux_am', toPin: 'A0' }, { from: 'reg_a', fromPin: 'Out1', to: 'mux_am', toPin: 'A1' }, { from: 'reg_a', fromPin: 'Out2', to: 'mux_am', toPin: 'A2' }, { from: 'reg_a', fromPin: 'Out3', to: 'mux_am', toPin: 'A3' },
      { from: 'inM0', to: 'mux_am', toPin: 'B0' }, { from: 'inM1', to: 'mux_am', toPin: 'B1' }, { from: 'inM2', to: 'mux_am', toPin: 'B2' }, { from: 'inM3', to: 'mux_am', toPin: 'B3' },
      
      { from: 'mux_am', fromPin: 'Out0', to: 'alu', toPin: 'Y0' }, { from: 'mux_am', fromPin: 'Out1', to: 'alu', toPin: 'Y1' }, { from: 'mux_am', fromPin: 'Out2', to: 'alu', toPin: 'Y2' }, { from: 'mux_am', fromPin: 'Out3', to: 'alu', toPin: 'Y3' },

      // ALU Control Bits
      { from: 'c1', to: 'alu', toPin: 'zx' }, { from: 'c2', to: 'alu', toPin: 'nx' },
      { from: 'c3', to: 'alu', toPin: 'zy' }, { from: 'c4', to: 'alu', toPin: 'ny' },
      { from: 'c5', to: 'alu', toPin: 'f' },  { from: 'c6', to: 'alu', toPin: 'no' },

      // --- ALU Output Feedback (這就是為什麼要有 MUX) ---
      // 回到 A-Reg Mux
      { from: 'alu', fromPin: 'Out0', to: 'mux_a', toPin: 'B0' }, { from: 'alu', fromPin: 'Out1', to: 'mux_a', toPin: 'B1' }, { from: 'alu', fromPin: 'Out2', to: 'mux_a', toPin: 'B2' }, { from: 'alu', fromPin: 'Out3', to: 'mux_a', toPin: 'B3' },
      // 回到 D-Reg
      { from: 'alu', fromPin: 'Out0', to: 'reg_d', toPin: 'In0' }, { from: 'alu', fromPin: 'Out1', to: 'reg_d', toPin: 'In1' }, { from: 'alu', fromPin: 'Out2', to: 'reg_d', toPin: 'In2' }, { from: 'alu', fromPin: 'Out3', to: 'reg_d', toPin: 'In3' },

      // --- WriteM Control ---
      { from: 'Op', to: 'and_write_m', toPin: 'A' }, { from: 'd3', to: 'and_write_m', toPin: 'B' },

      // --- Jump Logic ---
      // zr
      { from: 'alu', fromPin: 'Out0', to: 'or_zr', toPin: 'In0' }, { from: 'alu', fromPin: 'Out1', to: 'or_zr', toPin: 'In1' }, { from: 'alu', fromPin: 'Out2', to: 'or_zr', toPin: 'In2' }, { from: 'alu', fromPin: 'Out3', to: 'or_zr', toPin: 'In3' },
      { from: 'or_zr', to: 'not_zr', toPin: 'In' },
      
      // ng (Out3 is MSB)
      // JEQ
      { from: 'not_zr', to: 'and_jeq', toPin: 'A' }, { from: 'j2', to: 'and_jeq', toPin: 'B' },
      // JLT (using Out3 as ng)
      { from: 'alu', fromPin: 'Out3', to: 'and_jlt', toPin: 'A' }, { from: 'j1', to: 'and_jlt', toPin: 'B' },
      // JGT
      { from: 'not_zr', to: 'and_pos', toPin: 'A' }, { from: 'not_ng', to: 'and_pos', toPin: 'B' }, // !zr & !ng
      { from: 'alu', fromPin: 'Out3', to: 'not_ng', toPin: 'In' }, // generate !ng
      { from: 'j3', to: 'and_jgt', toPin: 'A' }, { from: 'and_pos', to: 'and_jgt', toPin: 'B' },

      // Combine Jumps
      { from: 'and_jeq', to: 'or_j1', toPin: 'A' }, { from: 'and_jlt', to: 'or_j1', toPin: 'B' },
      { from: 'or_j1', to: 'or_j2', toPin: 'A' }, { from: 'and_jgt', to: 'or_j2', toPin: 'B' },
      
      // Final Load PC check
      { from: 'or_j2', to: 'and_pc_load', toPin: 'A' }, { from: 'Op', to: 'and_pc_load', toPin: 'B' },

      // --- PC Control ---
      { from: 'and_pc_load', to: 'pc', toPin: 'load' },
      { from: 'reset', to: 'pc', toPin: 'reset' },
      // PC inc 恆為 1 (Hack 架構：如果不 Load 不 Reset，就是 Inc)
      // 這裡我們把 inc 接到一個 NOT(0) 或者乾脆利用 PC 內部的 MUX 邏輯。
      // PC 的定義是: if reset=0, load=0, inc=1 then Out++.
      // 我們需要把 inc 接腳接上恆為 1 的訊號。
      // 簡單解法：用 reset 的 NOT 訊號再 OR reset... 或者直接用一個 NOT(const 0 from registry default)
      // Hack CPU 中 PC 的 inc 其實是常時開啟的，只要 load 和 reset 沒搶贏它。
      // 我們這裡假設 PC 內部的 mux_inc 預設需要 inc=1。
      // 借用 not_op (如果 Op=0/1 它是變動的)，我們需要一個穩定的 1。
      // 💡 技巧：利用 not_zr 的輸入 (or_zr 的輸出) 雖然會變，但我們可以加一個 Dedicated CONST_1 if needed.
      // 暫時解法：假設使用者在外部測試時把 inc 設為 1，或者我們在這裡加一個 NOT(GND)。
      // 為了方便，我們加一個 const_1 元件在 CPU 內。
    ],
    ioMapping: {
      inputs: {
        'Op': [{id:'mux_a',pin:'Sel'}, {id:'not_op',pin:'In'}, {id:'and_load_a',pin:'A'}, {id:'and_load_d',pin:'A'}, {id:'and_write_m',pin:'A'}, {id:'and_pc_load',pin:'B'}],
        'Instr0': [{id:'mux_a',pin:'A0'}], 'Instr1': [{id:'mux_a',pin:'A1'}], 'Instr2': [{id:'mux_a',pin:'A2'}], 'Instr3': [{id:'mux_a',pin:'A3'}],
        'inM0': [{id:'mux_am',pin:'B0'}], 'inM1': [{id:'mux_am',pin:'B1'}], 'inM2': [{id:'mux_am',pin:'B2'}], 'inM3': [{id:'mux_am',pin:'B3'}],
        'a': [{id:'mux_am',pin:'Sel'}],
        'c1':[{id:'alu',pin:'zx'}], 'c2':[{id:'alu',pin:'nx'}], 'c3':[{id:'alu',pin:'zy'}], 'c4':[{id:'alu',pin:'ny'}], 'c5':[{id:'alu',pin:'f'}], 'c6':[{id:'alu',pin:'no'}],
        'd1':[{id:'and_load_a',pin:'B'}], 'd2':[{id:'and_load_d',pin:'B'}], 'd3':[{id:'and_write_m',pin:'B'}],
        'j1':[{id:'and_jlt',pin:'B'}], 'j2':[{id:'and_jeq',pin:'B'}], 'j3':[{id:'and_jgt',pin:'A'}],
        'reset': [{id:'pc',pin:'reset'}]
      },
      outputs: {
        'outM0': {id:'alu',pin:'Out0'}, 'outM1': {id:'alu',pin:'Out1'}, 'outM2': {id:'alu',pin:'Out2'}, 'outM3': {id:'alu',pin:'Out3'},
        'writeM': 'and_write_m',
        'addr0': {id:'reg_a',pin:'Out0'}, 'addr1': {id:'reg_a',pin:'Out1'}, 'addr2': {id:'reg_a',pin:'Out2'}, 'addr3': {id:'reg_a',pin:'Out3'},
        'pc0': {id:'pc',pin:'Out0'}, 'pc1': {id:'pc',pin:'Out1'}, 'pc2': {id:'pc',pin:'Out2'}, 'pc3': {id:'pc',pin:'Out3'}
      }
    }
  },

  // 🖥️ The Hack Computer (4-bit)
  'COMPUTER_4_BIT': {
    // 輸入：指令 (模擬 ROM), Reset
    inputs: [
      'Instr0','Instr1','Instr2','Instr3',
      'Op', 'a', 
      'c1','c2','c3','c4','c5','c6', 
      'd1','d2','d3', 
      'j1','j2','j3', 
      'reset'
    ],
    // 輸出：為了觀察，我們把 PC 和 記憶體寫入狀態 拉出來看
    outputs: ['PC0','PC1','PC2','PC3', 'WriteLight'],
    
    components: [
      // 1. 核心 CPU
      { id: 'cpu', type: 'CPU_4_BIT', x: 100, y: 100, value: 0 },
      
      // 2. 主記憶體 RAM (4x4)
      { id: 'ram', type: 'RAM_4_4_BIT', x: 600, y: 100, value: 0 }
    ],
    
    wires: [
      // === 1. 指令流 (ROM -> CPU) ===
      // 直接從外部輸入連到 CPU (由你扮演 ROM)
      { from: 'Op', to: 'cpu', toPin: 'Op' },
      { from: 'Instr0', to: 'cpu', toPin: 'Instr0' }, { from: 'Instr1', to: 'cpu', toPin: 'Instr1' }, { from: 'Instr2', to: 'cpu', toPin: 'Instr2' }, { from: 'Instr3', to: 'cpu', toPin: 'Instr3' },
      { from: 'a', to: 'cpu', toPin: 'a' },
      { from: 'c1', to: 'cpu', toPin: 'c1' }, { from: 'c2', to: 'cpu', toPin: 'c2' }, { from: 'c3', to: 'cpu', toPin: 'c3' }, { from: 'c4', to: 'cpu', toPin: 'c4' }, { from: 'c5', to: 'cpu', toPin: 'c5' }, { from: 'c6', to: 'cpu', toPin: 'c6' },
      { from: 'd1', to: 'cpu', toPin: 'd1' }, { from: 'd2', to: 'cpu', toPin: 'd2' }, { from: 'd3', to: 'cpu', toPin: 'd3' },
      { from: 'j1', to: 'cpu', toPin: 'j1' }, { from: 'j2', to: 'cpu', toPin: 'j2' }, { from: 'j3', to: 'cpu', toPin: 'j3' },
      { from: 'reset', to: 'cpu', toPin: 'reset' },

      // === 2. 數據流 (CPU -> RAM) ===
      // CPU 告訴 RAM 要寫入什麼值 (outM -> In)
      { from: 'cpu', fromPin: 'outM0', to: 'ram', toPin: 'In0' }, { from: 'cpu', fromPin: 'outM1', to: 'ram', toPin: 'In1' }, { from: 'cpu', fromPin: 'outM2', to: 'ram', toPin: 'In2' }, { from: 'cpu', fromPin: 'outM3', to: 'ram', toPin: 'In3' },
      
      // CPU 告訴 RAM 要寫入哪個地址 (addrM -> Addr)
      // RAM 4 只需要 2 bits 地址，我們取 CPU 的低 2 位 (addr0, addr1)
      { from: 'cpu', fromPin: 'addr0', to: 'ram', toPin: 'Addr0' },
      { from: 'cpu', fromPin: 'addr1', to: 'ram', toPin: 'Addr1' },
      
      // CPU 告訴 RAM 是否要寫入 (writeM -> Load)
      { from: 'cpu', fromPin: 'writeM', to: 'ram', toPin: 'Load' },

      // === 3. 回授流 (RAM -> CPU) ===
      // RAM 告訴 CPU 該地址現在的值 (Out -> inM)
      { from: 'ram', fromPin: 'Out0', to: 'cpu', toPin: 'inM0' }, { from: 'ram', fromPin: 'Out1', to: 'cpu', toPin: 'inM1' }, { from: 'ram', fromPin: 'Out2', to: 'cpu', toPin: 'inM2' }, { from: 'ram', fromPin: 'Out3', to: 'cpu', toPin: 'inM3' }
    ],
    
    ioMapping: {
      inputs: {
        'Op': [{id:'cpu',pin:'Op'}], 'reset': [{id:'cpu',pin:'reset'}],
        'Instr0':[{id:'cpu',pin:'Instr0'}], 'Instr1':[{id:'cpu',pin:'Instr1'}], 'Instr2':[{id:'cpu',pin:'Instr2'}], 'Instr3':[{id:'cpu',pin:'Instr3'}],
        'a':[{id:'cpu',pin:'a'}],
        'c1':[{id:'cpu',pin:'c1'}], 'c2':[{id:'cpu',pin:'c2'}], 'c3':[{id:'cpu',pin:'c3'}], 'c4':[{id:'cpu',pin:'c4'}], 'c5':[{id:'cpu',pin:'c5'}], 'c6':[{id:'cpu',pin:'c6'}],
        'd1':[{id:'cpu',pin:'d1'}], 'd2':[{id:'cpu',pin:'d2'}], 'd3':[{id:'cpu',pin:'d3'}],
        'j1':[{id:'cpu',pin:'j1'}], 'j2':[{id:'cpu',pin:'j2'}], 'j3':[{id:'cpu',pin:'j3'}],
      },
      outputs: {
        'PC0': {id:'cpu',pin:'pc0'}, 'PC1': {id:'cpu',pin:'pc1'}, 'PC2': {id:'cpu',pin:'pc2'}, 'PC3': {id:'cpu',pin:'pc3'},
        'WriteLight': {id:'cpu',pin:'writeM'} // 讓我們知道現在是否正在寫入 RAM
      }
    }
  },
};