<template>
  <div class="main-layout">
    <div class="workspace">
      <div class="editor-panel" v-show="isEditorOpen">
        <div class="panel-top-bar">
          <h3>HDL EDITOR</h3>
          <button class="icon-btn close-panel-btn" @click="isEditorOpen = false" title="Close Panel">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>
        
        <textarea v-model="hdlCode" spellcheck="false"></textarea>
        
        <div class="panel-bottom-bar">
          <button class="action-btn" @click="runAssembler">Compile & Load</button>
        </div>
      </div>

      <div 
        class="canvas-panel" 
        tabindex="0"
        @mousedown.prevent="handleMouseDown" 
        @mousemove="handleMouseMove" 
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel.prevent="handleWheel"
        @keydown="handleKeyDown"
        :style="{ cursor: isPanning ? 'grabbing' : 'default' }"
      >
        <button 
          v-if="!isEditorOpen" 
          class="floating-panel-btn"
          @click="isEditorOpen = true"
          title="Open Editor"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        </button>

        <h3>Renderer View (Zoom: {{ Math.round(zoom * 100) }}%)</h3>
        
        <div 
          class="viewport" 
          :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
        >
          <svg class="wires-layer">
            <g v-for="(wire, i) in wiresPaths" :key="i">
              <path :d="wire.path" class="wire-path" :class="{ 'active': wire.active }" stroke-width="3" fill="transparent" />
              <path :d="wire.path" stroke="transparent" stroke-width="15" fill="none" class="wire-hit-area" @dblclick.stop="addWaypoint($event, wire.sourceWire)" />
              <circle v-for="(wp, idx) in wire.waypoints" :key="idx" :cx="wp.x" :cy="wp.y" r="6" class="waypoint-handle" @mousedown.stop="startDragWaypoint($event, wire.sourceWire, idx)" @dblclick.stop="removeWaypoint(wire.sourceWire, idx)" />
            </g>
          </svg>

          <CircuitBlock 
            v-for="comp in systemState.components" 
            :key="comp.id"
            :comp="comp"
            :is-selected="selectedIds.has(comp.id)" 
            @startDrag="startDrag"
          />
          
          <div v-if="selectionBox" class="selection-box" :style="selectionBoxStyle"></div>
        </div>
        
        <div class="helper-text">
          Ctrl+Drag Select • Scroll Zoom • DblClick Wire to Add Point • Drag Points to Adjust
        </div>
      </div>
    </div> <ControlPanel />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { systemState, assembleCode } from './useSystem';
import { ChipRegistry } from './registry';
import ControlPanel from './components/ControlPanel.vue';
import CircuitBlock from './components/CircuitBlock.vue';

// --- 常數 ---
const PIN_HEIGHT = 30;
const HEADER_HEIGHT = 40;
const PIN_OFFSET_Y = 15;
const INPUT_DOT_X = 30;
const DOT_OFFSET_X = -39;

// 🟢 UI 狀態：編輯器開關
const isEditorOpen = ref(true);

// --- HDL 相關 ---
const hdlCode = ref(`
INPUT reset
INPUT Op
INPUT a

INPUT c1
INPUT c2
INPUT c3
INPUT c4
INPUT c5
INPUT c6

INPUT d1
INPUT d2
INPUT d3

INPUT j1
INPUT j2
INPUT j3

INPUT Instr0
INPUT Instr1
INPUT Instr2
INPUT Instr3

COMPUTER_4_BIT HackPC

WIRE Op HackPC Op
WIRE reset HackPC reset
WIRE a HackPC a
WIRE c1 HackPC c1
WIRE c2 HackPC c2
WIRE c3 HackPC c3
WIRE c4 HackPC c4
WIRE c5 HackPC c5
WIRE c6 HackPC c6
WIRE d1 HackPC d1
WIRE d2 HackPC d2
WIRE d3 HackPC d3
WIRE j1 HackPC j1
WIRE j2 HackPC j2
WIRE j3 HackPC j3
WIRE Instr0 HackPC Instr0
WIRE Instr1 HackPC Instr1
WIRE Instr2 HackPC Instr2
WIRE Instr3 HackPC Instr3
`);

