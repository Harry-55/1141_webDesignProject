<!-- this is the "GOD" object, but I don't mind, because rewrite it will be a disaster, so enjoy. -->
 
<template>
  <div class="container">
    <h1>MIPS 視覺化 (v8.5)</h1>
    <p class="fsm-state">FSM State: <span>{{ cpuDisplay.currentState }}</span></p>

    <div class="svg-container">
      <svg width="100%" viewBox="0 0 1994 1144" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="Frame 1">
          <rect width="1994" height="1144" fill="#111827"/>

          <rect id="ControlROM" x="847" y="876" width="899" height="143" 
                class="box" :class="{'box-active': checkActive('ControlROM')}"/>
          <text x="1296" y="955" class="label">Control ROM</text>

          <rect id="PC" x="327" y="495" width="168" height="119" 
                class="box"  
                :class="{
                  'box-active': checkActive('PC'),
                  'clock-active': cpuDisplay.currentState === 'FETCH_1'
                }"/>
          <text x="411" y="545" class="label">PC</text>
          <text x="411" y="580" class="data-label">0x{{ cpuDisplay.pc.toString(16) }}</text>

          <path id="PCMux" d="M289 526.166L261 510V592.166L289 576V526.166Z" 
                class="box" :class="{'box-active': checkActive('PCMux')}"/>

          <path id="PCadder" d="M379.5 388.5L432 362.5V388.5L406.5 403V437L432 449.5V477L379.5 449.5V388.5Z" 
                class="box" :class="{'box-active': checkActive('PCadder')}"/>

          <rect id="InstMemory" x="570" y="246" width="233" height="439" 
                class="box" :class="{'box-active': checkActive('InstMemory')}"/>
          <text x="686" y="445" class="label">Inst Memory</text>
          <text x="686" y="480" class="data-label">Mem[0]: 0x{{ cpuDisplay.mem0.toString(16) }}</text>
          
          <rect id="Register" x="957.5" y="246.5" width="233" height="438" 
                class="box"
                :class="{
                    'box-active': checkActive('Register'),
                    'clock-active': cpuDisplay.currentState === 'FETCH_1'
                  }"/>
          <text x="1074" y="420" class="label">Reg File</text>
          <text x="1074" y="460" class="data-label">$t0 (8): {{ cpuDisplay.reg_t0 }}</text>
          <text x="1074" y="490" class="data-label">$t1 (9): {{ cpuDisplay.reg_t1 }}</text>
          <text x="1074" y="520" class="data-label">$t2 (10): {{ cpuDisplay.reg_t2 }}</text>
          
          <g id="ALU">
            <path d="M1310.5 361.5V279.5L1435 361.5V548.5L1310.5 627V548.5L1368.5 504.5V401L1310.5 361.5Z" 
                  class="box" :class="{'box-active': checkActive('ALU')}" 
                  shape-rendering="crispEdges"/>
            <text x="1372" y="460" class="label">ALU</text>
            <text x="1372" y="495" class="data-label">R: {{ cpuDisplay.aluResult }}</text>
          </g>

          <rect id="DataMemo" x="1569" y="246" width="235" height="439" 
                class="box" 
                :class="{
                  'box-active': checkActive('DataMemo'),
                  'clock-active': cpuDisplay.currentState === 'FETCH_1'
                }"/>
          <text x="1686" y="445" class="label">Data Memory</text>

          <path id="RegWriteMUX" d="M910.5 578V473L933.5 486.279V564.721L910.5 578Z" 
                class="box" :class="{'box-active': checkActive('RegWriteMUX')}"/>
          <path id="RegDataMUX" d="M911 699V594L934 607.279V685.721L911 699Z" 
                class="box" :class="{'box-active': checkActive('RegDataMUX')}"/>
          
          <rect id="Flag" x="1259" y="661" width="114" height="44" 
                class="box" :class="{'box-active': checkActive('Flag')}"/>

          <circle id="CLK" cx="411" cy="989" r="58" 
                  class="box" 
                  :class="{'clock-active': cpuDisplay.currentState === 'FETCH_1'}"/>
          <text x="411" y="995" class="label">CLK</text>


          <line id="PCtoInstOrPCadderPath" x1="495" y1="554.5" x2="570" y2="554.5" 
                class="wire" :class="{'wire-active': cpuDisplay.currentState === 'FETCH_1'}"/>
          
          <g id="PCcurrentPath" class="wire" :class="{'wire-active': cpuDisplay.currentState === 'FETCH_1'}">
            <line x1="526.5" y1="555" x2="526.5" y2="462" stroke="inherit"/>
            <line x1="527" y1="462.5" x2="432" y2="462.5" stroke="inherit"/>
          </g>

          <g id="PCcurADD4Path" class="wire" :class="{'wire-active': checkActive('PCcurADD4Path')}">
            <line x1="379" y1="414.5" x2="209" y2="414.5" stroke="inherit"/>
            <line x1="209.5" y1="414" x2="209.5" y2="533" stroke="inherit"/>
            <line x1="209" y1="532.5" x2="256" y2="532.5" stroke="inherit"/>
          </g>
          
          <line id="PCnextPath" x1="289" y1="550.5" x2="324" y2="550.5" 
                class="wire" :class="{'wire-active': checkActive('PCnextPath')}"/>

          <line id="R1readAddr" x1="847" y1="313.5" x2="953" y2="313.5" 
                class="wire" :class="{'wire-active': checkActive('R1readAddr')}"/>
          <line id="R2readAddr" x1="847" y1="380.5" x2="953" y2="380.5" 
                class="wire" :class="{'wire-active': checkActive('R2readAddr')}"/>
          
          <line id="RegWrite4to7" x1="847" y1="520.5" x2="907" y2="520.5" 
                class="wire" :class="{'wire-active': checkActive('RegWrite4to7')}"/>
          <line id="RegWrite0to3" x1="847" y1="488.5" x2="907" y2="488.5" 
                class="wire" :class="{'wire-active': checkActive('RegWrite0to3')}"/>
          <line id="RegWrite8to11" x1="847" y1="556.5" x2="907" y2="556.5" 
                class="wire" :class="{'wire-active': checkActive('RegWrite8to11')}"/>
          <line id="RegWritePath" x1="935" y1="520.5" x2="953" y2="520.5" 
                class="wire" :class="{'wire-active': checkActive('RegWritePath')}"/>
          <line id="RegWritePath_2" x1="934" y1="646.5" x2="959" y2="646.5"
                class="wire" :class="{'wire-active': checkActive('RegWritePath_2')}"/>

          <line id="RegToALUpathD1" x1="1191" y1="327.5" x2="1308" y2="327.5" 
                class="wire" :class="{'wire-active': checkActive('RegToALUpathD1')}"/>
          <line id="RegToALUD2MUXPath" x1="1191" y1="582.5" x2="1311" y2="582.5"
                class="wire" :class="{'wire-active': checkActive('RegToALUD2MUXPath')}"/>
          <line id="ALUtoDataMemoPath" x1="1435" y1="448.5" x2="1569" y2="448.5" 
                class="wire" :class="{'wire-active': checkActive('ALUtoDataMemoPath')}"/>
          <line id="ALUtoFlagPath" x1="1341.5" y1="609" x2="1341.5" y2="661"
                class="control-line" :class="{'wire-control-line-active': checkActive('ALUtoFlagPath')}"/>

          <g id="ALUtoRegDataPath" class="wire" :class="{'wire-active': checkActive('ALUtoRegDataPath')}">
            <line x1="881" y1="673.5" x2="907" y2="673.5" stroke="inherit"/>
            <line x1="881.5" y1="674" x2="881.5" y2="735" stroke="inherit"/>
            <line x1="881" y1="734.5" x2="1494" y2="734.5" stroke="inherit"/>
            <line x1="1493.5" y1="735" x2="1493.5" y2="449" stroke="inherit"/>
          </g>
          
          <g id="DataMemoToRegPath" class="wire" :class="{'wire-active': checkActive('DataMemoToRegPath')}">
            <line x1="848" y1="646.5" x2="911" y2="646.5" stroke="inherit"/>
            <line x1="847.5" y1="647" x2="847.5" y2="766" stroke="inherit"/>
            <line x1="1802" y1="448.5" x2="1872" y2="448.5" stroke="inherit"/>
            <line x1="1872.5" y1="449" x2="1872.5" y2="767" stroke="inherit"/>
            <line x1="1873" y1="766.5" x2="847" y2="766.5" stroke="inherit"/>
          </g>

          <g id="RegToDataPath" class="wire" :class="{'wire-active': checkActive('RegToDataPath')}">
            <line x1="1216.5" y1="583" x2="1216.5" y2="634" stroke="inherit"/>
            <line x1="1216" y1="633.5" x2="1566" y2="633.5" stroke="inherit"/>
          </g>
          
          <g id="PCjumpPath" class="wire" :class="{'wire-active': checkActive('PCjumpPath')}">
            <path x1="111.5" y1="196.75" d="M111.5 196.75H847.5" stroke="inherit"/>
            <line x1="111.5" y1="197" x2="111.5" y2="578" stroke="inherit"/>
            <line x1="111" y1="577.5" x2="256" y2="577.5" stroke="inherit"/>
          </g>
          
          <g id="CLKPath" class="control-line" 
            :class="{'clock-active': cpuDisplay.currentState === 'FETCH_1'}">
            <line x1="411.5" y1="614" x2="411.5" y2="931" stroke="inherit"/>
            <line x1="1179.5" y1="685" x2="1179.5" y2="802" stroke="inherit"/>
            <line x1="1179" y1="802.5" x2="411" y2="802.5" stroke="inherit"/>
            <line x1="1745.5" y1="802" x2="1745.5" y2="685" stroke="inherit"/>
            <line x1="1746" y1="802.5" x2="1179" y2="802.5" stroke="inherit"/>
          </g>


          <g id="INSTtoMainPath" class="wire" :class="{'wire-active': checkActive('INSTtoMainPath')}">
            <line x1="803" y1="348.5" x2="847" y2="348.5" stroke="inherit"/>
          </g>

          <g id="Line 23" class="wire" :class="{'control-line-active': checkActive('Line 23')}">
            <line x1="847" y1="613.5" x2="907" y2="613.5"  stroke="inherit"/>
          </g>

          <g id="InstBusToAnyway" class="wire" :class="{'wire-active': checkActive('InstBusToAnyway')}">
            <line x1="847.5" y1="196" x2="847.5" y2="614" stroke="inherit"/>
          </g>
          
          <g id="ControlToInstPath" class="wire" :class="{'control-line-active': checkActive('ControlToInstPath')}">
            <line id="Line 48" x1="670.5" y1="685" x2="670.5" y2="948" stroke="inherit"/>
            <line id="Line 49" x1="670" y1="947.5" x2="847" y2="947.5" stroke="inherit"/>
          </g>

          <g id="ControlToPCMUXPath" class="control-line" :class="{'control-line-active': checkActive('ControlToPCMUXPath')}">
            <line x1="275.5" y1="586" x2="275.5" y2="908" stroke="inherit"/>
            <line x1="275" y1="907.5" x2="847" y2="907.5" stroke="inherit"/>
          </g>
          
          <g id="ControlToRegWrite" class="control-line" :class="{'control-line-active': checkActive('ControlToRegWrite')}">
            <line x1="1040.5" y1="685" x2="1040.5" y2="876" stroke="inherit"/>
            <line x1="957" y1="685" x2="1040" y2="685" stroke="inherit"/>
          </g>
          
          <line id="ControlToALUPath" x1="1391.5" y1="575" x2="1391.5" y2="876" 
                class="control-line" :class="{'control-line-active': checkActive('ControlToALUPath')}"/>

          <line id="ControlToDataEnPath" x1="1687.5" y1="685" x2="1687.5" y2="876" 
                class="control-line" :class="{'control-line-active': checkActive('ControlToDataEnPath')}"/>
          
          <line id="ControlToDataWriteAddrPath" x1="1629.5" y1="685" x2="1629.5" y2="876" 
                class="control-line" :class="{'control-line-active': checkActive('ControlToDataWriteAddrPath')}"/>
          
          <line id="ControlToRegWritePath" x1="922.5" y1="572" x2="922.5" y2="601"
                class="control-line" :class="{'control-line-active': checkActive('ControlToRegWritePath')}"/>
          
          <line id="ControlToRegDataOrControlToRegWritePath" x1="922.5" y1="692" x2="922.5" y2="876"
                class="control-line" :class="{'control-line-active': checkActive('ControlToRegDataOrControlToRegWritePath')}"/>
          
          <line id="FlagToControlROMpath" x1="1311.5" y1="705" x2="1311.5" y2="876"
                class="control-line" :class="{'control-line-active': checkActive('FlagToControlROMpath')}"/>
          
        </g>
      </svg>
    </div>
    
    <div class="bottom-panel">
        <div class="panel-box editor-area">
            <h2 class="text-xl font-bold mb-2 border-b border-gray-700 pb-1">MIPS 組合語言</h2>
            <textarea v-model="assemblyCode"></textarea>
            <button @click="handleAssembleAndLoad" :disabled="isLoading" class="bg-purple-600 hover:bg-purple-700 w-full mt-2">
                組譯並載入
            </button>
        </div>
        <div class="panel-box w-64"> <h2 class="text-xl font-bold mb-2 border-b border-gray-700 pb-1">控制面板</h2>
            <div class="flex flex-col space-y-2">
                <button @click="handleStep" :disabled="isLoading">Run 1 Step</button>
                <button @click="handleRunInstruction" :disabled="isLoading" class="bg-green-600 hover:bg-green-700">Run 1 Instruction</button>
            </div>
        </div>
    </div>
    
  </div>
