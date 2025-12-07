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
      <button v-if="comp.internals" class="expand-btn" @mousedown.stop @click="comp.expanded = true">+</button>
      
      <div v-if="comp.outputStates" class="mini-pin-row">
        <div v-for="(val, name) in comp.outputStates" :key="name" 
             class="mini-pin" :class="{on: Number(val) === 1}" :title="name"></div>
      </div>
    </div>

    <div 
      v-else
      class="expanded-container"
      :style="dynamicStyle"
      :class="{ 'selected': isSelected }"
    >
      <div class="expanded-header" @mousedown.stop="$emit('startDrag', $event, comp)">
        <span>{{ comp.type }} ({{ comp.id }})</span>
        <button class="close-btn" @mousedown.stop @click="comp.expanded = false">x</button>
      </div>

      <div class="internal-canvas" @mousedown="handleCanvasMouseDown">
        <svg class="internal-wires-layer">
          <path v-for="(wire, i) in allInternalWires" :key="i" :d="wire.path" 
                class="wire-path" :class="{ 'active': wire.active }"
                stroke-width="2" fill="transparent"/>
        </svg>

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
          :is-selected="internalSelectedIds.has(subComp.id)"
          @startDrag="handleInternalDrag"
        />

        <div v-if="internalSelectionBox" class="selection-box" :style="internalSelectionStyle"></div>
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
import { ref, computed, reactive } from 'vue';
import { ChipRegistry } from '../registry';

// === 佈局常數 ===
const PIN_HEIGHT = 30;
const HEADER_HEIGHT = 40;
const PIN_OFFSET_Y = 15;
const BOTTOM_PADDING = 20;
const PANEL_TOP = 40;
const OUT_PIN_H = 30;
const OUT_PIN_GAP = 5;
const DOT_OFFSET_X = -39;
const INPUT_DOT_X = 30;

const props = defineProps(['comp', 'isSelected']);
const emit = defineEmits(['startDrag']);

// === 狀態管理 ===
const isActive = ref(false);
const internalSelectedIds = ref(new Set()); // 內部選取的元件 ID
const isInternalBoxSelecting = ref(false);
const internalSelectionStart = reactive({ x: 0, y: 0 });
const internalSelectionBox = ref(null);

let globalZIndex = 10;

function handleMouseDown(e) {
  globalZIndex++;
  e.currentTarget.style.zIndex = globalZIndex;
}

// === 元件大小計算 ===
function getCompSize(c) {
  if (!c.expanded) return { w: 100, h: 80 };
  let maxW = 300; let maxH = 100;
  
  if (c.internals && c.internals.components) {
    c.internals.components.forEach(sub => {
      const subSize = getCompSize(sub);
      const right = sub.x + subSize.w;
      const bottom = sub.y + subSize.h;
      if (right > maxW) maxW = right;
      if (bottom > maxH) maxH = bottom;
    });
  }
  const inputs = ChipRegistry[c.type]?.inputs || [];
  const inputsHeight = HEADER_HEIGHT + (inputs.length * PIN_HEIGHT) + BOTTOM_PADDING;
  const ioMapping = ChipRegistry[c.type]?.ioMapping || {};
  const outputs = ioMapping.outputs ? Object.keys(ioMapping.outputs) : [];
  const outputsHeight = HEADER_HEIGHT + (outputs.length * (OUT_PIN_H + OUT_PIN_GAP)) + BOTTOM_PADDING;
  maxH = Math.max(maxH, inputsHeight, outputsHeight);
  return { w: maxW + 100, h: maxH + 20 };
}

const dynamicStyle = computed(() => {
  const size = getCompSize(props.comp);
  return { width: size.w + 'px', height: size.h + 'px' };
});

// === 🟢 內部拖曳邏輯 (Internal Drag) ===
let draggingSubComp = null;
let lastInternalMouseX = 0;
let lastInternalMouseY = 0;

function handleInternalDrag(event, subComp) {
  event.stopPropagation(); 

  // 處理選取狀態
  if (event.ctrlKey) {
    if (!internalSelectedIds.value.has(subComp.id)) {
        internalSelectedIds.value.add(subComp.id);
    }
  } else {
    if (!internalSelectedIds.value.has(subComp.id)) {
        internalSelectedIds.value.clear();
        internalSelectedIds.value.add(subComp.id);
    }
  }

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

    const moveX = deltaX / currentScale;
    const moveY = deltaY / currentScale;

    // 移動所有被選取的內部元件
    internalSelectedIds.value.forEach(id => {
        const c = props.comp.internals.components.find(x => x.id === id);
        if (c) {
            c.x += moveX;
            c.y += moveY;
        }
    });
  }
}

