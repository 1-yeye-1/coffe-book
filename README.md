# 咖啡书屋平台

咖啡书屋平台是一个面向毕业设计展示的全栈 Web 项目，围绕“咖啡消费 + 图书阅读 + 文创商城 + 座位预约 + 书友社区 + 后台运营”构建。项目包含前台用户端和后台管理端，覆盖用户登录注册、商品浏览、购物车、订单支付、座位预约、活动报名、社区互动、会员中心与运营后台管理等完整业务链路。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite、Pinia、Vue Router、原生 CSS |
| 后端 | Node.js 原生 HTTP 服务、模块化路由、JWT 鉴权 |
| 数据 | MySQL 8，支持开发环境内存演示数据 |
| 测试 | 后端 API 冒烟测试、Playwright E2E 测试、自定义巡检脚本 |
| 文档 | Markdown 项目文档、测试报告、UI 重构报告 |

## 功能模块

前台用户端：
- 首页、咖啡文化、精品书库、文创商城、在线预约、书友社区、活动赛事
- 购物车、订单列表、订单详情、支付提交、支付结果
- 我的收藏、我的笔记、消息中心、积分中心、我的礼品
- 个人资料、安全设置、会员成长和隐私设置

后台管理端：
- 工作台、实时日志、用户管理、商品管理、书籍管理、订单管理
- 支付审核、预约管理、活动管理、社区审核、内容管理
- 财务中心、运营驾驶舱、权限管理、系统设置、数据库对应

## 项目截图

以下截图来自最终 UI 精修与验收阶段，可用于答辩展示或项目报告：

| 页面 | PC | 移动端 |
| --- | --- | --- |
| 首页 | `docs/ui-polish-screenshots/verification-realdb/home-pc-realdb.png` | `docs/ui-polish-screenshots/verification-realdb/home-mobile-realdb.png` |
| 咖啡文化 | `docs/ui-polish-screenshots/verification-realdb/culture-pc-realdb.png` | `docs/ui-polish-screenshots/verification-realdb/culture-mobile-realdb.png` |
| 精品书库 | `docs/ui-polish-screenshots/verification-realdb/books-pc-realdb.png` | `docs/ui-polish-screenshots/verification-realdb/books-mobile-realdb.png` |
| 文创商城 | `docs/ui-polish-screenshots/verification-realdb/shop-pc-realdb.png` | `docs/ui-polish-screenshots/verification-realdb/shop-mobile-realdb.png` |
| 个人资料 | `docs/ui-polish-screenshots/verification/profile-pc-final-polish.png` | `docs/ui-polish-screenshots/verification/profile-mobile-final-polish.png` |
| 安全设置 | `test-results/security-settings-polish/security-settings-pc-final.png` | `test-results/security-settings-polish/security-settings-mobile-final.png` |

## 运行方式

安装依赖：

```bash
npm install
npm --prefix front install
```

开发环境一键启动：

```bash
npm run dev
```

也可以分开启动：

```bash
npm run dev:backend
npm run dev:front
```

访问地址：

```text
前台用户端：http://localhost:5173
后台管理端：http://localhost:5173/admin.html
后端接口：http://localhost:4173/api
```

演示账号：

```text
前台用户：13800000000 / coffee123
后台管理员：admin / admin123
```

## 目录结构

```text
coffee-book-platform
├─ backend
│  ├─ index.js
│  └─ src
│     ├─ client-routes.js
│     ├─ admin-routes.js
│     ├─ modules
│     └─ shared
├─ front
│  ├─ src
│  │  ├─ api
│  │  ├─ components
│  │  ├─ router
│  │  ├─ stores
│  │  ├─ styles
│  │  └─ views
│  └─ vite.config.mjs
├─ database
├─ docs
├─ scripts
├─ tests
└─ test-results
```

## 项目亮点

- 前后台完整闭环：前台下单、支付提交、预约、活动报名、社区发布均可在后台管理端查看或处理。
- 毕设展示友好：页面视觉经过统一重构，具备咖啡书屋主题、响应式适配和完整演示路径。
- 权限边界清晰：普通用户 token 与管理员 token 分离，会员、订单、预约等接口做归属校验。
- 数据链路完整：商品库存、购物车、订单、支付审核、积分成长、礼券与消息通知形成业务闭环。
- 自动化验证：提供 `npm run build`、`npm test`、`npm run test:e2e`，并完成最终全站巡检。

## 测试命令

```bash
npm run build
npm test
npm run test:e2e
```

最终验收结果：
- `npm run build`：通过
- `npm test`：通过，后端 API 冒烟流程全绿
- `npm run test:e2e`：通过，10 个 Playwright 用例全部通过
- 全站巡检：前台 16 页、后台 16 个模块完成；console error/warning、图片 404、破图、页面级横向滚动均为 0

## 文档索引

- [项目说明](docs/项目说明.md)
- [功能模块说明](docs/功能模块说明.md)
- [接口说明](docs/接口说明.md)
- [测试报告](docs/测试报告.md)
- [UI重构报告](docs/UI重构报告.md)
- [部署运行说明](docs/部署运行说明.md)
- [数据库设计](docs/数据库设计.md)