</template>

<script setup>
import { reactive, onMounted, ref, computed } from 'vue';
import { MipsCPU } from './cpu/CPU.js';
import { MockAssembler } from './cpu/Assembler.js';
import { VisualMapping } from './cpu/VisualMapping.js'; // 確保檔案存在！

const cpu = new MipsCPU();
const assembler = new MockAssembler();
const visualMapper = new VisualMapping();
const isLoading = ref(true);

const cpuDisplay = reactive({
  currentState: 'BOOTING',
  controlSignals: {},
  pc: 0,
  aluResult: 0,
  mem0: 0,
  reg_t0: 0,
  reg_t1: 0,
  reg_t2: 0,
});

const assemblyCode = ref('add $t2, $t0, $t1\nnop');

// [關鍵] 計算屬性：自動算出 Set
const activeIdsSet = computed(() => {
  return visualMapper.getActiveIds(cpuDisplay.controlSignals || {});
});

// [關鍵] 檢查函式
const checkActive = (id) => {
  return activeIdsSet.value.has(id);
};

onMounted(async () => {
  await cpu.initialize();
  isLoading.value = false;
  updateDisplay();
});

const handleStep = () => {
  cpu.step();
  updateDisplay();
};

const handleAssembleAndLoad = () => {
  const machineCode = assembler.assemble(assemblyCode.value);
  cpu.loadProgram(machineCode);
  updateDisplay();
};