function onInternalMouseUp() {
  draggingSubComp = null;
  window.removeEventListener('mousemove', onInternalMouseMove);
  window.removeEventListener('mouseup', onInternalMouseUp);
}

// === 🟢 內部框選邏輯 (Internal Box Selection) ===
let boxSelectEl = null;

function handleCanvasMouseDown(event) {
    event.stopPropagation();
    
    // 如果是按住 Ctrl 點擊空白處 -> 開始框選
    if (event.ctrlKey) {
        isInternalBoxSelecting.value = true;
        boxSelectEl = event.currentTarget; // .internal-canvas
        
        const rect = boxSelectEl.getBoundingClientRect();
        const scale = rect.width / boxSelectEl.offsetWidth;
        
        const logicX = (event.clientX - rect.left) / scale;
        const logicY = (event.clientY - rect.top) / scale;
        
        internalSelectionStart.x = logicX;
        internalSelectionStart.y = logicY;
        internalSelectionBox.value = { x: logicX, y: logicY, w: 0, h: 0 };
        
        window.addEventListener('mousemove', onBoxSelectMouseMove);
        window.addEventListener('mouseup', onBoxSelectMouseUp);
    } else {
        // 沒按 Ctrl 點擊空白處 -> 清除選取
        internalSelectedIds.value.clear();
    }
}

function onBoxSelectMouseMove(event) {
    if (!boxSelectEl) return;
    
    const rect = boxSelectEl.getBoundingClientRect();
    const scale = rect.width / boxSelectEl.offsetWidth;
    
    const currentX = (event.clientX - rect.left) / scale;
    const currentY = (event.clientY - rect.top) / scale;
    
    const startX = internalSelectionStart.x;
    const startY = internalSelectionStart.y;
    
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);
    
    internalSelectionBox.value = { x, y, w, h };
}

function onBoxSelectMouseUp() {
    // 計算選取到的元件
    if (internalSelectionBox.value) {
        const box = internalSelectionBox.value;
        const subComps = props.comp.internals?.components || [];
        
        subComps.forEach(sub => {
            const size = getCompSize(sub);
            // AABB 碰撞檢測
            if (sub.x < box.x + box.w &&
                sub.x + size.w > box.x &&
                sub.y < box.y + box.h &&
                sub.y + size.h > box.y) {
                internalSelectedIds.value.add(sub.id);
            }
        });
    }

    isInternalBoxSelecting.value = false;
    internalSelectionBox.value = null;
    boxSelectEl = null;
    window.removeEventListener('mousemove', onBoxSelectMouseMove);
    window.removeEventListener('mouseup', onBoxSelectMouseUp);
}

const internalSelectionStyle = computed(() => {
    if (!internalSelectionBox.value) return {};
    return {
        left: internalSelectionBox.value.x + 'px',
        top: internalSelectionBox.value.y + 'px',
        width: internalSelectionBox.value.w + 'px',
        height: internalSelectionBox.value.h + 'px'
    };
});

// === Wires & Pins (連線計算) ===
const inputPins = computed(() => ChipRegistry[props.comp.type]?.inputs || []);
const inputStates = computed(() => props.comp.inputStates || {});

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

    // 起點
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
            startX += DOT_OFFSET_X;
          } else {
            startY = sourceComp.y + (size.h / 2);
          }
       } else {
          startY = sourceComp.y + 40;
       }
       if (wire.fromPin && sourceComp.outputStates) isActive = Number(sourceComp.outputStates[wire.fromPin]) === 1;
       else isActive = Number(sourceComp.value) === 1;
    } else if (inputs.includes(wire.from)) {
       const index = inputs.indexOf(wire.from);
       startX = INPUT_DOT_X; 
       startY = PANEL_TOP + (index * PIN_HEIGHT) + PIN_OFFSET_Y;
       isActive = Number(inputStates.value[wire.from]) === 1; 
    } else { return; }

    // 終點
    const endComp = components.find(c => c.id === wire.to);
    if (!endComp) return;
    const endX = endComp.x;
    let endY;
    if (endComp.expanded) {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = -1;
       if (wire.toPin) pinIndex = targetInputs.indexOf(wire.toPin);
       else if (targetInputs.length > 0) pinIndex = 0;
       if (pinIndex !== -1) endY = endComp.y + PANEL_TOP + (pinIndex * PIN_HEIGHT) + PIN_OFFSET_Y;
       else endY = endComp.y + PANEL_TOP + 20;
    } else {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = targetInputs.indexOf(wire.toPin);
       if (pinIndex === -1) pinIndex = 0;
       const totalPins = targetInputs.length;
       if (totalPins <= 1) endY = endComp.y + 40;
       else {
         const step = (80 - 20) / (totalPins - 1);
         endY = endComp.y + 10 + (pinIndex * step);
       }
    }
    const cp1X = startX + 60;
    const cp2X = endX - 60;
    renderedWires.push({ path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`, active: isActive });
  });

  // Output Wall
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
        if (sourceComp.expanded) {
           const sourceOutputs = ChipRegistry[sourceComp.type]?.ioMapping?.outputs || {};
           const outKeys = Object.keys(sourceOutputs);
           const pinIndex = sourcePin ? outKeys.indexOf(sourcePin) : -1;
           if (pinIndex !== -1) {
             const rowH = OUT_PIN_H + OUT_PIN_GAP;
             startY = sourceComp.y + PANEL_TOP + (pinIndex * rowH) + (OUT_PIN_H / 2);
             startX += DOT_OFFSET_X;
           }
        }
        if (sourcePin && sourceComp.outputStates) isActive = Number(sourceComp.outputStates[sourcePin]) === 1;
        else isActive = Number(sourceComp.value) === 1;
        
        const endX = wallX + DOT_OFFSET_X + 5; 
        const rowH = OUT_PIN_H + OUT_PIN_GAP;
        const endY = PANEL_TOP + (index * rowH) + (OUT_PIN_H / 2) - 40;
        const cp1X = startX + 50;
        const cp2X = endX - 50;
        renderedWires.push({ path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`, active: isActive });
      }
    });
  }
  return renderedWires;
});
</script>

