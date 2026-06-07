# 咖啡书屋平台

咖啡书屋平台是一个适合课程设计、实验项目和毕业设计答辩展示的全栈 Web 项目。项目围绕“咖啡消费 + 图书阅读 + 文创商城 + 座位预约 + 书友社区 + 后台运营”构建，包含前台用户端和后台管理端，能够展示从用户登录、商品下单、订单支付、座位预约、活动报名、社区互动到后台管理的数据闭环。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite、Pinia、Vue Router、原生 CSS |
| 后端 | Node.js 原生 `http` 服务、模块化路由、JWT 登录态 |
| 数据库 | MySQL 8，首次运行自动建库建表并写入演示数据 |
| 配置 | `backend/.env`，示例文件为 `backend/.env.example` |
| 测试 | 自定义 lint、后端接口冒烟测试、Playwright E2E 测试 |

## 功能模块

- 前台用户端：首页、咖啡文化、精品书库、文创商城、购物车、订单支付、在线预约、我的预约、书友社区、活动赛事、会员中心。
- 后台管理端：后台登录、工作台、实时日志、用户管理、商品管理、图书管理、订单管理、预约管理、活动管理、社区审核、内容管理、收入查看、数据库查看、数据看板。
- 安全与权限：普通用户和管理员 token 分离，后台接口统一鉴权，订单和预约做用户归属校验，密码使用 hash 存储，短信验证码只保存在后端。

## 目录结构

```text
coffee-book
├── backend
│   ├── index.js
│   ├── .env.example
│   └── src
│       ├── admin-routes.js
│       ├── client-routes.js
│       ├── modules
│       │   ├── admin-summary.js
│       │   ├── activities.js
│       │   ├── cart.js
│       │   ├── community.js
│       │   ├── member.js
│       │   ├── orders.js
│       │   ├── products.js
│       │   └── reservations.js
│       └── shared
│           ├── audit.js
│           ├── auth.js
│           ├── data.js
│           ├── env.js
│           ├── mysql.js
│           ├── password.js
│           ├── request-body.js
│           ├── response.js
│           ├── validators.js
│           └── verification-store.js
├── front
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── router
│   │   ├── stores
│   │   └── views
│   └── vite.config.mjs
├── docs
├── scripts
└── tests
```

## 环境要求

- Node.js 18 或更高版本，当前已在 Node.js 22 环境验证。
- MySQL 8 或兼容版本。
- 生产环境建议准备 Redis，用于验证码和滑块校验的临时存储。

## 安装依赖

在项目根目录执行：

```bash
npm install
npm --prefix front install
```

如果需要单独进入后端目录安装依赖，也可以执行：

```bash
cd backend
npm install
```

## 配置 MySQL

后端会优先读取 `backend/.env`。本地开发如果没有 `.env`，会使用安全的开发默认值：

```text
PORT=4173
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=dev
DB_PASSWORD=
DB_NAME=coffee_book
```

建议复制示例文件后按本机 MySQL 修改：

```bash
cd backend
copy .env.example .env
```

`backend/.env.example` 包含：

```text
PORT=4173
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=dev
DB_PASSWORD=replace-with-your-mysql-password
DB_NAME=coffee_book
REDIS_URL=redis://127.0.0.1:6379
```

首次启动后端时会自动创建 `coffee_book` 数据库、业务表、索引和演示数据。生产环境必须设置足够长的 `JWT_SECRET`，并建议配置 `REDIS_URL`；如果 `NODE_ENV=production` 但仍使用内存验证码存储，后端会拒绝启动。

## 启动方式

推荐在项目根目录一键启动：

```bash
npm run dev
```

也可以分开启动，建议先后端、再前端：

```bash
npm run dev:backend
npm run dev:front
```

访问地址：

```text
前台用户端：http://localhost:5173
后台管理端：http://localhost:5173/admin.html
后端接口入口：http://localhost:4173/api
```

## 测试账号

```text
前台用户：13800000000 / coffee123
后台管理员：admin / admin123
```

## 接口入口

后端接口基础地址默认是：

```text
http://localhost:4173
```

常用入口：

- `GET /api`：服务信息和接口索引。
- `POST /api/auth/login`：用户密码登录。
- `POST /api/auth/sms-login`：用户短信验证码登录。
- `GET /api/member`：会员中心数据。
- `GET /api/products`：商品列表。
- `POST /api/orders`：创建订单。
- `POST /api/reservations`：创建预约。
- `GET /api/admin/summary`：后台汇总数据，需管理员 token。

完整接口说明见 [docs/接口说明.md](docs/接口说明.md)。

