const mount = document.querySelector("[data-fox-scene]");

if (mount) {
  Promise.all([
    import("/vendor/three.module.min.js"),
    import("/vendor/GLTFLoader.js")
  ])
    .then(([THREE, { GLTFLoader }]) => initFoxScene(THREE, GLTFLoader, mount))
    .catch((err) => {
      console.error("Fox scene load error:", err);
      showFallback(
        mount,
        "The 3D fox scene could not load right now. WebGL or the Three.js module is unavailable."
      );
    });
}

function initFoxScene(THREE, GLTFLoader, mountNode) {
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (_error) {
    showFallback(mountNode, "This browser does not expose the WebGL support needed for the fox scene.");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountNode.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x09131d, 10, 28);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 2.85, 10.6);

  const lights = createLights(THREE);
  scene.add(lights.group);

  const sky = createSky(THREE);
  scene.add(sky);

  const world = new THREE.Group();
  scene.add(world);

  const ground = createGround(THREE);
  world.add(ground);

  const forest = createForest(THREE);
  world.add(forest.group);

  const fireflies = createFireflies(THREE);
  world.add(fireflies.points);

  // Fox container - align feet with ground at y=-1.08
  const foxGroup = new THREE.Group();
  foxGroup.position.y = -1.08;
  world.add(foxGroup);

  // Shadow under fox
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 40),
    new THREE.MeshBasicMaterial({
      color: 0x020303,
      opacity: 0.22,
      transparent: true,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.03, 0);
  world.add(shadow);

  // Scattered $ coins that fade in and out in the forest
  const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20);
  const coins = [];
  const coinRandom = createRandom(42);

  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcf47,
      emissive: 0xaa6a05,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 1,
      transparent: true,
      opacity: 0
    });
    const coinMesh = new THREE.Mesh(coinGeo, mat);

    // Create $ text on the coin face
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b8860b";
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 32, 34);

    const dollarTex = new THREE.CanvasTexture(canvas);
    const dollarFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 20),
      new THREE.MeshBasicMaterial({
        map: dollarTex,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    dollarFace.rotation.x = -Math.PI / 2;
    dollarFace.position.y = 0.031;
    coinMesh.add(dollarFace);

    const px = (coinRandom() - 0.5) * 9;
    const pz = (coinRandom() - 0.5) * 5;
    const py = -0.8 + coinRandom() * 1.0;

    coinMesh.position.set(px, py, pz);
    coinMesh.rotation.x = Math.PI / 2;
    world.add(coinMesh);

    coins.push({
      mesh: coinMesh,
      faceMat: dollarFace.material,
      bodyMat: mat,
      baseY: py,
      phaseOffset: coinRandom() * Math.PI * 2,
      speed: 0.4 + coinRandom() * 0.6
    });
  }

  // Load Fox GLB model
  let mixer = null;
  let foxModel = null;
  let runAction = null;

  const loader = new GLTFLoader();
  loader.load(
    "/models/Fox.glb",
    (gltf) => {
      foxModel = gltf.scene;
      foxModel.scale.setScalar(0.018);
      foxModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            // Shift fox colors toward vibrant orange-red like the logo
            child.material.color.lerp(new THREE.Color(0xe84420), 0.35);
            child.material.emissive = new THREE.Color(0x991100);
            child.material.emissiveIntensity = 0.08;
          }
        }
      });
      foxGroup.add(foxModel);

      // Setup animations
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(foxModel);
        // The Fox model typically has: Survey (idle), Walk, Run
        const runClip = gltf.animations.find(
          (c) => c.name === "Run" || c.name === "run"
        ) || gltf.animations[gltf.animations.length - 1];

        if (runClip) {
          runAction = mixer.clipAction(runClip);
          runAction.timeScale = 1.4;
          runAction.play();
        }
      }
    },
    undefined,
    (err) => {
      console.error("Failed to load Fox model:", err);
    }
  );

  const pointer = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clock = new THREE.Clock();
  let frameId = 0;
  let sceneIsVisible = true;

  const resize = () => {
    const width = Math.max(mountNode.clientWidth, 1);
    const height = Math.max(mountNode.clientHeight, 1);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (reduceMotion.matches) {
      renderFrame();
    }
  };

  const renderFrame = () => {
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    const travel = Math.sin(elapsed * 0.85);
    const stride = elapsed * 10.5;
    const bounce = Math.abs(Math.sin(stride)) * 0.08;
    const direction = Math.cos(elapsed * 0.85) >= 0 ? 1 : -1;

    pointer.currentX = THREE.MathUtils.lerp(pointer.currentX, pointer.targetX, 0.06);
    pointer.currentY = THREE.MathUtils.lerp(pointer.currentY, pointer.targetY, 0.06);

    // Move fox group
    foxGroup.position.x = travel * 4.35;
    foxGroup.position.y = -1.08 + bounce;

    // Flip fox direction
    if (foxModel) {
      foxModel.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Scattered coins fade in and out
    for (const c of coins) {
      const phase = elapsed * c.speed + c.phaseOffset;
      const fade = Math.max(0, Math.sin(phase));
      const opacity = fade * fade * 0.7;
      c.bodyMat.opacity = opacity;
      c.faceMat.opacity = opacity;
      c.mesh.position.y = c.baseY + Math.sin(phase * 0.8) * 0.15;
      c.mesh.rotation.z = elapsed * c.speed * 0.5;
      c.bodyMat.emissiveIntensity = 0.2 + fade * 0.4;
    }

    // Update mixer
    if (mixer) {
      mixer.update(delta);
    }

    shadow.position.x = foxGroup.position.x;
    shadow.scale.x = 1.02 - bounce * 0.45;
    shadow.scale.y = 0.9 - bounce * 0.32;
    shadow.material.opacity = 0.22 - bounce * 0.34;

    for (const sway of forest.swayers) {
      sway.node.rotation.z = Math.sin(elapsed * sway.speed + sway.offset) * sway.amount;
    }

    const fireflyPositions = fireflies.points.geometry.attributes.position.array;
    for (let index = 0; index < fireflies.base.length; index += 3) {
      const particle = index / 3;
      fireflyPositions[index] =
        fireflies.base[index] + Math.cos(elapsed * 0.7 + particle * 0.3) * 0.08;
      fireflyPositions[index + 1] =
        fireflies.base[index + 1] + Math.sin(elapsed * 1.8 + particle) * 0.14;
      fireflyPositions[index + 2] =
        fireflies.base[index + 2] + Math.sin(elapsed * 0.9 + particle * 0.6) * 0.06;
    }
    fireflies.points.geometry.attributes.position.needsUpdate = true;
    fireflies.points.material.opacity = 0.52 + Math.abs(Math.sin(elapsed * 1.4)) * 0.22;

    world.rotation.y = pointer.currentX * 0.12;
    world.rotation.x = pointer.currentY * 0.04;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.currentX * 0.9, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.85 + pointer.currentY * 0.45, 0.06);
    camera.lookAt(pointer.currentX * 0.28, 0.35 + pointer.currentY * 0.2, 0);

    renderer.render(scene, camera);
  };

  const stopLoop = () => {
    if (!frameId) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const tick = () => {
    renderFrame();
    frameId = window.requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (frameId || reduceMotion.matches || !sceneIsVisible || document.hidden) {
      return;
    }

    tick();
  };

  const updatePointer = (event) => {
    if (reduceMotion.matches) {
      return;
    }

    const rect = mountNode.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    pointer.targetX = THREE.MathUtils.clamp(normalizedX, -1, 1) * 0.75;
    pointer.targetY = THREE.MathUtils.clamp(normalizedY, -1, 1) * -0.55;
  };

  const resetPointer = () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  };

  mountNode.addEventListener("pointermove", updatePointer);
  mountNode.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
      return;
    }

    if (reduceMotion.matches) {
      renderFrame();
      return;
    }

    startLoop();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        sceneIsVisible = Boolean(entry?.isIntersecting);

        if (sceneIsVisible) {
          if (reduceMotion.matches) {
            renderFrame();
          } else {
            startLoop();
          }
        } else {
          stopLoop();
        }
      },
      {
        threshold: 0.18
      }
    );

    observer.observe(mountNode);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountNode);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();

  if (reduceMotion.matches) {
    renderFrame();
  } else {
    startLoop();
  }
}

