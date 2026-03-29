'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const HDRI_URL =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_03_2k.hdr';
const PEEBEAR_TEXTURE_URL = '/assets/peebear-head.png';

type PeeBearGlassProps = {
  className?: string;
};

function createPolygonShape(sides: number, radius: number) {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / sides;
  const offset = Math.PI / 8;

  for (let i = 0; i < sides; i += 1) {
    const x = Math.cos(i * angleStep + offset) * radius;
    const y = Math.sin(i * angleStep + offset) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  shape.closePath();
  return shape;
}

export default function PeeBearGlass({ className }: PeeBearGlassProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const baseSpinVelocity = 0.42;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.85);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
    scene.add(ambientLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.65);
    backLight.position.set(-5, 2, -10);
    scene.add(backLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.9);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.7);
    frontLight.position.set(0, 2, 10);
    scene.add(frontLight);

    const group = new THREE.Group();
    group.position.y = 0;
    group.scale.setScalar(1.62);
    scene.add(group);
    group.rotation.order = 'YXZ';

    let envTexture: THREE.DataTexture | null = null;
    let envRenderTarget: THREE.WebGLRenderTarget | null = null;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      HDRI_URL,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        envTexture = texture;
        envRenderTarget = pmremGenerator.fromEquirectangular(texture);
        scene.environment = envRenderTarget.texture;
        scene.environmentIntensity = 0.11;
      },
      undefined,
      () => {
        // Keep the effect running with lights only if the HDRI fails.
      }
    );

    const photoGeo = new THREE.PlaneGeometry(1, 1);
    const photoMat = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
    });
    const photoMesh = new THREE.Mesh(photoGeo, photoMat);
    photoMesh.position.set(0, 0, 0.12);
    photoMesh.renderOrder = 0;
    group.add(photoMesh);

    let currentAspectRatio = 1.0;
    const photoScale = 2.0;

    const updatePhotoScale = () => {
      const finalScale = photoScale;
      const scaleX =
        currentAspectRatio > 1 ? finalScale : finalScale * currentAspectRatio;
      const scaleY =
        currentAspectRatio > 1 ? finalScale / currentAspectRatio : finalScale;

      photoMesh.scale.set(scaleX, scaleY, 1);
    };

    const textureLoader = new THREE.TextureLoader();
    let photoTexture: THREE.Texture | null = null;
    textureLoader.load(PEEBEAR_TEXTURE_URL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      photoTexture = texture;
      photoMat.map = texture;
      photoMat.needsUpdate = true;
      if (texture.image && 'width' in texture.image && 'height' in texture.image) {
        currentAspectRatio = texture.image.width / texture.image.height;
        updatePhotoScale();
      }
    });

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 1.0,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.1,
      curveSegments: 512,
    };

    const glassGeo = new THREE.ExtrudeGeometry(createPolygonShape(8, 1.2), extrudeSettings);
    glassGeo.center();

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#A855F7',
      transmission: 1.0,
      opacity: 1.0,
      metalness: 0.0,
      roughness: 0.0,
      ior: 2.33,
      thickness: 1.2,
      attenuationColor: new THREE.Color('#ddd6fe'),
      attenuationDistance: 5.5,
      specularIntensity: 0.82,
      envMapIntensity: 1.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      sheen: 0.16,
      sheenColor: new THREE.Color('#ede9fe'),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.renderOrder = 1;
    group.add(glassMesh);

    const resizeRenderer = () => {
      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 400;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resizeRenderer();

    const resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
    });
    resizeObserver.observe(mount);

    let frameId = 0;
    let isUnmounted = false;
    const clock = new THREE.Clock();
    let currentRotationY = 0;
    let spinVelocity = baseSpinVelocity;
    let isDragging = false;
    let lastPointerX = 0;

    const animate = () => {
      if (isUnmounted) {
        frameId = 0;
        return;
      }

      const delta = clock.getDelta();
      currentRotationY += spinVelocity * delta;
      spinVelocity *= isDragging ? 0.972 : 0.998;
      if (Math.abs(spinVelocity) < baseSpinVelocity) {
        spinVelocity += (baseSpinVelocity - spinVelocity) * 0.02;
      }

      group.rotation.x = 0;
      group.rotation.y = currentRotationY;
      group.rotation.z = 0;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    const onPointerDown = (event: PointerEvent) => {
      isDragging = true;
      lastPointerX = event.clientX;
      mount.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      spinVelocity += deltaX * 0.0055;
      spinVelocity = THREE.MathUtils.clamp(spinVelocity, -1.35, 1.35);
    };

    const endDrag = (event?: PointerEvent) => {
      isDragging = false;
      if (event) {
        mount.releasePointerCapture?.(event.pointerId);
      }
    };

    const ensureAnimation = () => {
      if (!frameId && !isUnmounted) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', endDrag);
    mount.addEventListener('pointercancel', endDrag);
    mount.addEventListener('pointerleave', endDrag);

    ensureAnimation();

    return () => {
      isUnmounted = true;
      resizeObserver.disconnect();
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', endDrag);
      mount.removeEventListener('pointercancel', endDrag);
      mount.removeEventListener('pointerleave', endDrag);

      scene.environment = null;
      envRenderTarget?.dispose();
      envTexture?.dispose();
      pmremGenerator.dispose();
      photoTexture?.dispose();
      photoGeo.dispose();
      photoMat.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      className={className ?? 'mx-auto h-[280px] w-[280px] md:h-[400px] md:w-[400px]'}
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
