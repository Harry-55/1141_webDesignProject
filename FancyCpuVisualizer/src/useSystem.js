// src/useSystem.js
import { reactive } from 'vue';
import { ChipRegistry } from './registry';

// 最大的穩定化迴圈次數，防止無限迴圈 (例如由 NOT 閘對接造成的震盪)
const MAX_ITERATIONS = 100;

export const systemState = reactive({
  components: [],
  wires: []
});

/**
 * 1. 組譯代碼並初始化所有元件 (包含內層遞迴結構)
 */
export function assembleCode(code) {
  // 清空狀態
  systemState.components = [];
  systemState.wires = []; 
  
  const lines = code.split('\n');
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;
    
    const type = parts[0].toUpperCase();
    
    if (type === 'WIRE' && parts.length >= 3) {
      // 處理連線: WIRE Source Target [SourcePin] [TargetPin]
      systemState.wires.push({ 
        from: parts[1], 
        to: parts[2],
        fromPin: parts[3] || null, // 支援指定腳位
        toPin: parts[4] || null
      });
    } else if (parts.length >= 4) {
      // 處理元件: TYPE ID X Y
      const [_, id, x, y] = parts;
      
      // 建立元件基礎物件
      const comp = {
        id: id,
        type: type,
        x: parseInt(x),
        y: parseInt(y),
        value: 0, // 單一輸出值 (相容舊邏輯)
        expanded: false,
        inputStates: {},  // 所有輸入腳位的狀態
        outputStates: {}, // 所有輸出腳位的狀態
        internals: null   // 內部結構
      };

      // **關鍵修正**: 立即遞迴建立內部結構，不要等到模擬時才做
      if (ChipRegistry[type]) {
        comp.internals = buildInternals(type);
      }

      systemState.components.push(comp);
    }
  });

  // 初始化完畢後，立即執行一次模擬以設定初始狀態
  evaluateSystem();
}

/**
 * 遞迴建立內部結構的 Helper
 */
function buildInternals(type) {
  const blueprint = ChipRegistry[type];
  
  // 🔴 修正：除了檢查 blueprint 是否存在，還要檢查是否有 components 陣列
  // 基礎閘 (AND, OR) 沒有 components，所以這裡會直接回傳 null，停止遞迴
  if (!blueprint || !blueprint.components) return null;

  // 深拷貝藍圖結構
  const internals = {
    components: blueprint.components.map(c => ({
      ...c,
      value: 0,
      inputStates: {},
      outputStates: {},
      // 遞迴建立更深層的元件
      internals: ChipRegistry[c.type] ? buildInternals(c.type) : null
    })),
    wires: JSON.parse(JSON.stringify(blueprint.wires || []))
  };
  return internals;
}

/**
 * 2. 核心模擬引擎 (迭代直到穩定)
 */
