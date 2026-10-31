# 4kYOU · 四键音乐游戏

**为 4K 屏幕、低配集显（目标机型 i5-6400 + Intel HD 530）做的白色像素风 4K 音游。**
纯 HTML + JavaScript + WebGL2，**不使用 .NET / .NET Framework**，不需要安装、不需要联网、不需要本地服务器。

![曲包选择](docs/packs.png)

![选曲界面](docs/menu.png)

> **白色像素主题**：Fusion Pixel 12px 像素字体、硬边框、网点纸背景、按谱面生成的 480×270 像素关卡场景。不是简单换色，UI、游玩 HUD、Note 和结算都重新做了一套。

## 直接开始

有三种打开方式，任选一种：

1. **单文件版（最省事）**：双击 `4kYOU.html`（约 70MB，音频全部内嵌）。
2. **启动脚本**：Windows 双击 `启动游戏.bat`，macOS 双击 `启动游戏.command`。
3. **源码版**：双击 `index.html`（需要保留同目录的 `src/` 与 `songs/`）。

> 推荐 **Chrome 或 Edge**。第一次点「进入游戏」是为了让浏览器允许播放音频；之后建议按 F11 或点「全屏」。
> 如果双击没有反应，把文件拖进浏览器窗口，或右键 → 打开方式 → Chrome。
>
> 单文件把 16 首歌全部内嵌，启动时要读取约 70MB；源码版 `index.html` 按需加载单曲，启动更快。

## 曲包选择

启动后先进入曲包页：

- **基础曲包**：原来的 7 首歌 / 12 个谱面。
- **曲包 2**：Sakuzyo 的 **Metamorphosism**、Cryptarithm、#1f1e33、Fracture Ray + 隐藏曲 **XYZ**（technoplanet，标级 13），共 5 首 / 7 个难度。曲包 2 有解锁链，详见下文。
- **曲包 3**：xi 的 **Heavenly Blast**、Sakuzyo 的 **Destr0yer**、uma vs. もりもりあつし 的 **Re:End of a Dream**、Kobaryo 的 **Sin Utopia**，共 4 首 / 7 个谱面。
- **导入曲目**：拖入的 `.osz` / `.mc` 会出现在这里（只在本次会话有效）。

方向键选择、`Enter` 进入；进入选曲后按 `Esc` 或点左上角「← 曲包」返回。曲包卡片上会显示曲目数、谱面数和标级范围。

![曲包 2](docs/pack2.png)

| | |
|---|---|
| ![游玩](docs/gameplay.png) | ![结算](docs/results.png) |

## 操作

| 操作 | 按键 |
|---|---|
| 4 条轨道 | `D` `F` `J` `K`（可在设置里改，支持方向键 / 小键盘等） |
| 暂停 / 继续 | `Esc` |
| 重试 | 暂停或结算界面按 `R` |
| 曲包页 | `↑` `↓` `←` `→` 选择，`Enter` 进入 |
| 选曲 | `↑` `↓`，鼠标单击；`Esc` 返回曲包 |
| 开始 / 自动演示 | `Enter` / `R`（选曲界面），或点按钮 |
| 性能信息开关 | `F3` |
| 成绩存档 | 右上角「成绩」按钮（结算/选曲里也会显示最高分） |
| 全屏 | 界面右上角「全屏」，或 `F11` |

游戏支持长条（LN）、判定（Perfect/Great/Good/Bad/Miss）、连击、准确率、结算评级、自动演示，以及可导出的 `.txt` 成绩存档。

## 轨道位置

轨道固定在屏幕**最左侧**，分数 / ACC / 连击 / 判定 / FPS 全部放到右侧空白区。这样宽屏 4K 下视线只需要看左边，右侧 HUD 不会压住 Note。

## 白色像素 UI 与关卡背景

