<template>
  <div class="control-panel">
    <h3>Signal Generator</h3>
    <div class="input-list">
      <div 
        v-for="input in inputComponents" 
        :key="input.id" 
        class="input-row"
      >
        <label>{{ input.id }}</label>
        
        <button 
          class="toggle-btn" 
          :class="{ active: input.value === 1 }"
          @click="toggle(input.id)"
        >
          {{ input.value }}
        </button>
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

// 自動過濾出所有的 INPUT 元件
const inputComponents = computed(() => {
  return systemState.components.filter(c => c.type === 'INPUT');
});

function toggle(id) {
  toggleInput(id);
}
</script>

<style scoped>
.control-panel {
  padding: 10px;
  background: #2b2b2b; /* 深色背景，像儀器面板 */
  color: #fff;
  border-top: 1px solid #444;
  height: 300px; /* 固定高度，放在底部 */
  overflow-y: auto;
}
.input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 5px;
  background: #3a3a3a;
  border-radius: 4px;
}
.toggle-btn {
  width: 40px;
  height: 24px;
  border: none;
  border-radius: 12px;
  background: #555;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}
.toggle-btn.active {
  background: #4caf50; /* 亮綠色 */
  font-weight: bold;
}
.empty-msg { color: #888; font-style: italic; }
</style>