function initializeCoreMod() {
    var Opcodes = Java.type('org.objectweb.asm.Opcodes');
    var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
    var owner = 'plus/dragons/createintegratedfarming/integration/starcatcher/StarcatcherFishingNetCatchProvider';
    var methodDesc = '(Lplus/dragons/createintegratedfarming/common/fishing/net/FishingNetCatchContext;)Ljava/util/List;';
    var api = 'com/wdiscute/starcatcher/fish/FishApi';
    var bob = 'com/wdiscute/starcatcher/bobentity/FishingBobEntity';
    var oldDesc = '(Lcom/wdiscute/starcatcher/fish/FishProperties;FZLnet/minecraft/world/entity/player/Player;Z)Lnet/minecraft/world/item/ItemStack;';
    var newDesc = '(L' + bob + ';' + oldDesc.substring(1);
    function require(ok, message) {
        if (!ok) throw new Error('[Fishing Net Starcatcher Fix] ' + message);
    }
    function previous(node) {
        do { node = node.getPrevious(); } while (node !== null && node.getOpcode() < 0);
        return node;
    }
    return {
        'fishing_net_starcatcher_fix': {
            'target': { 'type': 'CLASS', 'name': owner.replace(/\//g, '.') },
            'transformer': function(node) {
                require(String(node.name) === owner, 'Unexpected target class');
                var method = null;
                for (var i = 0; i < node.methods.size(); i++) {
                    var candidate = node.methods.get(i);
                    if (String(candidate.name) === 'getCatch' && String(candidate.desc) === methodDesc) {
                        require(method === null, 'Duplicate getCatch method');
                        method = candidate;
                    }
                }
                require(method !== null, 'Expected getCatch method is missing');
                var call = null, currentCalls = 0, bobLocal = -1;
                for (var insn = method.instructions.getFirst(); insn !== null; insn = insn.getNext()) {
                    if (insn.getOpcode() === Opcodes.INVOKESPECIAL && String(insn.owner) === bob && String(insn.name) === '<init>') {
                        var store = insn.getNext();
                        while (store !== null && store.getOpcode() < 0) store = store.getNext();
                        require(store !== null && store.getOpcode() === Opcodes.ASTORE && bobLocal < 0, 'Unexpected bob construction');
                        bobLocal = store['var'];
                    }
                    if (insn.getOpcode() !== Opcodes.INVOKESTATIC || String(insn.owner) !== api || String(insn.name) !== 'makeItemStackNonBucket') continue;
                    if (String(insn.desc) === oldDesc) {
                        require(call === null, 'Duplicate outdated FishApi call');
                        call = insn;
                    } else if (String(insn.desc) === newDesc) currentCalls++;
                    else require(false, 'Unsupported FishApi signature');
                }
                if (call === null && currentCalls === 1) return node;
                require(call !== null && currentCalls === 0 && bobLocal >= 0, 'Unsupported fishing net bytecode');
                var expected = [Opcodes.ICONST_0, Opcodes.INVOKEVIRTUAL, Opcodes.ALOAD,
                    Opcodes.ICONST_0, Opcodes.FMUL, Opcodes.LDC, Opcodes.INVOKEINTERFACE,
                    Opcodes.INVOKEVIRTUAL, Opcodes.ALOAD, Opcodes.ALOAD];
                var first = call;
                for (var j = 0; j < expected.length; j++) {
                    first = previous(first);
                    require(first !== null && first.getOpcode() === expected[j], 'Unsupported catch arguments at ' + j);
                }
                method.instructions.insertBefore(first, new VarInsnNode(Opcodes.ALOAD, bobLocal));
                call.desc = newDesc;
                method.maxStack = Math.max(method.maxStack, 6);
                return node;
            }
        }
    };
}
