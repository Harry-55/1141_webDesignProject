<template>
  <div 
    class="component-wrapper" 
    :style="{ left: comp.x + 'px', top: comp.y + 'px', zIndex: isActive ? 999 : 10 }"
    @mousedown.stop="handleMouseDown"
  >
    <div 
      v-if="!comp.expanded"
      class="component-box"
      :class="{ 'on': Number(comp.value) === 1, 'is-custom': !!comp.internals, 'is-input': comp.type === 'INPUT' }"
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
                stroke-width="3" fill="transparent"/>
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

<script>
let globalZIndex = 10;
export default { name: 'CircuitBlock' }
</script>

<script setup>
import { ref, computed } from 'vue';
import { ChipRegistry } from '../registry';

const props = defineProps(['comp']);
const emit = defineEmits(['startDrag']);

// --- Utils ---
const isActive = ref(false);
function handleMouseDown(e) {
  globalZIndex++;
  e.currentTarget.style.zIndex = globalZIndex;
  emit('startDrag', e, props.comp);
}

function getCompSize(c) {
  if (!c.expanded) return { w: 100, h: 80 };
  let maxW = 300; let maxH = 200;
  if (c.internals && c.internals.components) {
    c.internals.components.forEach(sub => {
      const subSize = getCompSize(sub);
      const right = sub.x + subSize.w;
      const bottom = sub.y + subSize.h;
      if (right > maxW) maxW = right;
      if (bottom > maxH) maxH = bottom;
    });
  }
  return { w: maxW + 100, h: maxH + 50 };
}

const dynamicStyle = computed(() => {
  const size = getCompSize(props.comp);
  return { width: size.w + 'px', height: size.h + 'px' };
});

// --- Drag ---
let draggingSubComp = null;
let dragOffsetX = 0; let dragOffsetY = 0;
function handleInternalDrag(event, subComp) {
  draggingSubComp = subComp;
  dragOffsetX = event.clientX - subComp.x;
  dragOffsetY = event.clientY - subComp.y;
  window.addEventListener('mousemove', onInternalMouseMove);
  window.addEventListener('mouseup', onInternalMouseUp);
}
function onInternalMouseMove(event) {
  if (draggingSubComp) {
    draggingSubComp.x = event.clientX - dragOffsetX;
    draggingSubComp.y = event.clientY - dragOffsetY;
  }
}
function onInternalMouseUp() {
  draggingSubComp = null;
  window.removeEventListener('mousemove', onInternalMouseMove);
  window.removeEventListener('mouseup', onInternalMouseUp);
}

// --- Wires & Pins ---
const inputPins = computed(() => ChipRegistry[props.comp.type]?.inputs || []);