function createLights(THREE) {
  const group = new THREE.Group();

  const ambient = new THREE.AmbientLight(0x435669, 1.15);
  group.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0x84b6f4, 0x102016, 1.3);
  hemisphere.position.set(0, 10, 0);
  group.add(hemisphere);

  const moonlight = new THREE.DirectionalLight(0xfff0c9, 1.6);
  moonlight.position.set(-5.5, 8.5, 5.5);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(1024, 1024);
  moonlight.shadow.camera.near = 0.5;
  moonlight.shadow.camera.far = 25;
  moonlight.shadow.camera.left = -10;
  moonlight.shadow.camera.right = 10;
  moonlight.shadow.camera.top = 10;
  moonlight.shadow.camera.bottom = -10;
  group.add(moonlight);

  const rim = new THREE.DirectionalLight(0x50f1d8, 0.82);
  rim.position.set(7, 4, -8);
  group.add(rim);

  // Warm light to enhance the fox's orange color
  const foxLight = new THREE.PointLight(0xff9944, 0.6, 8, 2);
  foxLight.position.set(0, 2, 3);
  group.add(foxLight);

  return { group };
}

function createSky(THREE) {
  const group = new THREE.Group();

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 28, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf8d37a
    })
  );
  moon.position.set(-4.8, 6.1, -11.5);
  group.add(moon);

  const moonGlow = new THREE.PointLight(0xffd98d, 0.8, 28, 2);
  moonGlow.position.copy(moon.position);
  group.add(moonGlow);

  const random = createRandom(21);
  const positions = [];

  for (let index = 0; index < 90; index += 1) {
    positions.push((random() - 0.5) * 22);
    positions.push(3.8 + random() * 5.4);
    positions.push(-15 - random() * 6);
  }

  const stars = new THREE.BufferGeometry();
  stars.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const starField = new THREE.Points(
    stars,
    new THREE.PointsMaterial({
      color: 0xeaf4ff,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  );
  group.add(starField);

  return group;
}

function createGround(THREE) {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(11.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x132116,
      roughness: 1,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.08;
  ground.receiveShadow = true;
  group.add(ground);

  const clearing = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0x3e3222,
      roughness: 1,
      metalness: 0
    })
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(0, -1.06, 0);
  clearing.receiveShadow = true;
  group.add(clearing);

  const trailGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12.6, 1.45),
    new THREE.MeshBasicMaterial({
      color: 0x6a522c,
      opacity: 0.28,
      transparent: true,
      depthWrite: false
    })
  );
  trailGlow.rotation.x = -Math.PI / 2;
  trailGlow.position.set(0, -1.03, 0);
  group.add(trailGlow);

  const random = createRandom(33);
  for (let index = 0; index < 16; index += 1) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 + random() * 0.08, 0),
      new THREE.MeshStandardMaterial({
        color: 0x3d4853,
        roughness: 0.96,
        metalness: 0.02
      })
    );

    stone.position.set((random() - 0.5) * 11.5, -0.97, (random() > 0.5 ? 1 : -1) * (1.5 + random() * 1.8));
    stone.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }

  return group;
}