export function evaluateSystem() {
  let stabilized = false;
  let iterations = 0;

  // 這一層迴圈是為了讓訊號有時間在層級間傳遞 (例如 Carry Bit 的傳遞)
  while (!stabilized && iterations < MAX_ITERATIONS) {
    stabilized = true; // 假設已經穩定
    iterations++;

    // 模擬頂層 (Top Scope)
    const hasChanged = simulateScope(systemState.components, systemState.wires, {}, {});
    
    // 如果這一次迭代有數值改變，代表電路尚未穩定，需要再跑一次
    if (hasChanged) {
      stabilized = false;
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn('⚠️ Circuit oscillation detected or max depth reached.');
  } else {
    // console.log(`✅ Stabilized in ${iterations} iterations.`);
  }
}

/**
 * 模擬一個 Scope (可以是頂層，也可以是晶片內部)
 * 回傳 boolean: 表示是否有任何數值發生了改變 (Dirty Check)
 */
function simulateScope(components, wires, parentInputs = {}, scopeInputs = {}) {
  let scopeChanged = false;

  components.forEach(comp => {
    // A. 收集輸入訊號
    // ----------------------------------------------------
    const oldInputs = JSON.stringify(comp.inputStates);
    const newInputs = getInputs(comp, wires, components, parentInputs, scopeInputs);
    
    // 檢查輸入是否改變
    if (JSON.stringify(newInputs) !== oldInputs) {
      comp.inputStates = newInputs;
      scopeChanged = true;
    }

    // B. 計算邏輯 (包含遞迴進入子晶片)
    // ----------------------------------------------------
    const oldVal = comp.value;
    const oldOutputStates = JSON.stringify(comp.outputStates);

    if (comp.internals && ChipRegistry[comp.type]) {
      // === 複合晶片 (Custom Chip) ===
      const mapping = ChipRegistry[comp.type].ioMapping;
      
      // 1. 將外部輸入 (comp.inputStates) 映射到內部子元件的 parentInputs
      const internalParentInputs = {};
      
      Object.keys(newInputs).forEach(pinName => {
        const val = newInputs[pinName];
        const targets = mapping.inputs[pinName] || []; // 支援一個 Pin 接到內部多個地方
        
        targets.forEach(target => {
          let tId, tPin;
          if (typeof target === 'object') { tId = target.id; tPin = target.pin; } 
          else { tId = target; tPin = null; }

          if (!internalParentInputs[tId]) internalParentInputs[tId] = {};
          
          if (tPin) {
            internalParentInputs[tId][tPin] = val;
          } else {
            // 處理像 Bus 一樣的輸入 (例如 Array)
            if (!internalParentInputs[tId]['__array__']) internalParentInputs[tId]['__array__'] = [];
            internalParentInputs[tId]['__array__'].push(val);
          }
        });
      });

      // 2. 遞迴模擬內部
      const internalChanged = simulateScope(
        comp.internals.components, 
        comp.internals.wires, 
        internalParentInputs, // 來自外部的輸入
        newInputs             // 當前 Scope 的輸入 (作為 fallback)
      );

      if (internalChanged) scopeChanged = true;

      // 3. 將內部結果映射回外部輸出 (Output States)
      if (mapping.outputs) {
        Object.keys(mapping.outputs).forEach(portName => {
          const target = mapping.outputs[portName];
          let internalId, internalPin;

          // 判斷定義是純字串 ID，還是 { id, pin } 物件
          if (typeof target === 'object') {
            internalId = target.id;
            internalPin = target.pin;
          } else {
            internalId = target;
            internalPin = null;
          }

          const internalComp = comp.internals.components.find(c => c.id === internalId);
          
          if (internalComp) {
            if (internalPin && internalComp.outputStates && internalComp.outputStates[internalPin] !== undefined) {
              // 情況 A: 指定了 Pin，且該元件有 outputStates (例如 Full Adder 的 Cout)
              comp.outputStates[portName] = internalComp.outputStates[internalPin];
            } else {
              // 情況 B: 沒指定 Pin，或找不到該 Pin，則使用主數值 (Value)
              comp.outputStates[portName] = internalComp.value;
            }
          } else {
            comp.outputStates[portName] = 0;
          }
        });
      }

      // 4. 設定主輸出 (Main Value)
      const outputId = typeof mapping.output === 'string' ? mapping.output : mapping.output?.main;
      if (outputId) {
        const outputComp = comp.internals.components.find(c => c.id === outputId);
        comp.value = outputComp ? outputComp.value : 0;
      }

    } else {
      // === 基本邏輯閘 (Basic Gate) ===
      const inputValues = Object.keys(newInputs).sort().map(k => newInputs[k]);
      // 確保順序: 這裡簡單假設 Object keys 排序，更嚴謹應該依賴 registry 定義的 inputs 順序
      // 但為了簡單起見，我們用 calculateLogic 處理
      comp.value = calculateLogic(comp.type, newInputs, comp.value);
      
      // 基本閘的 outputStates 通常就是 value，但也可能有多輸出
      comp.outputStates = { OUT: comp.value }; 
    }

    // C. 檢查輸出是否改變 (Dirty Check)
    // ----------------------------------------------------
    if (comp.value !== oldVal || JSON.stringify(comp.outputStates) !== oldOutputStates) {
      scopeChanged = true;
    }
  });

  return scopeChanged;
}

/**
 * 計算基本邏輯閘
 */
function calculateLogic(type, inputsMap, currentValue) {
  if (type === 'INPUT') return currentValue;

  // 將 Map 轉為 Array，這裡需要注意順序，最好依賴 Registry 定義
  const registryDef = ChipRegistry[type];
  const inputOrder = registryDef ? registryDef.inputs : ['A', 'B']; 
  const valArr = inputOrder.map(pin => inputsMap[pin] !== undefined ? inputsMap[pin] : 0);

  const a = valArr[0];
  const b = valArr[1];

  switch (type) {
    case 'AND': return (a === 1 && b === 1) ? 1 : 0;
    case 'OR':  return (a === 1 || b === 1) ? 1 : 0;
    case 'NOT': return (a === 0) ? 1 : 0;
    case 'NAND': return !(a === 1 && b === 1) ? 1 : 0;
    case 'XOR': return (a !== b) ? 1 : 0;
    default: return 0;
  }
}

/**
 * 取得元件的輸入狀態
 */
function getInputs(targetComp, wires, components, parentInputs, scopeInputs) {
  const inputMap = {};
  const definedInputs = ChipRegistry[targetComp.type]?.inputs || ['A', 'B'];

  // 輔助函式：設定值
  const setVal = (pin, val) => {
    // 簡單的競爭解決：後到的覆蓋先到的，或者保持既有
    inputMap[pin] = val;
  };

  // 1. 來自 "Parent Inputs" (如果是子元件，父層傳進來的訊號)
  if (parentInputs[targetComp.id]) {
    const pIn = parentInputs[targetComp.id];
    Object.keys(pIn).forEach(key => {
      if (key !== '__array__') setVal(key, pIn[key]);
    });
  }

  // 2. 來自 "Wires" (同層級的連線)
  wires.filter(w => w.to === targetComp.id).forEach(w => {
    let val = 0;
    
    // 來源可能是同層級的其他元件
    const sourceComp = components.find(c => c.id === w.from);
    
    if (sourceComp) {
      // 從元件讀取輸出
      if (w.fromPin) {
        // 如果連線指定了 fromPin (例如 "Cout")
        val = sourceComp.outputStates[w.fromPin] || 0;
      } else {
        // 預設讀取主 value
        val = sourceComp.value;
      }
    } else if (parentInputs[targetComp.id] && parentInputs[targetComp.id][w.from] !== undefined) {
      // 來源可能是父層的輸入 Pin (Pass-through)
      val = parentInputs[targetComp.id][w.from];
    } else if (scopeInputs[w.from] !== undefined) {
       // 頂層全域輸入
       val = scopeInputs[w.from];
    }

    // 寫入到目標 Pin
    if (w.toPin) {
      setVal(w.toPin, val);
    } else {
      // 智慧填充：如果沒指定 Pin，就找第一個空的
      const firstFreePin = definedInputs.find(pin => inputMap[pin] === undefined);
      if (firstFreePin) setVal(firstFreePin, val);
    }
  });

  return inputMap;
}

/**
 * 使用者互動：切換開關
 */
export function toggleInput(componentId) {
  const comp = systemState.components.find(c => c.id === componentId);
  if (comp && comp.type === 'INPUT') {
    comp.value = comp.value === 0 ? 1 : 0;
    comp.outputStates = { OUT: comp.value }; // 確保 Input 也有 outputStates
    evaluateSystem();
  }
}