// src/registry.js
export const ChipRegistry = {
  'AND': { inputs: ['A', 'B'], outputs: ['OUT'] },
  'OR':  { inputs: ['A', 'B'], outputs: ['OUT'] },
  'NAND':{ inputs: ['A', 'B'], outputs: ['OUT'] },
  'NOT': { inputs: ['In'], outputs: ['OUT'] },

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
      { id: 'and1', type: 'AND', x: 200, y: 50, value: 0 }, // 處理 A
      { id: 'and2', type: 'AND', x: 200, y: 200, value: 0 }, // 處理 B
      { id: 'or1',  type: 'OR',  x: 350, y: 125, value: 0 }
    ],
    wires: [
      // Sel 的反向訊號控制 A
      { from: 'Sel', to: 'not1', toPin: 'In' }, 
      { from: 'not1', to: 'and1', toPin: 'B' }, // 假設 AND 的 B 腳位接收控制訊號
      
      // Sel 直接控制 B
      { from: 'Sel', to: 'and2', toPin: 'B' },

      // 資料輸入
      { from: 'A', to: 'and1', toPin: 'A' },
      { from: 'B', to: 'and2', toPin: 'A' },

      // 匯總輸出
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
    // 定義 8 個資料輸入 + 1 個選擇訊號
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Sel'],
    outputs: ['Out0', 'Out1', 'Out2', 'Out3'],
    components: [
      // 4 個 1-bit MUX，分別處理每一個位元
      { id: 'm0', type: 'MUX', x: 50, y: 50, value: 0 },
      { id: 'm1', type: 'MUX', x: 50, y: 150, value: 0 },
      { id: 'm2', type: 'MUX', x: 50, y: 250, value: 0 },
      { id: 'm3', type: 'MUX', x: 50, y: 350, value: 0 }
    ],
    wires: [
      // === 共用 Sel 訊號 (控制所有 MUX) ===
      { from: 'Sel', to: 'm0', toPin: 'Sel' },
      { from: 'Sel', to: 'm1', toPin: 'Sel' },
      { from: 'Sel', to: 'm2', toPin: 'Sel' },
      { from: 'Sel', to: 'm3', toPin: 'Sel' },

      // === 資料位元 0 ===
      { from: 'A0', to: 'm0', toPin: 'A' },
      { from: 'B0', to: 'm0', toPin: 'B' },

      // === 資料位元 1 ===
      { from: 'A1', to: 'm1', toPin: 'A' },
      { from: 'B1', to: 'm1', toPin: 'B' },

      // === 資料位元 2 ===
      { from: 'A2', to: 'm2', toPin: 'A' },
      { from: 'B2', to: 'm2', toPin: 'B' },

      // === 資料位元 3 ===
      { from: 'A3', to: 'm3', toPin: 'A' },
      { from: 'B3', to: 'm3', toPin: 'B' }
    ],
    ioMapping: {
      inputs: {
        'Sel': [{id:'m0',pin:'Sel'}, {id:'m1',pin:'Sel'}, {id:'m2',pin:'Sel'}, {id:'m3',pin:'Sel'}],
        'A0': [{id:'m0',pin:'A'}], 'B0': [{id:'m0',pin:'B'}],
        'A1': [{id:'m1',pin:'A'}], 'B1': [{id:'m1',pin:'B'}],
        'A2': [{id:'m2',pin:'A'}], 'B2': [{id:'m2',pin:'B'}],
        'A3': [{id:'m3',pin:'A'}], 'B3': [{id:'m3',pin:'B'}]
      },
      // 通常我們會希望能直接讀取每一位元的輸出
      outputs: {
        'Out0': 'm0',
        'Out1': 'm1',
        'Out2': 'm2',
        'Out3': 'm3'
      }
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
      output: 'fa3', // 主輸出預設還是 S3 (sum)
      outputs: { 
        'S0': 'fa0', 
        'S1': 'fa1', 
        'S2': 'fa2', 
        // 🔴 關鍵修正：這裡要明確指定去抓 Full Adder 的哪一隻腳
        'S3':   { id: 'fa3', pin: 'SUM' }, 
        'Cout': { id: 'fa3', pin: 'Cout' } 
      }
    }
  }
};