function createForest(THREE) {
  const group = new THREE.Group();
  const swayers = [];
  const random = createRandom(7);

  const materials = {
    bark: new THREE.MeshStandardMaterial({
      color: 0x3b2619,
      roughness: 1,
      metalness: 0
    }),
    leafA: new THREE.MeshStandardMaterial({
      color: 0x2b5f33,
      roughness: 0.96,
      metalness: 0
    }),
    leafB: new THREE.MeshStandardMaterial({
      color: 0x1e4827,
      roughness: 0.98,
      metalness: 0
    }),
    shrub: new THREE.MeshStandardMaterial({
      color: 0x22472c,
      roughness: 1,
      metalness: 0
    })
  };

  for (let index = 0; index < 30; index += 1) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 1.4, 10),
      materials.bark
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const canopy = new THREE.Group();
    const layers = 2 + Math.floor(random() * 2);

    for (let layer = 0; layer < layers; layer += 1) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.72 - layer * 0.12 + random() * 0.08, 1.15, 8),
        layer % 2 === 0 ? materials.leafA : materials.leafB
      );
      cone.position.y = 1.22 + layer * 0.42;
      cone.rotation.y = random() * Math.PI;
      cone.castShadow = true;
      canopy.add(cone);
    }

    tree.add(canopy);

    const side = index % 2 === 0 ? 1 : -1;
    let x = (random() - 0.5) * 14;
    if (Math.abs(x) < 1.8) {
      x += side * (2 + random() * 2.2);
    }

    tree.position.set(x, -1.08, side * (2.7 + random() * 2.6));
    tree.scale.setScalar(0.78 + random() * 0.9);
    tree.rotation.y = random() * Math.PI * 2;
    group.add(tree);

    swayers.push({
      node: canopy,
      amount: 0.03 + random() * 0.025,
      speed: 0.65 + random() * 0.45,
      offset: random() * Math.PI * 2
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.45 + random() * 0.18, 18, 16),
      materials.shrub
    );
    shrub.scale.set(1.2 + random() * 0.4, 0.65 + random() * 0.15, 1.1 + random() * 0.4);
    shrub.position.set((random() - 0.5) * 12, -0.82, (random() > 0.5 ? 1 : -1) * (1.9 + random() * 1.8));
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    group.add(shrub);
  }

  return { group, swayers };
}

function createFireflies(THREE) {
  const random = createRandom(17);
  const positions = [];

  for (let index = 0; index < 22; index += 1) {
    positions.push((random() - 0.5) * 12);
    positions.push(0.2 + random() * 2.4);
    positions.push((random() - 0.5) * 6.5);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffdf72,
    size: 0.12,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.position.y = 0.2;

  return {
    points,
    base: Float32Array.from(positions)
  };
}

function showFallback(mountNode, message) {
  mountNode.classList.add("is-fallback");
  mountNode.textContent = "";

  const note = document.createElement("p");
  note.className = "scene-card__fallback";
  note.textContent = message;

  mountNode.append(note);
}

function createRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
