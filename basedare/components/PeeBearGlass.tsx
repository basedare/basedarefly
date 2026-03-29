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
    camera.position.set(0, 0, 6.3);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 3.0);
    backLight.position.set(-5, 2, -10);
    scene.add(backLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 2, 10);
    scene.add(frontLight);

    const group = new THREE.Group();
    group.position.y = 0;
    group.scale.setScalar(1.42);
    scene.add(group);
    group.rotation.order = 'YXZ';

    let envTexture: THREE.DataTexture | null = null;
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      HDRI_URL,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        envTexture = texture;
        scene.environment = texture;
        scene.environmentIntensity = 0.3;
      },
      undefined,
      () => {
        // Keep the effect running with lights only if the HDRI fails.
      }
    );

    const photoGeo = new THREE.PlaneGeometry(1, 1);
    const photoRig = new THREE.Group();
    group.add(photoRig);

    const createPhotoMaterial = (opacity = 1) =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        color: 0xffffff,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity,
        alphaTest: 0.02,
        depthWrite: false,
      });

    const centerPhotoMat = createPhotoMaterial(1);
    const leftPhotoMat = createPhotoMaterial(0.85);
    const rightPhotoMat = createPhotoMaterial(0.85);
    const rearPhotoMat = createPhotoMaterial(0.65);

    const centerPhotoMesh = new THREE.Mesh(photoGeo, centerPhotoMat);
    centerPhotoMesh.position.set(0, 0, 0.16);
    centerPhotoMesh.renderOrder = 0;
    photoRig.add(centerPhotoMesh);

    const leftPhotoMesh = new THREE.Mesh(photoGeo, leftPhotoMat);
    leftPhotoMesh.position.set(-0.22, 0, -0.02);
    leftPhotoMesh.rotation.y = 0.72;
    leftPhotoMesh.renderOrder = 0;
    photoRig.add(leftPhotoMesh);

    const rightPhotoMesh = new THREE.Mesh(photoGeo, rightPhotoMat);
    rightPhotoMesh.position.set(0.22, 0, -0.02);
    rightPhotoMesh.rotation.y = -0.72;
    rightPhotoMesh.renderOrder = 0;
    photoRig.add(rightPhotoMesh);

    const rearPhotoMesh = new THREE.Mesh(photoGeo, rearPhotoMat);
    rearPhotoMesh.position.set(0, 0, -0.22);
    rearPhotoMesh.rotation.y = Math.PI;
    rearPhotoMesh.renderOrder = 0;
    photoRig.add(rearPhotoMesh);

    let currentAspectRatio = 1.0;
    const photoScale = 2.0;

    const updatePhotoScale = () => {
      const finalScale = photoScale;
      const scaleX =
        currentAspectRatio > 1 ? finalScale : finalScale * currentAspectRatio;
      const scaleY =
        currentAspectRatio > 1 ? finalScale / currentAspectRatio : finalScale;

      centerPhotoMesh.scale.set(scaleX, scaleY, 1);
      leftPhotoMesh.scale.set(scaleX * 0.98, scaleY * 0.98, 1);
      rightPhotoMesh.scale.set(scaleX * 0.98, scaleY * 0.98, 1);
      rearPhotoMesh.scale.set(scaleX * 0.92, scaleY * 0.92, 1);
    };

    const textureLoader = new THREE.TextureLoader();
    let photoTexture: THREE.Texture | null = null;
    textureLoader.load(PEEBEAR_TEXTURE_URL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      photoTexture = texture;
      centerPhotoMat.map = texture;
      leftPhotoMat.map = texture;
      rightPhotoMat.map = texture;
      rearPhotoMat.map = texture;
      centerPhotoMat.needsUpdate = true;
      leftPhotoMat.needsUpdate = true;
      rightPhotoMat.needsUpdate = true;
      rearPhotoMat.needsUpdate = true;
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
      attenuationColor: new THREE.Color('#ffffff'),
      attenuationDistance: 9999.0,
      specularIntensity: 1.0,
      envMapIntensity: 1.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      sheen: 0.35,
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
    let isVisible = true;
    const clock = new THREE.Clock();
    let currentRotationY = 0;
    let spinVelocity = baseSpinVelocity;
    let isDragging = false;
    let lastPointerX = 0;

    const animate = () => {
      if (isUnmounted || !isVisible) {
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
      if (!frameId && isVisible && !isUnmounted) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible) {
          ensureAnimation();
        } else if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
      },
      { threshold: 0.12 }
    );
    intersectionObserver.observe(mount);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', endDrag);
    mount.addEventListener('pointercancel', endDrag);
    mount.addEventListener('pointerleave', endDrag);

    ensureAnimation();

    return () => {
      isUnmounted = true;
      intersectionObserver.disconnect();
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
      envTexture?.dispose();
      photoTexture?.dispose();
      photoGeo.dispose();
      centerPhotoMat.dispose();
      leftPhotoMat.dispose();
      rightPhotoMat.dispose();
      rearPhotoMat.dispose();
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
