(() => {
  const canvas = document.querySelector("[data-agent-viewer]");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const statNodes = document.querySelector('[data-agent-stat="nodes"]');
  const statLinks = document.querySelector('[data-agent-stat="links"]');
  const statCrossLinks = document.querySelector('[data-agent-stat="cross-links"]');
  const randomizeButton = document.querySelector("[data-agent-randomize]");
  const detailName = document.querySelector("[data-agent-detail-name]");
  const detailCopy = document.querySelector("[data-agent-detail-copy]");
  const detailWorkspace = document.querySelector("[data-agent-detail-workspace]");
  const detailRole = document.querySelector("[data-agent-detail-role]");
  const detailPeers = document.querySelector("[data-agent-detail-peers]");
  const detailStatus = document.querySelector("[data-agent-detail-status]");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const WORLD = {
    width: 1600,
    height: 980,
    centerX: 800,
    centerY: 490
  };

  const WORKSPACE_STYLES = {
    "~/openfox": {
      color: "#ff8b38",
      glow: "rgba(255, 139, 56, 0.30)",
      background: "rgba(255, 139, 56, 0.12)",
      band: [180, 720],
      labelX: 186,
      labelY: 120
    },
    "~/gtos": {
      color: "#62e7d6",
      glow: "rgba(98, 231, 214, 0.30)",
      background: "rgba(98, 231, 214, 0.12)",
      band: [900, 1420],
      labelX: 1078,
      labelY: 120
    }
  };

  const CROSS_LINK_COLOR = "#f7d57b";
  const RELATIONS = {
    "~/openfox": ["dispatches", "delegates", "plans", "wakes", "syncs", "summarizes"],
    "~/gtos": ["relays", "quotes", "confirms", "bridges", "settles", "signals"],
    cross: ["pays", "routes", "bridges", "syncs", "escrows", "streams"]
  };

  const ROLE_LANES = {
    "~/openfox": [
      { role: "gateway", y: 190 },
      { role: "scheduler", y: 305 },
      { role: "runner", y: 420 },
      { role: "memory", y: 540 },
      { role: "wallet", y: 660 },
      { role: "observer", y: 785 }
    ],
    "~/gtos": [
      { role: "router", y: 210 },
      { role: "validator", y: 330 },
      { role: "oracle", y: 455 },
      { role: "sequencer", y: 585 },
      { role: "settler", y: 705 },
      { role: "bridge", y: 820 }
    ]
  };

  const STATUS_COPY = {
    dispatches: "dispatching multi-step work",
    delegates: "delegating runtime tasks",
    plans: "planning the next queue",
    wakes: "watching for new triggers",
    syncs: "syncing local state",
    summarizes: "compressing recent context",
    relays: "relaying chain-side updates",
    quotes: "quoting the next route",
    confirms: "confirming downstream signals",
    bridges: "bridging between clusters",
    settles: "settling the latest payment flow",
    signals: "publishing network hints",
    pays: "routing payment-aware calls",
    routes: "routing cross-mesh traffic",
    escrows: "holding settlement handshakes",
    streams: "streaming state between stacks"
  };

  const state = {
    graph: null,
    selectedNode: null,
    hoveredNode: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    baseScale: 1,
    frameId: 0,
    isVisible: true,
    isHidden: document.hidden,
    reducedMotion: motionQuery.matches,
    needsSettleFrames: 0,
    size: {
      width: 1,
      height: 1,
      dpr: 1
    },
    drag: {
      type: null,
      pointerId: null,
      node: null,
      startX: 0,
      startY: 0,
      startPanX: 0,
      startPanY: 0,
      offsetX: 0,
      offsetY: 0,
      moved: false
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomBetween(random, min, max) {
    return min + random() * (max - min);
  }

  function pick(random, items) {
    return items[Math.floor(random() * items.length)];
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function hexToRgba(hex, opacity) {
    const normalized = hex.replace("#", "");
    const number = Number.parseInt(normalized, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  function displayWorkspace(workspace) {
    return workspace.replace(/^~\//, "");
  }

  function displayNodeId(nodeId) {
    return nodeId.replace(/^~\//, "");
  }

  function hashSeed(input) {
    let hash = 1779033703 ^ input.length;
    for (let index = 0; index < input.length; index += 1) {
      hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getScale() {
    return state.baseScale * state.zoom;
  }

  function constrainView() {
    const scale = getScale();
    const maxPanX = Math.max((WORLD.width * scale - state.size.width) * 0.52, state.size.width * 0.12);
    const maxPanY = Math.max((WORLD.height * scale - state.size.height) * 0.52, state.size.height * 0.12);
    state.panX = clamp(state.panX, -maxPanX, maxPanX);
    state.panY = clamp(state.panY, -maxPanY, maxPanY);
  }

  function worldToScreen(x, y) {
    const scale = getScale();
    return {
      x: state.size.width * 0.5 + state.panX + (x - WORLD.centerX) * scale,
      y: state.size.height * 0.5 + state.panY + (y - WORLD.centerY) * scale
    };
  }

  function screenToWorld(x, y) {
    const scale = getScale();
    return {
      x: WORLD.centerX + (x - state.size.width * 0.5 - state.panX) / scale,
      y: WORLD.centerY + (y - state.size.height * 0.5 - state.panY) / scale
    };
  }

  function summarizeNode(node) {
    const sideCopy =
      node.workspace === "~/openfox"
        ? "OpenFox-side runtime that keeps long-lived tasks moving in the background."
        : "GTOS-side runtime coordinating relay, routing, and settlement-facing traffic.";
    const dominant = STATUS_COPY[node.dominantRelation] || "processing mesh traffic";
    return `${sideCopy} Dominant flow: ${node.dominantRelation}. ${node.peers} peer links currently keep it ${dominant}.`;
  }

  function computeDominantRelation(nodeLinks) {
    const counts = new Map();
    for (const link of nodeLinks) {
      const current = counts.get(link.type) || 0;
      counts.set(link.type, current + 1);
    }

    let winner = "syncs";
    let winnerCount = -1;
    for (const [type, count] of counts.entries()) {
      if (count > winnerCount) {
        winner = type;
        winnerCount = count;
      }
    }
    return winner;
  }

  function createGraph(seed) {
    const random = createRng(seed);
    const nodes = [];
    const links = [];
    const adjacency = new Map();
    const pairKeys = new Set();
    const buckets = {
      "~/openfox": [],
      "~/gtos": []
    };
    const indexes = {
      "~/openfox": 0,
      "~/gtos": 0
    };

    for (let index = 0; index < 100; index += 1) {
      const workspace = index < 50 ? "~/openfox" : "~/gtos";
      const workspaceStyle = WORKSPACE_STYLES[workspace];
      const lane = pick(random, ROLE_LANES[workspace]);
      indexes[workspace] += 1;

      const node = {
        index,
        id: `${workspace}/${lane.role}-${pad(indexes[workspace])}`,
        shortLabel: `${lane.role}-${pad(indexes[workspace])}`,
        workspace,
        role: lane.role,
        x: randomBetween(random, workspaceStyle.band[0], workspaceStyle.band[1]),
        y: lane.y + randomBetween(random, -90, 90),
        targetX: randomBetween(random, workspaceStyle.band[0], workspaceStyle.band[1]),
        targetY: lane.y + randomBetween(random, -70, 70),
        vx: randomBetween(random, -0.6, 0.6),
        vy: randomBetween(random, -0.6, 0.6),
        radius: randomBetween(random, 7.5, 10.5),
        glow: randomBetween(random, 18, 28),
        traffic: randomBetween(random, 0.45, 1.1),
        peers: 0,
        dominantRelation: workspace === "~/openfox" ? "dispatches" : "relays",
        status: "warming up",
        summary: ""
      };

      nodes.push(node);
      buckets[workspace].push(node);
      adjacency.set(node.id, new Set());
    }

    function addLink(sourceNode, targetNode, type) {
      if (!sourceNode || !targetNode || sourceNode === targetNode) {
        return false;
      }

      const key =
        sourceNode.index < targetNode.index
          ? `${sourceNode.index}:${targetNode.index}`
          : `${targetNode.index}:${sourceNode.index}`;

      if (pairKeys.has(key)) {
        return false;
      }

      pairKeys.add(key);

      const isCross = sourceNode.workspace !== targetNode.workspace;
      const link = {
        source: sourceNode,
        target: targetNode,
        type,
        isCross,
        strength: randomBetween(random, 0.7, 1.35),
        width: isCross ? randomBetween(random, 1.3, 1.9) : randomBetween(random, 0.85, 1.35),
        traffic: randomBetween(random, 0.35, 1),
        curvature: randomBetween(random, -1, 1) * (isCross ? 160 : 72),
        phase: random(),
        speed: randomBetween(random, 0.0024, 0.0065)
      };

      links.push(link);
      adjacency.get(sourceNode.id).add(targetNode.id);
      adjacency.get(targetNode.id).add(sourceNode.id);
      return true;
    }

    for (const workspace of Object.keys(buckets)) {
      const bucket = buckets[workspace];
      const relations = RELATIONS[workspace];

      for (let index = 0; index < bucket.length; index += 1) {
        addLink(bucket[index], bucket[(index + 1) % bucket.length], pick(random, relations));

        if (random() > 0.24) {
          addLink(
            bucket[index],
            bucket[(index + 5 + Math.floor(random() * 6)) % bucket.length],
            pick(random, relations)
          );
        }

        if (random() > 0.58) {
          addLink(
            bucket[index],
            bucket[(index + 12 + Math.floor(random() * 8)) % bucket.length],
            pick(random, relations)
          );
        }
      }
    }

    while (links.length < 228) {
      const isCross = random() > 0.42;
      if (isCross) {
        addLink(
          pick(random, buckets["~/openfox"]),
          pick(random, buckets["~/gtos"]),
          pick(random, RELATIONS.cross)
        );
      } else {
        const workspace = random() > 0.5 ? "~/openfox" : "~/gtos";
        addLink(
          pick(random, buckets[workspace]),
          pick(random, buckets[workspace]),
          pick(random, RELATIONS[workspace])
        );
      }
    }

    const nodeLinks = new Map(nodes.map((node) => [node.id, []]));
    for (const link of links) {
      nodeLinks.get(link.source.id).push(link);
      nodeLinks.get(link.target.id).push(link);
    }

    for (const node of nodes) {
      const incident = nodeLinks.get(node.id);
      node.peers = adjacency.get(node.id).size;
      node.dominantRelation = computeDominantRelation(incident);
      node.status = STATUS_COPY[node.dominantRelation] || "processing mesh traffic";
      node.summary = summarizeNode(node);
      node.radius = clamp(node.radius + node.peers * 0.045, 7.5, 12.5);
      node.traffic = clamp(node.traffic + incident.length * 0.015, 0.45, 1.45);
    }

    const sortedByPeers = nodes.slice().sort((left, right) => right.peers - left.peers);
    const labelIds = new Set(sortedByPeers.slice(0, 10).map((node) => node.id));
    const crossLinks = links.filter((link) => link.isCross).length;

    return {
      seed,
      nodes,
      links,
      adjacency,
      labelIds,
      crossLinks,
      defaultNodeId: sortedByPeers[0]?.id || null
    };
  }

  function currentDetailNode() {
    if (state.selectedNode) {
      return state.selectedNode;
    }

    if (state.hoveredNode) {
      return state.hoveredNode;
    }

    if (!state.graph || !state.graph.defaultNodeId) {
      return null;
    }

    return state.graph.nodes.find((node) => node.id === state.graph.defaultNodeId) || null;
  }

  function updateDetail() {
    const node = currentDetailNode();
    if (!node) {
      return;
    }

    if (detailName) {
      detailName.textContent = displayNodeId(node.id);
    }

    if (detailCopy) {
      detailCopy.textContent = node.summary;
    }

    if (detailWorkspace) {
      detailWorkspace.textContent = displayWorkspace(node.workspace);
    }

    if (detailRole) {
      detailRole.textContent = node.role;
    }

    if (detailPeers) {
      detailPeers.textContent = String(node.peers);
    }

    if (detailStatus) {
      detailStatus.textContent = node.status;
    }
  }

  function updateStats() {
    if (!state.graph) {
      return;
    }

    if (statNodes) {
      statNodes.textContent = String(state.graph.nodes.length);
    }

    if (statLinks) {
      statLinks.textContent = String(state.graph.links.length);
    }

    if (statCrossLinks) {
      statCrossLinks.textContent = String(state.graph.crossLinks);
    }
  }

  function resetView() {
    state.panX = 0;
    state.panY = 0;
    state.zoom = 1;
    constrainView();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    state.size.width = width;
    state.size.height = height;
    state.size.dpr = dpr;
    state.baseScale = Math.min(width / WORLD.width, height / WORLD.height) * 0.94;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    constrainView();
    render();
  }

  function isConnectedToFocus(node, focusNode) {
    if (!focusNode || !state.graph) {
      return true;
    }

    if (node === focusNode) {
      return true;
    }

    return state.graph.adjacency.get(focusNode.id)?.has(node.id) || false;
  }

  function traceQuadratic(link) {
    const sourceX = link.source.x;
    const sourceY = link.source.y;
    const targetX = link.target.x;
    const targetY = link.target.y;
    const deltaX = targetX - sourceX;
    const deltaY = targetY - sourceY;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const normalX = -deltaY / distance;
    const normalY = deltaX / distance;
    const controlX = (sourceX + targetX) * 0.5 + normalX * link.curvature;
    const controlY = (sourceY + targetY) * 0.5 + normalY * link.curvature;

    context.beginPath();
    context.moveTo(sourceX, sourceY);
    context.quadraticCurveTo(controlX, controlY, targetX, targetY);

    return {
      controlX,
      controlY
    };
  }

  function quadraticPoint(link, control, t) {
    const inverse = 1 - t;
    return {
      x:
        inverse * inverse * link.source.x +
        2 * inverse * t * control.controlX +
        t * t * link.target.x,
      y:
        inverse * inverse * link.source.y +
        2 * inverse * t * control.controlY +
        t * t * link.target.y
    };
  }

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function drawBackdrop() {
    for (const workspace of Object.keys(WORKSPACE_STYLES)) {
      const style = WORKSPACE_STYLES[workspace];
      const fieldX = workspace === "~/openfox" ? 420 : 1180;
      const gradient = context.createRadialGradient(fieldX, WORLD.centerY, 40, fieldX, WORLD.centerY, 360);
      gradient.addColorStop(0, style.background);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(fieldX, WORLD.centerY, 360, 0, TAU);
      context.fill();

      context.fillStyle = hexToRgba(style.color, 0.68);
      context.font = '700 34px "Cabinet Grotesk", system-ui, sans-serif';
      context.fillText(displayWorkspace(workspace), style.labelX, style.labelY);

      context.fillStyle = "rgba(238, 244, 255, 0.38)";
      context.font = '500 14px "Supreme", system-ui, sans-serif';
      context.fillText(
        workspace === "~/openfox"
          ? "runtime / memory / wallet / scheduler"
          : "relay / validator / router / settlement",
        style.labelX,
        style.labelY + 24
      );
    }
  }

  function drawLinks(focusNode) {
    for (const link of state.graph.links) {
      const connected = isConnectedToFocus(link.source, focusNode) && isConnectedToFocus(link.target, focusNode);
      const baseColor = link.isCross
        ? CROSS_LINK_COLOR
        : link.source.workspace === "~/openfox"
          ? WORKSPACE_STYLES["~/openfox"].color
          : WORKSPACE_STYLES["~/gtos"].color;
      const baseOpacity = link.isCross ? 0.24 : 0.15;
      const emphasis = focusNode && connected ? 0.78 : baseOpacity;
      const opacity = focusNode && !connected ? baseOpacity * 0.45 : emphasis;

      context.strokeStyle = hexToRgba(baseColor, opacity);
      context.lineWidth = focusNode && connected ? link.width * 1.6 : link.width;
      const control = traceQuadratic(link);
      context.stroke();

      if (state.reducedMotion && !focusNode) {
        continue;
      }

      const packetPoint = quadraticPoint(link, control, link.phase);
      context.fillStyle = hexToRgba(baseColor, focusNode && connected ? 0.92 : 0.72);
      context.beginPath();
      context.arc(packetPoint.x, packetPoint.y, focusNode && connected ? 3.3 : 2.3, 0, TAU);
      context.fill();
    }
  }

  function drawNodes(focusNode) {
    for (const node of state.graph.nodes) {
      const workspaceStyle = WORKSPACE_STYLES[node.workspace];
      const connected = isConnectedToFocus(node, focusNode);
      const faded = Boolean(focusNode) && !connected;
      const isHovered = state.hoveredNode === node;
      const isSelected = state.selectedNode === node;
      const radius = node.radius + (isSelected ? 2.5 : isHovered ? 1.3 : 0);

      context.shadowBlur = faded ? 0 : node.glow;
      context.shadowColor = workspaceStyle.glow;
      context.fillStyle = hexToRgba(workspaceStyle.color, faded ? 0.33 : 0.94);
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, TAU);
      context.fill();
      context.shadowBlur = 0;

      context.fillStyle = "rgba(5, 12, 18, 0.9)";
      context.beginPath();
      context.arc(node.x, node.y, Math.max(2.4, radius * 0.3), 0, TAU);
      context.fill();

      if (isSelected || isHovered) {
        context.lineWidth = isSelected ? 2.6 : 1.8;
        context.strokeStyle = isSelected ? "rgba(247, 213, 123, 0.95)" : "rgba(255, 255, 255, 0.72)";
        context.beginPath();
        context.arc(node.x, node.y, radius + 6.5, 0, TAU);
        context.stroke();
      }
    }
  }

  function drawLabels(focusNode) {
    const visibleLabels = new Set(state.graph.labelIds);
    if (state.hoveredNode) {
      visibleLabels.add(state.hoveredNode.id);
    }
    if (state.selectedNode) {
      visibleLabels.add(state.selectedNode.id);
    }

    context.font = '600 13px "Supreme", system-ui, sans-serif';
    context.textBaseline = "middle";

    for (const node of state.graph.nodes) {
      if (!visibleLabels.has(node.id)) {
        continue;
      }

      if (focusNode && !isConnectedToFocus(node, focusNode) && node !== focusNode) {
        continue;
      }

      const label = node.shortLabel;
      const x = node.x + node.radius + 10;
      const y = node.y;
      const width = context.measureText(label).width + 18;
      roundedRect(x, y - 13, width, 26, 13);
      context.fillStyle = "rgba(6, 12, 18, 0.72)";
      context.fill();
      context.strokeStyle = "rgba(255, 255, 255, 0.06)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = "rgba(238, 244, 255, 0.9)";
      context.fillText(label, x + 9, y + 0.5);
    }
  }

  function render() {
    if (!state.graph) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(state.size.dpr, 0, 0, state.size.dpr, 0, 0);

    context.save();
    context.translate(state.size.width * 0.5 + state.panX, state.size.height * 0.5 + state.panY);
    context.scale(getScale(), getScale());
    context.translate(-WORLD.centerX, -WORLD.centerY);

    const focusNode = state.selectedNode || state.hoveredNode || null;
    drawBackdrop();
    drawLinks(focusNode);
    drawNodes(focusNode);
    drawLabels(focusNode);
    context.restore();
  }

  function stepSimulation(multiplier = 1) {
    if (!state.graph) {
      return;
    }

    const dragNode = state.drag.type === "node" ? state.drag.node : null;

    for (const node of state.graph.nodes) {
      if (node !== dragNode) {
        node.vx += (node.targetX - node.x) * 0.00085 * multiplier;
        node.vy += (node.targetY - node.y) * 0.00085 * multiplier;
      }
    }

    for (const link of state.graph.links) {
      const deltaX = link.target.x - link.source.x;
      const deltaY = link.target.y - link.source.y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      const desiredDistance = link.isCross ? 175 + link.traffic * 70 : 92 + link.traffic * 42;
      const force = (distance - desiredDistance) * 0.0012 * link.strength * multiplier;
      const forceX = (deltaX / distance) * force;
      const forceY = (deltaY / distance) * force;

      if (link.source !== dragNode) {
        link.source.vx += forceX;
        link.source.vy += forceY;
      }

      if (link.target !== dragNode) {
        link.target.vx -= forceX;
        link.target.vy -= forceY;
      }

      link.phase = (link.phase + link.speed * multiplier) % 1;
    }

    for (let leftIndex = 0; leftIndex < state.graph.nodes.length; leftIndex += 1) {
      const left = state.graph.nodes[leftIndex];

      for (let rightIndex = leftIndex + 1; rightIndex < state.graph.nodes.length; rightIndex += 1) {
        const right = state.graph.nodes[rightIndex];
        const deltaX = right.x - left.x;
        const deltaY = right.y - left.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;

        if (distanceSquared > 24000) {
          continue;
        }

        const distance = Math.sqrt(distanceSquared) || 1;
        const minimum = left.radius + right.radius + 15;
        let push = (left.workspace === right.workspace ? 4700 : 5600) / distanceSquared;

        if (distance < minimum) {
          push += (minimum - distance) * 0.03;
        }

        const forceX = (deltaX / distance) * push * multiplier;
        const forceY = (deltaY / distance) * push * multiplier;

        if (left !== dragNode) {
          left.vx -= forceX;
          left.vy -= forceY;
        }

        if (right !== dragNode) {
          right.vx += forceX;
          right.vy += forceY;
        }
      }
    }

    for (const node of state.graph.nodes) {
      if (node === dragNode) {
        continue;
      }

      const boundary = 70;
      if (node.x < boundary) {
        node.vx += (boundary - node.x) * 0.003;
      } else if (node.x > WORLD.width - boundary) {
        node.vx -= (node.x - (WORLD.width - boundary)) * 0.003;
      }

      if (node.y < boundary) {
        node.vy += (boundary - node.y) * 0.003;
      } else if (node.y > WORLD.height - boundary) {
        node.vy -= (node.y - (WORLD.height - boundary)) * 0.003;
      }

      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.91;
      node.vy *= 0.91;
    }
  }

  function stopLoop() {
    if (!state.frameId) {
      return;
    }

    window.cancelAnimationFrame(state.frameId);
    state.frameId = 0;
  }

  function shouldAnimate() {
    if (!state.graph || state.isHidden || !state.isVisible) {
      return false;
    }

    if (!state.reducedMotion) {
      return true;
    }

    return Boolean(state.drag.type) || state.needsSettleFrames > 0;
  }

  function animate() {
    state.frameId = 0;

    if (!state.graph || state.isHidden || !state.isVisible) {
      return;
    }

    if (!state.reducedMotion || state.drag.type || state.needsSettleFrames > 0) {
      stepSimulation(state.reducedMotion ? 0.8 : 1);
      if (state.reducedMotion && state.needsSettleFrames > 0) {
        state.needsSettleFrames -= 1;
      }
    }

    render();

    if (shouldAnimate()) {
      state.frameId = window.requestAnimationFrame(animate);
    }
  }

  function ensureLoop(extraFrames = 0) {
    if (state.reducedMotion && extraFrames > 0) {
      state.needsSettleFrames = Math.max(state.needsSettleFrames, extraFrames);
    }

    if (state.frameId || !shouldAnimate()) {
      return;
    }

    state.frameId = window.requestAnimationFrame(animate);
  }

  function buildGraph(seed) {
    state.graph = createGraph(seed);
    state.selectedNode = null;
    state.hoveredNode = null;
    resetView();
    updateStats();
    updateDetail();

    if (state.reducedMotion) {
      for (let index = 0; index < 120; index += 1) {
        stepSimulation(0.75);
      }
      render();
      ensureLoop(24);
      return;
    }

    for (let index = 0; index < 36; index += 1) {
      stepSimulation(0.95);
    }
    render();
    ensureLoop();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function updateCursor() {
    if (state.drag.type) {
      canvas.style.cursor = "grabbing";
      return;
    }

    if (state.hoveredNode) {
      canvas.style.cursor = "pointer";
      return;
    }

    canvas.style.cursor = "grab";
  }

  function pickNodeAt(position) {
    if (!state.graph) {
      return null;
    }

    const worldPoint = screenToWorld(position.x, position.y);
    let match = null;
    let minDistance = Infinity;
    const threshold = 20 / getScale();

    for (const node of state.graph.nodes) {
      const deltaX = worldPoint.x - node.x;
      const deltaY = worldPoint.y - node.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < threshold + node.radius && distance < minDistance) {
        match = node;
        minDistance = distance;
      }
    }

    return match;
  }

  function handlePointerDown(event) {
    if (!state.graph) {
      return;
    }

    const position = pointerPosition(event);
    const hoveredNode = pickNodeAt(position);
    const worldPoint = screenToWorld(position.x, position.y);

    state.drag.pointerId = event.pointerId;
    state.drag.startX = position.x;
    state.drag.startY = position.y;
    state.drag.startPanX = state.panX;
    state.drag.startPanY = state.panY;
    state.drag.moved = false;

    if (hoveredNode) {
      state.drag.type = "node";
      state.drag.node = hoveredNode;
      state.drag.offsetX = worldPoint.x - hoveredNode.x;
      state.drag.offsetY = worldPoint.y - hoveredNode.y;
      state.selectedNode = hoveredNode;
      state.hoveredNode = hoveredNode;
      updateDetail();
    } else {
      state.drag.type = "pan";
      state.drag.node = null;
    }

    canvas.setPointerCapture(event.pointerId);
    updateCursor();
    render();
  }

  function handlePointerMove(event) {
    if (!state.graph) {
      return;
    }

    const position = pointerPosition(event);

    if (state.drag.type === "node" && state.drag.node) {
      const worldPoint = screenToWorld(position.x, position.y);
      state.drag.node.x = worldPoint.x - state.drag.offsetX;
      state.drag.node.y = worldPoint.y - state.drag.offsetY;
      state.drag.node.vx = 0;
      state.drag.node.vy = 0;
      state.drag.moved =
        state.drag.moved ||
        Math.hypot(position.x - state.drag.startX, position.y - state.drag.startY) > 3;
      updateDetail();
      if (state.reducedMotion) {
        render();
      } else {
        ensureLoop();
      }
      updateCursor();
      return;
    }

    if (state.drag.type === "pan") {
      state.panX = state.drag.startPanX + position.x - state.drag.startX;
      state.panY = state.drag.startPanY + position.y - state.drag.startY;
      constrainView();
      state.drag.moved =
        state.drag.moved ||
        Math.hypot(position.x - state.drag.startX, position.y - state.drag.startY) > 3;
      if (state.reducedMotion) {
        render();
      }
      updateCursor();
      return;
    }

    const hoveredNode = pickNodeAt(position);
    if (hoveredNode !== state.hoveredNode) {
      state.hoveredNode = hoveredNode;
      if (!state.selectedNode) {
        updateDetail();
      }
      render();
    }

    updateCursor();
  }

  function handlePointerUp(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (state.drag.type === "pan" && !state.drag.moved) {
      const position = pointerPosition(event);
      const hoveredNode = pickNodeAt(position);
      state.selectedNode = hoveredNode;
      state.hoveredNode = hoveredNode;
      updateDetail();
    }

    state.drag.type = null;
    state.drag.pointerId = null;
    state.drag.node = null;
    state.drag.moved = false;

    if (state.reducedMotion) {
      ensureLoop(10);
      render();
    } else {
      ensureLoop();
    }

    updateCursor();
  }

  function handlePointerLeave() {
    if (state.drag.type) {
      return;
    }

    state.hoveredNode = null;
    if (!state.selectedNode) {
      updateDetail();
    }
    updateCursor();
    render();
  }

  function handleWheel(event) {
    if (!state.graph) {
      return;
    }

    event.preventDefault();
    const position = pointerPosition(event);
    const worldBefore = screenToWorld(position.x, position.y);
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    state.zoom = clamp(state.zoom * factor, 0.74, 2.4);
    const scale = getScale();
    state.panX = position.x - state.size.width * 0.5 - (worldBefore.x - WORLD.centerX) * scale;
    state.panY = position.y - state.size.height * 0.5 - (worldBefore.y - WORLD.centerY) * scale;
    constrainView();

    if (state.reducedMotion) {
      render();
    } else {
      ensureLoop();
    }
  }

  function handleRandomize() {
    buildGraph(hashSeed(String(Date.now())));
    if (!randomizeButton) {
      return;
    }

    const previousLabel = randomizeButton.textContent;
    randomizeButton.textContent = "Mesh Rewired";
    window.setTimeout(() => {
      randomizeButton.textContent = previousLabel;
    }, 1200);
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  if (randomizeButton) {
    randomizeButton.addEventListener("click", handleRandomize);
  }

  const handleMotionChange = (event) => {
    state.reducedMotion = event.matches;
    stopLoop();
    render();
    ensureLoop(24);
  };

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionChange);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionChange);
  }

  document.addEventListener("visibilitychange", () => {
    state.isHidden = document.hidden;
    if (state.isHidden) {
      stopLoop();
      return;
    }

    render();
    ensureLoop(24);
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        state.isVisible = Boolean(entry?.isIntersecting);
        if (!state.isVisible) {
          stopLoop();
          return;
        }

        render();
        ensureLoop(24);
      },
      {
        threshold: 0.12
      }
    );

    observer.observe(canvas);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  resizeCanvas();
  buildGraph(hashSeed("openfox-agent-viewer"));
  updateCursor();
})();