function runAssembler() { assembleCode(hdlCode.value); }

// --- 互動狀態 ---
const pan = reactive({ x: 0, y: 0 });
const zoom = ref(1);
const isPanning = ref(false);
const selectedIds = ref(new Set());
const isBoxSelecting = ref(false);
const selectionStart = { x: 0, y: 0 };
const selectionBox = ref(null);
const lastMousePos = { x: 0, y: 0 };
let isDraggingComp = false;
let draggingWaypoint = null;

function getRelativeMousePos(event) {
  const panel = document.querySelector('.canvas-panel');
  if (!panel) return { x: event.clientX, y: event.clientY };
  const rect = panel.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getWorldMousePos(event) {
  const rel = getRelativeMousePos(event);
  return {
    x: (rel.x - pan.x) / zoom.value,
    y: (rel.y - pan.y) / zoom.value
  };
}

function handleMouseDown(event) {
  if (event.target.closest('.component-wrapper')) return;
  if (event.target.closest('.waypoint-handle')) return;
  // 🟢 防止點擊懸浮按鈕時觸發畫布拖曳
  if (event.target.closest('.floating-panel-btn')) return;

  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;

  if (event.ctrlKey) {
    isBoxSelecting.value = true;
    const worldPos = getWorldMousePos(event);
    selectionStart.x = worldPos.x;
    selectionStart.y = worldPos.y;
    selectionBox.value = { x: worldPos.x, y: worldPos.y, w: 0, h: 0 };
  } else {
    isPanning.value = true;
    selectedIds.value.clear();
    selectionBox.value = null;
  }
}

function startDrag(event, comp) {
  event.stopPropagation();
  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;
  isDraggingComp = true;

  if (event.ctrlKey) {
    if (selectedIds.value.has(comp.id)) selectedIds.value.delete(comp.id);
    else selectedIds.value.add(comp.id);
  } else if (!selectedIds.value.has(comp.id)) {
    selectedIds.value.clear();
    selectedIds.value.add(comp.id);
  }
}

function addWaypoint(event, wire) {
  if (!wire.waypoints) wire.waypoints = [];
  const worldPos = getWorldMousePos(event);
  let insertIdx = wire.waypoints.length;
  for(let i=0; i<wire.waypoints.length; i++) {
      if (worldPos.x < wire.waypoints[i].x) {
          insertIdx = i;
          break;
      }
  }
  wire.waypoints.splice(insertIdx, 0, { x: worldPos.x, y: worldPos.y });
}

function removeWaypoint(wire, index) {
  wire.waypoints.splice(index, 1);
}

function startDragWaypoint(event, wire, index) {
  draggingWaypoint = { wire, index };
  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;
}

function handleMouseMove(event) {
  const deltaX = event.clientX - lastMousePos.x;
  const deltaY = event.clientY - lastMousePos.y;
  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;

  if (draggingWaypoint) {
    const moveX = deltaX / zoom.value;
    const moveY = deltaY / zoom.value;
    const wp = draggingWaypoint.wire.waypoints[draggingWaypoint.index];
    wp.x += moveX;
    wp.y += moveY;
  }
  else if (isPanning.value) {
    pan.x += deltaX;
    pan.y += deltaY;
  } 
  else if (isDraggingComp) {
    const moveX = deltaX / zoom.value;
    const moveY = deltaY / zoom.value;
    selectedIds.value.forEach(id => {
      const comp = systemState.components.find(c => c.id === id);
      if (comp) {
        comp.x += moveX;
        comp.y += moveY;
      }
    });
  }
  else if (isBoxSelecting.value) {
    const worldPos = getWorldMousePos(event);
    const x = Math.min(selectionStart.x, worldPos.x);
    const y = Math.min(selectionStart.y, worldPos.y);
    const w = Math.abs(worldPos.x - selectionStart.x);
    const h = Math.abs(worldPos.y - selectionStart.y);
    selectionBox.value = { x, y, w, h };
  }
}

function handleMouseUp() {
  if (isBoxSelecting.value && selectionBox.value) {
    const box = selectionBox.value;
    systemState.components.forEach(comp => {
      const compW = comp.expanded ? 300 : 100;
      const compH = comp.expanded ? 200 : 80;
      if (comp.x < box.x + box.w && comp.x + compW > box.x &&
          comp.y < box.y + box.h && comp.y + compH > box.y) {
        selectedIds.value.add(comp.id);
      }
    });
  }
  isPanning.value = false;
  isDraggingComp = false;
  isBoxSelecting.value = false;
  selectionBox.value = null;
  draggingWaypoint = null;
}

function handleWheel(event) {
  if (!event.target.closest('.canvas-panel')) return;
  const zoomIntensity = 0.1;
  const direction = event.deltaY > 0 ? -1 : 1;
  const factor = 1 + (direction * zoomIntensity);
  const newZoom = Math.max(0.2, Math.min(5, zoom.value * factor));
  const rel = getRelativeMousePos(event);
  pan.x = rel.x - (rel.x - pan.x) * (newZoom / zoom.value);
  pan.y = rel.y - (rel.y - pan.y) * (newZoom / zoom.value);
  zoom.value = newZoom;
}

function handleKeyDown(event) {}

const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {};
  return {
    left: selectionBox.value.x + 'px',
    top: selectionBox.value.y + 'px',
    width: selectionBox.value.w + 'px',
    height: selectionBox.value.h + 'px'
  };
});

