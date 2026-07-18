# World Compiler v12 — 高精度轴心旋转实施文档

- 状态：可供下一 session 直接实施
- 实现基线：`24a5a84 feat: animate World Compiler mechanisms`
- 工作分支：`codex/world-compiler-parts-motion`
- 视觉基准：`design/world-compiler-expanded.png`
- 当前 QA：`design/qa-v11-motion-contact-sheet.png`

## 1. 本轮目标

让 INPUT、RULES、STATE、OUTPUT 的内部运动明确服从同一条水平机械轴，并在桌面 DPR 2 与移动端显示中保持锐利、稳定、可读。

下一轮先完成 INPUT 高精度样板，样板通过轴心、清晰度、生命周期和性能验收后，再把同一层级模型推广到 RULES 与 STATE。OUTPUT 的真实球体转动在最后单独决策。

## 2. 已确认的根因

### 2.1 轴心坐标正确

- 全局机器画布：`936 × 660`。
- INPUT 轴心：`(201, 263)`。
- 当前移动裁片：`(168, 204) → (252, 316)`，尺寸 `84 × 112`。
- 裁片内轴心：`(33, 59)`。
- 当前 CSS 轴心：`39.2857% 52.6786%`，与 `(33, 59)` 精确对应。

### 2.2 图层所有权过粗

当前 `grid_x < 248` 的分割规则把轮体、左侧轴杆、中央轮毂、轮缘和少量背景边缘一起放入旋转层，移动层覆盖原零件约 93% 的有效 alpha。

当前二维投影变换：

```text
scaleX(0.58) rotateZ(θ) scaleX(1 / 0.58)
```

该数学公式适合一张位于同一平面的圆盘纹理。轴杆、轮毂和有厚度的轮缘属于不同深度面；它们进入同一变换后，左侧轴杆在 ±10° 相位下会产生约 ±9px 的垂直位移，形成整块轮体摇晃的观感。

### 2.3 清晰度不足来自设备像素覆盖与重复采样

- 当前 INPUT 运动图尺寸为 `84 × 112`。
- 1280px 桌面布局中，它约显示为 `72 × 97 CSS px`。
- DPR 2 下需要至少约 `144 × 194` 个源像素覆盖设备像素；当前宽度只达到约 1.17 源像素 / CSS px。
- `scaleX → rotate → inverse scaleX` 会继续放大双线性采样造成的软化。
- 运动图里残留的浅色低对比像素在旋转时会形成纸色雾边。

## 3. 已锁定的技术方向

### 3.1 Phase 1 使用 CSS + WAAPI

INPUT 采用细粒度真实素材分层与嵌套投影变换。WAAPI 只负责纯 `rotateZ()`，浏览器提供连续逐帧插值。

### 3.2 物理层级

INPUT 拆为以下所有权：

| 层 | 状态 | 内容 |
| --- | --- | --- |
| `input-static-back` | 固定 | 黄铜主体、圆盘基础明暗、后部桶身 |
| `input-face-detail` | 旋转 | 前盘刻线、黑色定位标、可识别微纹理 |
| `input-static-front` | 固定 | 水平轴杆、中央轮毂、前缘遮挡与轮缘高光 |
| `input-face-mask` | 固定 | 前盘有效椭圆区域，中央轮毂与轴杆区域留空 |

固定层决定轮廓、轴线和光照。旋转层只提供材质随零件转动的视觉证据。任何动画相位下，外部 bbox、轴杆斜率和轮毂中心都保持稳定。

### 3.3 嵌套投影结构

保持现有投影比例 `0.58`，把一个复合矩阵拆成三层固定/动态变换：

```jsx
<span className="machine-rotor-window machine-rotor-window-input">
  <span className="machine-rotor-projector">
    <span className="machine-rotor-spin" data-mechanism="input">
      <span className="machine-rotor-unprojector">
        <img src={inputFaceDetail} alt="" draggable="false" />
      </span>
    </span>
  </span>
</span>
```

```css
.machine-rotor-window-input {
  --axis-x: 39.2857%;
  --axis-y: 52.6786%;
  --projection-x: 0.58;
  --projection-x-inverse: 1.7241379;
}

.machine-rotor-projector,
.machine-rotor-spin,
.machine-rotor-unprojector {
  position: absolute;
  inset: 0;
  transform-origin: var(--axis-x) var(--axis-y);
}

.machine-rotor-projector {
  transform: scaleX(var(--projection-x));
}

.machine-rotor-unprojector {
  transform: scaleX(var(--projection-x-inverse));
}
```

WAAPI 只动画 `.machine-rotor-spin`：

```js
spin.animate(
  [
    { transform: "rotateZ(0deg)" },
    { transform: "rotateZ(360deg)" },
  ],
  {
    duration: 14000,
    easing: "linear",
    iterations: Infinity,
  },
);
```

