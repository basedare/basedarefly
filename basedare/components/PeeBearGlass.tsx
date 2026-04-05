'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const HDRI_URL =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/moonless_golf_2k.hdr';
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
  const sparkleRef = useRef<HTMLCanvasElement>(null);
  const baseSpinVelocity = 0.42;

  useEffect(() => {
    const mount = mountRef.current;
    const sparkleCanvas = sparkleRef.current;
    if (!mount || !sparkleCanvas) return undefined;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
    scene.add(ambientLight);

    const backLight = new THREE.DirectionalLight(0xe879f9, 0.6);
    backLight.position.set(-5, 2, -10);
    scene.add(backLight);

    const topLight = new THREE.DirectionalLight(0xf0abfc, 0.24);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const frontLight = new THREE.DirectionalLight(0xd946ef, 0.22);
    frontLight.position.set(0, 2, 10);
    scene.add(frontLight);

    const group = new THREE.Group();
    group.position.y = 0;
    group.scale.setScalar(1.72);
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
        scene.environmentIntensity = 0.08;
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
    const photoScale = 2.14;

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
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.03,
      curveSegments: 512,
    };

    const glassGeo = new THREE.ExtrudeGeometry(createPolygonShape(8, 1.2), extrudeSettings);
    glassGeo.center();

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#a855f7',
      transmission: 1.0,
      opacity: 1.0,
      metalness: 0.0,
      roughness: 0.0,
      ior: 2.33,
      thickness: 0.22,
      attenuationColor: new THREE.Color('#f3e8ff'),
      attenuationDistance: 3.1,
      emissive: new THREE.Color('#581c87'),
      emissiveIntensity: 0.28,
      specularIntensity: 0.8,
      envMapIntensity: 0.52,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      sheen: 0.16,
      sheenColor: new THREE.Color('#f0abfc'),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.renderOrder = 1;
    group.add(glassMesh);

    let sparkleContext: CanvasRenderingContext2D | null = null;
    let sparkleWidth = 0;
    let sparkleHeight = 0;
    const sparkleStars = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.2 + 0.35,
      opacity: Math.random() * 0.28 + 0.06,
      speed: Math.random() * 0.05 + 0.018,
      twinkle: Math.random() * Math.PI * 2,
    }));
    let sparkleBursts: Array<{
      x: number;
      y: number;
      life: number;
      maxLife: number;
      size: number;
    }> = [];

    const clipOctagon = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.47;
      const sides = 8;
      const offset = Math.PI / 8;
      ctx.beginPath();
      for (let i = 0; i < sides; i += 1) {
        const angle = (i * Math.PI * 2) / sides + offset;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
    };

    const resizeRenderer = () => {
      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 400;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      sparkleWidth = width;
      sparkleHeight = height;
      sparkleCanvas.width = Math.floor(width * Math.min(window.devicePixelRatio, 2));
      sparkleCanvas.height = Math.floor(height * Math.min(window.devicePixelRatio, 2));
      sparkleCanvas.style.width = `${width}px`;
      sparkleCanvas.style.height = `${height}px`;
      sparkleContext = sparkleCanvas.getContext('2d');
      if (sparkleContext) {
        sparkleContext.setTransform(1, 0, 0, 1, 0, 0);
        sparkleContext.scale(
          sparkleCanvas.width / width,
          sparkleCanvas.height / height
        );
      }
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

      if (sparkleContext) {
        const ctx = sparkleContext;
        ctx.clearRect(0, 0, sparkleWidth, sparkleHeight);
        ctx.save();
        clipOctagon(ctx, sparkleWidth, sparkleHeight);

        const now = performance.now() * 0.001;
        const gradX = sparkleWidth * 0.5 + Math.sin(now * 0.24) * sparkleWidth * 0.16;
        const gradY = sparkleHeight * 0.48 + Math.cos(now * 0.18) * sparkleHeight * 0.14;
        const holoGrad = ctx.createRadialGradient(
          gradX,
          gradY,
          0,
          gradX,
          gradY,
          Math.max(sparkleWidth, sparkleHeight) * 0.8
        );
        holoGrad.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
        holoGrad.addColorStop(0.34, 'rgba(192, 132, 252, 0.05)');
        holoGrad.addColorStop(0.62, 'rgba(245, 197, 24, 0.025)');
        holoGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = holoGrad;
        ctx.fillRect(0, 0, sparkleWidth, sparkleHeight);

        sparkleStars.forEach((star) => {
          star.twinkle += 0.02;
          star.x -= star.speed * 0.0018 * sparkleWidth;
          if (star.x < -0.02) star.x = 1.02;

          const x = star.x * sparkleWidth;
          const y = star.y * sparkleHeight;
          const twinkleOpacity = star.opacity * (0.42 + 0.58 * Math.sin(star.twinkle));
          const glow = ctx.createRadialGradient(x, y, 0, x, y, star.size * 4.5);
          glow.addColorStop(0, `rgba(245, 197, 24, ${twinkleOpacity})`);
          glow.addColorStop(0.42, `rgba(192, 132, 252, ${twinkleOpacity * 0.42})`);
          glow.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(x, y, star.size * 4.5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 244, 200, ${twinkleOpacity * 0.9})`;
          ctx.fill();
        });

        if (Math.random() < 0.024) {
          sparkleBursts.push({
            x: sparkleWidth * (0.18 + Math.random() * 0.64),
            y: sparkleHeight * (0.18 + Math.random() * 0.64),
            life: 0,
            maxLife: 24,
            size: Math.random() * 4.8 + 3.2,
          });
        }

        sparkleBursts = sparkleBursts.filter((sparkle) => sparkle.life < sparkle.maxLife);
        sparkleBursts.forEach((sparkle) => {
          sparkle.life += 1;
          const progress = sparkle.life / sparkle.maxLife;
          const size = Math.sin(progress * Math.PI) * sparkle.size;
          const opacity = Math.sin(progress * Math.PI) * 0.7;

          ctx.save();
          ctx.translate(sparkle.x, sparkle.y);
          ctx.beginPath();
          for (let i = 0; i < 4; i += 1) {
            const angle = (i * Math.PI) / 2;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
            ctx.lineTo(
              Math.cos(angle + Math.PI / 4) * (size * 0.22),
              Math.sin(angle + Math.PI / 4) * (size * 0.22)
            );
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 220, 100, ${opacity})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = `rgba(245, 197, 24, ${opacity})`;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-size * 0.18, 0);
          ctx.lineTo(size * 0.18, 0);
          ctx.moveTo(0, -size * 0.18);
          ctx.lineTo(0, size * 0.18);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.78})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        });

        ctx.restore();
      }

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
      style={{ touchAction: 'none', cursor: 'grab', position: 'relative' }}
    >
      <div ref={mountRef} className="h-full w-full" />
      <canvas
        ref={sparkleRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: 'color-dodge', opacity: 0.98 }}
      />
    </div>
  );
}
