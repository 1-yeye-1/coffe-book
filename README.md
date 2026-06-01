# 咖啡书屋平台

本项目保留中文业务文案，代码目录和文件名统一使用英文形式，并按业务模块组织。

## 启动方式

前后端需要分别启动，建议打开两个终端窗口。

后端：

```bash
cd backend
node index.js
```

前端：

```bash
cd front
npm run dev
```

访问地址：

```text
前端：http://localhost:5173
后端：http://localhost:4173/api
后台管理：http://localhost:5173/admin.html
```

直接打开 `http://localhost:4173/api` 会显示后端服务信息和常用接口列表。
前端开发服务统一使用 `http://localhost:5173/`，如果误用 `http://127.0.0.1:5173/` 打开，会自动跳转回 localhost 格式。
后台管理是独立页面，不在前台导航中展示，需要直接访问 `http://localhost:5173/admin.html`。

测试账号：

```text
前台用户：13800000000 / coffee123
后台管理员：admin / admin123
```

## 登录与注册

- 右上角未登录状态下显示“登录”和“注册”两个独立入口。
- 登录只校验已有账号，不再自动注册；支持密码登录和短信验证码登录，短信登录前需要完成滑块验证。
- 未登录状态不展示购物车入口；登录后购物车、我的订单、收藏、笔记、通知、积分、礼券和个人资料统一放在个人中心下拉框里。
- 注册使用手机号 + 密码 + 短信验证码。
- 获取短信验证码前必须先通过图形验证码校验。
- 短信验证码只保存在后端，不会返回给前端；开发环境会打印在后端终端里，便于本地调试。
- 后台管理入口会先进入管理员登录页，不再通过浏览器缓存直接进入后台工作台。

## MySQL 配置

后端会优先读取 `backend/.env`，请先复制示例文件并填写本地数据库密码：

```bash
cd backend
copy .env.example .env
```

核心配置项：

```text
PORT=4173
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=dev
DB_PASSWORD=your-mysql-password
DB_NAME=coffee_book
```

首次运行 `node index.js` 时，后端会自动创建 `coffee_book` 数据库、创建业务表，并写入初始化演示数据。

生产环境要求：

```text
NODE_ENV=production
JWT_SECRET=至少 32 位随机字符串
DB_PASSWORD=生产数据库密码
REDIS_URL=redis://your-redis-host:6379
```

如果 `NODE_ENV=production` 但没有配置 `REDIS_URL`，后端会拒绝启动，避免验证码落到内存存储。

## 常用工程命令

安装依赖：

```bash
npm install
cd front && npm install
cd ../backend && npm install
```

回到项目根目录后：

```bash
npm run dev      # 同时启动后端和前端
npm run build    # 前端生产构建
npm run lint     # package/json、后端与脚本语法、冲突标记检查
npm run test     # 后端核心接口冒烟测试
```

前端单独启动：

```bash
cd front
npm run dev
```

后端单独启动：

```bash
cd backend
npm run dev
```

## 核心接口说明

用户端接口：

```text
GET    /api
GET    /api/home
GET    /api/products
GET    /api/books
GET    /api/seats/status?date=YYYY-MM-DD&time=HH:mm
GET    /api/activities
GET    /api/posts
POST   /api/auth/sms-code
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/sms-login
GET    /api/member
PATCH  /api/member/profile
PATCH  /api/member/security
PATCH  /api/member/password
POST   /api/cart
POST   /api/orders
POST   /api/orders/:id/pay
POST   /api/reservations
POST   /api/activities/:id/apply
POST   /api/posts
POST   /api/posts/:id/comments
POST   /api/posts/:id/like
```

后台接口需要管理员 Token：

```text
POST   /api/admin/login
GET    /api/admin/summary
GET    /api/admin/realtime
POST   /api/admin/users
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
POST   /api/admin/orders
PATCH  /api/admin/orders/:id
PATCH  /api/admin/orders/:id/payment-review
POST   /api/admin/reservations
PATCH  /api/admin/reservations/:id
POST   /api/admin/activities
PATCH  /api/admin/activities/:id
PATCH  /api/admin/posts/:postId/comments/:commentId
```

## 目录结构

```text
front
├── server.js
└── src
    ├── app.js
    ├── styles.css
    ├── shared
    │   ├── api.js
    │   ├── layout.js
    │   ├── state.js
    │   └── ui.js
    ├── client
    │   ├── home.js
    │   ├── coffee-culture.js
    │   ├── book-library.js
    │   ├── creative-shop.js
    │   ├── shopping-cart.js
    │   ├── payment-flow
    │   │   ├── order-confirmation.js
    │   │   ├── payment.js
    │   │   └── payment-result.js
    │   ├── reservations
    │   │   ├── seat-selection.js
    │   │   ├── reservation-confirmation.js
    │   │   └── my-reservations.js
    │   ├── community
    │   │   ├── community-home.js
    │   │   ├── publish-post.js
    │   │   ├── post-detail.js
    │   │   └── user-home.js
    │   ├── events.js
    │   ├── member-center
    │   │   ├── index.js
    │   │   ├── panels.js
    │   │   ├── login.js
    │   │   ├── profile.js
    │   │   └── register.js
    │   └── brand-introduction.js
    └── admin
        ├── login.js
        ├── workbench.js
        ├── user-management.js
        ├── product-management.js
        ├── order-management.js
        ├── reservation-management.js
        ├── community-review.js
        ├── content-management.js
        └── data-dashboard.js

backend
├── index.js
└── src
    ├── admin-routes.js
    ├── client-routes.js
    ├── shared
    │   ├── auth.js
    │   ├── data.js
    │   ├── mysql.js
    │   ├── request-body.js
    │   ├── response.js
    │   └── verification-store.js
```

## 功能说明

- 前台用户端：首页、咖啡文化、精品书库、文创商城、在线预约、书友社区、活动赛事、会员中心、品牌介绍。
- 后台管理端：登录、工作台、用户管理、商品管理、订单管理、预约管理、活动管理、社区审核、内容管理、数据大屏。
- 当前导航里“文创商城”只保留商品列表；购物车移入登录后右上角账户下拉框，商城可选择购买数量，确认订单、支付界面和支付结果位于 `payment-flow`。
- 咖啡文化页中的饮品与商城商品共用购物车、确认订单、扫码支付、支付结果和积分成长流程。
- 在线预约已嵌入首页；品牌介绍通过点击顶部“咖啡书屋”品牌入口进入。
- 会员中心不在主导航显示；用户登录后，右上角直接显示会员等级，点击等级进入会员中心。
- 右上角账户菜单包含购物车、我的订单、我的收藏、我的笔记、消息通知、积分中心、个人中心和退出登录。
- 个人中心支持编辑昵称、手机号并保存到 MySQL，同时支持本地上传头像并随个人资料保存；收藏、笔记和通知在独立页面编辑。
- 会员等级包含普通会员、黄金会员、钻石会员；签到和购买商品会增加积分与等级度，积分中心可兑换咖啡券、优惠券和活动权益。
- 后端核心数据已经接入 MySQL，新增用户、购物车记录、订单、预约、活动赛事、活动报名、发帖、评论、点赞会写入数据库。
- 前端已增加页面进入、卡片悬停、按钮反馈、首屏动效、验证码表单等交互动画。