- **字体**：内置 [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) 12px 简体中文 + 日文字形（OFL 协议，见 `src/fonts/OFL.txt`），菜单、设置、结算和 WebGL HUD 都使用像素字。
- **视觉**：米白纸色 + 墨黑硬边框 + 错位实心阴影 + 粉色/青色/黄色强调色；没有圆角、模糊、渐变按钮或半透明玻璃。
- **每个谱面单独背景**：`src/art.js` 用谱面 UID 作为种子，在 480×270 的 Canvas 上生成像素场景（天空、太阳、山脊、城市、网格地面、悬浮关卡徽记）。菜单选中时的 `stageBg`、详情页横幅、游玩背景共用同一张图，切歌自动换。
- **不增加大图资源**：背景是程序生成的，不加载外部图片/视频；缓存为 Canvas/DataURL，游玩时只绘制一次到低分辨率背景层，不会每帧重画。
- **仍然只有 2 个 WebGL draw call**：背景层是浏览器合成的低分辨率 Canvas，WebGL 仍只负责矩形批和文字批；4K 下按 50% 内部渲染。
- **未知曲目也保持隐藏**：曲包 2 的 XYZ 锁定期间使用通用灰色锁定背景，不泄露原曲关卡图。

## 为什么 i5-6400 也能跑 4K

这个项目的核心不是「画面好」，而是**每帧只做必要的事**：

- **两个 draw call**：所有 Note、轨道、判定线、按键、HUD 合批成一次矩形实例化绘制；数字和英文 HUD 用一张文字图集再画一次。
- **内部 1080p 渲染**：4K 屏幕默认按 50% 渲染（1920×1080），由 GPU 拉伸到 3840×2160；动态分辨率最低可到 35%（约 1344×756）。
- **零 DOM 刷新**：游玩时 HUD 全部在 WebGL 里画，没有逐帧改 DOM、没有 CSS 动画、没有模糊/阴影/粒子/泛光/后期。
- **无外部背景图、无视频、无封面**：关卡背景是按谱面 UID 程序生成的 480×270 像素场景，只在切歌/开始游玩时画一次；不加载大图，不增加 WebGL draw call。
- **音频时钟驱动**：画面按 AudioContext 的音频时钟推进，不是按帧累加，掉帧不会让谱面错位。
- **只画屏幕里的东西**：按时间二分查找 + 视口裁剪，不遍历整张谱面。
- **一次解码，重试复用**：音频解码后缓存，重试同一首歌不再解码；切同一首歌的不同难度也复用音频。
- **60 帧上限**：默认把帧率锁在 60，省 GPU，也避免 4K 下风扇狂转。
- **按键判定用事件时间戳**：`keydown` 的 `timeStamp` 映射到歌曲时间，而不是「按下后下一帧才算」。

在 4K 60Hz 下，默认 50% 内部分辨率对 HD 530 属于很轻的负载；如果仍然掉帧，设置里有一键 **低配模式 720P**（约 35%），并保持动态分辨率。

> 以上是设计目标与架构上的保证。不同浏览器/驱动/系统缩放会有差异，请以游戏内 `F3` 显示的 FPS、帧时间和内部分辨率为准。我在开发机上用无头 Chrome 按 3840×2160 验证过 60fps，但**无法替你在 i5-6400 实机上实测**。

## 设置说明

![设置](docs/settings.png)

- **全局偏移**：单位毫秒。**总是打得偏早就调正，偏晚就调负。** 暂停界面里可以 ±5ms 快速微调，边听边调最准。
- **下落速度**：0.5x–4x，数字越大 Note 越快。
- **判定宽松度**：宽松 / 标准 / 严格（Perfect 窗口约 ±26 / ±19 / ±14ms）。
- **滚动方向**：下落或上浮。
- **渲染倍率**：4K 建议 50%；卡就 35%–40%。勾选「自动分辨率」后，会根据帧时间自动降/升。
- **帧率上限**：60 / 120 / 不限。4K 60Hz 屏保持 60。
- **按键映射**：点一下然后按新键。重复键会与旧键交换。
- **低配模式 720P**：自动分辨率 + 35% + 60 上限 + 打开性能 HUD。

**校准建议**：先玩一首简单的歌，如果结算/暂停里看到自己总是 Early，就把偏移 +5、+10；总是 Late 就 -5、-10。蓝牙耳机延迟较大，一定要校准。

## 成绩存档（.txt）

