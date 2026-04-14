/*
 * Stripe Mesh Gradient - WebGL Animation
 * Reverse-engineered from stripe.com
 * Original credit: Stripe, Inc.
 *
 * 核心原理:
 * 1. 使用 WebGL 在 canvas 上渲染
 * 2. 顶点着色器(vertex shader) 用 Simplex Noise 扭曲网格几何体，产生波浪状的形变
 * 3. 颜色在顶点着色器中计算: 一个基础色 + 多个"波浪层"，每层有独立的噪声参数
 * 4. 片段着色器(fragment shader) 负责最终输出颜色，并可选地在顶部加暗影
 * 5. 颜色通过 CSS 变量传入，便于动态更换配色方案
 */

// ========== 工具函数 ==========

// 将十六进制颜色值转换为归一化的 RGB 数组 [0-1, 0-1, 0-1]
function normalizeColor(hexCode) {
  return [
    ((hexCode >> 16) & 255) / 255,
    ((hexCode >> 8) & 255) / 255,
    (255 & hexCode) / 255,
  ];
}

// ========== MiniGL: 轻量级 WebGL 封装 ==========
// Stripe 没有使用 Three.js 这样的重型库，而是写了一个极简的 WebGL 封装

class MiniGl {
  constructor(canvas, width, height, debug = false) {
    const _miniGl = this;
    _miniGl.canvas = canvas;
    _miniGl.gl = _miniGl.canvas.getContext("webgl", { antialias: true });
    _miniGl.meshes = [];

    const context = _miniGl.gl;

    if (width && height) this.setSize(width, height);

    _miniGl.debug =
      debug &&
      -1 !== document.location.search.toLowerCase().indexOf("debug=webgl")
        ? function (e) {
            const t = new Date();
            if (t - _miniGl.lastDebugMsg > 1e3) console.log("---");
            console.log(
              t.toLocaleTimeString() +
                Array(Math.max(0, 32 - e.length)).join(" ") +
                e +
                ": ",
              ...Array.from(arguments).slice(1)
            );
            _miniGl.lastDebugMsg = t;
          }
        : () => {};

    // ---- Material (材质): 管理着色器程序和 uniform 变量 ----
    Object.defineProperties(_miniGl, {
      Material: {
        enumerable: false,
        value: class {
          constructor(vertexShaders, fragments, uniforms = {}) {
            const material = this;

            function getShaderByType(type, source) {
              const shader = context.createShader(type);
              context.shaderSource(shader, source);
              context.compileShader(shader);
              if (
                !context.getShaderParameter(shader, context.COMPILE_STATUS)
              ) {
                console.error(context.getShaderInfoLog(shader));
              }
              return shader;
            }

            function getUniformVariableDeclarations(uniforms, type) {
              return Object.entries(uniforms)
                .map(([uniform, value]) =>
                  value.getDeclaration(uniform, type)
                )
                .join("\n");
            }

            material.uniforms = uniforms;
            material.uniformInstances = [];

            const prefix = "\n precision highp float;\n ";

            material.vertexSource = `
              ${prefix}
              attribute vec4 position;
              attribute vec2 uv;
              attribute vec2 uvNorm;
              ${getUniformVariableDeclarations(_miniGl.commonUniforms, "vertex")}
              ${getUniformVariableDeclarations(uniforms, "vertex")}
              ${vertexShaders}
            `;

            material.Source = `
              ${prefix}
              ${getUniformVariableDeclarations(_miniGl.commonUniforms, "fragment")}
              ${getUniformVariableDeclarations(uniforms, "fragment")}
              ${fragments}
            `;

            material.vertexShader = getShaderByType(
              context.VERTEX_SHADER,
              material.vertexSource
            );
            material.fragmentShader = getShaderByType(
              context.FRAGMENT_SHADER,
              material.Source
            );
            material.program = context.createProgram();
            context.attachShader(material.program, material.vertexShader);
            context.attachShader(material.program, material.fragmentShader);
            context.linkProgram(material.program);

            if (
              !context.getProgramParameter(
                material.program,
                context.LINK_STATUS
              )
            ) {
              console.error(context.getProgramInfoLog(material.program));
            }

            context.useProgram(material.program);
            material.attachUniforms(void 0, _miniGl.commonUniforms);
            material.attachUniforms(void 0, material.uniforms);
          }

          attachUniforms(name, uniforms) {
            const material = this;
            if (void 0 === name) {
              Object.entries(uniforms).forEach(([name, uniform]) => {
                material.attachUniforms(name, uniform);
              });
            } else if ("array" == uniforms.type) {
              uniforms.value.forEach((uniform, i) =>
                material.attachUniforms(`${name}[${i}]`, uniform)
              );
            } else if ("struct" == uniforms.type) {
              Object.entries(uniforms.value).forEach(([uniform, i]) =>
                material.attachUniforms(`${name}.${uniform}`, i)
              );
            } else {
              material.uniformInstances.push({
                uniform: uniforms,
                location: context.getUniformLocation(material.program, name),
              });
            }
          }
        },
      },

      // ---- Uniform: 着色器中的统一变量 ----
      Uniform: {
        enumerable: false,
        value: class {
          constructor(e) {
            this.type = "float";
            Object.assign(this, e);
            this.typeFn =
              {
                float: "1f",
                int: "1i",
                vec2: "2fv",
                vec3: "3fv",
                vec4: "4fv",
                mat4: "Matrix4fv",
              }[this.type] || "1f";
            this.update();
          }

          update(value) {
            if (void 0 !== this.value) {
              context[`uniform${this.typeFn}`](
                value,
                0 === this.typeFn.indexOf("Matrix")
                  ? this.transpose
                  : this.value,
                0 === this.typeFn.indexOf("Matrix") ? this.value : null
              );
            }
          }

          getDeclaration(name, type, length) {
            const uniform = this;
            if (uniform.excludeFrom !== type) {
              if ("array" === uniform.type) {
                return (
                  uniform.value[0].getDeclaration(
                    name,
                    type,
                    uniform.value.length
                  ) + `\nconst int ${name}_length = ${uniform.value.length};`
                );
              }
              if ("struct" === uniform.type) {
                let name_no_prefix = name.replace("u_", "");
                name_no_prefix =
                  name_no_prefix.charAt(0).toUpperCase() +
                  name_no_prefix.slice(1);
                return (
                  `uniform struct ${name_no_prefix} {\n` +
                  Object.entries(uniform.value)
                    .map(([name, uniform]) =>
                      uniform
                        .getDeclaration(name, type)
                        .replace(/^uniform/, "")
                    )
                    .join("") +
                  `\n} ${name}${length > 0 ? `[${length}]` : ""};`
                );
              }
              return `uniform ${uniform.type} ${name}${
                length > 0 ? `[${length}]` : ""
              };`;
            }
          }
        },
      },

      // ---- PlaneGeometry: 平面网格几何体 ----
      // 这就是被着色器"扭曲"的那个平面
      PlaneGeometry: {
        enumerable: false,
        value: class {
          constructor(width, height, n, i, orientation) {
            context.createBuffer();
            this.attributes = {
              position: new _miniGl.Attribute({
                target: context.ARRAY_BUFFER,
                size: 3,
              }),
              uv: new _miniGl.Attribute({
                target: context.ARRAY_BUFFER,
                size: 2,
              }),
              uvNorm: new _miniGl.Attribute({
                target: context.ARRAY_BUFFER,
                size: 2,
              }),
              index: new _miniGl.Attribute({
                target: context.ELEMENT_ARRAY_BUFFER,
                size: 3,
                type: context.UNSIGNED_SHORT,
              }),
            };
            this.setTopology(n, i);
            this.setSize(width, height, orientation);
          }

          setTopology(e = 1, t = 1) {
            const n = this;
            n.xSegCount = e;
            n.ySegCount = t;
            n.vertexCount = (n.xSegCount + 1) * (n.ySegCount + 1);
            n.quadCount = n.xSegCount * n.ySegCount * 2;
            n.attributes.uv.values = new Float32Array(2 * n.vertexCount);
            n.attributes.uvNorm.values = new Float32Array(2 * n.vertexCount);
            n.attributes.index.values = new Uint16Array(3 * n.quadCount);

            for (let e = 0; e <= n.ySegCount; e++) {
              for (let t = 0; t <= n.xSegCount; t++) {
                const i = e * (n.xSegCount + 1) + t;
                n.attributes.uv.values[2 * i] = t / n.xSegCount;
                n.attributes.uv.values[2 * i + 1] = 1 - e / n.ySegCount;
                n.attributes.uvNorm.values[2 * i] =
                  (t / n.xSegCount) * 2 - 1;
                n.attributes.uvNorm.values[2 * i + 1] =
                  1 - (e / n.ySegCount) * 2;

                if (t < n.xSegCount && e < n.ySegCount) {
                  const s = e * n.xSegCount + t;
                  n.attributes.index.values[6 * s] = i;
                  n.attributes.index.values[6 * s + 1] = i + 1 + n.xSegCount;
                  n.attributes.index.values[6 * s + 2] = i + 1;
                  n.attributes.index.values[6 * s + 3] = i + 1;
                  n.attributes.index.values[6 * s + 4] = i + 1 + n.xSegCount;
                  n.attributes.index.values[6 * s + 5] = i + 2 + n.xSegCount;
                }
              }
            }

            n.attributes.uv.update();
            n.attributes.uvNorm.update();
            n.attributes.index.update();
          }

          setSize(width = 1, height = 1, orientation = "xz") {
            const geometry = this;
            geometry.width = width;
            geometry.height = height;
            geometry.orientation = orientation;

            if (
              !geometry.attributes.position.values ||
              geometry.attributes.position.values.length !==
                3 * geometry.vertexCount
            ) {
              geometry.attributes.position.values = new Float32Array(
                3 * geometry.vertexCount
              );
            }

            const o = width / -2;
            const r = height / -2;
            const segment_width = width / geometry.xSegCount;
            const segment_height = height / geometry.ySegCount;

            for (let yIndex = 0; yIndex <= geometry.ySegCount; yIndex++) {
              const t = r + yIndex * segment_height;
              for (let xIndex = 0; xIndex <= geometry.xSegCount; xIndex++) {
                const r = o + xIndex * segment_width;
                const l = yIndex * (geometry.xSegCount + 1) + xIndex;
                geometry.attributes.position.values[
                  3 * l + "xyz".indexOf(orientation[0])
                ] = r;
                geometry.attributes.position.values[
                  3 * l + "xyz".indexOf(orientation[1])
                ] = -t;
              }
            }

            geometry.attributes.position.update();
          }
        },
      },

      // ---- Mesh: 将几何体和材质组合在一起 ----
      Mesh: {
        enumerable: false,
        value: class {
          constructor(geometry, material) {
            const mesh = this;
            mesh.geometry = geometry;
            mesh.material = material;
            mesh.wireframe = false;
            mesh.attributeInstances = [];
            Object.entries(mesh.geometry.attributes).forEach(
              ([e, attribute]) => {
                mesh.attributeInstances.push({
                  attribute: attribute,
                  location: attribute.attach(e, mesh.material.program),
                });
              }
            );
            _miniGl.meshes.push(mesh);
          }

          draw() {
            context.useProgram(this.material.program);
            this.material.uniformInstances.forEach(
              ({ uniform: e, location: t }) => e.update(t)
            );
            this.attributeInstances.forEach(
              ({ attribute: e, location: t }) => e.use(t)
            );
            context.drawElements(
              this.wireframe ? context.LINES : context.TRIANGLES,
              this.geometry.attributes.index.values.length,
              context.UNSIGNED_SHORT,
              0
            );
          }

          remove() {
            _miniGl.meshes = _miniGl.meshes.filter((e) => e != this);
          }
        },
      },

      // ---- Attribute: 顶点属性 ----
      Attribute: {
        enumerable: false,
        value: class {
          constructor(e) {
            this.type = context.FLOAT;
            this.normalized = false;
            this.buffer = context.createBuffer();
            Object.assign(this, e);
            this.update();
          }

          update() {
            if (void 0 !== this.values) {
              context.bindBuffer(this.target, this.buffer);
              context.bufferData(
                this.target,
                this.values,
                context.STATIC_DRAW
              );
            }
          }

          attach(e, t) {
            const n = context.getAttribLocation(t, e);
            if (this.target === context.ARRAY_BUFFER) {
              context.enableVertexAttribArray(n);
              context.vertexAttribPointer(
                n,
                this.size,
                this.type,
                this.normalized,
                0,
                0
              );
            }
            return n;
          }

          use(e) {
            context.bindBuffer(this.target, this.buffer);
            if (this.target === context.ARRAY_BUFFER) {
              context.enableVertexAttribArray(e);
              context.vertexAttribPointer(
                e,
                this.size,
                this.type,
                this.normalized,
                0,
                0
              );
            }
          }
        },
      },
    });

    // 正交投影矩阵（单位矩阵）
    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    _miniGl.commonUniforms = {
      projectionMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
      modelViewMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
      resolution: new _miniGl.Uniform({ type: "vec2", value: [1, 1] }),
      aspectRatio: new _miniGl.Uniform({ type: "float", value: 1 }),
    };
  }

