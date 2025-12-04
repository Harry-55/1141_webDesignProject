<template>
  <div class="main-layout">
    <div class="workspace">
      <div class="editor-panel">
        <h3>Vue-HDL Editor</h3>
        <textarea v-model="hdlCode"></textarea>
        <button @click="runAssembler">Compile & Load</button>
      </div>

      <div 
        class="canvas-panel" 
        @mousedown="startPan" 
        @mousemove="handleMouseMove" 
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel.prevent="handleWheel"  :style="{ cursor: isPanning ? 'grabbing' : 'grab' }"
      >
        <h3>Renderer View (Zoom: {{ Math.round(zoom * 100) }}%)</h3>
        
        <div 
          class="viewport" 
          :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
        >
        
        <div class="helper-text">Scroll to Zoom • Drag to Pan</div>
          <svg class="wires-layer">
            <path 
              v-for="(wire, i) in wiresPaths" 
              :key="i" 
              :d="wire.path" 
              class="wire-path"
              :class="{ 'active': wire.active }"
              stroke-width="3" 
              fill="transparent"
            />
          </svg>

          <CircuitBlock 
            v-for="comp in systemState.components" 
            :key="comp.id"
            :comp="comp"
            @startDrag="startDrag"
          />
        </div>
        
        <div class="helper-text">Drag empty space to pan</div>
      </div>
    </div>
    <ControlPanel />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { systemState, assembleCode } from './useSystem';
import { ChipRegistry } from './registry';
import ControlPanel from './components/ControlPanel.vue';
import CircuitBlock from './components/CircuitBlock.vue';

// --- HDL 相關 ---
const hdlCode = ref(`
INPUT Sel 300 50

INPUT A0 50 50
INPUT A1 50 100
INPUT A2 50 150
INPUT A3 50 200

INPUT B0 50 300
INPUT B1 50 350
INPUT B2 50 400
INPUT B3 50 450

MUX_4_BIT myMux4 400 150

WIRE Sel myMux4 Sel
WIRE A0 myMux4 A0
WIRE A1 myMux4 A1
WIRE A2 myMux4 A2
WIRE A3 myMux4 A3
WIRE B0 myMux4 B0
WIRE B1 myMux4 B1
WIRE B2 myMux4 B2
WIRE B3 myMux4 B3
`);

function runAssembler() { assembleCode(hdlCode.value); }

// --- 互動狀態 ---
const pan = reactive({ x: 0, y: 0 });
const zoom = ref(1);
const isPanning = ref(false);
const lastMousePos = { x: 0, y: 0 };
let draggingComp = null;
let offsetX = 0; let offsetY = 0;

function startPan(event) {
  if (event.target.classList.contains('canvas-panel') || event.target.classList.contains('viewport')) {
    isPanning.value = true;
    lastMousePos.x = event.clientX;
    lastMousePos.y = event.clientY;
  }
}

function startDrag(event, comp) {
  draggingComp = comp;
  offsetX = event.clientX - pan.x - comp.x;
  offsetY = event.clientY - pan.y - comp.y;
}

function handleMouseMove(event) {
  if (isPanning.value) {
    pan.x += event.clientX - lastMousePos.x;
    pan.y += event.clientY - lastMousePos.y;
    lastMousePos.x = event.clientX;
    lastMousePos.y = event.clientY;
  } else if (draggingComp) {
    draggingComp.x = event.clientX - offsetX - pan.x;
    draggingComp.y = event.clientY - offsetY - pan.y;
  }
}

function handleWheel(event) {
  if (!event.target.closest('.canvas-panel')) return;
  
  const zoomIntensity = 0.1;
  const direction = event.deltaY > 0 ? -1 : 1; // 滾輪向下縮小，向上放大
  const factor = 1 + (direction * zoomIntensity);
  
  // 限制縮放範圍 (0.2倍 ~ 5倍)
  const newZoom = Math.max(0.2, Math.min(5, zoom.value * factor));
  
  // 計算滑鼠相對於視圖的偏移量，讓縮放是以滑鼠游標為中心
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  // 數學魔法：調整 Pan 讓畫面不會亂跑
  pan.x = mouseX - (mouseX - pan.x) * (newZoom / zoom.value);
  pan.y = mouseY - (mouseY - pan.y) * (newZoom / zoom.value);
  
  zoom.value = newZoom;
}