// --- 連線計算 ---
function getSegmentPath(x1, y1, x2, y2) {
    const dist = Math.abs(x2 - x1);
    const cpOffset = Math.max(dist * 0.5, 50);
    const cp1X = x1 + cpOffset;
    const cp2X = x2 - cpOffset;
    return `C ${cp1X} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`;
}

const wiresPaths = computed(() => {
  return systemState.wires.map(wire => {
    const startComp = systemState.components.find(c => c.id === wire.from);
    const endComp = systemState.components.find(c => c.id === wire.to);
    if (!startComp || !endComp) return { path: '', active: false, waypoints: [], sourceWire: wire };

    const startSize = getCompSize(startComp);
    let startX = startComp.x + startSize.w; 
    let startY = startComp.y + 40;

    if (startComp.expanded) {
      if (wire.fromPin) {
         const outputs = ChipRegistry[startComp.type]?.ioMapping?.outputs || {};
         const outKeys = Object.keys(outputs);
         const outIndex = outKeys.indexOf(wire.fromPin);
         if (outIndex !== -1) {
            startY = startComp.y + HEADER_HEIGHT + (outIndex * 35) + 17;
            startX += DOT_OFFSET_X;
         }
      } else {
        startY = startComp.y + (startSize.h / 2);
      }
    }

    let endX = endComp.x;
    let endY = endComp.y + 40; 

    if (endComp.expanded) {
      // endX += INPUT_DOT_X; 
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      let pinIndex = -1;
      if (wire.toPin) pinIndex = inputs.indexOf(wire.toPin);
      else if (inputs.length > 0) pinIndex = 0;

      if (pinIndex !== -1) {
        endY = endComp.y + HEADER_HEIGHT + (pinIndex * PIN_HEIGHT) + PIN_OFFSET_Y + 45;
      } else {
        endY = endComp.y + HEADER_HEIGHT + 20;
      }
    } else {
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      let pinIndex = inputs.indexOf(wire.toPin);
      if (pinIndex === -1) pinIndex = 0;
      const totalPins = inputs.length;
      const START_OFFSET = 15;
      const AVAILABLE_HEIGHT = 80 - (START_OFFSET * 2);

      if (totalPins <= 1) endY = endComp.y + 40; 
      else {
        const ratio = pinIndex / (totalPins - 1);
        endY = endComp.y + START_OFFSET + (AVAILABLE_HEIGHT * ratio);
      }
    }

    const waypoints = wire.waypoints || [];
    let d = `M ${startX} ${startY}`;
    let currX = startX;
    let currY = startY;

    waypoints.forEach(wp => {
        d += ` ${getSegmentPath(currX, currY, wp.x, wp.y)}`;
        currX = wp.x;
        currY = wp.y;
    });
    d += ` ${getSegmentPath(currX, currY, endX, endY)}`;

    let isActive = false;
    if (wire.fromPin && startComp.outputStates) isActive = Number(startComp.outputStates[wire.fromPin]) === 1;
    else isActive = Number(startComp.value) === 1;

    return { 
      path: d,
      active: isActive,
      waypoints: waypoints,
      sourceWire: wire
    };
  });
});

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
  const inputsHeight = HEADER_HEIGHT + (inputs.length * PIN_HEIGHT) + 20;
  const ioMapping = ChipRegistry[c.type]?.ioMapping || {};
  const outputs = ioMapping.outputs ? Object.keys(ioMapping.outputs) : [];
  const outputsHeight = HEADER_HEIGHT + (outputs.length * 35) + 20;
  maxH = Math.max(maxH, inputsHeight, outputsHeight);
  return { w: maxW + 100, h: maxH + 50 };
}
</script>

