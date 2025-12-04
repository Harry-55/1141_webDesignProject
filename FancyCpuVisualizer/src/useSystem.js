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
// src/useSystem.js -> assembleCode

export function assembleCode(code) {
  // 1. 清空舊狀態
  systemState.components = [];
  systemState.wires = []; 
  
  const lines = code.split('\n').map(l => l.trim()).filter(l => l);

  // 2. 第一遍掃描：先建立所有 Components (確保連線時找得到人)
  lines.forEach(line => {
    const parts = line.split(/\s+/);
    if (parts.length < 2) return;
    const type = parts[0].toUpperCase();

    // 跳過 WIRE 指令，只處理元件宣告
    if (type === 'WIRE') return;

    if (parts.length >= 4) {
      const [_, id, x, y] = parts;
      
      const comp = {
        id: id,
        type: type,
        x: parseInt(x),
        y: parseInt(y),
        value: 0,
        expanded: false,
        inputStates: {},
        outputStates: {},
        internals: null
      };

      if (ChipRegistry[type]) {
        comp.internals = buildInternals(type);
      }
      systemState.components.push(comp);
    }
  });

  // 3. 第二遍掃描：處理 WIRE 連線
  lines.forEach(line => {
    const parts = line.split(/\s+/);
    if (parts.length < 2) return;
    const type = parts[0].toUpperCase();

    if (type === 'WIRE' && parts.length >= 3) {
      const sourceId = parts[1];
      const targetId = parts[2];
      const arg1 = parts[3]; // 可能是 fromPin，也可能是 toPin
      const arg2 = parts[4]; // 如果有這個，那它肯定是 toPin

      let fromPin = null;
      let toPin = null;

      if (arg2) {
        // 5個參數: WIRE Src Tgt SrcPin TgtPin
        fromPin = arg1;
        toPin = arg2;
      } else if (arg1) {
        // 4個參數: WIRE Src Tgt PinName
        // 這裡要判斷 PinName 是屬於來源的輸出，還是目標的輸入？
        
        const targetComp = systemState.components.find(c => c.id === targetId);
        
        // 檢查目標元件是否有這個輸入腳位 (例如 MUX 有 'A', 'B', 'Sel')
        const targetDef = targetComp ? ChipRegistry[targetComp.type] : null;
        const isTargetInput = targetDef && targetDef.inputs && targetDef.inputs.includes(arg1);

        if (isTargetInput) {
          // 如果名字吻合目標的 Input，那它就是 toPin
          toPin = arg1;
        } else {
          // 否則預設它是來源的 fromPin (例如 HalfAdder 的 Sum)
          fromPin = arg1;
        }
      }

      systemState.wires.push({ 
        from: sourceId, 
        to: targetId, 
        fromPin: fromPin, 
        toPin: toPin 
      });
    }
  });

  // 4. 執行初始模擬
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
    const oldInputs = JSON.stringify(comp.inputStates);
    const newInputs = getInputs(comp, wires, components, parentInputs, scopeInputs);
    
    if (JSON.stringify(newInputs) !== oldInputs) {
      comp.inputStates = newInputs;
      scopeChanged = true;
    }

    // B. 計算邏輯 (包含遞迴進入子晶片)
    const oldVal = comp.value;
    const oldOutputStates = JSON.stringify(comp.outputStates);

    if (comp.internals && ChipRegistry[comp.type]) {
      // === 複合晶片 (Custom Chip) ===
      const mapping = ChipRegistry[comp.type].ioMapping;
      
      // 🟢 修正：不再建立複雜的 internalParentInputs 映射表
      // 直接把當前層級的 Inputs (newInputs) 傳進去，讓內部的 Wires 自己去對應
      const internalChanged = simulateScope(
        comp.internals.components, 
        comp.internals.wires, 
        newInputs, // <--- 直接傳遞原始輸入 Map { A:0, B:0, Sel:1 }
        newInputs  // 當作 scopeInputs (雖然這裡 parentInputs 已經夠用)
      );

      if (internalChanged) scopeChanged = true;

      // 3. 將內部結果映射回外部輸出 (Output States) - 這部分維持不變
      if (mapping.outputs) {
        Object.keys(mapping.outputs).forEach(portName => {
          const target = mapping.outputs[portName];
          let internalId, internalPin;

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
              comp.outputStates[portName] = internalComp.outputStates[internalPin];
            } else {
              comp.outputStates[portName] = internalComp.value;
            }
          } else {
            comp.outputStates[portName] = 0;
          }
        });
      }

      // 4. 設定主輸出
      const outputId = typeof mapping.output === 'string' ? mapping.output : mapping.output?.main;
      if (outputId) {
        const outputComp = comp.internals.components.find(c => c.id === outputId);
        comp.value = outputComp ? outputComp.value : 0;
      }

    } else {
      // === 基本邏輯閘 (Basic Gate) ===
      // ... (維持不變)
      comp.value = calculateLogic(comp.type, newInputs, comp.value);
      comp.outputStates = { OUT: comp.value }; 
    }

    if (comp.value !== oldVal || JSON.stringify(comp.outputStates) !== oldOutputStates) {
      scopeChanged = true;
    }
  });

  return scopeChanged;
}

/**
 * 計算基本邏輯閘
 */
// src/useSystem.js

function calculateLogic(type, inputsMap, currentValue) {
  if (type === 'INPUT') return currentValue;

  const registryDef = ChipRegistry[type];
  const inputOrder = registryDef ? registryDef.inputs : ['A', 'B']; 
  
  // 🛡️ 強制轉型為 Number，避免字串 "1" 或是 undefined 造成誤判
  const valArr = inputOrder.map(pin => {
    const val = inputsMap[pin];
    return (val !== undefined) ? Number(val) : 0;
  });

  const a = valArr[0];
  const b = valArr[1];

  // Debug: 讓你確認當下發生什麼事
  if (type === 'AND' && (a !== 1 || b !== 1) && (a === 1 && b === 1)) {
     // 這行應該永遠不會執行，除非宇宙毀滅
     console.error('Logic Error: Math is broken'); 
  }

  switch (type) {
    // 🛡️ 明確的 return，確保不會 fall-through
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
/**
 * 取得元件的輸入狀態
 */
function getInputs(targetComp, wires, components, parentInputs, scopeInputs) {
  const inputMap = {};
  const definedInputs = ChipRegistry[targetComp.type]?.inputs || ['A', 'B'];

  const setVal = (pin, val) => {
    inputMap[pin] = val;
  };

  // 🟢 移除舊的 "Method 1: Parent Inputs Injection"
  // 現在完全依賴 Wires 來傳遞訊號，這樣更符合硬體邏輯

  // 2. 來自 "Wires" (同層級的連線)
  wires.filter(w => w.to === targetComp.id).forEach(w => {
    let val = 0;
    
    // 來源 A: 同層級的其他元件
    const sourceComp = components.find(c => c.id === w.from);
    
    if (sourceComp) {
      if (w.fromPin) {
        val = sourceComp.outputStates[w.fromPin] || 0;
      } else {
        val = sourceComp.value;
      }
    } 
    // 來源 B: 父層傳進來的輸入 (Parent Inputs)
    // 🟢 修正：直接檢查 parentInputs 是否有這個 key (例如 'A', 'B', 'Sel')
    else if (parentInputs[w.from] !== undefined) {
      val = parentInputs[w.from];
    } 
    // 來源 C: 頂層全域輸入
    else if (scopeInputs[w.from] !== undefined) {
       val = scopeInputs[w.from];
    }

    // 寫入到目標 Pin
    if (w.toPin) {
      setVal(w.toPin, val);
    } else {
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