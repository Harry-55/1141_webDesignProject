<template>
  <div 
    class="component-wrapper" 
    :style="{ left: comp.x + 'px', top: comp.y + 'px', zIndex: isActive ? 999 : 10 }"
    @mousedown.stop="handleMouseDown"
  >
   <div 
      v-if="!comp.expanded"
      class="component-box"
      :class="{ 
        'on': Number(comp.value) === 1, 
        'is-custom': !!comp.internals, 
        'is-input': comp.type === 'INPUT',
        'selected': isSelected
      }"
      @mousedown.stop="$emit('startDrag', $event, comp)"
    >
      <div class="header">{{ comp.type }}</div>
      <div class="body">{{ comp.id }}</div>
      <button v-if="comp.internals" class="expand-btn" @mousedown.stop @click="comp.expanded = true">Ex</button>
      
      <div v-if="comp.outputStates" class="mini-pin-row">
        <div v-for="(val, name) in comp.outputStates" :key="name" 
             class="mini-pin" :class="{on: Number(val) === 1}" :title="name"></div>
      </div>
    </div>

    <div 
      v-else
      class="expanded-container"
      :style="dynamicStyle"
      @mousedown.stop="$emit('startDrag', $event, comp)"
    >
      <div class="expanded-header">
        <span>{{ comp.type }} ({{ comp.id }})</span>
        <button class="close-btn" @mousedown.stop @click="comp.expanded = false">x</button>
      </div>

      <div class="internal-canvas">
        <svg class="internal-wires-layer">
          <path v-for="(wire, i) in allInternalWires" :key="i" :d="wire.path" 
                class="wire-path" :class="{ 'active': wire.active }"
                stroke-width="2" fill="transparent"/> </svg>

        <div class="input-ports-column">
          <div v-for="pin in inputPins" :key="pin" class="input-port-label">
            <span class="pin-text">{{ pin }}</span>
            <div class="port-dot" :class="{ active: Number(inputStates[pin]) === 1 }"></div>
          </div>
        </div>

        <CircuitBlock 
          v-for="subComp in comp.internals.components"
          :key="subComp.id"
          :comp="subComp"
          @startDrag="handleInternalDrag"
        />
      </div>

      <div class="output-pins-panel">
        <div v-for="(val, name) in comp.outputStates" :key="name" 
             class="output-pin" :class="{ 'on': Number(val) === 1 }">
          <div class="port-dot-left" :class="{active: Number(val) === 1}"></div>
          <span class="pin-name">{{ name }}</span>
          <span class="pin-led"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ChipRegistry } from '../registry';

// === 常數定義 (這是修復的關鍵) ===
const PIN_HEIGHT = 30;      // 每個輸入孔的高度 (對應 CSS)
const HEADER_HEIGHT = 40;   // 標題列高度 + padding 預留
const PANEL_TOP = 40;
const OUT_PIN_H = 30;
const OUT_PIN_GAP = 5;
const DOT_OFFSET_X = -39;

const props = defineProps(['comp', 'isSelected']);
const emit = defineEmits(['startDrag']);

// --- Utils ---
const isActive = ref(false);
let globalZIndex = 10;

function handleMouseDown(e) {
  globalZIndex++;
  e.currentTarget.style.zIndex = globalZIndex;
  emit('startDrag', e, props.comp);
}

// 🟢 修正 1: 計算元件大小時，考慮輸入孔的數量，防止內容溢出
function getCompSize(c) {
  if (!c.expanded) return { w: 100, h: 80 };
  
  let maxW = 300; 
  let maxH = 200;

  // 1. 考慮子元件的位置
  if (c.internals && c.internals.components) {
    c.internals.components.forEach(sub => {
      const subSize = getCompSize(sub);
      const right = sub.x + subSize.w;
      const bottom = sub.y + subSize.h;
      if (right > maxW) maxW = right;
      if (bottom > maxH) maxH = bottom;
    });
  }

  // 2. 考慮左側輸入孔佔用的高度 (關鍵修復)
  const inputs = ChipRegistry[c.type]?.inputs || [];
  const minHeightForInputs = HEADER_HEIGHT + (inputs.length * PIN_HEIGHT) + 20; // +20 是底部緩衝
  if (minHeightForInputs > maxH) maxH = minHeightForInputs;

  return { w: maxW + 100, h: maxH + 50 };
}