const inputStates = computed(() => {
  return props.comp.inputStates || {};
});

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
    
    if (sourceComp) {
      const size = getCompSize(sourceComp);
      startX = sourceComp.x + size.w; 
      
      if (sourceComp.expanded && wire.fromPin) {
         const outputs = ChipRegistry[sourceComp.type]?.ioMapping?.outputs || {};
         const outKeys = Object.keys(outputs);
         const outIndex = outKeys.indexOf(wire.fromPin);
         
         if (outIndex !== -1) {
           startY = sourceComp.y + 25 + (outIndex * 35);
           startX += 70; 
         } else {
           startY = sourceComp.y + (size.h / 2);
         }
      } else {
         startY = sourceComp.y + 40; 
      }

      // 🛡️ 關鍵修正：加上 Number() 確保字串 "1" 也能被視為 1 (綠色)
      if (wire.fromPin && sourceComp.outputStates) {
        isActive = Number(sourceComp.outputStates[wire.fromPin]) === 1;
      } else {
        isActive = Number(sourceComp.value) === 1;
      }

    } else if (inputs.includes(wire.from)) {
      const index = inputs.indexOf(wire.from);
      startX = 30; 
      startY = 30 + (index * 60) + 30; 
      
      // 🛡️ 關鍵修正：加上 Number()
      isActive = Number(inputStates.value[wire.from]) === 1; 
    } else { return; }

    const endComp = components.find(c => c.id === wire.to);
    if (!endComp) return;
    
    const endX = endComp.x;
    let endY = endComp.y + 40;
    
    if (endComp.expanded) {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = -1;
       if (wire.toPin) pinIndex = targetInputs.indexOf(wire.toPin);
       
       if (pinIndex !== -1) {
         endY = endComp.y + 65 + (pinIndex * 60);
       } else {
         endY = endComp.y + 65;
       }
    } else {
       const targetInputs = ChipRegistry[endComp.type]?.inputs || [];
       let pinIndex = 0;
       if (wire.toPin) pinIndex = targetInputs.indexOf(wire.toPin);
       
       if (pinIndex === 0) endY = endComp.y + 20;
       else if (pinIndex > 0) endY = endComp.y + 60;
    }

    const cp1X = startX + 60;
    const cp2X = endX - 60;
    renderedWires.push({
      path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
      active: isActive
    });
  });

  // 處理連線到外部 Output Wall 的線路
  if (registry && registry.ioMapping && registry.ioMapping.outputs) {
    const containerSize = getCompSize(props.comp);
    const wallX = containerSize.w; 
    
    Object.keys(registry.ioMapping.outputs).forEach((outName, index) => {
      const target = registry.ioMapping.outputs[outName];
      let sourceId, sourcePin;
      
      if (typeof target === 'object') {
        sourceId = target.id;
        sourcePin = target.pin;
      } else {
        sourceId = target;
        sourcePin = null;
      }

      const sourceComp = components.find(c => c.id === sourceId);
      
      if (sourceComp) {
        const size = getCompSize(sourceComp);
        let startX = sourceComp.x + size.w;
        let startY = sourceComp.y + 40;

        if (sourceComp.expanded) {
           const sourceOutputs = ChipRegistry[sourceComp.type]?.ioMapping?.outputs || {};
           const outKeys = Object.keys(sourceOutputs);
           const pinIndex = sourcePin ? outKeys.indexOf(sourcePin) : -1;
           
           if (pinIndex !== -1) {
             startY = sourceComp.y + 25 + (pinIndex * 35);
             startX += 70; 
           } else {
             startY = sourceComp.y + (size.h / 2);
           }
        }

        const endX = wallX; 
        const endY = 25 + (index * 35); 

        // 🛡️ 關鍵修正：加上 Number()
        let isActive = false;
        if (sourcePin && sourceComp.outputStates) {
          isActive = Number(sourceComp.outputStates[sourcePin]) === 1;
        } else {
          isActive = Number(sourceComp.value) === 1;
        }

        const cp1X = startX + 50;
        const cp2X = endX - 50;
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
/* CSS 維持不變 */
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
.expand-btn { position: absolute; bottom: 5px; right: 5px; font-size: 10px; cursor: pointer; background: #fff; color: #000; border: none; border-radius: 4px; z-index: 20; }

.expanded-container {
  background: rgba(40, 40, 40, 0.75);
  border: 2px solid #9c27b0;
  border-radius: 8px;
  cursor: grab;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.expanded-header { 
  background: #2d2d2d; /* 改成深灰色，更有質感 */
  color: #ddd; 
  padding: 8px 12px; /* 增加一點內距 */
  font-weight: bold; 
  font-size: 13px;
  display: flex; 
  justify-content: space-between; 
  align-items: center; /* 垂直置中 */
  cursor: grab; 
  border-bottom: 1px solid #444;
  border-radius: 8px 8px 0 0; /* 上方圓角 */
}

/* 🍎 Mac 風格紅色關閉按鈕 */
.close-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff5f56; /* Mac 紅 */
  border: 1px solid #e0443e;
  color: transparent; /* 隱藏文字 'x' */
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  transition: all 0.2s;
}

/* 滑鼠移過去時顯示 X 符號 (選擇性) */
.close-btn:hover {
  background-color: #ff5f56;
  color: #330000; /* 深紅色 X */
  content: 'x'; /* CSS 無法直接改文字內容，這裡主要靠 color 讓原本的 x 現形 */
}
.internal-canvas { position: relative; width: 100%; height: 100%; }
.internal-wires-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }

.wire-path { stroke: #666; transition: stroke 0.2s; }
.wire-path.active { stroke: #0f0; filter: drop-shadow(0 0 3px #0f0); }

.input-ports-column { position: absolute; left: 0; top: 30px; bottom: 0; width: 30px; display: flex; flex-direction: column; pointer-events: none; }
.input-port-label { height: 60px; font-size: 10px; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 5px; border-left: 2px solid #555; position: relative; }
.port-dot { width: 6px; height: 6px; background: #555; border-radius: 50%; }
.port-dot.active { background: #0f0; box-shadow: 0 0 5px #0f0; }

.output-pins-panel { position: absolute; right: -80px; top: 40px; display: flex; flex-direction: column; gap: 5px; pointer-events: none; }
.output-pin { background: #222; color: #fff; padding: 5px 10px; font-size: 12px; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; position: relative; height: 30px; box-sizing: border-box; }
.output-pin.on { border-color: #0f0; box-shadow: 0 0 5px #0f0; }
.port-dot-left { position: absolute; left: -14px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; background: #555; border-radius: 50%; }
.port-dot-left.active { background: #0f0; box-shadow: 0 0 5px #0f0; }
.pin-led { width: 8px; height: 8px; background: #444; border-radius: 50%; margin-left: 8px; }
.output-pin.on .pin-led { background: #0f0; box-shadow: 0 0 5px #0f0; }

.mini-pin-row { display: flex; gap: 3px; position: absolute; bottom: -5px; }
.mini-pin { width: 6px; height: 6px; border-radius: 50%; background: #555; }
.mini-pin.on { background: #0f0; box-shadow: 0 0 3px #0f0; }
</style>