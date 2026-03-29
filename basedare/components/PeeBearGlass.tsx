'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const HDRI_URL =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/royal_esplanade_2k.hdr';
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

    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }

  shape.closePath();
  return shape;
}

export default function PeeBearGlass({ className }: PeeBearGlassProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    const topLight = new THREE.DirectionalLight(0xffffff, 1.8);
    topLight.position.set(0, 3, 4);
    const rimLight = new THREE.DirectionalLight(0xc084fc, 1.2);
    rimLight.position.set(-4, 1.5, 2.5);
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(3, -2, 2);

    scene.add(ambientLight, topLight, rimLight, fillLight);

    const glassGroup = new THREE.Group();
    scene.add(glassGroup);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 1.0,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.1,
      curveSegments: 64,
    };

    const geo = new THREE.ExtrudeGeometry(createPolygonShape(8, 1.2), extrudeSettings);
    geo.center();

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#9333ea'),
      transparent: true,
      transmission: 1.0,
      ior: 1.6,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      roughness: 0.04,
      metalness: 0.0,
      envMapIntensity: 1.5,
      attenuationColor: new THREE.Color('#9333ea'),
      attenuationDistance: 1.5,
      sheen: 0.2,
      sheenColor: new THREE.Color('#f5d0fe'),
      specularIntensity: 1.0,
      side: THREE.DoubleSide,
    });

    const octagonMesh = new THREE.Mesh(geo, glassMaterial);
    glassGroup.add(octagonMesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 18),
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#d8b4fe'),
        transparent: true,
        opacity: 0.45,
      })
    );
    glassGroup.add(edges);

    const imageTexture = new THREE.TextureLoader().load(PEEBEAR_TEXTURE_URL);
    imageTexture.colorSpace = THREE.SRGBColorSpace;

    const peebearMaterial = new THREE.MeshBasicMaterial({
      map: imageTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.03,
    });
    const peebearPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.85), peebearMaterial);
    peebearPlane.position.z = 0.08;
    peebearPlane.renderOrder = 2;
    glassGroup.add(peebearPlane);

    const glowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#a855f7'),
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glowPlane.position.z = -0.12;
    glassGroup.add(glowPlane);

    const rgbeLoader = new RGBELoader();
    let environmentTexture: THREE.DataTexture | null = null;
    rgbeLoader.load(
      HDRI_URL,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        environmentTexture = texture;
        scene.environment = texture;
      },
      undefined,
      () => {
        // The lights are enough to keep the glass legible if the HDRI fails.
      }
    );

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
    let isVisible = true;
    let isUnmounted = false;

    const startTime = performance.now();

    const animate = () => {
      if (isUnmounted || !isVisible) {
        frameId = 0;
        return;
      }

      const elapsed = (performance.now() - startTime) / 1000;

      glassGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.5;
      glassGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
      glassGroup.rotation.z = Math.sin(elapsed * 0.15) * 0.08;

      peebearPlane.rotation.y = Math.sin(elapsed * 0.14) * 0.04;
      glowPlane.material.opacity = 0.08 + ((Math.sin(elapsed * 0.9) + 1) * 0.5) * 0.05;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
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

    ensureAnimation();

    return () => {
      isUnmounted = true;
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      scene.environment = null;
      environmentTexture?.dispose();
      imageTexture.dispose();
      geo.dispose();
      glassMaterial.dispose();
      peebearMaterial.dispose();
      glowPlane.geometry.dispose();
      (glowPlane.material as THREE.Material).dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      peebearPlane.geometry.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={className ?? 'mx-auto h-[280px] w-[280px] md:h-[400px] md:w-[400px]'}>
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
