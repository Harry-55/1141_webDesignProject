<template>
  <div class="control-panel">
    <div class="panel-header">
      <h3>Signal Generator</h3>
      <span class="input-count" v-if="inputComponents.length > 0">
        {{ inputComponents.length }} Inputs
      </span>
    </div>

    <div class="input-grid">
      <div 
        v-for="input in inputComponents" 
        :key="input.id" 
        class="input-card"
        :class="{ active: input.value === 1 }"
        @click="toggle(input.id)"
      >
        <span class="label">{{ input.id }}</span>
        <div class="toggle-indicator"></div>
      </div>
      
      <div v-if="inputComponents.length === 0" class="empty-msg">
        No Inputs detected.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { systemState, toggleInput } from '../useSystem';

// 自動過濾出所有的 INPUT 元件，並進行簡單排序 (讓 A0, A1... 排在一起)
const inputComponents = computed(() => {
  return systemState.components
    .filter(c => c.type === 'INPUT')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
});

function toggle(id) {
  toggleInput(id);
}
</script>

<style scoped>
.control-panel {
  padding: 10px 15px;
  background: #1e1e1e;
  border-top: 1px solid #333;
  /* 📐 縮減高度：原本很高，現在改為固定小高度或自動 */
  height: 140px; 
  display: flex;
  flex-direction: column;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.control-panel h3 {
  color: #aaa;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
  font-weight: 600;
}

.input-count {
  font-size: 10px;
  color: #555;
  background: #252525;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 📦 改用 Grid 佈局，自動填滿橫向空間 */
.input-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow-y: auto;
  align-content: flex-start; /* 內容少了就往上靠 */
}

/* 🎛️ 緊湊的小卡片設計 */
.input-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 50px; /* 固定寬度，很省空間 */
  height: 50px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  padding: 6px;
  transition: all 0.15s ease;
  user-select: none;
}

.input-card:hover {
  background: #333;
  border-color: #555;
}

/* 啟動狀態：卡片變亮，邊框變色 */
.input-card.active {
  background: #2e3b2e; /* 深綠底 */
  border-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.2);
}

.label {
  font-size: 12px;
  color: #ccc;
  font-weight: bold;
  font-family: 'Consolas', monospace; /* 標籤維持等寬字體比較好看 */
}

.input-card.active .label {
  color: #4caf50;
}

/* 💡 底部的小燈條 */
.toggle-indicator {
  width: 20px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  transition: background 0.2s;
}

.input-card.active .toggle-indicator {
  background: #4caf50; /* 亮綠燈 */
  box-shadow: 0 0 5px #4caf50;
}

/* 捲軸美化 */
.input-grid::-webkit-scrollbar { width: 6px; }
.input-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.input-grid::-webkit-scrollbar-track { background: transparent; }

.empty-msg { color: #555; font-size: 12px; font-style: italic; padding: 10px; }
</style>