该结构的总矩阵仍为 `S × R × S⁻¹`，连续角度由纯旋转层提供，时间采样无需 17 点正弦近似。

## 4. 高精度素材规格

### 4.1 源文件与输出文件

源文件：

- `design/world-compiler-parts-v4-sources/input-rotor-clean.webp`
- `design/world-compiler-expanded.png`

- v5 运行时目录：`public/world-compiler/parts-v5/`
- v5 设计母版目录：`design/world-compiler-parts-v5-sources/`

建议新增运行时素材：

- `public/world-compiler/parts-v5/input-static-back-3x.webp`
- `public/world-compiler/parts-v5/input-face-detail-3x.webp`
- `public/world-compiler/parts-v5/input-static-front-3x.webp`
- `public/world-compiler/parts-v5/input-face-mask-3x.webp`
- `public/world-compiler/parts-v5/input-frame-3x.webp`
- `public/world-compiler/parts-v5/input-guide-3x.webp`
- `public/world-compiler/parts-v5/shaft-3x.webp`

设计母版放入：

- `design/world-compiler-parts-v5-sources/input-static-back-4x.png`
- `design/world-compiler-parts-v5-sources/input-face-detail-4x.png`
- `design/world-compiler-parts-v5-sources/input-static-front-4x.png`
- `design/world-compiler-parts-v5-sources/input-face-mask-4x.png`
- `design/world-compiler-parts-v5-sources/input-frame-4x.png`
- `design/world-compiler-parts-v5-sources/input-guide-4x.png`
- `design/world-compiler-parts-v5-sources/shaft-4x.png`

### 4.2 分辨率与裁切

- 保持逻辑坐标系 `936 × 660`。
- 所有运行时紧裁素材采用 `3×` 逻辑像素密度。
- 当前 `84 × 112` 逻辑裁片的物理输出为 `252 × 336`。
- 设计母版以 `4×` RGBA PNG 重建，再下采样为 `3×` lossless WebP。
- 全透明边缘保留 4 个逻辑像素的安全 padding。
- CSS window 继续使用逻辑坐标百分比；自然尺寸承担 DPR 清晰度。
- 全画布高倍率运动图不进入运行时，紧裁素材控制解码内存。

### 4.3 分层方法

1. 从 `input-rotor-clean.webp` 提取完整零件 bbox，并保留透明边缘。
2. 手工确认轴心 `(201, 263)`，在检查图中画出十字轴线。
3. 生成固定基础层：保留完整外轮廓和摄影明暗，清除会随旋转移动的定位标与微纹理。
4. 生成旋转细节层：只保留前盘纹理、定位标和少量非对称表面细节。
5. 生成固定前景层：保留水平轴杆、中央轮毂、轮缘与所有跨越前盘的遮挡。
6. 生成固定 mask：外边界贴合前盘椭圆，中央轮毂与水平轴杆形成透明孔洞。
7. 用三层中性相位复合结果与原始零件逐像素对照。

前盘 mask 的初始测量中心使用 `(201, 263)`；椭圆半径和轮毂孔径由源图 alpha 边界确认后写入生成脚本。所有裁片的局部轴心按以下公式自动计算并断言：

```py
local_axis_x = global_axis_x - crop_left
local_axis_y = global_axis_y - crop_top
```

### 4.4 清晰度处理

- RGBA 缩放使用预乘 alpha 后的 Lanczos 重采样。
- 下采样后仅对非透明 RGB 使用轻量 unsharp mask；建议起点为 `radius=0.7, percent=110, threshold=2`。
- `alpha == 0` 的 RGB 归零，避免透明边缘携带纸色。
- moving mask 外的纸色像素全部清除。
- WebP 使用 lossless、`method=6`。
- 浏览器保持默认平滑插值；`image-rendering: crisp-edges` 与 `pixelated` 均不进入实现。

本地 4× 重建仍显柔软时，使用 ImageGen 的精确对象编辑重建前盘材质母版。输入同时提供原始零件裁片与 `design/world-compiler-expanded.png`，几何、黄铜色、光向、透视和定位标位置保持一致；生成结果只替换前盘材质层。

## 5. 代码改造范围

### 5.1 `design/build_world_compiler_parts_v5.py`

- 从批准的 4× PNG 母版确定性导出 3× tight-crop WebP，保留 v4 资产作为视觉回退。
- 把 `grid_x < 248` 替换为明确的 INPUT 四层 mask。
- 增加 `EXPORT_SCALE = 3` 与预乘 alpha resize helper。
- 将边缘 alpha 保留阈值从当前 `32` 调整到 `4`，并在 3× 物理像素中保留 1–2px feather。
- 对每个 moving sprite 断言：
  - 有效 alpha 全部位于裁片内；
  - 轴杆和轮毂 mask 与 moving mask 无交集；
  - 中性复合与批准母版一致；
  - 透明 RGB 已清理；
  - natural size 达到逻辑尺寸的 3×。