  setSize(e = 640, t = 480) {
    this.width = e;
    this.height = t;
    this.canvas.width = e;
    this.canvas.height = t;
    this.gl.viewport(0, 0, e, t);
    this.commonUniforms.resolution.value = [e, t];
    this.commonUniforms.aspectRatio.value = e / t;
  }

  setOrthographicCamera(e = 0, t = 0, n = 0, i = -2e3, s = 2e3) {
    this.commonUniforms.projectionMatrix.value = [
      2 / this.width, 0, 0, 0,
      0, 2 / this.height, 0, 0,
      0, 0, 2 / (i - s), 0,
      e, t, n, 1,
    ];
  }

  render() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clearDepth(1);
    this.meshes.forEach((e) => e.draw());
  }
}

// ========== GLSL 着色器代码 ==========

// Simplex Noise (简单噪声)
// 这是产生"有机感"运动的核心算法，比 Perlin Noise 更好
const shaderNoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// 混合模式 - 在 GPU 中实现 Photoshop 的图层混合效果
const shaderBlend = `
vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}
`;

// 顶点着色器 - 这是最核心的部分
// 每个顶点的位置和颜色都在这里计算
const shaderVertex = `
varying vec3 v_color;

void main() {
  // 时间驱动动画
  float time = u_time * u_global.noiseSpeed;

  // 噪声坐标 = 分辨率 × UV × 噪声频率
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;

  vec2 st = 1. - uvNorm.xy;

  // === 顶点形变 ===
  // 倾斜 + 倾角 + 噪声偏移 → 产生波浪状的 3D 效果
  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  // 用 3D simplex noise 计算顶点偏移量
  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  // 边缘衰减: 让顶部和底部的形变幅度减小
  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(
    position.x,
    position.y + tilt + incline + noise - offset,
    position.z
  );

  // === 颜色计算 ===
  // 基础色
  if (u_active_colors[0] == 1.) {
    v_color = u_baseColor;
  }

  // 叠加波浪色层 - 每层颜色用独立的噪声控制显隐
  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];

      // smoothstep 产生平滑的 0→1 过渡
      float noise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );

      // pow(noise, 4.) 让颜色过渡更锐利
      v_color = blendNormal(v_color, layer.color, pow(noise, 4.));
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 片段着色器 - 最终像素输出
const shaderFragment = `
varying vec3 v_color;

