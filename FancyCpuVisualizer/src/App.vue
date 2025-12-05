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
        tabindex="0"
        @mousedown.prevent="handleMouseDown" 
        @mousemove="handleMouseMove" 
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel.prevent="handleWheel"
        @keydown="handleKeyDown"
        :style="{ cursor: isPanning ? 'grabbing' : 'default' }"
      >
        <h3>Renderer View (Zoom: {{ Math.round(zoom * 100) }}%)</h3>
        
        <div 
          class="viewport" 
          :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
        >
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
            :is-selected="selectedIds.has(comp.id)" 
            @startDrag="startDrag"
          />
          
          <div v-if="selectionBox" class="selection-box" :style="selectionBoxStyle"></div>
        </div>
        
        <div class="helper-text">
          Ctrl+Click/Drag to Select • Drag Space to Pan • Scroll to Zoom
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

const PIN_HEIGHT = 30;
const HEADER_HEIGHT = 40;
const PIN_OFFSET_Y = 15;
// --- HDL 相關 (維持不變) ---
const hdlCode = ref(`
INPUT reset 50 50

INPUT Op 200 50
INPUT a  250 50

INPUT c1 300 50
INPUT c2 350 50
INPUT c3 400 50
INPUT c4 450 50
INPUT c5 500 50
INPUT c6 550 50

INPUT d1 600 50
INPUT d2 650 50
INPUT d3 700 50

INPUT j1 750 50
INPUT j2 800 50
INPUT j3 850 50

INPUT Instr0 50 150
INPUT Instr1 100 150
INPUT Instr2 150 150
INPUT Instr3 200 150

COMPUTER_4_BIT HackPC 450 300

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

// 選取功能相關狀態
const selectedIds = ref(new Set());
const isBoxSelecting = ref(false);
const selectionStart = { x: 0, y: 0 };
const selectionBox = ref(null);

// 拖曳相關
const lastMousePos = { x: 0, y: 0 };
let isDraggingComp = false;

// 🟢 輔助函式：取得滑鼠相對於畫布(Canvas Panel)的座標
function getRelativeMousePos(event) {
  // 嘗試抓取 canvas-panel，如果 event target 本身就是最好
  const panel = document.querySelector('.canvas-panel');
  if (!panel) return { x: event.clientX, y: event.clientY };
  
  const rect = panel.getBoundingClientRect();
  return {
    x: event.clientX - rect.left, // 扣除左側編輯器的寬度
    y: event.clientY - rect.top   // 扣除頂部的高度
  };
}

function handleMouseDown(event) {
  if (event.target.closest('.component-wrapper')) return;

  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;

  if (event.ctrlKey) {
    isBoxSelecting.value = true;
    
    // 🟢 修正：使用相對座標來計算起點
    const rel = getRelativeMousePos(event);
    const worldX = (rel.x - pan.x) / zoom.value;
    const worldY = (rel.y - pan.y) / zoom.value;
    
    selectionStart.x = worldX;
    selectionStart.y = worldY;
    selectionBox.value = { x: worldX, y: worldY, w: 0, h: 0 };
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

function handleMouseMove(event) {
  const deltaX = event.clientX - lastMousePos.x;
  const deltaY = event.clientY - lastMousePos.y;
  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;

  if (isPanning.value) {
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
    // 🟢 修正：使用相對座標來更新選取框
    const rel = getRelativeMousePos(event);
    const currentWorldX = (rel.x - pan.x) / zoom.value;
    const currentWorldY = (rel.y - pan.y) / zoom.value;

    const x = Math.min(selectionStart.x, currentWorldX);
    const y = Math.min(selectionStart.y, currentWorldY);
    const w = Math.abs(currentWorldX - selectionStart.x);
    const h = Math.abs(currentWorldY - selectionStart.y);
    
    selectionBox.value = { x, y, w, h };
  }
}

function handleWheel(event) {
  if (!event.target.closest('.canvas-panel')) return;
  
  const zoomIntensity = 0.1;
  const direction = event.deltaY > 0 ? -1 : 1;
  const factor = 1 + (direction * zoomIntensity);
  const newZoom = Math.max(0.2, Math.min(5, zoom.value * factor));
  
  // 🟢 修正：縮放中心點也必須使用相對座標 (防止縮放時畫面漂移)
  const rel = getRelativeMousePos(event);
  
  pan.x = rel.x - (rel.x - pan.x) * (newZoom / zoom.value);
  pan.y = rel.y - (rel.y - pan.y) * (newZoom / zoom.value);
  
  zoom.value = newZoom;
}

function handleMouseUp() {
  if (isBoxSelecting.value && selectionBox.value) {
    const box = selectionBox.value;
    systemState.components.forEach(comp => {
      const compW = comp.expanded ? 300 : 100;
      const compH = comp.expanded ? 200 : 80;
      
      if (comp.x < box.x + box.w &&
          comp.x + compW > box.x &&
          comp.y < box.y + box.h &&
          comp.y + compH > box.y) {
        selectedIds.value.add(comp.id);
      }
    });
  }

  isPanning.value = false;
  isDraggingComp = false;
  isBoxSelecting.value = false;
  selectionBox.value = null;
}

const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {};
  return {
    left: selectionBox.value.x + 'px',
    top: selectionBox.value.y + 'px',
    width: selectionBox.value.w + 'px',
    height: selectionBox.value.h + 'px'
  };
});

// --- 連線計算 (維持不變) ---
const COLLAPSED_HEIGHT = 80; // 元件預設高度
const PADDING_Y = 10;        // 上下保留的邊距，避免線條貼齊邊緣
const DOT_OFFSET_X = -39;

const wiresPaths = computed(() => {
  return systemState.wires.map(wire => {
    const startComp = systemState.components.find(c => c.id === wire.from);
    const endComp = systemState.components.find(c => c.id === wire.to);
    if (!startComp || !endComp) return { path: '', active: false };

    // 1. 計算起點 (Start) - 保持上次修復的邏輯
    const startSize = getCompSize(startComp);
    let startX = startComp.x + startSize.w; 
    let startY = startComp.y + 40;

    if (startComp.expanded) {
      if (wire.fromPin) {
         const outputs = ChipRegistry[startComp.type]?.ioMapping?.outputs || {};
         const outKeys = Object.keys(outputs);
         const outIndex = outKeys.indexOf(wire.fromPin);
         
         if (outIndex !== -1) {
            // Y 軸維持不變
            startY = startComp.y + 40 + (outIndex * 35) + 17; 
            
            // 🟢 修正 X 軸：使用新的負值偏移量
            startX += DOT_OFFSET_X; 
         }
      } else {
        startY = startComp.y + (startSize.h / 2);
      }
    }

    // ==========================================
    // 🟢 2. 計算終點 (End) - 針對「未展開」做比例壓縮修正
    // ==========================================
    const endX = endComp.x;
    let endY; 

    if (endComp.expanded) {
      // --- 展開狀態 (維持精準對齊) ---
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      let pinIndex = -1;
      if (wire.toPin) pinIndex = inputs.indexOf(wire.toPin);
      else if (inputs.length > 0) pinIndex = 0;

      if (pinIndex !== -1) {
        endY = endComp.y + HEADER_HEIGHT + (pinIndex * PIN_HEIGHT) + PIN_OFFSET_Y + 40;
      } else {
        endY = endComp.y + HEADER_HEIGHT + 20;
      }
    } else {
      // --- 🟢 縮小狀態 (關鍵修正：比例分配) ---
      const inputs = ChipRegistry[endComp.type]?.inputs || [];
      let pinIndex = inputs.indexOf(wire.toPin);
      
      // 如果找不到腳位，預設視為第 0 個
      if (pinIndex === -1) pinIndex = 0;

      // 計算可用高度區間 (80px - 上下邊距)
      const availableHeight = COLLAPSED_HEIGHT - (PADDING_Y * 2);
      
      // 計算每條線的間距 (Step)
      // 如果只有 1 個輸入，就在中間；如果有多個，均分高度
      const totalPins = inputs.length;
      const step = totalPins > 1 ? availableHeight / (totalPins - 1) : 0;

      if (totalPins <= 1) {
        endY = endComp.y + (COLLAPSED_HEIGHT / 2); // 只有一個輸入時居中
      } else {
        // 公式：元件頂部 + 上邊距 + (第幾個 * 間距)
        endY = endComp.y + PADDING_Y + (pinIndex * step);
      }
    }

    // 3. 判斷線路顏色 (維持不變)
    let isActive = false;
    if (wire.fromPin && startComp.outputStates) isActive = Number(startComp.outputStates[wire.fromPin]) === 1;
    else isActive = Number(startComp.value) === 1;

    // 4. 繪製曲線
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
  
  let maxW = 300; 
  let maxH = 200;

  if (c.internals && c.internals.components) {
    c.internals.components.forEach(sub => {
      const subSize = getCompSize(sub);
      const right = sub.x + subSize.w;
      const bottom = sub.y + subSize.h;
      if (right > maxW) maxW = right;
      if (bottom > maxH) maxH = bottom;
    });
  }
  
  // 加上輸入孔的高度計算
  const inputs = ChipRegistry[c.type]?.inputs || [];
  const minHeightForInputs = HEADER_HEIGHT + (inputs.length * PIN_HEIGHT) + 20;
  if (minHeightForInputs > maxH) maxH = minHeightForInputs;

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
  user-select: none; /* 🚫 禁止選取文字 */
  outline: none;
}

.selection-box {
  position: absolute;
  border: 1px solid #00a8ff;
  background-color: rgba(0, 168, 255, 0.2);
  pointer-events: none; /* 讓滑鼠事件穿透 */
  z-index: 9999;
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