<style>
body { margin: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #121212; }
button, input, select, textarea { font-family: inherit; }
</style>
<style scoped>
.main-layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.workspace { display: flex; flex-grow: 1; overflow: hidden; position: relative; }

/* 🟢 Editor Panel Style */
.editor-panel { 
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  width: 250px; 
  background: #1e1e1e; border-right: 1px solid #333;
  display: flex; flex-direction: column; z-index: 20; 
  box-shadow: 2px 0 10px rgba(0,0,0,0.3); 
  flex-shrink: 0; /* 防止被擠壓 */
}

.panel-top-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #252526; border-bottom: 1px solid #333;
}
.panel-top-bar h3 { color: #ccc; margin: 0; font-size: 12px; letter-spacing: 1px; }

.icon-btn {
  background: transparent; border: none; color: #888; cursor: pointer;
  padding: 4px; border-radius: 4px; display: flex; align-items: center;
  transition: all 0.2s;
}
.icon-btn:hover { background: #333; color: #fff; }

.editor-panel textarea {
  flex-grow: 1; background: #1e1e1e; color: #d4d4d4;
  border: none; padding: 10px;
  font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; resize: none; outline: none;
}
.editor-panel textarea:focus { background: #222; }

.panel-bottom-bar { padding: 10px; border-top: 1px solid #333; background: #252526; }
.action-btn {
  width: 100%; background: #007fd4; color: white; border: none; padding: 8px;
  border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s;
}
.action-btn:hover { background: #0060a0; }

/* 🟢 Canvas Panel & Floating Button */
.canvas-panel { 
  flex-grow: 1; position: relative; background: #121212; overflow: hidden; color: #fff; user-select: none; outline: none;
}

.floating-panel-btn {
  position: absolute; top: 50px; left: 10px; z-index: 100;
  background: rgba(30, 30, 30, 0.8); color: #ccc;
  border: 1px solid #444; border-radius: 6px;
  padding: 6px; cursor: pointer; backdrop-filter: blur(4px);
  transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.floating-panel-btn:hover { background: #333; color: #fff; border-color: #666; transform: translateY(1px); }

/* 其他樣式維持不變 */
.selection-box { position: absolute; border: 1px solid #00a8ff; background-color: rgba(0, 168, 255, 0.2); pointer-events: none; z-index: 9999; }
.viewport { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 0 0; }
.wires-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: visible; }
.wire-path { stroke: #666; transition: stroke 0.2s; pointer-events: none; }
.wire-path.active { stroke: #0f0; filter: drop-shadow(0 0 3px #0f0); }
.wire-hit-area { pointer-events: stroke; cursor: crosshair; }
.wire-hit-area:hover { stroke: rgba(255, 255, 255, 0.1); }
.waypoint-handle { cursor: grab; pointer-events: all; transform-origin: center; transform-box: fill-box; fill:#ffbd2e;}
.waypoint-handle:hover { fill: #ffbd2e; stroke: #fff; stroke-width: 2px; transform: scale(1.2); }
.waypoint-handle:active { cursor: grabbing; transform: scale(1.2); }
.helper-text { position: absolute; bottom: 10px; right: 10px; color: #666; font-size: 12px; pointer-events: none; }
</style>