void main() {
  vec3 color = v_color;
  // 顶部暗影效果（模拟 Stripe 的导航栏下方阴影）
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy / resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

// ========== Gradient 主类 ==========

class Gradient {
  constructor() {
    this.el = undefined;
    this.cssVarRetries = 0;
    this.maxCssVarRetries = 200;
    this.angle = 0;
    this.isLoadedClass = false;
    this.isScrolling = false;
    this.scrollingTimeout = undefined;
    this.scrollingRefreshDelay = 200;
    this.isIntersecting = false;
    this.computedCanvasStyle = undefined;
    this.conf = undefined;
    this.uniforms = undefined;
    this.t = 1253106; // 初始时间偏移，避免从 0 开始
    this.last = 0;
    this.width = undefined;
    this.minWidth = 1111;
    this.height = 600;
    this.xSegCount = undefined;
    this.ySegCount = undefined;
    this.mesh = undefined;
    this.material = undefined;
    this.geometry = undefined;
    this.minigl = undefined;
    this.scrollObserver = undefined;
    this.amp = 320;        // 波浪振幅
    this.seed = 5;         // 噪声种子
    this.freqX = 14e-5;    // X 方向噪声频率
    this.freqY = 29e-5;    // Y 方向噪声频率
    this.freqDelta = 1e-5;
    this.activeColors = [1, 1, 1, 1]; // 4 个颜色层的开关
    this.isMetaKey = false;
    this.isGradientLegendVisible = false;
    this.isMouseDown = false;
    this.isStatic = false;
    this.sectionColors = undefined;
    this.shaderFiles = undefined;
    this.vertexShader = undefined;
  }

  // --- 事件处理 ---

  handleScroll = () => {
    clearTimeout(this.scrollingTimeout);
    this.scrollingTimeout = setTimeout(
      this.handleScrollEnd,
      this.scrollingRefreshDelay
    );
    if (this.conf.playing) {
      this.isScrolling = true;
      this.pause();
    }
  };

  handleScrollEnd = () => {
    this.isScrolling = false;
    if (this.isIntersecting) this.play();
  };

  resize = () => {
    this.width = window.innerWidth;
    this.minigl.setSize(this.width, this.height);
    this.minigl.setOrthographicCamera();
    this.xSegCount = Math.ceil(this.width * this.conf.density[0]);
    this.ySegCount = Math.ceil(this.height * this.conf.density[1]);
    this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
    this.mesh.geometry.setSize(this.width, this.height);
    this.mesh.material.uniforms.u_shadow_power.value =
      this.width < 600 ? 5 : 6;
  };

  // --- 动画循环 ---

  animate = (e) => {
    if (!this.shouldSkipFrame(e) || this.isMouseDown) {
      this.t += Math.min(e - this.last, 1e3 / 15);
      this.last = e;

      if (this.isMouseDown) {
        this.t += this.isMetaKey ? -160 : 160;
      }

      this.mesh.material.uniforms.u_time.value = this.t;
      this.minigl.render();
    }

    if (0 !== this.last && this.isStatic) {
      this.minigl.render();
      this.disconnect();
      return;
    }

    if (this.conf.playing || this.isMouseDown) {
      requestAnimationFrame(this.animate);
    }
  };

  addIsLoadedClass = () => {
    if (!this.isLoadedClass) {
      this.isLoadedClass = true;
      this.el.classList.add("isLoaded");
      setTimeout(() => {
        this.el.parentElement.classList.add("isLoaded");
      }, 3e3);
    }
  };

  pause = () => {
    this.conf.playing = false;
  };

  play = () => {
    requestAnimationFrame(this.animate);
    this.conf.playing = true;
  };

  // --- 初始化 ---

  initGradient(selector) {
    this.el = document.querySelector(selector);
    this.connect();
    return this;
  }

  connect() {
    this.shaderFiles = {
      vertex: shaderVertex,
      noise: shaderNoise,
      blend: shaderBlend,
      fragment: shaderFragment,
    };

    this.conf = {
      presetName: "",
      wireframe: false,
      // density 控制网格密度: [x方向, y方向]
      // 更高的值 = 更多三角形 = 更平滑的波浪但更消耗 GPU
      density: [0.06, 0.16],
      zoom: 1,
      rotation: 0,
      playing: true,
    };

    if (document.querySelectorAll("canvas").length < 1) {
      console.log("No canvas found");
      return;
    }

    this.minigl = new MiniGl(this.el, null, null, true);
    requestAnimationFrame(() => {
      if (this.el) {
        this.computedCanvasStyle = getComputedStyle(this.el);
        this.waitForCssVars();
      }
    });
  }

  disconnect() {
    if (this.scrollObserver) {
      window.removeEventListener("scroll", this.handleScroll);
      this.scrollObserver.disconnect();
    }
    window.removeEventListener("resize", this.resize);
  }

  // 等待 CSS 变量可用后再初始化
  waitForCssVars() {
    if (
      this.computedCanvasStyle &&
      this.computedCanvasStyle
        .getPropertyValue("--gradient-color-1")
        .indexOf("#") !== -1
    ) {
      this.init();
      this.addIsLoadedClass();
    } else {
      this.cssVarRetries += 1;
      if (this.cssVarRetries > this.maxCssVarRetries) {
        // 回退到默认颜色
        this.sectionColors = [
          normalizeColor(0xef008f),
          normalizeColor(0x6ec3f4),
          normalizeColor(0x7038ff),
          normalizeColor(0xfbaf3f),
        ];
        this.init();
        return;
      }
      requestAnimationFrame(() => this.waitForCssVars());
    }
  }

  // 从 CSS 变量读取颜色
  initGradientColors() {
    this.sectionColors = [
      "--gradient-color-1",
      "--gradient-color-2",
      "--gradient-color-3",
      "--gradient-color-4",
    ]
      .map((cssPropertyName) => {
        let hex = this.computedCanvasStyle
          .getPropertyValue(cssPropertyName)
          .trim();
        // 处理简写的 3 位 hex
        if (4 === hex.length) {
          const expanded = hex
            .substr(1)
            .split("")
            .map((c) => c + c)
            .join("");
          hex = `#${expanded}`;
        }
        return hex && `0x${hex.substr(1)}`;
      })
      .filter(Boolean)
      .map(normalizeColor);
  }

  // 初始化材质（着色器 + uniform 参数）
  initMaterial() {
    this.uniforms = {
      u_time: new this.minigl.Uniform({ value: 0 }),
      u_shadow_power: new this.minigl.Uniform({ value: 5 }),
      u_darken_top: new this.minigl.Uniform({
        value: "" === this.el.dataset.jsDarkenTop ? 1 : 0,
      }),
      u_active_colors: new this.minigl.Uniform({
        value: this.activeColors,
        type: "vec4",
      }),
      u_global: new this.minigl.Uniform({
        value: {
          noiseFreq: new this.minigl.Uniform({
            value: [this.freqX, this.freqY],
            type: "vec2",
          }),
          noiseSpeed: new this.minigl.Uniform({
            value: 5e-6, // 非常慢的速度 → 缓慢流动的效果
          }),
        },
        type: "struct",
      }),
      u_vertDeform: new this.minigl.Uniform({
        value: {
          incline: new this.minigl.Uniform({
            value: Math.sin(this.angle) / Math.cos(this.angle),
          }),
          offsetTop: new this.minigl.Uniform({ value: -0.5 }),
          offsetBottom: new this.minigl.Uniform({ value: -0.5 }),
          noiseFreq: new this.minigl.Uniform({
            value: [3, 4],
            type: "vec2",
          }),
          noiseAmp: new this.minigl.Uniform({ value: this.amp }),
          noiseSpeed: new this.minigl.Uniform({ value: 10 }),
          noiseFlow: new this.minigl.Uniform({ value: 3 }),
          noiseSeed: new this.minigl.Uniform({ value: this.seed }),
        },
        type: "struct",
        excludeFrom: "fragment",
      }),
      u_baseColor: new this.minigl.Uniform({
        value: this.sectionColors[0],
        type: "vec3",
        excludeFrom: "fragment",
      }),
      u_waveLayers: new this.minigl.Uniform({
        value: [],
        excludeFrom: "fragment",
        type: "array",
      }),
    };

    // 为每个颜色（除基础色外）创建一个波浪层
    for (let e = 1; e < this.sectionColors.length; e += 1) {
      this.uniforms.u_waveLayers.value.push(
        new this.minigl.Uniform({
          value: {
            color: new this.minigl.Uniform({
              value: this.sectionColors[e],
              type: "vec3",
            }),
            noiseFreq: new this.minigl.Uniform({
              value: [
                2 + e / this.sectionColors.length,
                3 + e / this.sectionColors.length,
              ],
              type: "vec2",
            }),
            noiseSpeed: new this.minigl.Uniform({
              value: 11 + 0.3 * e,
            }),
            noiseFlow: new this.minigl.Uniform({
              value: 6.5 + 0.3 * e,
            }),
            noiseSeed: new this.minigl.Uniform({
              value: this.seed + 10 * e,
            }),
            noiseFloor: new this.minigl.Uniform({ value: 0.1 }),
            noiseCeil: new this.minigl.Uniform({
              value: 0.63 + 0.07 * e,
            }),
          },
          type: "struct",
        })
      );
    }

    this.vertexShader = [
      this.shaderFiles.noise,
      this.shaderFiles.blend,
      this.shaderFiles.vertex,
    ].join("\n\n");

    return new this.minigl.Material(
      this.vertexShader,
      this.shaderFiles.fragment,
      this.uniforms
    );
  }

  initMesh() {
    this.material = this.initMaterial();
    this.geometry = new this.minigl.PlaneGeometry();
    this.mesh = new this.minigl.Mesh(this.geometry, this.material);
  }

  shouldSkipFrame(e) {
    return (
      !!window.document.hidden ||
      !this.conf.playing ||
      parseInt(e, 10) % 2 == 0
    );
  }

  updateFrequency(e) {
    this.freqX += e;
    this.freqY += e;
  }

  toggleColor(index) {
    this.activeColors[index] = 0 === this.activeColors[index] ? 1 : 0;
  }

  init() {
    this.initGradientColors();
    this.initMesh();
    this.resize();
    requestAnimationFrame(this.animate);
    window.addEventListener("resize", this.resize);

    // 使用 IntersectionObserver 在不可见时暂停动画（节省 GPU）
    this.isIntersecting = true;
    if ("IntersectionObserver" in window) {
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.isIntersecting = entry.isIntersecting;
            if (this.isIntersecting) {
              this.play();
            } else {
              this.pause();
            }
          });
        },
        { rootMargin: "0px", threshold: 0.1 }
      );
      this.scrollObserver.observe(this.el);
    }
  }
}

// Expose to global scope for dynamic script loading
window.Gradient = Gradient;