const dynamicStyle = computed(() =>   {
  const size = getCompSize(props.comp);
  return { width: size.w + 'px', height: size.h + 'px' };
});

// --- Drag (維持不變) ---
let draggingSubComp = null;
let lastInternalMouseX = 0;
let lastInternalMouseY = 0;
function handleInternalDrag(event, subComp) {
  draggingSubComp = subComp;
  lastInternalMouseX = event.clientX;
  lastInternalMouseY = event.clientY;
  window.addEventListener('mousemove', onInternalMouseMove);
  window.addEventListener('mouseup', onInternalMouseUp);
}
function onInternalMouseMove(event) {
  if (draggingSubComp) {
    const deltaX = event.clientX - lastInternalMouseX;
    const deltaY = event.clientY - lastInternalMouseY;
    lastInternalMouseX = event.clientX;
    lastInternalMouseY = event.clientY;
    const el = event.target.closest('.expanded-container') || event.target;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    const currentScale = rect ? (rect.width / el.offsetWidth) : 1;
    draggingSubComp.x += deltaX / currentScale;
    draggingSubComp.y += deltaY / currentScale;
  }
}
function onInternalMouseUp() {
  draggingSubComp = null;
  window.removeEventListener('mousemove', onInternalMouseMove);
  window.removeEventListener('mouseup', onInternalMouseUp);
}

// --- Wires & Pins ---
const inputPins = computed(() => ChipRegistry[props.comp.type]?.inputs || []);
const inputStates = computed(() => props.comp.inputStates || {});
const COLLAPSED_HEIGHT = 80; 
const PADDING_Y = 10;

