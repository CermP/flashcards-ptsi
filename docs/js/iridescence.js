/**
 * Iridescence WebGL Background
 * Vanilla JS adaptation using OGL (loaded via CDN as ES module)
 * Renders an animated iridescent shader behind the hero section
 */
import { Renderer, Program, Mesh, Color, Triangle } from 'https://cdn.jsdelivr.net/npm/ogl/+esm';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

(function initIridescence() {
    const container = document.getElementById('iridescence-bg');
    if (!container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Configuration
    const config = {
        color: [0, 0.9, 1],
        speed: prefersReducedMotion ? 0 : 1.0,
        amplitude: 0.1,
        mouseReact: false,
    };

    let renderer, program, mesh, animateId;

    try {
        renderer = new Renderer({ alpha: false, antialias: true });
    } catch (e) {
        // WebGL not available — CSS fallback gradient will show
        console.warn('WebGL not available, falling back to CSS gradient.');
        container.classList.add('iridescence-fallback');
        return;
    }

    const gl = renderer.gl;
    gl.clearColor(0.18, 0.2, 0.25, 1); // Match --bg-main for seamless blend

    function resize() {
        const scale = window.devicePixelRatio > 1 ? 0.75 : 1; // Reduce resolution on HiDPI for performance
        renderer.setSize(container.offsetWidth * scale, container.offsetHeight * scale);
        gl.canvas.style.width = container.offsetWidth + 'px';
        gl.canvas.style.height = container.offsetHeight + 'px';
        if (program) {
            program.uniforms.uResolution.value = new Color(
                gl.canvas.width,
                gl.canvas.height,
                gl.canvas.width / gl.canvas.height
            );
        }
    }

    window.addEventListener('resize', resize, false);

    const geometry = new Triangle(gl);
    program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new Color(...config.color) },
            uResolution: {
                value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
            },
            uMouse: { value: new Float32Array([0.5, 0.5]) },
            uAmplitude: { value: config.amplitude },
            uSpeed: { value: config.speed },
        },
    });

    mesh = new Mesh(gl, { geometry, program });

    // Initial resize
    resize();

    // Animation loop
    function update(t) {
        animateId = requestAnimationFrame(update);
        program.uniforms.uTime.value = t * 0.001;
        renderer.render({ scene: mesh });
    }

    animateId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);

    // Listen for reduced motion changes at runtime
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        program.uniforms.uSpeed.value = e.matches ? 0 : 1.0;
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(animateId);
        window.removeEventListener('resize', resize);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
})();