function handleMouseUp() {
  isPanning.value = false;
  draggingComp = null;
}

// --- 連線計算 ---
const wiresPaths = computed(() => {
  return systemState.wires.map(wire => {
    const startComp = systemState.components.find(c => c.id === wire.from);
    const endComp = systemState.components.find(c => c.id === wire.to);
    if (!startComp || !endComp) return { path: '', active: false };

    // 1. 起點
    const startW = startComp.expanded ? getCompSize(startComp).w : 100;
    const startX = startComp.x + startW; 
    let startY = startComp.y + 40;

    // 2. 終點 (對齊 Input Wall)
    const endX = endComp.x;
    let endY = endComp.y + 40; 

    if (endComp.expanded) {
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      const pinIndex = inputs.indexOf(wire.from); 
      
      if (pinIndex !== -1) {
        // 黃金公式： Header(35) + LabelCenter(30) = 65
        endY = endComp.y + 65 + (pinIndex * 60);
      } else {
        endY = endComp.y + 65;
      }
    } else {
      // 收合時分散連線
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      const pinIndex = inputs.indexOf(wire.from);
      if (pinIndex === 0) endY = endComp.y + 20;
      else if (pinIndex > 0) endY = endComp.y + 60;
    }

    // 3. 狀態
    let isActive = false;
    if (wire.fromPin && startComp.outputStates) {
      isActive = startComp.outputStates[wire.fromPin] === 1;
    } else {
      isActive = startComp.value === 1;
    }

    const cp1X = startX + 80;
    const cp2X = endX - 80;
    return { 
      path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
      active: isActive
    };
  });
});

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
</script>

<style>
body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #121212; /* 確保背景色一致 */
}

/* 讓按鈕和輸入框也繼承字體 */
button, input, select, textarea {
  font-family: inherit;
}
</style>
<style scoped>
.main-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.workspace { display: flex; flex-grow: 1; overflow: hidden; }
.editor-panel { 
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  width: 250px; /* 固定寬度稍微寬一點 */
  padding: 15px; 
  background: #1e1e1e; /* VS Code 風格背景 */
  border-right: 1px solid #333;
  display: flex; 
  flex-direction: column; 
  z-index: 10; 
  box-shadow: 2px 0 10px rgba(0,0,0,0.3); 
}
.editor-panel h3 {
  color: #ddd;
  margin-top: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.editor-panel textarea {
  flex-grow: 1;
  background: #252526;
  color: #d4d4d4;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  resize: none;
  outline: none;
  margin-bottom: 10px;
}

.editor-panel textarea:focus {
  border-color: #007fd4;
}

.editor-panel button {
  background: #007fd4;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.editor-panel button:hover {
  background: #0060a0;
}

/* Canvas 維持不變，稍微調整背景色讓層次分明 */
.canvas-panel { 
  flex-grow: 1; 
  position: relative; 
  background: #121212; /* 更深的背景 */
  overflow: hidden; 
  color: #fff; 
}

.canvas-panel { flex-grow: 1; position: relative; background: #222; overflow: hidden; color: #fff; }
.viewport { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 0 0; }

/* 關鍵修正：overflow visible 讓線條不會被切斷 */
.wires-layer { 
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
  pointer-events: none; z-index: 1; 
  overflow: visible; 
}

.wire-path { stroke: #666; transition: stroke 0.2s; }
.wire-path.active { stroke: #0f0; filter: drop-shadow(0 0 3px #0f0); }
.helper-text { position: absolute; bottom: 10px; right: 10px; color: #666; font-size: 12px; pointer-events: none; }
</style>