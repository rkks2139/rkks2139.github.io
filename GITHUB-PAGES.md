# 用 GitHub Pages 跑「神人工具箱」

> **当前状态**：本目录已经完成 `git init`、首次提交，并把 `origin` 指向
> `https://github.com/rkks2139/rkks2139.github.io.git`。
> 剩余两步需要你的 GitHub 账号：创建空仓库、授权 push。当前机器没有 GitHub 登录凭据。

可以。整套东西是纯静态 HTML / CSS / JS / Canvas，GitHub Pages 能直接托管。
不需要 Node、不需要数据库、不需要服务器。

## 一键前提

仓库根目录需要有一个 `index.html`。本目录已经放好：
它只负责跳转到 `神人工具箱.html`，所以原文件名可以继续保留。

`.nojekyll` 也已放好，避免 GitHub 用 Jekyll 处理这些文件夹。

## 先在 GitHub 建空仓库

1. 打开 https://github.com/new
2. Repository name 填 **rkks2139.github.io**
3. 选 **Public**
4. 不要勾选 README、.gitignore、license（保持空仓库）
5. Create repository

## 上传

```bash
# 本目录已经 init / commit / remote 完成，通常只需要：
git push -u origin main
```

第一次 push 需要 GitHub 认证：HTTPS 方式输入用户名 + Personal Access Token；或者配置 SSH。
当前机器没有 GitHub 登录凭据，所以最后一步需要你本人授权。

如果你把仓库放在别的名字下，改 remote 即可：

```bash
git remote set-url origin https://github.com/rkks2139/<仓库名>.git
```

## 开启 Pages

1. 打开 GitHub 仓库 → **Settings** → **Pages**
2. **Build and deployment** → Source 选 **Deploy from a branch**
3. Branch 选 **main**，目录选 **/ (root)**
4. 保存，等 1–2 分钟

访问地址：

- 仓库名是 `rkks2139.github.io`：`https://rkks2139.github.io/`
- 普通仓库：`https://rkks2139.github.io/仓库名/`

## 文件大小与限制

- 最大单文件是 `pulse4k/4kYOU.html`（66.33 MB），低于 GitHub 单文件 100 MB 硬限制。
- 4kYOU 单文件约 66 MB；GitHub 会提示“超过 50 MB”，这是警告，不是失败。
- 整站建议控制在 1 GB 以内；GitHub Pages 的站点上限是 1 GB。
- **不要用 Git LFS 托管站点文件**：GitHub Pages 不保证提供 LFS 内容。
- GitHub Pages 有每月约 100 GB 的软带宽限制。4kYOU 和 73 MB 的舞动实验室包比较吃流量，分享给很多人时建议把大 ZIP 改放到 GitHub Releases。

## 会正常工作的部分

- 项目卡片、搜索、筛选、详情、下载中心
- 音游 / 弹幕 / 冰之声 / 跑步模拟器 / 舞动实验室 / 第二部的启动页
- 所有 `downloads/*.zip`
- 美国用户检测器的「查看源码」外链

## 不会在 Pages 上执行的部分

- `.bat` / `.command` 启动脚本：会被下载，不能远程执行，这是浏览器安全限制。
- `dsh-american-detector` 的安装脚本：必须把仓库拉到本地后运行 Node。
- 本地 `file://` 专属逻辑：在 Pages 上会自动显示为 HTTP 模式。

## 路径说明

页面使用相对路径，所以放在仓库根目录、子目录、自定义域名下都能跑。
中文目录名（如 `？！冰冰？！`）在 GitHub Pages 上会由浏览器自动做 URL 编码，正常访问。