- 继续生成 lossless WebP，输出文件名采用本文件第 4.1 节定义。

### 5.2 `src/WorldCompiler.jsx`

- 新增 `PART_ROOT_V5 = "/world-compiler/parts-v5"`，INPUT 高精度层读取 v5；其余组件在各自迁移前继续读取 v4。
- 把 INPUT 的 `part.rotor` 元数据扩展为 `staticBack`、`detail`、`staticFront`、`mask`、`axis`、`aspect` 和 `duration`。
- 为 INPUT 渲染 `projector → spin → unprojector` 嵌套结构。
- INPUT 从 `MECHANISM_CYCLES` 的正弦摆动切换为纯 `0 → 360deg` 线性循环，初始周期 `14s`。
- 保留当前 `smootherstep((progress - 0.45) / 0.34)` 速度包络。
- 回装、离屏、页面隐藏、资源未完成和 reduced motion 继续统一暂停，并保留当前相位。
- `data-mechanism="input"` 只挂在纯旋转层上。

### 5.3 `src/styles.css`

- 新增 projector、spin、unprojector 的固定变换层。
- 所有嵌套层共享同一 transform origin。
- `will-change: transform` 继续只在 `data-mechanisms-active="true"` 时启用。
- INPUT 固定层与 mask 使用明确 z-index：`static-back < moving-detail < static-front`。
- 动画静止时不保留额外 compositor hint。

### 5.4 `index.html` 与缓存键

- 预加载新增 INPUT 核心四层、frame、guide 与高精度 shaft 资产。
- motion assets 与 CSS mask 使用同一个新版本键，建议 `20260718-12`。
- entry、stylesheet、lazy module 的缓存键同步前进一次，冷启动验证只加载本轮文件。

### 5.5 `design/check_world_compiler_parts_v5.py`

- 校验逻辑 crop、3× natural size 与局部 pivot。
- 校验 moving alpha 与固定 shaft/hub/rim mask 无交集。
- 输出 neutral composite、400% alpha edge、轴线 overlay 和固定 ROI 差异指标。
- 失败时返回非零退出码，使下一 session 能在浏览器 QA 前发现资产问题。

## 6. 分阶段实施顺序

### Phase 0 — 基线

1. 确认分支为 `codex/world-compiler-parts-motion` 且工作区干净。
2. 运行现有开发服务器并在 1280×720 捕获当前 INPUT close-up。
3. 保存当前轴线、bbox、自然尺寸、渲染尺寸和 1 秒运动差异。

### Phase 1 — INPUT 样板

1. 制作四层高精度资产与 mask。
2. 输出 3× lossless WebP。
3. 实现嵌套投影 DOM。
4. 切换为 14s 连续旋转。
5. 验证轴线和轮廓完全固定。
6. 验证普通页面比例下定位标移动清晰。
7. 使用同一 4×→3× 管线升级 INPUT frame、guide 与贯穿 shaft 的细线清晰度，保持其逻辑坐标不变。

Phase 1 验收通过后再进入 Phase 2。

### Phase 2 — RULES 与 STATE

| 组件 | 建议周期 | 方向 | 分层原则 |
| --- | ---: | --- | --- |
| RULES outer | 8s | 顺时针 | 齿轮完整轮廓可转；固定轴和前景遮挡独立 |
| RULES inner | 5.2s | 逆时针 | 与 outer 保持约 1.55 的角速度比 |
| STATE drum | 18s | 逆时针 | 固定轴、轮毂和玻璃轮廓；旋转鼓面纹理 |

RULES 与 STATE 的 moving asset 同样采用 3× 紧裁、固定遮罩和纯 rotate 层。沿用现有逻辑裁片时，RULES outer 输出 `276 × 510`、inner 输出 `252 × 432`，STATE 输出 `237 × 408`。

### Phase 3 — OUTPUT 决策门

OUTPUT 镂空球体需要体现绕水平轴的真实空间深度。进入实现前选择以下一种来源：

1. 具有稳定几何的 3D 模型与匹配材质，交给 Three.js/PBR 渲染；
2. 从同一 3D 几何预渲染 36–48 个透明相位，交给帧序列播放；
3. 保留静态球体轮廓，仅让内部高精度纹理做极小幅度二维循环。

Three.js 的采用条件：已有可用几何、相机与灯光能够匹配当前摄影资产，并且需要动态光照、视差或真实空间遮挡。Phase 1 与 Phase 2 使用 WAAPI。

