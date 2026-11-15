import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD_CONTINENT_POLYGONS } from '../../data/worldCoastlines';
import { Marina } from '../../types/maritime';

interface Globe3DProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  focusPreset: 'turkey' | 'med' | 'world';
}

const GLOBE_RADIUS = 1.0;

// Convert (lat, lon) in degrees to 3D Cartesian coordinates on unit sphere
function latLonToVector3(lat: number, lon: number, radius: number, target = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  target.x = -radius * Math.sin(phi) * Math.cos(theta);
  target.y = radius * Math.cos(phi);
  target.z = radius * Math.sin(phi) * Math.sin(theta);
  return target;
}

// Procedural high-resolution bathymetric ocean + continent CanvasTexture (zero external 404s)
function createEarthChartTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep abyssal ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#07162c');
  oceanGrad.addColorStop(0.25, '#071b36');
  oceanGrad.addColorStop(0.5, '#092344');
  oceanGrad.addColorStop(0.75, '#071b36');
  oceanGrad.addColorStop(1, '#061224');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle bathymetric contour bands
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator & Tropics subtle nautical line
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.16)';
  ctx.setLineDash([6, 6]);
  const eqY = height / 2;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(width, eqY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Continental shelf halo glow beneath landmasses
  const drawRings = (
    fillStyle: string | CanvasGradient,
    strokeStyle: string,
    lineWidth: number,
  ) => {
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;

    WORLD_CONTINENT_POLYGONS.forEach((ring) => {
      ctx.beginPath();
      ring.forEach(([lon, lat], idx) => {
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  };

  // Shallow continental shelf border
  drawRings('rgba(14, 165, 233, 0.10)', 'rgba(56, 189, 248, 0.25)', 10);

  // Landmass surface
  const landGrad = ctx.createLinearGradient(0, 0, width, height);
  landGrad.addColorStop(0, '#132946');
  landGrad.addColorStop(0.5, '#183356');
  landGrad.addColorStop(1, '#112540');
  drawRings(landGrad, 'rgba(125, 211, 252, 0.45)', 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 8);
  texture.needsUpdate = true;
  return texture;
}

// Build great-circle curved arc between two coordinates
function createRouteArc(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radius: number,
  colorHex: number,
): THREE.Line {
  const start = latLonToVector3(lat1, lon1, radius);
  const end = latLonToVector3(lat2, lon2, radius);
  const points: THREE.Vector3[] = [];
  const segments = 40;
  const dist = start.distanceTo(end);
  const arcLift = Math.min(0.18, dist * 0.14);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(start, end, t).normalize();
    const lift = Math.sin(t * Math.PI) * arcLift;
    pt.multiplyScalar(radius + 0.006 + lift);
    points.push(pt);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.45,
  });
  return new THREE.Line(geometry, material);
}

const _camTargetPos = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const Globe3D: React.FC<Globe3DProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  focusPreset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectMarina);
  onSelectRef.current = onSelectMarina;

  const [webglError, setWebglError] = useState(false);

  // Refs to trigger smooth camera fly-to without re-mounting WebGL scene
  const flyTargetRef = useRef<{ pos: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(0, 1.4, 2.2),
    active: false,
  });
  const beaconRefs = useRef<Map<string, { stem: THREE.Mesh; head: THREE.Mesh; ring: THREE.Mesh }>>(
    new Map(),
  );

  // Compute camera target position for a lat/lon & distance
  const setFlyToLatLon = (lat: number, lon: number, distance: number) => {
    latLonToVector3(lat, lon, distance, _camTargetPos);
    flyTargetRef.current.pos.copy(_camTargetPos);
    flyTargetRef.current.active = true;
  };

  useEffect(() => {
    setFlyToLatLon(selectedMarina.latitude, selectedMarina.longitude, 1.95);

    // Update beacon highlight states
    beaconRefs.current.forEach((parts, id) => {
      const isSelected = id === selectedMarina.id;
      const headMat = parts.head.material as THREE.MeshStandardMaterial;
      const ringMat = parts.ring.material as THREE.MeshBasicMaterial;
      if (isSelected) {
        headMat.color.setHex(0xd9a441);
        headMat.emissive.setHex(0xd9a441);
        headMat.emissiveIntensity = 1.1;
        parts.head.scale.setScalar(1.45);
        ringMat.color.setHex(0xd9a441);
        ringMat.opacity = 0.9;
      } else {
        headMat.color.setHex(0x38bdf8);
        headMat.emissive.setHex(0x0ea5e9);
        headMat.emissiveIntensity = 0.65;
        parts.head.scale.setScalar(1.0);
        ringMat.color.setHex(0x38bdf8);
        ringMat.opacity = 0.45;
      }
    });
  }, [selectedMarina]);

  useEffect(() => {
    if (focusPreset === 'turkey') {
      setFlyToLatLon(37.2, 28.4, 1.72);
    } else if (focusPreset === 'med') {
      setFlyToLatLon(38.0, 16.0, 2.25);
    } else {
      setFlyToLatLon(28.0, 22.0, 2.95);
    }
  }, [focusPreset]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    // Software WebGL detection per Three.js skill protocol
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 480;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    latLonToVector3(37.1, 28.2, 1.85, camera.position);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.38;
    controls.maxDistance = 3.8;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    // 3-point maritime studio lighting
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x040b16, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.75);
    keyLight.position.set(4, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0ea5e9, 0.95);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Root globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Earth sphere with procedural bathymetric texture
    const earthTexture = createEarthChartTexture(renderer.capabilities.getMaxAnisotropy());
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.72,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // 2. Subtle atmospheric Fresnel shell
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, 48, 32);
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        glowColor: { value: new THREE.Color(0x0ea5e9) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(glowColor, clamp(intensity * 0.55, 0.0, 0.5));
        }
      `,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosMesh);

    // 3. Great-circle shipping & cruising corridor arcs
    const corridorPairs: [string, string, number][] = [
      ['tr-izmir-cesme', 'tr-didim-dmarin', 0x38bdf8],
      ['tr-didim-dmarin', 'tr-bodrum-yalikavak', 0x38bdf8],
      ['tr-bodrum-yalikavak', 'tr-marmaris-netsel', 0x38bdf8],
      ['tr-marmaris-netsel', 'tr-fethiye-ecesaray', 0x38bdf8],
      ['tr-fethiye-ecesaray', 'tr-antalya-setur', 0x38bdf8],
      ['tr-bodrum-yalikavak', 'gr-athens-flisvos', 0xd9a441],
      ['gr-athens-flisvos', 'me-tivat-portomontenegro', 0x0ea5e9],
      ['me-tivat-portomontenegro', 'mc-monaco-hercule', 0x0ea5e9],
      ['mc-monaco-hercule', 'es-barcelona-portvell', 0x0ea5e9],
      ['tr-antalya-setur', 'ae-dubai-harbour', 0x38bdf8],
    ];

    const routeLines: THREE.Line[] = [];
    corridorPairs.forEach(([fromId, toId, hex]) => {
      const a = marinas.find((m) => m.id === fromId);
      const b = marinas.find((m) => m.id === toId);
      if (a && b) {
        const line = createRouteArc(a.latitude, a.longitude, b.latitude, b.longitude, GLOBE_RADIUS, hex);
        globeGroup.add(line);
        routeLines.push(line);
      }
    });

    // 4. Composite 3-part marina beacons + invisible raycast proxy
    const hitProxies: THREE.Mesh[] = [];
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.032, 8);
    const headGeo = new THREE.SphereGeometry(0.011, 12, 12);
    const ringGeo = new THREE.RingGeometry(0.014, 0.02, 20);
    const proxyGeo = new THREE.SphereGeometry(0.036, 10, 10);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    beaconRefs.current.clear();

    marinas.forEach((marina) => {
      const isSelected = marina.id === selectedMarina.id;
      const surfacePos = latLonToVector3(marina.latitude, marina.longitude, GLOBE_RADIUS);
      _hitNormal.copy(surfacePos).normalize();

      const beaconGroup = new THREE.Group();
      beaconGroup.position.copy(surfacePos);
      beaconGroup.quaternion.setFromUnitVectors(_upAxis, _hitNormal);

      const stemMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.4,
        metalness: 0.7,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.016;

      const headMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xd9a441 : 0x38bdf8,
        emissive: isSelected ? 0xd9a441 : 0x0ea5e9,
        emissiveIntensity: isSelected ? 1.1 : 0.65,
        roughness: 0.25,
        metalness: 0.3,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.034;
      if (isSelected) head.scale.setScalar(1.45);

      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xd9a441 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.45,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;

      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.position.y = 0.024;
      proxy.layers.set(1);
      proxy.userData.marina = marina;

      beaconGroup.add(stem, head, ring, proxy);
      globeGroup.add(beaconGroup);
      hitProxies.push(proxy);
      beaconRefs.current.set(marina.id, { stem, head, ring });
    });

    // Raycasting for click + hover cursor
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return; // Dragged, not clicked

      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        const marina = hits[0].object.userData.marina as Marina | undefined;
        if (marina) {
          onSelectRef.current(marina);
        }
      }
    };

    let lastHoverCheck = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 60) return;
      lastHoverCheck = now;

      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // Render-on-demand + smooth transition loop
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 65);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;

      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const delta = Math.min(clock.getDelta(), 0.05);

        let needsMoreFrames = false;

        if (flyTargetRef.current.active) {
          const lambda = isSoftwareGl ? 10 : 5.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, flyTargetRef.current.pos.x, lambda, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, flyTargetRef.current.pos.y, lambda, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, flyTargetRef.current.pos.z, lambda, delta);
          camera.lookAt(0, 0, 0);

          if (camera.position.distanceTo(flyTargetRef.current.pos) < 0.015) {
            camera.position.copy(flyTargetRef.current.pos);
            flyTargetRef.current.active = false;
          } else {
            needsMoreFrames = true;
          }
        }

        const controlsMoved = controls.update();
        if (controlsMoved) {
          needsMoreFrames = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const onControlsStart = () => {
      flyTargetRef.current.active = false;
    };
    const onControlsChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);

    const onResize = () => {
      if (!mount || disposed) return;
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      stemGeo.dispose();
      headGeo.dispose();
      ringGeo.dispose();
      proxyGeo.dispose();
      proxyMat.dispose();
      routeLines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      beaconRefs.current.forEach((parts) => {
        (parts.stem.material as THREE.Material).dispose();
        (parts.head.material as THREE.Material).dispose();
        (parts.ring.material as THREE.Material).dispose();
      });
      beaconRefs.current.clear();

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [marinas]);

  if (webglError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#061224] p-6 text-center">
        <p className="text-sm font-medium text-sky-300">3D WebGL Globe unavailable on this device</p>
        <p className="mt-1 text-xs text-slate-400">Switch to World Sea Map view to inspect global marinas.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none select-none"
      aria-label="Interactive 3D Maritime Globe"
    />
  );
};