- 每张谱面会自动记录：最佳分数、最佳 ACC、最大连击、Perfect/Great/Good/Bad/Miss 分布、评级、游玩次数。
- 存档默认保存在浏览器本地（localStorage）；换浏览器、清缓存或换机器会丢，所以建议定期导出。
- 右上角「成绩」打开成绩面板：总游玩次数、有成绩谱面数、平均最佳 ACC、最高分，以及逐曲最佳成绩列表。
- **导出 .txt**：生成类似 `4kYOU-save-20261028-1930.txt` 的纯文本文件，文件头是 `4KYOU_SAVE_V1`，之后每行一张谱面，Tab 分隔。旧版 `PULSE4K_SAVE_V1` 存档仍可导入；localStorage 也沿用旧 key，升级不会丢成绩。
- **导入 .txt**：把导出的文件选回来（或直接拖进窗口），会与当前成绩合并，**保留更高分**，不会把低分覆盖高分。
- **清空成绩**：会二次确认；建议先导出一份。
- 只有完整游玩（歌曲自然结束）才会进入存档；自动演示不记录。
- 导入曲目的成绩用「曲名/作者/难度/物量」生成稳定键，重新导入同一个 `.osz` 后仍能对上。

![成绩存档](docs/scores.png)

存档文件是纯文本，方便备份、查看，也可以手动改分数；导入时只读取文件头之后、Tab 分隔的合法行，不会执行任何代码。

## 导入谱面

支持两种来源：

- **osu!mania**：`.osz` 曲包（内部是 ZIP）。只接受 `Mode: 3` 且 `CircleSize: 4` 的 4K 谱面；一个曲包里有多个音频/多首歌时会自动按音频分组。
- **Malody**：`.mc` 谱面 + 音频文件一起拖入；或包含 `.mc` / `chart.json` 与音频的 `.mcz` / `.zip`。

操作方式：

1. 把文件直接拖进窗口；或点右上角「导入谱面」选择文件。
2. 导入成功后会自动进入「导入曲目」曲包并选中新谱面，直接开始即可。
3. 导入的曲目**只在本次会话有效**，刷新页面后消失；内置曲目不受影响。

说明：

- 只支持 4K（4 键）。5K/7K 会提示不支持。
- `.osz` 里的视频、封面、音效不会加载，只取 `.osu` 和音频。
- Malody 的 `.mc` 本身通常不带音频，需要把音频一起拖入；按文件名匹配，匹配不到且只有一首音频时会自动配对。
- 导入谱面的标级由**估算星级**换算（按物量/时长，界面显示 `≈`），内置曲目使用 osu! 谱面页星级换算。

## 内置曲目

共 **16 首歌、26 个谱面**，全部为 4K。曲包页可切换。

> **标级规则**：界面不再显示 `1.23★` 这种小数星级，而是显示标级：`10 + floor(星级)`。所以 1.x★ → **11**，2.x★ → **12**，……，9.x★ → **19**。存档/内部仍保留原始星级用于排序和换算。

### 基础曲包（7 首 / 12 谱面）

| 曲目 | 作者 | 难度 | 标级 |
|---|---|---|---|
| HITO Mania | Sasuke Haraguchi feat. Kasane Teto | Easy / Normal / Hard / Insane / Mania | 11 / 12 / 12 / 13 / 14 |
| fnf enterprise 4k mania - RERUN | Composer: Punkett / Art by: Muto | Hard / Insane | 12 / 12 |
| Apollo | xelloscope | 4K | 14 |
| Sugar Glazed Madness | t+pazolite | 4K | 14 |
| Blue Zenith | xi | 4K | 15 |
| Ascension to Heaven | xi | 4K | 15 |
| FREEDOM DiVE | xi | 4K | 15 |

### 曲包 2 · 标级 11–14（5 首 / 7 谱面）

Sakuzyo 的 **Metamorphosism** 是替换 cygnus《Metamorphism》后的正确版本；它只有一张 4.22★（标级 14）的 4K 谱面，因此曲包 2 的范围扩大到 11–14。Cryptarithm、#1f1e33、Fracture Ray 仍在低标级；**XYZ** 原始 3.36★（标级 13）。