// 🟢 修正 2: 內部連線邏輯修正
const allInternalWires = computed(() => {
  if (!props.comp.internals || !props.comp.internals.wires) return [];
  const wires = props.comp.internals.wires;
  const components = props.comp.internals.components;
  const inputs = inputPins.value;
  const registry = ChipRegistry[props.comp.type];
  
  const renderedWires = [];

  wires.forEach(wire => {
    let startX, startY, isActive = false;
    const sourceComp = components.find(c => c.id === wire.from);

    // --- 起點計算 (Start Point) ---
    if (sourceComp) {
       const size = getCompSize(sourceComp);
       startX = sourceComp.x + size.w;

       if (sourceComp.expanded && wire.fromPin) {
          const outputs = ChipRegistry[sourceComp.type]?.ioMapping?.outputs || {};
          const outKeys = Object.keys(outputs);
          const outIndex = outKeys.indexOf(wire.fromPin);
          
          if (outIndex !== -1) {
            const rowH = OUT_PIN_H + OUT_PIN_GAP;
            startY = sourceComp.y + PANEL_TOP + (outIndex * rowH) + (OUT_PIN_H / 2);
            startX += DOT_OFFSET_X; // 🟢 修正：使用固定偏移量 20px
          } else {
            startY = sourceComp.y + (size.h / 2);
          }
       } else {
          startY = sourceComp.y + 40;
       }
       
       // ... (isActive 計算省略) ...
       isActive = (wire.fromPin && sourceComp.outputStates) 
         ? Number(sourceComp.outputStates[wire.fromPin]) === 1
         : Number(sourceComp.value) === 1;

    } else if (inputs.includes(wire.from)) {
       // ... (Wall Input 計算省略) ...
       const index = inputs.indexOf(wire.from);
       startX = 30; 
       startY = 40 + (index * 30) + 15;
       isActive = Number(inputStates.value[wire.from]) === 1; 
    } else { return; }

    // --- 終點計算 (End Point) ---
    const endComp = components.find(c => c.id === wire.to);
    if (!endComp) return;
    
    const endX = endComp.x;
    let endY;
    
    // ... (終點 Y 計算保持上一輪的修復邏輯，此處省略以節省篇幅) ...
    // 請保留原本的 endComp.expanded / collapsed 邏輯
    if (endComp.expanded) {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = -1;
       if (wire.toPin) pinIndex = targetInputs.indexOf(wire.toPin);
       else if (targetInputs.length > 0) pinIndex = 0;
       if (pinIndex !== -1) endY = endComp.y + 40 + (pinIndex * 30) + 55;
       else endY = endComp.y + 60;
    } else {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = targetInputs.indexOf(wire.toPin);
       if (pinIndex === -1) pinIndex = 0;
       const totalPins = targetInputs.length;
       const availableHeight = 80 - 20; 
       if (totalPins <= 1) endY = endComp.y + 40; 
       else {
         const step = availableHeight / (totalPins - 1);
         endY = endComp.y + 10 + (pinIndex * step);
       }
    }

    const cp1X = startX + 60;
    const cp2X = endX - 60;
    renderedWires.push({
      path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
      active: isActive
    });
  });

  // --- Output Wall 連線 (內部 -> 右牆) ---
  if (registry && registry.ioMapping && registry.ioMapping.outputs) {
    const containerSize = getCompSize(props.comp);
    const wallX = containerSize.w; 
    
    Object.keys(registry.ioMapping.outputs).forEach((outName, index) => {
      const target = registry.ioMapping.outputs[outName];
      let sourceId, sourcePin;
      if (typeof target === 'object') { sourceId = target.id; sourcePin = target.pin; } 
      else { sourceId = target; sourcePin = null; }

      const sourceComp = components.find(c => c.id === sourceId);
      if (sourceComp) {
        const size = getCompSize(sourceComp);
        let startX = sourceComp.x + size.w;
        let startY = sourceComp.y + 40;
        let isActive = false;

        // 起點計算 (保持不變)
        if (sourceComp.expanded) {
           const sourceOutputs = ChipRegistry[sourceComp.type]?.ioMapping?.outputs || {};
           const outKeys = Object.keys(sourceOutputs);
           const pinIndex = sourcePin ? outKeys.indexOf(sourcePin) : -1;
           if (pinIndex !== -1) {
             const rowH = OUT_PIN_H + OUT_PIN_GAP;
             startY = sourceComp.y + PANEL_TOP + (pinIndex * rowH) + (OUT_PIN_H / 2);
             
             // 🟢 起點如果是內部的 Output Pin，也要用同樣的偏移量
             // 因為內部的 Output Pin 結構跟外部牆是一樣的
             startX += DOT_OFFSET_X; 
           }
        }
        
        if (sourcePin && sourceComp.outputStates) isActive = Number(sourceComp.outputStates[sourcePin]) === 1;
        else isActive = Number(sourceComp.value) === 1;

        // 🟢 終點修正：右牆的位置也要加上偏移量
        const endX = wallX + DOT_OFFSET_X  + 10; 
        
        const rowH = OUT_PIN_H + OUT_PIN_GAP + 7;
        const endY = PANEL_TOP + (index * rowH ) + (OUT_PIN_H / 2) - 39;

        // 控制點調整 (讓線條在元件內部轉彎，不會太擠)
        const cp1X = startX + 40;
        const cp2X = endX - 40; // 讓線條在到達圓點前先拉直
        renderedWires.push({
          path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
          active: isActive
        });
      }
    });
  }

  return renderedWires;
});
</script>