## 测试命令

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
```

测试会自动创建临时商品、订单、预约、帖子等数据，并在结束时按测试批次清理，避免污染演示数据。`npm run test` 和 `npm run test:e2e` 默认设置 `COFFEE_BOOK_MEMORY_DB=1` 使用内存演示数据，便于没有本机 MySQL 的环境完成自动化验证；正常开发启动仍会连接 MySQL 8 并自动建库建表。

## 项目截图占位说明

用于报告或答辩时，建议补充以下截图：

- 首页首屏和核心入口。
- 文创商城商品卡片和加入购物车。
- 购物车、订单确认、支付页面。
- 在线预约座位图和预约成功反馈。
- 书友社区帖子列表、发帖和评论。
- 后台工作台、商品管理、订单管理、预约管理、数据看板。

## 文档目录

- [项目说明](docs/项目说明.md)
- [功能模块说明](docs/功能模块说明.md)
- [数据库设计](docs/数据库设计.md)
- [接口说明](docs/接口说明.md)
- [测试报告](docs/测试报告.md)
- [部署运行说明](docs/部署运行说明.md)
- [UI 改造说明](docs/UI改造说明.md)

## 全站 UI 重构与最终验收

本项目已完成“咖啡书屋”主题的全站 UI 重构，覆盖前台用户端和后台管理端。重构过程中保持技术栈不变，未改变数据库结构、API 路径、API 返回格式、JWT 流程、Pinia 数据结构、Vue Router 路由结构和后端业务逻辑。

前台已完成首页、咖啡文化、精品书库、文创商城、在线预约、书友社区、活动赛事、购物车、订单、收藏、笔记、消息、积分、礼品、个人资料和安全设置等页面的商业化视觉升级。后台已完成工作台、实时日志、用户、商品、书籍、订单、支付、预约、活动、社区、内容、财务中心、运营驾驶舱、权限管理和系统设置等模块升级。

最终验收阶段完成了：

- 全站前台桌面端和移动端路由走查。
- 后台侧边栏所有模块导航走查。
- 横向滚动检查。
- 空状态、Toast、Modal、Drawer 和危险操作确认检查。
- README、UI 改造说明和测试报告整理。

最终验收命令：

```bash
npm run build
npm test
npm run test:e2e
```

## 常见问题

1. 后端启动报 MySQL 连接失败怎么办？
   检查 MySQL 是否启动，确认 `backend/.env` 中的 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD` 是否正确。

2. 是否必须先启动后端再启动前端？
   推荐先后端再前端。根目录 `npm run dev` 会自动同时启动两者；手动分开启动时，如果前端先启动，页面会在后端未就绪时显示接口连接失败。

3. 短信验证码在哪里看？
   开发环境不会返回给前端，只会打印在后端终端，格式类似 `[dev sms] 13800000000: 123456`。

4. 后台为什么访问不了？
   后台入口是 `http://localhost:5173/admin.html`，需要使用管理员账号 `admin / admin123` 登录。

5. 生产环境为什么需要 Redis？
   验证码和滑块挑战属于临时安全数据，生产环境不建议保存在进程内存中，因此后端会要求配置 `REDIS_URL`。

## 课程设计增强说明

本版本在不更换技术栈的前提下，补强了验证码、滑块验证、支付审核、后台看板、接口校验、通用组件、自动化测试和答辩文档。

- 验证码与滑块验证：开发环境仍使用内存 `Map`，生产环境配置 `REDIS_URL` 后使用 Redis；短信验证码、图形验证码、滑块 challenge 均包含过期时间、失败次数、使用次数控制。
- 支付流程：用户下单后进入 `/pay/:orderId`，选择微信、支付宝或模拟支付，扫码后提交“我已支付”；后台在 `/admin/payments` 确认收款后订单变为已支付。
- 后台看板：新增订单总数、今日订单、今日收入、预约数量、用户数量、近 7 天销售趋势、订单状态分布、热门商品排行、预约时段统计。
- 前端组件：新增 `BaseButton`、`BaseCard`、`BaseModal`、`BaseTable`、`BaseFormItem`，用于后台登录、看板、状态重试和日志详情等页面。
- 接口安全：登录、下单、预约、评论、活动报名、支付等接口补充参数校验；所有业务响应保持 `{ code, msg, data }`，并兼容旧版 `{ success, message, data }` 字段。
- 自动化测试：`npm run test` 覆盖后端冒烟流程，`npm run test:e2e` 覆盖登录、下单、支付页、预约、社区发帖、后台管理，并按测试批次清理临时数据。

## 第 3 周功能完善

- 商城系统：商品列表支持全分类浏览和关键词筛选，新增商品详情页 `/shop/:productId`；购物车支持登录用户远端同步、修改数量、删除、全选与结算。
- 订单流程：新增订单列表、订单详情、订单取消接口，用户只能访问自己的订单；创建订单时校验库存并扣减库存，取消未支付订单会恢复库存。
- 支付流程：保留微信、支付宝、模拟支付三种方式，用户提交付款后进入后台收款确认，后台确认后订单变为已支付并发放积分/成长值。
- 在线预约：座位图按日期和时间段查询，后端创建与后台编辑均校验座位冲突；我的预约支持查看和取消本人预约。
- 活动赛事：活动列表、详情和报名流程支持重复报名校验、满员校验、提前报名权益校验；后台活动管理新增草稿、开放、关闭状态。
- 后台管理：商品、订单、预约、活动管理和数据看板保持原生 CSS 简单图表，不引入第三方 UI 组件库。

补充答辩文档：

- [项目架构说明](docs/项目架构说明.md)
- [数据库 ER 图说明](docs/数据库ER图说明.md)
- [验证码与滑块验证实现说明](docs/验证码与滑块验证实现说明.md)
- [接口安全设计说明](docs/接口安全设计说明.md)