| 曲目 | 作者 | 难度（标级） | 谱师 | 来源 set |
|---|---|---|---|---|
| Metamorphosism | Sakuzyo | Transformation (14) | beane | #2032237 |
| Cryptarithm | Sakuzyo | Sava's NORMAL (12) / ADVANCED (12) | Gahyeonln | #2433731 |
| #1f1e33 | Camellia | McEndu's Past (11) / Present (12) | Murumoo | #1184620 |
| Fracture Ray | Sakuzyo | PAST (12) | MrMoai | #2231037 |
| XYZ | technoplanet | 4K (13) | Aflocat | #2350114 |

### 曲包 2 解锁条件

- **Cryptarithm 的两个难度初始锁定**。需要先完成以下 4 个谱面（完整打完、歌曲结束，结算有成绩）：
  - Metamorphosism · Transformation
  - #1f1e33 · McEndu's Past
  - #1f1e33 · Present
  - Fracture Ray · PAST
- **XYZ 初始完全隐藏**：曲名显示为 `？？？？？`，不展示作者/难度/标级/BPM/物量等信息，不能开始或自动演示，也不会加载/播放任何音频。完成 Cryptarithm 的两个难度后解锁。
- 解锁进度由成绩存档计算：自动演示不计数；导入带成绩的 `.txt` 会同步解锁进度；清空成绩会重新上锁。中途退出不算完成，必须打完到结算。
- 曲包 2 的卡片在隐藏曲解锁前也会把曲名显示为 `？？？？？`，解锁后恢复正常。

![曲包 2 锁定状态](docs/pack2.png)

### 曲包 3 · xi / Sakuzyo / uma / Kobaryo（4 首 / 7 谱面）

| 曲目 | 作者 | 难度（标级） | 谱师 | 来源 set |
|---|---|---|---|---|
| Heavenly Blast | xi | Advanced (14) / Master (15) | Xinhong1003 | #1914163 |
| Destr0yer | Sakuzyo feat. Nikki Simmons | Hyper (13) / Another (14) | Copano Rickey | #1962070 |
| Re:End of a Dream | uma vs. もりもりあつし | Hyper (13) / Another (14) | Critical_Star | #531425 |
| Sin Utopia | Kobaryo | 4K (14) | 4kYOU AutoChart | In Falsus / Bilibili |

> 前三首是 osu!mania 4K 正式谱面。**Sin Utopia** 没有找到公开可下载的 osu!mania / Malody 谱面文件——B 站只有一个 Malody 自制视频（BV1R7Hp61EB6），未附下载。因此这里使用 In Falsus 官方音频（B 站 BV15vhR6dEgQ）按 **BPM 282 + onset** 自动生成 4K 谱，原始星级 4.20（标级 14）为估算。它保证音频同步、可直接游玩，但**不是原作者的 Malody 谱**；如果你有正式 `.mc` / `.osz`，替换 `sayo_sinutopia.osz` 后重新构建即可。

![曲包 3](docs/pack3.png)

> 这些歌曲/谱面的版权属于原作者与谱师。仓库里内置它们只是为了让你本地直接可玩，**请勿公开再分发**。要分享游戏，请把 `songs/` 换成你有权使用的曲目。

## 目录结构

