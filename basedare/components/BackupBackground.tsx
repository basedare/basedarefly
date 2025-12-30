'use client'

import { useEffect, useRef } from 'react'

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) return

    const vertexShaderSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float starLayer(vec2 uv) {
          vec2 gv = fract(uv) - 0.5;
          vec2 id = floor(uv);
          float n = hash21(id);
          float star = 0.0;
          if(n > 0.97) { // Even sparser stars
             float d = length(gv);
             float m = smoothstep(0.12, 0.0, d);
             float twinkle = sin(iTime * 1.5 + n * 100.0) * 0.5 + 0.5;
             star = m * twinkle;
          }
          return star;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
          vec3 col = vec3(0.0); // Pure black void

          float t = iTime * 0.01; // Ultra slow motion
          
          // Only stars, no lines or nebula gradients
          vec2 uv1 = uv * rot(t * 0.5);
          col += vec3(starLayer(uv1 * 15.0) * 0.3); 
          
          vec2 uv2 = uv * rot(t * 0.8);
          col += vec3(starLayer(uv2 * 8.0) * 0.6); 
          
          vec2 uv3 = uv * rot(t);
          col += vec3(starLayer(uv3 * 3.0) * 1.0);

          gl_FragColor = vec4(col, 1.0);
      }
    `

    // Shader creation/program logic (standard WebGL boilerplate)
    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const program = gl.createProgram()!
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource))
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))
    gl.linkProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(program, 'position')
    const timeLoc = gl.getUniformLocation(program, 'iTime')
    const resLoc = gl.getUniformLocation(program, 'iResolution')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener('resize', resize)
    resize()

    let startTime = Date.now()
    const loop = () => {
      gl.useProgram(program)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(timeLoc, (Date.now() - startTime) * 0.001)
      gl.uniform2f(resLoc, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full pointer-events-none" />
}
