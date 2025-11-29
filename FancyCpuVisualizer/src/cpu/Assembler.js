// src/cpu/Assembler.js

// [關鍵] 確保 "export" 這個字在 "class" 的前面
export class MockAssembler {
    assemble(text) {
        let machineCode = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const trimmedLine = line.trim().toLowerCase();
            
            // 簡易的組譯邏輯
            if (trimmedLine === 'add $t2, $t0, $t1') {
                // R-type: add $t2, $t0, $t1
                // opcode=0, rs=8, rt=9, rd=10, funct=0x20
                machineCode.push(0x01295020);
            } else if (trimmedLine === 'nop') {
                machineCode.push(0x00000000);
            }
            // (你未來可以在這裡加入 ADDI, LW, SW 的組譯邏輯)
        });
        
        console.log("組譯完成:", machineCode);
        return machineCode;
    }
}