```
4kYOU/
├─ 4kYOU.html           # 单文件版（构建产物，双击即玩）
├─ index.html            # 源码版入口（file:// 直接打开）
├─ src/
│  ├─ core.js            # 设置、标级、工具、判定窗口常量
│  ├─ art.js             # 每谱面程序化像素关卡背景
│  ├─ scores.js          # 成绩存档、localStorage、.txt 导入/导出
│  ├─ zip.js             # 无依赖 ZIP 读取（DecompressionStream）
│  ├─ chart.js           # .osu / .mc 解析与 .osz/.mcz 分组
│  ├─ audio.js           # WebAudio 解码、播放、延迟补偿时钟
│  ├─ renderer.js        # WebGL2 矩形批渲染 + 文字图集 + 场景
│  ├─ input.js           # 键盘映射、改键捕获
│  ├─ game.js            # 判定、长条、计分、自动演示、暂停
│  ├─ library.js         # 曲库、懒加载、导入曲目
│  ├─ ui.js              # 选曲/设置/结算/导入 UI
│  └─ main.js            # 启动、主循环、动态分辨率
├─ src/fonts/            # Fusion Pixel 字体与 OFL 许可
├─ songs/                # 内置曲目（每首一个 .js：音频 base64 + 原始 .osu）
├─ tools/
│  ├─ build_songs.py     # 从 .osz 生成 songs/*.js
│  ├─ build_singlefile.py# 打包 4kYOU.html
│  ├─ cdp_test.mjs       # 无头 Chrome 冒烟测试（macOS）
│  ├─ cdp_deep.mjs       # 长条/整曲结算/Malody 导入测试
│  ├─ cdp_pack2.mjs      # 曲包 2 选择与游玩测试
│  ├─ cdp_pack3.mjs      # 曲包 3 Sin Utopia 测试
│  ├─ make_sin_utopia.py # Sin Utopia 自动谱生成
│  ├─ cdp_scores.mjs     # 成绩存档 / 左对齐轨道测试
│  ├─ cdp_export.mjs     # .txt 导出下载测试
│  └─ cdp_unlock.mjs     # 曲包 2 解锁链测试
├─ tests/                # Node 单元测试 + 小体积 fixture
└─ docs/                 # README 截图
```

## 构建与测试

需要 Python 3、ffmpeg/ffprobe；测试需要 Node 18+（无 npm 依赖）。

```bash
# 0) 可选：重新下载源 .osz（Sayobot 镜像，约 130MB）
bash tools/fetch_sources.sh

# 1) 把 tools/build_songs.py 里配置的 .osz 转成 songs/*.js
#    默认从 /tmp/osz 读取，可用 P4K_OSZ_DIR 指定
#    曲包 3 需要先生成自动谱（需要官方音频 wav）：
#    python3 tools/make_sin_utopia.py /path/to/sin_official.wav /tmp/osz/sayo_sinutopia.osz
python3 tools/build_songs.py

# 2) 打包单文件版（约 70MB；字体会被内联进 HTML）
python3 tools/build_singlefile.py

# 3) 单元测试（31 项）
node --test tests/*.test.mjs
```

`tools/cdp_test.mjs` / `cdp_deep.mjs` 是开发用的无头 Chrome 验证脚本（路径里写死了 macOS Chrome），会输出截图、控制台错误、判定/结算数据。白色主题以及每谱面背景分别由 `cdp_test.mjs` / `cdp_pack3.mjs` / `cdp_unlock.mjs` 的截图验证。

## 已知限制

- 需要 **WebGL2**。Chrome / Edge 最新版最稳；很老的浏览器或关闭硬件加速会黑屏。
- 只做 4K 键盘玩法，不支持触屏、5K/7K、BMS/Etterna 等格式。
- 曲包 3 的 Sin Utopia 谱面是自动生成谱，标级由估算星级换算；不是原作者的 Malody 谱。
- 像素关卡背景是程序化生成的抽象场景，不是人工绘制的歌曲插画；每个谱面颜色/构图不同，但不代表原曲封面。
- Malody `.mc` 的音频需要一起提供（格式本身只存引用）。
- 导入谱面不持久化；刷新即消失。
- 成绩存档在浏览器 localStorage 里；清缓存/换浏览器会丢，请用「导出 .txt」备份。
- 曲包 2 的解锁状态由成绩存档推导；清空成绩会重新锁定 Cryptarithm 和 XYZ。
- 自动演示只用于看谱和跑性能，不计入任何排行。
- 4K 60Hz 需要显卡/接口支持（DP 1.2 或 HDMI 2.0）。如果系统只能输出 30Hz，游戏也只能 30fps。

## 关于 .NET

**整个项目没有任何 .NET / .NET Framework / C# 代码，也没有 Electron、Unity、安装包或后台服务。** 它就是一个静态网页：双击 HTML，浏览器执行 JavaScript，WebGL2 绘制画面，WebAudio 播放音乐。

## License

代码部分 MIT。`songs/` 下的音乐与谱面版权归原作者/谱师所有，仅用于本地个人游玩，不在 MIT 许可范围内，请勿再分发。