const handleRunInstruction = () => {
  if (cpu.controlUnit.currentState !== 'FETCH_1') {
      alert("請先完成當前指令，或重置 CPU。");
      return;
  }
  const run = () => {
    cpu.step();
    updateDisplay();
    if (cpu.controlUnit.currentState !== 'FETCH_1') {
        setTimeout(run, 500); // 慢動作播放
    }
  };
  run();
};

const updateDisplay = () => {
  cpuDisplay.currentState = cpu.controlUnit.currentState;
  cpuDisplay.controlSignals = { ...cpu.controlUnit.getSignals() };
  cpuDisplay.pc = cpu.pc.read();
  cpuDisplay.aluResult = cpu.alu.output;
  cpuDisplay.mem0 = cpu.instMemory.read(0);
  cpuDisplay.reg_t0 = cpu.regFile.registers[8].read();
  cpuDisplay.reg_t1 = cpu.regFile.registers[9].read();
  cpuDisplay.reg_t2 = cpu.regFile.registers[10].read();
};
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;

/* [關鍵] 設定 Body 佔滿視窗且不出現捲軸 */
body {
  @apply bg-gray-900 text-gray-200 font-sans m-0 p-0 overflow-hidden;
}

/* [關鍵] 主容器：改為全螢幕 Flex Column */
.container {
  @apply w-full h-screen p-4 flex flex-col; 
  /* 移除了 max-w-7xl，改用 w-full */
}