<style scoped>
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

.expand-btn {
  position: absolute; bottom: 5px; right: 5px; width: 12px; height: 12px;
  border-radius: 50%; background-color: #ffbd2e; border: 1px solid #e09e3e;
  color: transparent; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: bold; z-index: 20; transition: all 0.2s;
}
.expand-btn:hover { color: #7a4b00; }

.expanded-container {
  background: rgba(40, 40, 40, 0.9);
  border: 2px solid #9c27b0;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.expanded-header { 
  background: #2d2d2d; color: #ddd; padding: 0 12px; height: 40px; 
  font-weight: bold; font-size: 13px;
  display: flex; justify-content: space-between; align-items: center; 
  border-bottom: 1px solid #444; border-radius: 8px 8px 0 0;
  cursor: grab;
}

.close-btn {
  width: 12px; height: 12px; border-radius: 50%;
  background-color: #ff5f56; border: 1px solid #e0443e;
  color: transparent; cursor: pointer; padding: 0;
  margin-left: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 8px; transition: all 0.2s;
}
.close-btn:hover { background-color: #ff5f56; color: #330000; content: 'x'; }

.internal-canvas { position: relative; width: 100%; height: 100%; }
.internal-wires-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }
.wire-path { stroke: #666; transition: stroke 0.2s; fill: none; }
.wire-path.active { stroke: #0f0; filter: drop-shadow(0 0 3px #0f0); }

.input-ports-column { position: absolute; left: 0; top: 40px; bottom: 0; width: 40px; display: flex; flex-direction: column; pointer-events: none; }
.input-port-label { height: 30px; font-size: 10px; color: #ccc; display: flex; align-items: center; justify-content: space-between; padding: 0 4px; border-left: 3px solid #555; position: relative; box-sizing: border-box; }
.pin-text { transform: scale(0.9); transform-origin: left center; }
.port-dot { width: 8px; height: 8px; background: #555; border: 1px solid #777; border-radius: 50%; margin-right: -4px; z-index: 2; }
.port-dot.active { background: #0f0; box-shadow: 0 0 5px #0f0; border-color: #0f0; }

.output-pins-panel { position: absolute; right: auto; left: 100%; margin-left: -25px; top: 40px; display: flex; flex-direction: column; gap: 5px; pointer-events: none; }
.output-pin { height: 30px; background: #222; color: #fff; padding: 0 10px; font-size: 12px; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; position: relative; box-sizing: border-box; }
.output-pin.on { border-color: #0f0; box-shadow: 0 0 5px #0f0; }
.port-dot-left { position: absolute; left: -14px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #555; border-radius: 50%; }
.port-dot-left.active { background: #0f0; box-shadow: 0 0 5px #0f0; }
.pin-led { width: 8px; height: 8px; background: #444; border-radius: 50%; margin-left: 8px; }
.output-pin.on .pin-led { background: #0f0; box-shadow: 0 0 5px #0f0; }

.mini-pin-row { display: flex; gap: 3px; position: absolute; bottom: -5px; }
.mini-pin { width: 6px; height: 6px; border-radius: 50%; background: #555; }
.mini-pin.on { background: #0f0; box-shadow: 0 0 3px #0f0; }

.selection-box {
  position: absolute;
  border: 1px solid #00a8ff;
  background-color: rgba(0, 168, 255, 0.2);
  pointer-events: none;
  z-index: 9999;
}
</style>