<style scoped>
/* 維持原有的 wrapper, box 樣式 */
.component-wrapper { position: absolute; }
.component-box {
  width: 100px; height: 80px;
  background: #333; color: white;
  border-radius: 8px; cursor: grab;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
  position: relative; border: 2px solid #555;
}
.component-box.on { background: #2e7d32; border-color: #4caf50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.6); }
.component-box.is-custom { border-color: #9c27b0; background: #4a148c; }
.component-box.is-custom.on { border-color: #76ff03; background: #4a148c; }
.component-box.is-input.on { background: #2e7d32; border-color: #4caf50; }
.component-box.selected, .expanded-container.selected { outline: 2px solid #00a8ff; box-shadow: 0 0 15px rgba(0, 168, 255, 0.5); }
.expand-btn { position: absolute; bottom: 5px; right: 5px; font-size: 10px; cursor: pointer; background: #fff; color: #000; border: none; border-radius: 4px; z-index: 20; }

.expanded-container {
  background: rgba(40, 40, 40, 0.9); /* 稍微不透明一點 */
  border: 2px solid #9c27b0;
  border-radius: 8px;
  cursor: grab;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  /* 移除 overflow:hidden，讓右側 output pins 顯示出來 */
}

.expanded-header { 
  background: #2d2d2d;
  color: #ddd; 
  padding: 8px 12px;
  height: 40px; /* 🟢 固定高度，對應 HEADER_HEIGHT */
  box-sizing: border-box;
  font-weight: bold; font-size: 13px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #444; border-radius: 8px 8px 0 0;
}
.close-btn { width: 12px; height: 12px; border-radius: 50%; background-color: #ff5f56; border: 1px solid #e0443e; color: transparent; cursor: pointer; padding: 0; }
.close-btn:hover { color: #300; content: 'x'; }

.internal-canvas { position: relative; width: 100%; height: 100%; }
.internal-wires-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }
.wire-path { stroke: #666; transition: stroke 0.2s; fill: none;} 
.wire-path.active { stroke: #0f0; filter: drop-shadow(0 0 3px #0f0); }

/* 左側輸入孔 */
.input-ports-column { 
  position: absolute; left: 0; top: 40px; /* 🟢 對應 Header */
  bottom: 0; width: 40px; 
  display: flex; flex-direction: column; 
  pointer-events: none; 
}
.input-port-label { 
  height: 30px; /* 🟢 固定高度，對應 PIN_HEIGHT */
  font-size: 10px; color: #ccc; 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 0 4px; 
  border-left: 3px solid #555; /* 視覺提示 */
  box-sizing: border-box;
  position: relative;
}
.pin-text { transform: scale(0.9); transform-origin: left center; }
.port-dot { 
  width: 8px; height: 8px; 
  background: #555; border: 1px solid #777; 
  border-radius: 50%; 
  margin-right: -4px; /* 讓點點剛好壓在線上 */
  z-index: 2;
}
.port-dot.active { background: #0f0; box-shadow: 0 0 5px #0f0; border-color: #0f0; }

/* 右側輸出孔 */
.output-pins-panel { 
  position: absolute; 
  /* right: -80px;  <-- 刪除這行 (移除靠右對齊) */
  right: auto;      /* 重置 right */
  left: 100%;       /* 改為靠左對齊 (貼著元件右邊緣) */
  margin-left: -20px; /* 設定固定距離 (讓小圓點距離邊框約 20px) */
  
  top: 40px; 
  display: flex; flex-direction: column; 
  gap: 5px;       /* 確保 gap 為 5px */
  pointer-events: none; 
}
.output-pin { 
  height: 35px; /* 右側可以稍微寬一點 */
  background: #222; color: #fff; 
  padding: 0 10px; font-size: 12px; 
  border: 1px solid #444; border-radius: 4px; 
  display: flex; align-items: center; 
  position: relative; box-sizing: border-box; margin-bottom: 2px;
}
.output-pin.on { border-color: #0f0; box-shadow: 0 0 5px #0f0; }
.port-dot-left { 
  position: absolute; left: -14px; top: 50%; transform: translateY(-50%); 
  width: 8px; height: 8px; 
  background: #555; border-radius: 50%; 
}
.port-dot-left.active { background: #0f0; box-shadow: 0 0 5px #0f0; }
.pin-led { width: 8px; height: 8px; background: #444; border-radius: 50%; margin-left: 8px; }
.output-pin.on .pin-led { background: #0f0; box-shadow: 0 0 5px #0f0; }

.mini-pin-row { display: flex; gap: 3px; position: absolute; bottom: -5px; }
.mini-pin { width: 6px; height: 6px; border-radius: 50%; background: #555; }
.mini-pin.on { background: #0f0; box-shadow: 0 0 3px #0f0; }
</style>