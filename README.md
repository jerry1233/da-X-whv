# 大 X 打工度假自动填表扩展

澳大利亚、新西兰打工度假相关页面的自动填表辅助工具，提供自动填表、填表后提交、个人资料管理、快捷链接和教学提示等功能。

当前版本：`3.6.0`。本仓库保存源码，可直接安装的 Chrome 扩展 ZIP 单独放在 [GitHub Releases](https://github.com/jerry1233/da-X-whv/releases)。

> 当前发布为迁移预览版。已知存在站点识别、配置实时同步和存储并发等问题，详见下方“已知限制”。建议使用独立浏览器配置和虚构资料进行测试，完成修复和回归验证后再用于真实申请。

## 架构说明

- Chrome Extension Manifest V3，后台采用 Service Worker。
- 后台入口使用 TypeScript，构建工具为 Plasmo。
- 弹窗、资料页和快捷链接页保留现有 HTML/CSS；页面脚本和内容脚本仍含旧版 JavaScript，并非全量 TypeScript 迁移。
- 通过 `chrome.storage.local` 保存设置和个人资料。
- 不需要部署服务器、数据库或网页托管服务；部署方式是在 Chrome 中加载构建后的扩展目录。

## 直接安装 Release

1. 打开 [Releases 页面](https://github.com/jerry1233/da-X-whv/releases)，下载附件 `da-X-whv-v3.6.0-chrome-mv3.zip`。
2. 解压 ZIP，保留解压后的目录。GitHub 自动生成的 `Source code (zip)` 和 `Source code (tar.gz)` 是源码，不能直接当作已构建扩展安装。
3. 在 Chrome 地址栏打开 `chrome://extensions/`。
4. 开启右上角“开发者模式”。
5. 点击“加载已解压的扩展程序”，选择解压后直接包含 `manifest.json` 的目录。
6. 在浏览器扩展菜单中找到本扩展，按需要固定到工具栏。

无需把 ZIP 拖入浏览器，也无需打开 ZIP 中的 `popup.html`。不要在安装后移动或删除扩展目录，否则 Chrome 无法继续加载文件。

## 从源码构建并安装

### 环境

- Git。
- Node.js 24 和随附的 npm。本次本地构建验证使用 Node.js `24.13.1`。
- 建议使用 Chrome 120 或更新版本；后台使用的 30 秒周期闹钟依赖该版本起的能力。

### 获取源码

```sh
git clone https://github.com/jerry1233/da-X-whv.git
cd da-X-whv
npm ci
```

`npm ci` 按仓库中的 `package-lock.json` 安装依赖，无需配置 API Key 或 `.env` 文件。

### 检查与构建

```sh
npm run typecheck
npm run build
```

构建会先运行 Plasmo，再通过 `scripts/postbuild.mjs` 复制原有 UI、内容脚本和资源，补齐最终 Manifest。

构建目录为：

```text
build/chrome-mv3-prod/
```

在 `chrome://extensions/` 中加载此目录。**不要加载仓库根目录**：根目录的 `manifest.json` 引用了仅存在于构建产物中的后台脚本。

## 开发与调试

完整扩展目前建议采用“修改源码、重新构建、重新加载”的方式：

```sh
npm run typecheck
npm run build
```

构建完成后，在 `chrome://extensions/` 点击本扩展的重新加载按钮，并刷新已经打开的目标网页，让内容脚本重新注入。

- 调试后台：在扩展详情中点击 Service Worker 的“检查”入口。
- 调试弹窗：打开弹窗后右键选择“检查”。
- 调试内容脚本：打开目标网页的开发者工具，检查控制台和扩展脚本执行环境。
- 修改模式或个人资料后，请刷新目标网页。当前已注入的内容脚本不会可靠地实时同步设置。

`npm run dev` 仅启动 Plasmo 自身的开发监听，尚未自动整合静态页面复制和 Manifest 补齐，不能把它的原始输出视为功能完整的扩展。完整功能验证请使用上面的生产构建流程。

## 生成发布包

```sh
npm run package
```

命令按以下顺序执行：类型检查、生产构建、复制静态资源并补齐 Manifest、压缩。输出为：

```text
build/chrome-mv3-prod.zip
```

该 ZIP 内的 `manifest.json` 位于压缩包根目录。上传 Release 时可将附件命名为 `da-X-whv-v3.6.0-chrome-mv3.zip`。附件名中的版本应与构建后 Manifest 的版本一致。

发布前应解压 ZIP，在独立浏览器配置中实际安装，检查弹窗、资料保存、快捷链接、页面填表和快捷键。仅通过 TypeScript 检查或构建并不能证明网页流程正确。

源码提交到 GitHub 仓库；构建 ZIP 上传至 GitHub Release 的附件区域。`node_modules/`、`.plasmo/` 和 `build/` 不纳入源码版本控制。

## 基本使用

1. 打开扩展弹窗，选择澳大利亚或新西兰。
2. 选择需要使用的个人资料组，通过“修改资料”编辑信息。
3. 选择“仅自动填表”或“自动填表+提交”等模式。
4. 刷新目标网页后再测试填表行为。
5. 在仅填表模式下，快捷键 `Ctrl+Shift+S`，macOS 为 `Command+Shift+S`，会触发该页填表及点击操作。可在 `chrome://extensions/shortcuts` 检查快捷键是否冲突。

现有页面适配规则来自旧版逻辑，真实网站的 DOM、链接和流程可能已经变化。验证码及付款等环节需要用户自行处理，未验证当前真实签证网站的完整申请流程。

## 目录结构

```text
background.ts          TypeScript 后台 Service Worker
content_script.js      旧版页面识别及自动填表逻辑
popup.html             扩展弹窗
info_au.html            澳大利亚资料编辑页
info_nz.html            新西兰资料编辑页
link_au.html            澳大利亚快捷链接页
link_nz.html            新西兰快捷链接页
js/                    页面脚本及旧版后台参考代码
assets/                UI 库、图标和样式资源
css/                   扩展自定义样式
images/                图片资源
scripts/postbuild.mjs   静态资源复制与 Manifest 补齐
package.json           npm 命令、依赖与 Plasmo Manifest 配置
package-lock.json      依赖锁文件
tsconfig.json          TypeScript 配置
build/                 本地构建产物，不提交到源码仓库
```

## 已知限制

以下问题在当前迁移版本中尚未修复，本次发布主要整理源码、部署说明并修正发布打包顺序：

- 站点识别存在完整 URL 字符串匹配，非官方站点可能被误判并填入资料。正式使用前需要精确的域名白名单和更窄的注入范围。
- 已打开页面缓存旧设置，切换关闭模式或资料组后可能继续按旧配置操作；页面刷新前不要依赖开关立即停止操作。
- 多处配置保存采用整对象读改写，并发操作可能覆盖其他修改。
- 存储初始化发现一个分区缺失时可能重置其他已有资料，需要改为增量补齐和版本化迁移。
- 测试刷新模式、目标标签页筛选，以及 Service Worker 冷启动后的定时器恢复仍需修正。
- UI 存在重复 jQuery 加载、Bootstrap 加载顺序及缺失滑块元素引起的初始化错误。
- 核心旧 JavaScript 未纳入完整类型检查，Manifest 配置仍有多处来源。
- 部分字体来自外部资源，离线或网络受限时显示效果可能不同。

## 数据与权限

个人资料保存在当前 Chrome 配置的 `chrome.storage.local` 中，不会因源码上传自动进入 GitHub。不要将真实资料、账号密码、浏览器配置目录或导出的资料文件提交到仓库。

当前 Manifest 请求所有 HTTP/HTTPS 页面访问权限，以及 storage、tabs、activeTab、clipboardWrite、scripting、alarms 等权限。结合上述已知站点识别问题，预览测试建议限定在独立浏览器配置内进行。

## 常见问题

**提示无法加载后台脚本或 Service Worker？**

确认加载的是 Release 解压目录或 `build/chrome-mv3-prod/`，并且目录内存在 `static/background/index.js`。从源码安装时先执行 `npm run build`。

**修改源码后 Chrome 没有变化？**

重新构建、在扩展管理页重新加载扩展，再刷新目标网页。这三个步骤分别更新构建文件、扩展实例和网页内的内容脚本。

**如何更新已安装版本？**

先备份个人资料，将新版本解压到原安装目录，再到扩展管理页重新加载。不要先卸载扩展，因为卸载会删除该扩展的本地数据。移动到其他目录可能改变未打包扩展的 ID 和存储位置。

**能否直接发布到 Chrome Web Store？**

当前版本尚未完成上架准备和全流程回归。现有字符串混淆还需要根据 [Chrome Web Store 代码可读性要求](https://developer.chrome.com/docs/webstore/program-policies/code-readability) 处理，不能将本 Release 理解为已通过商店审核。

## 来源与许可

原项目元数据署名为“澳打君”，本仓库整理其迁移版本。保留代码和第三方资源中的原有署名、版权与许可声明；当前源码没有单独的项目级 LICENSE 文件，本次整理不额外授予或替换原作者许可。
