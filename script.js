document.addEventListener('DOMContentLoaded', function () {
    const networkContainer = document.getElementById('transaction-network');
    const timelineContainer = document.getElementById('transaction-timeline');
    const infoContent = document.getElementById('info-content');
    const loadingOverlay = document.getElementById('loading-overlay');
    const transactionsFileInput = document.getElementById('transactions-file-input');
    const accountsFileInput = document.getElementById('accounts-file-input');
    const loadDataBtn = document.getElementById('load-data-btn');

    // --- THIS IS THE FIX: Re-declaring the button variables ---
    const detectSmurfingBtn = document.getElementById('detect-smurfing-btn');
    const detectLayeringBtn = document.getElementById('detect-layering-btn');
    const detectRapidMovementBtn = document.getElementById('detect-rapid-movement-btn');
    const resetBtn = document.getElementById('reset-btn');
    const togglePhysicsBtn = document.getElementById('toggle-physics-btn');

    let network = null;
    let timeline = null;
    let nodes = new vis.DataSet();
    let edges = new vis.DataSet();
    let timelineItems = new vis.DataSet();
    let physicsEnabled = true;

    const options = {
        nodes: {
            shape: 'dot',
            font: { size: 16, color: '#e1e7f2', face: 'Inter' },
            borderWidth: 2,
            color: {
                background: '#2a303c',
                border: '#8a93a5',
                highlight: { background: '#3b82f6', border: '#e1e7f2' }
            },
            shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.5)', size: 10, x: 2, y: 2 },
            scaling: { min: 12, max: 50, label: { enabled: true, min: 14, max: 30 } }
        },
        edges: {
            width: 1.5,
            color: { color: '#4a5160', highlight: '#3b82f6', hover: '#60a5fa' },
            font: { align: 'top', color: '#8a93a5', face: 'Inter', size: 12, strokeWidth: 0 },
            smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
        },
        physics: {
            barnesHut: { gravitationalConstant: -30000, centralGravity: 0.25, springLength: 200 },
            minVelocity: 0.75, solver: 'barnesHut',
        },
        interaction: { hover: true, tooltipDelay: 200, navigationButtons: true },
        groups: {
            highlight_smurfing: { color: { background: '#d97706', border: '#fde68a' }, borderWidth: 3 },
            highlight_layering: { color: { background: '#9333ea', border: '#e9d5ff' }, borderWidth: 3 },
            highlight_rapid: { color: { background: '#dc2626', border: '#fecaca' }, borderWidth: 3 },
            normal: { color: { background: '#2a303c', border: '#8a93a5' } },
            dim: { color: { background: '#12151c', border: '#363c4a' } }
        }
    };
    
    const initializeNetwork = () => {
        if (network) network.destroy();
        const data = { nodes: nodes, edges: edges };
        network = new vis.Network(networkContainer, data, options);
        setupNetworkEventListeners();
    };

    const initializeTimeline = () => {
        if (timeline) timeline.destroy();
        const timelineOptions = {
            stack: true, margin: { item: { horizontal: 2, vertical: 5 } }, orientation: 'bottom',
        };
        timeline = new vis.Timeline(timelineContainer, timelineItems, timelineOptions);
        timeline.on('select', params => {
            if (params.items.length > 0) {
                network.setSelection({ nodes: [], edges: params.items });
            }
        });
    };

    const setupNetworkEventListeners = () => {
        network.on('select', function (params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = nodes.get(nodeId);
                const score = node.riskScore || 0;
                let riskColor = 'text-green-400';
                if (score > 75) riskColor = 'text-red-400';
                else if (score > 40) riskColor = 'text-amber-400';

                const connectedEdges = network.getConnectedEdges(nodeId);
                let edgeInfo = edges.get(connectedEdges).map(e => `<li>TXN to/from ${e.from === nodeId ? `${e.to}` : `${e.from}`}: <strong>$${e.value.toLocaleString()}</strong></li>`).join('');
                infoContent.innerHTML = `
                    <h3 class="font-bold text-base text-white">Account: ${node.label}</h3>
                    <p class="text-gray-400">ID: ${node.id}</p>
                    <p class="mt-2 font-semibold">ML Risk Score: <span class="font-bold ${riskColor}">${score.toFixed(2)}</span></p>
                    <p class="mt-2 font-semibold">Transactions:</p>
                    <ul class="list-disc pl-5 mt-1">${edgeInfo || '<li>No transactions found.</li>'}</ul>
                `;
            } else if (params.edges.length > 0) {
                const edgeId = params.edges[0];
                timeline.setSelection(edgeId, { focus: true });
            }
        });
        network.on("deselectNode", () => { resetInfoPanel(); timeline.setSelection([]); });
        network.on("deselectEdge", () => { resetInfoPanel(); timeline.setSelection([]); });
    };

    const showLoading = (isShowing) => loadingOverlay.classList.toggle('hidden', !isShowing);
    const resetInfoPanel = () => infoContent.innerHTML = '<p>Click an element for details or run a detection rule.</p>';
    
    const loadDataFromFiles = (transactionsFile, accountsFile) => {
        showLoading(true);
        const transactionsPromise = new Promise((resolve) => {
            Papa.parse(transactionsFile, {
                header: true, dynamicTyping: true, complete: resolve
            });
        });
        const accountsPromise = new Promise((resolve) => {
            Papa.parse(accountsFile, {
                header: true, dynamicTyping: true, complete: resolve
            });
        });

        Promise.all([transactionsPromise, accountsPromise]).then(([transactionResults, accountResults]) => {
            nodes.clear(); edges.clear(); timelineItems.clear();
            const transactions = transactionResults.data;
            const accounts = accountResults.data;

            accounts.forEach(acc => {
                if (!acc.account_id) return;
                nodes.add({
                    id: acc.account_id,
                    label: `${acc.account_id}`,
                    value: acc.total_incoming_value + acc.total_outgoing_value,
                    riskScore: acc.ml_risk_score,
                    group: 'normal'
                });
            });

            transactions.forEach(tx => {
                if (!tx.id || tx.value === null || tx.value === undefined) return;
                edges.add({
                    id: tx.id, from: tx.from, to: tx.to, value: tx.value,
                    label: `$${(tx.value/1000).toFixed(0)}k`, timestamp: tx.timestamp
                });
                timelineItems.add({
                    id: tx.id, content: `$${tx.value.toLocaleString()}`, start: new Date(tx.timestamp),
                    title: `From ${tx.from} to ${tx.to}`
                });
            });

            initializeNetwork();
            initializeTimeline();
            showLoading(false);
            resetInfoPanel();
        });
    };

    loadDataBtn.addEventListener('click', () => {
        if (transactionsFileInput.files.length === 0 || accountsFileInput.files.length === 0) {
            alert("Please select both a transactions file and an accounts file.");
            return;
        }
        loadDataFromFiles(transactionsFileInput.files[0], accountsFileInput.files[0]);
    });
    
     const resetHighlights = () => {
        nodes.update(nodes.get().map(node => ({ id: node.id, group: 'normal', shadow: options.nodes.shadow })));
        edges.update(edges.get().map(edge => ({ id: edge.id, color: null, width: 1.5 })));
    };

    const highlightElements = (nodeIdsToHighlight, edgeIdsToHighlight, group) => {
        const highlightNodeSet = new Set(nodeIdsToHighlight);
        const highlightEdgeSet = new Set(edgeIdsToHighlight);
        nodes.update(nodes.get().map(node => ({
            id: node.id,
            group: highlightNodeSet.has(node.id) ? group : 'dim',
            shadow: { enabled: highlightNodeSet.has(node.id) }
        })));
        edges.update(edges.get().map(edge => ({
            id: edge.id,
            color: highlightEdgeSet.has(edge.id) ? options.groups[group].color.border : null,
            width: highlightEdgeSet.has(edge.id) ? 3 : 0.5,
        })));
    };
    function detectSmurfing(silent = false) {
        const threshold = 10000, minTransactions = 3;
        let suspiciousAccounts = {};
        edges.forEach(edge => {
            if (edge.value < threshold && edge.value > 0) {
                if (!suspiciousAccounts[edge.to]) suspiciousAccounts[edge.to] = { count: 0, from: new Set(), edges: [], totalValue: 0 };
                suspiciousAccounts[edge.to].count++;
                suspiciousAccounts[edge.to].from.add(edge.from);
                suspiciousAccounts[edge.to].edges.push(edge.id);
                suspiciousAccounts[edge.to].totalValue += edge.value;
            }
        });
        
        let allNodesToHighlight = new Set(), allEdgesToHighlight = new Set(), report = '';
        for (const accId in suspiciousAccounts) {
            if (suspiciousAccounts[accId].count >= minTransactions) {
                const targetNodeId = parseInt(accId);
                allNodesToHighlight.add(targetNodeId);
                suspiciousAccounts[accId].from.forEach(fromId => allNodesToHighlight.add(fromId));
                suspiciousAccounts[accId].edges.forEach(edgeId => allEdgesToHighlight.add(edgeId));
                report += `<li><strong>Account ${targetNodeId}</strong> received ${suspiciousAccounts[accId].count} payments totaling <strong>$${suspiciousAccounts[accId].totalValue.toLocaleString()}</strong>.</li>`;
            }
        }

        if (silent) return { nodes: Array.from(allNodesToHighlight), edges: Array.from(allEdgesToHighlight) };
        highlightElements(Array.from(allNodesToHighlight), Array.from(allEdgesToHighlight), 'highlight_smurfing');
        if (report) infoContent.innerHTML = `<h3 class="font-bold text-base text-amber-400">Smurfing Detected</h3><ul class="list-disc pl-5 mt-1">${report}</ul>`;
        else infoContent.innerHTML = `<h3 class="font-bold text-base text-green-400">No Smurfing Detected</h3><p>No accounts found with multiple small incoming transactions.</p>`;
    }
    detectSmurfingBtn.addEventListener('click', () => {
        showLoading(true); resetHighlights();
        setTimeout(() => { detectSmurfing(); showLoading(false); }, 500);
    });

    function detectLayeringCycles(silent = false) {
        const adj = new Map();
        nodes.getIds().forEach(id => adj.set(id, []));
        edges.get().forEach(edge => adj.get(edge.from).push({node: edge.to, edgeId: edge.id}));
        const cycles = [], path = [], visited = new Set(), recursionStack = new Set();

        function findCyclesDFS(u) {
            visited.add(u); recursionStack.add(u); path.push(u);
            const neighbors = adj.get(u) || [];
            for (const {node: v} of neighbors) {
                if (!visited.has(v)) findCyclesDFS(v);
                else if (recursionStack.has(v)) {
                    const cycle = path.slice(path.indexOf(v));
                    if (cycle.length > 1) cycles.push(cycle);
                }
            }
            path.pop(); recursionStack.delete(u);
        }
        nodes.getIds().forEach(id => { if (!visited.has(id)) findCyclesDFS(id); });

        let allNodesToHighlight = new Set(), allEdgesToHighlight = new Set(), report = '';
        if (cycles.length > 0) {
            cycles.forEach((cycle, index) => {
                report += `<li><strong>Cycle ${index + 1}:</strong> ${cycle.map(c => `${c}`).join(' → ')} → ${cycle[0]}</li>`;
                cycle.forEach(nodeId => allNodesToHighlight.add(nodeId));
                for (let i = 0; i < cycle.length; i++) {
                    const fromNode = cycle[i], toNode = (i + 1 < cycle.length) ? cycle[i+1] : cycle[0];
                    const edge = edges.get({ filter: e => e.from === fromNode && e.to === toNode })[0];
                    if (edge) allEdgesToHighlight.add(edge.id);
                }
            });
            if (silent) return { nodes: Array.from(allNodesToHighlight), edges: Array.from(allEdgesToHighlight) };
            highlightElements(Array.from(allNodesToHighlight), Array.from(allEdgesToHighlight), 'highlight_layering');
            infoContent.innerHTML = `<h3 class="font-bold text-base text-purple-400">Layering Cycles Detected</h3><ul class="list-disc pl-5 mt-1">${report}</ul>`;
        } else {
            if (silent) return { nodes: [], edges: [] };
            infoContent.innerHTML = `<h3 class="font-bold text-base text-green-400">No Layering Cycles Detected</h3><p>No circular transaction patterns were found.</p>`;
        }
    }
    detectLayeringBtn.addEventListener('click', () => {
        showLoading(true); resetHighlights();
        setTimeout(() => { detectLayeringCycles(); showLoading(false); }, 500);
    });

    function detectRapidMovement(silent = false) {
        const timeThresholdMinutes = 60, amountSimilarity = 0.95;
        const suspiciousNodes = new Map();
        edges.forEach(edge => {
            if (!suspiciousNodes.has(edge.to)) suspiciousNodes.set(edge.to, { ins: [], outs: [] });
            if (!suspiciousNodes.has(edge.from)) suspiciousNodes.set(edge.from, { ins: [], outs: [] });
            suspiciousNodes.get(edge.to).ins.push(edge);
            suspiciousNodes.get(edge.from).outs.push(edge);
        });

        let allNodesToHighlight = new Set(), allEdgesToHighlight = new Set(), report = '';
        suspiciousNodes.forEach((data, nodeId) => {
            if (data.ins.length > 0 && data.outs.length > 0) {
                data.ins.forEach(inTx => {
                    data.outs.forEach(outTx => {
                        const timeDiff = (new Date(outTx.timestamp) - new Date(inTx.timestamp)) / (1000 * 60);
                        if (timeDiff > 0 && timeDiff <= timeThresholdMinutes && outTx.value >= inTx.value * amountSimilarity) {
                            allNodesToHighlight.add(inTx.from); allNodesToHighlight.add(nodeId); allNodesToHighlight.add(outTx.to);
                            allEdgesToHighlight.add(inTx.id); allEdgesToHighlight.add(outTx.id);
                            report += `<li><strong>Acc ${nodeId}</strong> pass-through: $${inTx.value.toLocaleString()} in, $${outTx.value.toLocaleString()} out in ${timeDiff.toFixed(1)}m.</li>`;
                        }
                    });
                });
            }
        });

        if (silent) return { nodes: Array.from(allNodesToHighlight), edges: Array.from(allEdgesToHighlight) };
        highlightElements(Array.from(allNodesToHighlight), Array.from(allEdgesToHighlight), 'highlight_rapid');
        if (report) infoContent.innerHTML = `<h3 class="font-bold text-base text-red-400">Rapid Movement Detected</h3><ul class="list-disc pl-5 mt-1">${report}</ul>`;
        else infoContent.innerHTML = `<h3 class="font-bold text-base text-green-400">No Rapid Movement Detected</h3><p>No pass-through accounts with immediate withdrawals were found.</p>`;
    }
    detectRapidMovementBtn.addEventListener('click', () => {
        showLoading(true); resetHighlights();
        setTimeout(() => { detectRapidMovement(); showLoading(false); }, 500);
    });
    
    resetBtn.addEventListener('click', () => {
        showLoading(true);
        setTimeout(() => {
            resetHighlights();
            if (network) network.fit();
            resetInfoPanel();
            showLoading(false);
        }, 500);
    });
    
    togglePhysicsBtn.addEventListener('click', () => {
        physicsEnabled = !physicsEnabled;
        network.setOptions({ physics: physicsEnabled });
        togglePhysicsBtn.textContent = physicsEnabled ? 'Freeze Layout' : 'Unfreeze Layout';
        togglePhysicsBtn.classList.toggle('bg-gray-600', physicsEnabled);
        togglePhysicsBtn.classList.toggle('hover:bg-gray-500', physicsEnabled);
        togglePhysicsBtn.classList.toggle('bg-red-700', !physicsEnabled);
        togglePhysicsBtn.classList.toggle('hover:bg-red-600', !physicsEnabled);
    });
});
