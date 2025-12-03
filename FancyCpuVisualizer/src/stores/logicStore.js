// src/stores/logicStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLogicStore = defineStore('logic', () => {
  // 1. Component & State (核心資料)
  // 儲存所有的邏輯閘/元件
  const components = ref([
    // 範例結構
    // { id: 'AND_1', type: 'AND', x: 100, y: 100, inputs: { a: 0, b: 1 }, output: 0 }
  ]);

  // 儲存連線 (曲線的依據)
  const wires = ref([
    // { from: 'AND_1', to: 'OR_1', fromPort: 'output', toPort: 'a' }
  ]);

  // 2. Actions (App.vue 用來 CRUD 的介面)
  function addComponent(component) {
    components.value.push(component);
  }

  function updateComponentPosition(id, x, y) {
    const target = components.value.find(c => c.id === id);
    if (target) {
      target.x = x;
      target.y = y;
    }
  }

  function clearAll() {
    components.value = [];
    wires.value = [];
  }

  return {
    components,
    wires,
    addComponent,
    updateComponentPosition,
    clearAll
  };
});