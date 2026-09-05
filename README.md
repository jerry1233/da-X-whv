# 大 X 打工度假自动填表扩展

澳大利亚、新西兰打工度假相关页面的自动填表辅助工具。保留原有弹窗、八组个人资料、快捷链接、教学提示以及填表和快捷键功能。

当前版本：`3.6.1`。源码位于本仓库，安装包单独发布在 [GitHub Releases](https://github.com/jerry1233/da-X-whv/releases)。

> 这是安全与功能修复预览版，不代表已适配当前签证网站的全部流程。请先用独立浏览器配置和虚构资料测试，真实提交前逐项核对。验证码和付款仍需手动完成。

## 安装 Release

1. 在 [Releases](https://github.com/jerry1233/da-X-whv/releases) 下载 `da-X-whv-v3.6.1-chrome-mv3.zip`，解压到固定目录。
2. 使用 Chrome 120 或更新版本，打开 `chrome://extensions/`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择解压后直接包含 `manifest.json` 的目录。
4. 固定扩展到工具栏，打开弹窗，选择国家、资料组和运行模式。

GitHub 自动生成的 `Source code` 附件是源码，不能直接加载。安装后不要移动或删除扩展目录。无需服务器、数据库服务、API Key 或网页托管。

### 从旧版更新

先在旧版资料页导出并安全保存资料，**不要先卸载扩展**。将新版解压到原安装目录，再在扩展管理页重新加载；新增的剪贴板读取和导航事件权限可能需要确认。随后刷新目标网页，移除旧版已注入的脚本。

新版本首次启动会把旧 `chrome.storage.local` 中的资料事务性迁移到扩展自身的 IndexedDB，成功后才删除旧资料副本。原有国家、八组资料和设置会保留，缺失字段增量补齐。小于 30 秒的旧后台刷新间隔会调整为 30 秒。

迁移后不要直接降级到 3.6.0：旧版本不认识新的资料存储。移动安装目录可能改变未打包扩展的 ID；卸载会删除本地数据。

## 从源码构建

验证环境：Node.js `24.13.1`、npm、Chromium 134。建议使用 Node.js 24。

```sh
git clone https://github.com/jerry1233/da-X-whv.git
cd da-X-whv
npm ci
npm run typecheck
npm test
npm run build
```

在 Chrome 中加载 `build/chrome-mv3-prod/`。不要加载源码根目录，也不要直接打开 `popup.html`。

生产构建会清理当前生产输出目录，运行 Plasmo 编译 Service Worker，再由 esbuild 编译 TypeScript 页面和内容控制器，复制原有 UI 资源并检查 Manifest、页面引用及版本号。不会把旧版本遗留脚本混入新包。

### 开发模式

```sh
npm run dev
```

加载 `build/chrome-mv3-dev/`。开发监听同时准备原有 HTML、样式、页面脚本与内容脚本；不再只生成后台。修改构建脚本或 npm 配置后重启开发命令。页面资源更新后，在扩展管理页重新加载，并刷新目标网页。

开发版 CSP 仅额外允许本机 localhost/127.0.0.1 的开发连接；生产版不包含该许可。不要将开发服务暴露给公网，不要把开发版作为 Release 发布。

### 发布打包

```sh
npm run package
```

依次执行类型检查、单元测试、生产构建、资源检查与压缩，输出 `build/chrome-mv3-prod.zip`。ZIP 根目录包含 `manifest.json`，可将附件命名为 `da-X-whv-v3.6.1-chrome-mv3.zip`。

源码提交到仓库；ZIP 和 `SHA256SUMS.txt` 上传到 GitHub Release。`node_modules/`、`.plasmo/`、`build/`、浏览器配置和导出的个人资料不得提交。

## 使用与行为

- “仅自动填表”不自动提交；`Ctrl+Shift+S`（macOS：`Command+Shift+S`）可触发当前页面填表和点击。
- “关闭”立即取消当前等待任务，并禁止填表、点击和快捷键自动跳转。已经完成的网页操作无法撤销。
- 修改模式、国家或资料组会取消旧任务。下一次快捷键读取最新设置；要重新执行页面自动流程，请刷新网页。
- 资料窗口固定编辑打开时选择的资料组，不会因另一个弹窗切组而误写其他组。保存完成后才显示“已保存”。
- JSON 导入验证对象类型、字段、长度和日期；错误会提示，不会覆盖原资料。剪贴板仅读取用户点击导入时的内容。
- 模拟站点 `moni.iwhver.com` 只接收虚构示例资料，不会读取真实账号和护照。生成测试资料使用 `example.invalid` 邮箱，不能用于真实注册。
- 测试模式的后台网络错误重试保留旧版“关闭模式 + 测试模式 + 自动跳转”的启用条件；只处理允许站点真实导航失败的标签页，不根据 favicon 猜测，更不会改写其他网页。
- 后台重试与名额不足页刷新间隔为 30000–86400000 毫秒。浏览器休眠可能延迟任务；MV3 不承诺毫秒级后台定时。普通“关闭”且未显式开启测试重试时，不执行自动操作。
- 下拉框等待最长 15 秒，超时提示重试，不再无限轮询。

## 架构

```text
src/background.ts             Plasmo / Manifest V3 Service Worker
src/shared/model.ts           类型、输入验证、精确站点规则和默认资料
src/shared/store.ts           串行更新，避免并发覆盖
src/shared/private-storage.ts 扩展私有 IndexedDB 与旧版迁移
src/shared/client.ts          带成功/错误响应的消息客户端
src/content/index.ts          TypeScript 页面控制器与任务取消
src/content/legacy-engine.js  已去除字符串混淆的旧站点选择器兼容层
src/content/notifications.ts  DOMPurify 净化后的原样式通知
src/ui/                       TypeScript 弹窗、资料页、快捷链接逻辑
*.html                        原有五个界面
assets/ css/ images/ js/       原有样式、图片与兼容 UI 库
scripts/                      开发、构建、验证和测试入口
tests/core.test.ts            域名、校验、迁移、并发保存等单元测试
tests/browser-*.js            Playwright CLI 浏览器回归脚本
package.json                  版本、依赖、命令及权限唯一配置来源
```

后台、消息边界和 UI 逻辑使用严格 TypeScript。旧站点 DOM 适配器暂保留可读 JavaScript，以控制选择器迁移风险，并通过受限能力接口接入控制器；它不是全量 TypeScript 改写。

## 安全与权限

- 移除全部 HTTP/HTTPS 页面注入，只允许 `package.json` 明确列出的 HTTPS INZ/VFS 站点及模拟站点，并在后台与内容控制器再次校验主机及国家。
- 网页内容脚本不能直接读取完整资料库，只能请求当前站点、当前国家和当前资料组。网页消息不能修改设置或任意个人资料。
- 个人资料保存在扩展源的 IndexedDB。普通网页和内容脚本不能直接访问该数据库；这不是磁盘加密，拥有本机配置文件或扩展调试权限的人仍可能读取资料。
- 不主动上传资料到自建服务。但填入目标网站表单的资料会被该网站读取或提交；请确认页面和网站本身可信。
- `storage` 用于设置及重试状态；`tabs` 用于快捷链接和目标标签页校验；`webNavigation` 仅记录允许站点的主框架错误；`alarms` 用于 MV3 重试；剪贴板权限用于用户主动导入/导出和复制链接。
- 移除资料日志、旧混淆后台、重复 jQuery 和未使用的初始化调用。密码输入框改为遮罩显示，通知 HTML 使用锁定版本的 DOMPurify 净化。

## 验证与限制

本次已验证类型检查、单元测试、独立 Chromium 中的域名欺骗防护、关闭模式、快捷键、切组、消息权限、并发保存、资料编辑、恶意导入及五个 UI 页面。没有使用真实账号，没有提交真实申请或付款。

`tests/browser-check.js` 和 `tests/browser-lifecycle.js` 可通过 Playwright CLI 的 `run-code` 执行。必须使用只加载本扩展的独立测试浏览器配置；生命周期测试会重置其中的测试数据库，不要在个人浏览器配置执行。它们使用虚构资料和本地拦截的网页，不访问真实申请流程。截图输出到 `output/playwright/`。

仍需注意：

- 旧版 AU/NZ 选择器和流程可能不适用于当前真实网站；部分新预约页面原本就未适配，仍提示手动操作。
- 健康、品行、资金等申请答案来自原有规则，不能替代对本人真实情况的核对；建议先使用仅填表模式。
- 部分字体仍来自原有外部资源，离线时可能出现字体差异。
- `npm audit` 仍报告 Plasmo 固定构建链的依赖告警，包括 CSP 解析、开发服务器及图像处理相关包。已应用兼容修复并锁定 `msgpackr`、`fflate`、`browserslist`，未强制降级 Plasmo 或跨主版本替换其内部依赖。只构建可信源码和本地素材，不对外开放开发服务。不能把本次修复解释为全依赖零漏洞认证。
- 未申请 Chrome Web Store 审核；项目级授权仍需确认。

详见 [CHANGELOG.md](CHANGELOG.md)。发现新站点失效时，请提供网址、脱敏后的 DOM 或错误信息，勿提交真实密码、护照或申请资料。

## 来源与许可

原项目元数据署名为“澳打君”。保留原作者及第三方资源的署名、版权和许可声明。本仓库没有单独的项目级 LICENSE；本次整理不额外授予或替换原作者许可。