h1 {
  @apply text-3xl font-bold text-cyan-400 mb-2 text-center flex-shrink-0;
}

/* 按鈕區塊：防止被壓縮 */
.controls-top {
  @apply flex justify-center gap-4 mb-2 flex-shrink-0;
}

button {
  @apply bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors;
}
button:hover {
  @apply bg-blue-500;
}
button:disabled {
  @apply bg-gray-500 cursor-not-allowed;
}

.fsm-state {
  @apply text-center text-lg text-gray-400 my-1 flex-shrink-0;
}
.fsm-state span {
  @apply text-2xl font-bold text-cyan-300;
}

/* [關鍵] SVG 容器：自動長高 (flex-grow) 並置中內容 */
.svg-container {
  @apply flex-grow my-2 relative;
  /* background-color: #272F50;  <-- 移除這行背景色，或是改成透明 */
  background-color: transparent; 
  /* border: 1px solid #374151; <-- 移除邊框，這樣邊界感消失 */
  
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* [修改] 讓 SVG 盡可能大 */
.svg-container svg {
  width: 100%;
  height: 100%;
  /* max-width/max-height 保持 100%，確保不破版 */
  max-width: 100%;
  max-height: 100%;
}

/* 底部編輯器與控制面板：固定高度或彈性 */
.bottom-panel {
  @apply flex space-x-6 w-full mt-2 flex-shrink-0;
  height: 25vh; /* 設定一個固定高度，例如視窗的 25% */
}

.panel-box {
  @apply bg-gray-800 p-4 rounded-lg shadow-xl flex flex-col;
}

.editor-area {
  @apply flex-1;
}

textarea {
  @apply w-full flex-grow p-2 rounded bg-gray-900 font-mono text-sm border border-gray-700 resize-none;
}

/* --- 以下是 SVG 內部的高亮樣式 (保持不變) --- */

.box {
  fill: #374151; 
  fill-opacity: 0.8;
  stroke: #6b7280; 
  stroke-width: 1;
  transition: all 0.2s ease-in-out;
}
.box-active {
  stroke: #06b6d4; 
  stroke-width: 4;
  filter: drop-shadow(0 0 10px #06b6d4);
}

.wire {
  stroke: white; 
  stroke-width: 2;
  transition: all 0.2s ease-in-out;
  fill: none;
}
.wire-active {
  stroke: #34d399 !important; 
  stroke-width: 4;
  filter: drop-shadow(0 0 5px #34d399);
}

.control-line {
  stroke: #6b7280; 
  stroke-width: 2;
  stroke-dasharray: 4 2; 
  transition: all 0.2s ease-in-out;
  fill: none;
}
.control-line-active {
  stroke: #f87171 !important; 
  stroke-width: 3;
  stroke-dasharray: 0; 
  filter: drop-shadow(0 0 5px #f87171);
}

.clock-active {
  stroke: #FACC15 !important; 
  stroke-width: 4;
  stroke-dasharray: 0;   
  filter: drop-shadow(0 0 10px #FACC15); 
}

.label {
  font-family: monospace;
  fill: #E5E7EB; 
  font-size: 24px;
  text-anchor: middle; 
  user-select: none;
}
.data-label {
  font-family: monospace;
  fill: #fcd34d; 
  font-size: 22px;
  text-anchor: middle;
  user-select: none;
}
</style>