## 7. 验收标准

### 7.1 INPUT 几何

- 轴心始终为全局 `(201, 263)`。
- 水平轴杆在完整一圈中垂直位移 `≤ 0.5 CSS px`。
- 轴杆角度变化 `≤ 0.2°`。
- 外轮廓 bbox 在任意相位的四条边变化 `≤ 0.5 CSS px`。
- 中央轮毂质心漂移 `≤ 0.25 CSS px`。
- 两帧差异图中，运动像素只出现在批准的前盘 mask 内。

### 7.2 清晰度

- moving asset 使用 3× 逻辑尺寸，并在最大 1180px scene、DPR 2 下提供至少 2 个源像素覆盖 1 个渲染设备像素。
- DPR 2、100% 浏览器缩放下，前盘边缘保持单一清晰轮廓。
- 200% close-up 中无双边、纸色矩形、低 alpha 雾边和锯齿闪烁。
- 普通页面比例下，定位标在 1 秒内产生可辨认位移。
- 静态层的清晰度与当前批准基线相同或更高。

### 7.3 生命周期与交互

- 展开进度约 0.45 后开始加速，约 0.79 达到全速。
- 回装平滑降速并冻结当前相位。
- 离屏、页面隐藏、资源未完成与 reduced motion 状态下全部暂停。
- 快速反向 10 次保持 spring 位置、速度和旋转相位连续。
- compact endpoint 连续 400ms 的 transform 字符串保持一致。

### 7.4 响应式与性能

- 1280×720 与 390×844 无横向溢出。
- 所有新增素材成功 decode，浏览器 warning/error 日志为空。
- steady state 不新增 React render loop 或额外 rAF。
- INPUT 新增资产合计目标 `< 700KB`；全套 v5 运行时资源目标 `< 2.5MB`。
- 3× 紧裁纹理解码内存目标 `< 8MB`，高倍率全画布图不进入运行时。

## 8. QA 与交付物

执行：

```bash
python3 design/build_world_compiler_parts_v5.py
python3 design/check_world_compiler_parts_v5.py
python3 -m py_compile design/build_world_compiler_parts_v5.py
npm run build
git diff --check
```

浏览器验证：

- 1280×720：compact、展开、1 秒相位 A/B、完整回装。
- INPUT close-up：0°、90°、180°、270° 四相位。
- 90ms 快速反向与连续 10 次反向。
- 离屏 450ms 暂停。
- 390×844：展开、滚动和横向溢出。
- reduced motion：1 秒内 transform 不变。
- 浏览器 warning/error 日志为空。

新增 QA 文件建议：

- `design/qa-v12-input-before-after.png`
- `design/qa-v12-input-axis-overlay.png`
- `design/qa-v12-input-four-phases.png`
- `design/qa-v12-motion-contact-sheet.png`
- `design/build_motion_qa_v12.py`

在 `design-qa.md` 增加 `Pass 22 — high-fidelity shaft rotation`，最终状态必须为 `passed` 才进入 RULES/STATE 推广。

## 9. 实施边界与回退

- 保持爆炸图外层 spring、零件位置、玻璃框、 casing、石头、文案、版式和色彩不变。
- 每个 transform 由单一动画所有者控制：外层负责拆装，内层负责自转。
- 每个新 moving layer 都有固定 viewport mask。
- Phase 1 仅触碰 INPUT 相关素材、渲染结构、动画元数据、预加载和 QA。
- 回退单位为 INPUT 新四层资产与嵌套 DOM；旧 `input-core-front.webp` 与 `input-rotor-cycle.webp` 在 Phase 1 验收前保留。

## 10. 下一 session 接力提示

复制以下内容作为新 session 的首条消息：

```text
继续优化 /Users/liuxiaochen/Desktop/project/Me 首页 World Compiler 动画。

先完整读取：
1. /Users/liuxiaochen/Desktop/project/Me/AGENTS.md
2. /Users/liuxiaochen/Desktop/project/Me/docs/world-compiler-motion-v12-implementation.md

当前分支应为 codex/world-compiler-parts-motion，实现基线为 24a5a84。先执行文档 Phase 0 和 Phase 1，只完成 INPUT 高精度轴心旋转样板：固定轴杆、轮毂、轮缘、外轮廓和摄影高光，只旋转前盘细节；使用 4× PNG 母版、3× 紧裁 lossless WebP、嵌套 S×R×S⁻¹ 变换与现有 WAAPI 生命周期。同步升级 INPUT frame、guide 和 shaft 的细线清晰度。运行本地预览并完成 1280×720、390×844、快速反向、离屏、reduced-motion、控制台与视觉对比 QA。Pass 22 达到 passed 后提交代码。
```
