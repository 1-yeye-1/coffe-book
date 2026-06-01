const mysql = require("mysql2/promise");
const { db } = require("./data");
const { hashPassword } = require("./password");

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "dev",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "coffee_book"
};

let pool = null;

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  return String(value).slice(0, 19).replace("T", " ");
}

async function initDatabase() {
  if (process.env.NODE_ENV === "production" && !process.env.DB_PASSWORD) {
    throw new Error("Production must configure DB_PASSWORD in backend/.env or environment variables");
  }

  const bootstrap = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 10 });
  await createTables();
  await seedTables();
  await loadTables();
  db.usingMysql = true;
  console.log(`MySQL connected: ${config.host}:${config.port}/${config.database}`);
}

async function createTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL UNIQUE,
      email VARCHAR(160) NOT NULL DEFAULT '',
      birthday DATE NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL,
      level VARCHAR(50) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      avatar MEDIUMTEXT NULL,
      bio TEXT NULL,
      coffee_preference VARCHAR(100) NOT NULL DEFAULT '',
      book_preference VARCHAR(100) NOT NULL DEFAULT '',
      address TEXT NULL,
      profile_public TINYINT(1) NOT NULL DEFAULT 1,
      level_progress INT NOT NULL DEFAULT 0,
      last_checkin VARCHAR(20) NOT NULL DEFAULT '',
      favorites TEXT NULL,
      notes TEXT NULL,
      notifications TEXT NULL,
      gifts TEXT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      account VARCHAR(60) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      category VARCHAR(40) NOT NULL DEFAULT 'creative',
      image TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS books (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(160) NOT NULL,
      author VARCHAR(100) NOT NULL,
      category VARCHAR(40) NOT NULL,
      ranking VARCHAR(80) NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      publisher VARCHAR(160) NOT NULL DEFAULT '',
      published_at DATETIME NOT NULL,
      image TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL DEFAULT 0,
      phone VARCHAR(30) NOT NULL DEFAULT '',
      seat_id VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      time VARCHAR(20) NOT NULL,
      people VARCHAR(20) NOT NULL,
      purpose VARCHAR(100) NOT NULL,
      note TEXT,
      status VARCHAR(30) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL DEFAULT 0,
      user_name VARCHAR(100) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(30) NOT NULL,
      payment_method VARCHAR(40) NOT NULL DEFAULT '',
      paid_at DATETIME NULL,
      payment_review_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted',
      payment_submitted_at DATETIME NULL,
      payment_reviewed_at DATETIME NULL,
      payment_reviewed_by INT NOT NULL DEFAULT 0,
      earned_points INT NOT NULL DEFAULT 0,
      earned_progress INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(160) NOT NULL,
      capacity INT NOT NULL,
      applied INT NOT NULL,
      date DATE NOT NULL,
      time VARCHAR(40) NOT NULL DEFAULT '',
      registration_start DATETIME NULL,
      early_start DATETIME NULL,
      location VARCHAR(160) NOT NULL DEFAULT '',
      description TEXT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activity_applications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      activity_id INT NOT NULL,
      user_id INT NOT NULL DEFAULT 0,
      phone VARCHAR(30) NOT NULL,
      people INT NOT NULL DEFAULT 1,
      kind VARCHAR(20) NOT NULL DEFAULT 'regular',
      created_at DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL DEFAULT 0,
      author VARCHAR(100) NOT NULL,
      avatar MEDIUMTEXT NULL,
      title VARCHAR(160) NOT NULL,
      content TEXT NOT NULL,
      image MEDIUMTEXT NULL,
      liked_by TEXT NULL,
      likes INT NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      post_id INT NOT NULL,
      user_id INT NOT NULL DEFAULT 0,
      user VARCHAR(100) NOT NULL,
      avatar MEDIUMTEXT NULL,
      content TEXT NOT NULL,
      likes INT NOT NULL DEFAULT 0,
      liked_by TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'approved'
    )`,
    `CREATE TABLE IF NOT EXISTS carts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_key VARCHAR(80) NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      created_at DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notices (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(160) NOT NULL,
      summary TEXT NOT NULL,
      date DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      actor_type VARCHAR(30) NOT NULL DEFAULT 'system',
      actor_id INT NOT NULL DEFAULT 0,
      actor_name VARCHAR(100) NOT NULL DEFAULT '',
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(60) NOT NULL DEFAULT '',
      target_id VARCHAR(80) NOT NULL DEFAULT '',
      detail TEXT NULL,
      created_at DATETIME NOT NULL
    )`
  ];

  for (const statement of statements) await pool.query(statement);
  await pool.query("DROP TABLE IF EXISTS permissions");
  await ensureUserColumns();
  await ensurePasswordColumns();
  await ensureProductColumns();
  await ensureOrderColumns();
  await ensureReservationColumns();
  await ensureActivityColumns();
  await ensureCommunityColumns();
  await ensureNoticeColumns();
  await linkCommunityUsers();
}

async function ensurePasswordColumns() {
  await pool.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL");
  await pool.query("ALTER TABLE admins MODIFY COLUMN password VARCHAR(255) NOT NULL");
}

async function ensureProductColumns() {
  try {
    await pool.query("ALTER TABLE products ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'creative'");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureOrderColumns() {
  const columns = [
    "ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT '' AFTER status",
    "ADD COLUMN paid_at DATETIME NULL AFTER payment_method",
    "ADD COLUMN payment_review_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted' AFTER paid_at",
    "ADD COLUMN payment_submitted_at DATETIME NULL AFTER payment_review_status",
    "ADD COLUMN payment_reviewed_at DATETIME NULL AFTER payment_submitted_at",
    "ADD COLUMN payment_reviewed_by INT NOT NULL DEFAULT 0 AFTER payment_reviewed_at",
    "ADD COLUMN earned_points INT NOT NULL DEFAULT 0 AFTER payment_reviewed_by",
    "ADD COLUMN earned_progress INT NOT NULL DEFAULT 0 AFTER earned_points"
  ];
  for (const column of columns) {
    try {
      await pool.query(`ALTER TABLE orders ${column}`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
}

async function ensureUserColumns() {
  const columns = [
    "ADD COLUMN email VARCHAR(160) NOT NULL DEFAULT '' AFTER phone",
    "ADD COLUMN birthday DATE NULL AFTER email",
    "ADD COLUMN avatar MEDIUMTEXT NULL",
    "ADD COLUMN bio TEXT NULL AFTER avatar",
    "ADD COLUMN coffee_preference VARCHAR(100) NOT NULL DEFAULT '' AFTER bio",
    "ADD COLUMN book_preference VARCHAR(100) NOT NULL DEFAULT '' AFTER coffee_preference",
    "ADD COLUMN address TEXT NULL AFTER book_preference",
    "ADD COLUMN profile_public TINYINT(1) NOT NULL DEFAULT 1",
    "ADD COLUMN level_progress INT NOT NULL DEFAULT 0",
    "ADD COLUMN last_checkin VARCHAR(20) NOT NULL DEFAULT ''",
    "ADD COLUMN favorites TEXT NULL",
    "ADD COLUMN notes TEXT NULL",
    "ADD COLUMN notifications TEXT NULL",
    "ADD COLUMN gifts TEXT NULL"
  ];

  for (const column of columns) {
    try {
      await pool.query(`ALTER TABLE users ${column}`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
}

async function ensureActivityColumns() {
  const columns = [
    "ADD COLUMN time VARCHAR(40) NOT NULL DEFAULT ''",
    "ADD COLUMN registration_start DATETIME NULL",
    "ADD COLUMN early_start DATETIME NULL",
    "ADD COLUMN location VARCHAR(160) NOT NULL DEFAULT ''",
    "ADD COLUMN description TEXT NULL",
    "ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'regular'"
  ];
  for (const column of columns.slice(0, 5)) {
    try {
      await pool.query(`ALTER TABLE activities ${column}`);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  try {
    await pool.query(`ALTER TABLE activity_applications ${columns[5]}`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureCommunityColumns() {
  const statements = [
    "ALTER TABLE posts ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER id",
    "ALTER TABLE posts ADD COLUMN avatar MEDIUMTEXT NULL AFTER author",
    "ALTER TABLE posts ADD COLUMN image MEDIUMTEXT NULL AFTER content",
    "ALTER TABLE posts ADD COLUMN liked_by TEXT NULL AFTER image",
    "ALTER TABLE comments ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER post_id",
    "ALTER TABLE comments ADD COLUMN avatar MEDIUMTEXT NULL AFTER user",
    "ALTER TABLE comments ADD COLUMN likes INT NOT NULL DEFAULT 0 AFTER content",
    "ALTER TABLE comments ADD COLUMN liked_by TEXT NULL AFTER likes",
    "ALTER TABLE comments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved' AFTER liked_by"
  ];
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
}

async function ensureReservationColumns() {
  try {
    await pool.query("ALTER TABLE reservations ADD COLUMN phone VARCHAR(30) NOT NULL DEFAULT '' AFTER user_id");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureNoticeColumns() {
  await pool.query("ALTER TABLE notices MODIFY COLUMN date DATETIME NOT NULL");
}

async function linkCommunityUsers() {
  await pool.query("UPDATE posts p INNER JOIN users u ON u.name=p.author SET p.user_id=u.id WHERE p.user_id=0");
  await pool.query("UPDATE comments c INNER JOIN users u ON u.name=c.user SET c.user_id=u.id WHERE c.user_id=0");
}

async function countRows(table) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  return rows[0].count;
}

async function seedTables() {
  if (await countRows("users") === 0) {
    for (const user of db.users) await persistUser(user);
  }
  const demoUsers = [
    ["晨光读者", "13900000001", "普通会员", 260, 180],
    ["南风书友", "13900000002", "普通会员", 420, 360],
    ["白露咖啡客", "13900000003", "黄金会员", 860, 720],
    ["山茶阅读者", "13900000004", "黄金会员", 1180, 1040],
    ["星河藏书家", "13900000005", "钻石会员", 2360, 1680],
    ["晚灯写作者", "13900000006", "钻石会员", 3280, 2150]
  ];
  for (const [name, phone, level, points, levelProgress] of demoUsers) {
    await pool.execute(
      `INSERT IGNORE INTO users (name, phone, password, role, level, points, avatar, profile_public, level_progress, last_checkin, favorites, notes, notifications, gifts)
       VALUES (?, ?, ?, 'member', ?, ?, '', 1, ?, '', '[]', '[]', '[]', '[]')`,
      [name, phone, hashPassword("Coffee#123"), level, points, levelProgress]
    );
  }
  if (await countRows("admins") === 0) {
    for (const admin of db.admins) await pool.execute(
      "INSERT INTO admins (id, name, account, password, role) VALUES (?, ?, ?, ?, ?)",
      [admin.id, admin.name, admin.account, admin.password, admin.role]
    );
  }
  for (const product of db.products) await pool.execute(
    "INSERT IGNORE INTO products (id, name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [product.id, product.name, product.description, product.price, product.stock, product.category || "creative", product.image]
  );
  for (const book of db.books) await pool.execute(
    "INSERT IGNORE INTO books (id, title, author, category, ranking, summary, publisher, published_at, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [book.id, book.title, book.author, book.category, book.ranking, book.summary, book.publisher, book.publishedAt, book.image]
  );
  if (await countRows("reservations") === 0) {
    for (const reservation of db.reservations) await persistReservation(reservation);
  }
  for (const activity of db.activities) await pool.execute(
    `INSERT INTO activities (id, title, capacity, applied, date, time, registration_start, early_start, location, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE time=IF(time='', VALUES(time), time), registration_start=COALESCE(registration_start, VALUES(registration_start)), early_start=COALESCE(early_start, VALUES(early_start)), location=IF(location='', VALUES(location), location), description=IF(description IS NULL OR description='', VALUES(description), description)`,
    [activity.id, activity.title, activity.capacity, activity.applied, activity.date, activity.time || "", activity.registrationStart || null, activity.earlyStart || null, activity.location || "", activity.description || ""]
  );
  if (await countRows("posts") === 0) {
    for (const post of db.posts) {
      await persistPost(post);
      for (const comment of post.comments) await persistComment(post.id, comment);
    }
  }
  if (await countRows("notices") === 0) {
    for (const notice of db.notices) await persistNotice(notice);
  }
  if (await countRows("audit_logs") === 0) {
    for (const log of db.realtime) await persistAuditLog(log);
  }
  for (const notice of db.notices) {
    await pool.execute("UPDATE notices SET date=? WHERE id=? AND TIME(date)='00:00:00'", [notice.date, notice.id]);
  }
}

async function loadTables() {
  const [users] = await pool.query("SELECT * FROM users ORDER BY id");
  const [admins] = await pool.query("SELECT * FROM admins ORDER BY id");
  const [products] = await pool.query("SELECT * FROM products ORDER BY id");
  const [books] = await pool.query("SELECT * FROM books ORDER BY id");
  const [reservations] = await pool.query("SELECT * FROM reservations ORDER BY id");
  const [orders] = await pool.query("SELECT * FROM orders ORDER BY id");
  const [orderItems] = await pool.query("SELECT * FROM order_items ORDER BY id");
  const [activities] = await pool.query("SELECT * FROM activities ORDER BY id");
  const [activityApplications] = await pool.query("SELECT * FROM activity_applications ORDER BY id");
  const [posts] = await pool.query("SELECT * FROM posts ORDER BY id DESC");
  const [comments] = await pool.query("SELECT * FROM comments ORDER BY id");
  const [carts] = await pool.query("SELECT * FROM carts ORDER BY id");
  const [notices] = await pool.query("SELECT * FROM notices ORDER BY date DESC, id DESC");
  const [auditLogs] = await pool.query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100");

  db.users = users.map((item) => {
    const levelProgress = item.level_progress || progressFromLevel(item.level);
    return {
      id: item.id,
      name: item.name,
      phone: item.phone,
      email: item.email || "",
      birthday: formatDate(item.birthday),
      password: item.password,
      role: item.role,
      level: item.level,
      points: item.points,
      avatar: item.avatar || "",
      bio: item.bio || "",
      coffeePreference: item.coffee_preference || "",
      bookPreference: item.book_preference || "",
      address: item.address || "",
      showProfile: Boolean(item.profile_public),
      levelProgress,
      lastCheckIn: item.last_checkin || "",
      favorites: parseList(item.favorites, ["夜航西飞", "桂花拿铁"]),
      notes: parseList(item.notes, ["城市阅读笔记", "手冲课要点"]),
      notifications: parseList(item.notifications, ["您的预约已确认", "六月新书已上架"]),
      gifts: parseList(item.gifts, [])
    };
  });
  db.admins = admins.map((item) => ({
    id: item.id,
    name: item.name,
    account: item.account,
    password: item.password,
    role: item.role
  }));
  db.products = products.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    stock: item.stock,
    category: item.category || "creative",
    image: item.image
  }));
  db.books = books.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    category: item.category,
    ranking: item.ranking,
    summary: item.summary,
    publisher: item.publisher,
    publishedAt: formatDateTime(item.published_at),
    image: item.image
  }));
  db.reservations = reservations.map((item) => ({
    id: item.id,
    userId: item.user_id,
    phone: item.phone || "",
    seatId: item.seat_id,
    date: formatDate(item.date),
    time: item.time,
    people: item.people,
    purpose: item.purpose,
    note: item.note || "",
    status: item.status
  }));
  db.orders = orders.map((order) => ({
    id: order.id,
    userId: order.user_id,
    userName: order.user_name,
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.payment_method || "",
    paidAt: formatDateTime(order.paid_at),
    paymentReviewStatus: order.payment_review_status || "not_submitted",
    paymentSubmittedAt: formatDateTime(order.payment_submitted_at),
    paymentReviewedAt: formatDateTime(order.payment_reviewed_at),
    paymentReviewedBy: order.payment_reviewed_by || 0,
    earnedPoints: order.earned_points || 0,
    earnedProgress: order.earned_progress || 0,
    createdAt: formatDateTime(order.created_at),
    items: orderItems
      .filter((item) => item.order_id === order.id)
      .map((item) => ({ productId: item.product_id, name: item.name, price: Number(item.price), quantity: item.quantity }))
  }));
  db.activities = activities.map((item) => ({
    id: item.id,
    title: item.title,
    capacity: item.capacity,
    applied: item.applied,
    date: formatDate(item.date),
    time: item.time || "",
    registrationStart: formatDateTime(item.registration_start),
    earlyStart: formatDateTime(item.early_start),
    location: item.location || "",
    description: item.description || ""
  }));
  db.activityApplications = activityApplications.map((item) => ({
    id: item.id,
    activityId: item.activity_id,
    userId: item.user_id,
    phone: item.phone,
    people: item.people,
    kind: item.kind || "regular",
    createdAt: formatDateTime(item.created_at)
  }));
  db.carts = new Map();
  for (const item of carts) {
    const key = String(item.user_key);
    const entries = db.carts.get(key) || [];
    entries.push({ productId: item.product_id, quantity: item.quantity, createdAt: formatDateTime(item.created_at) });
    db.carts.set(key, entries);
  }
  db.posts = posts.map((post) => {
    const userId = post.user_id || 0;
    const author = users.find((user) => user.id === userId);
    return {
      id: post.id,
      userId,
      author: author?.name || post.author,
      avatar: author?.avatar || post.avatar || "",
      title: post.title,
      content: post.content,
      image: post.image || "",
      likes: post.likes,
      likedBy: parseList(post.liked_by, []),
      comments: comments
        .filter((comment) => comment.post_id === post.id)
        .map((comment) => ({ id: comment.id, userId: comment.user_id, user: comment.user, avatar: comment.avatar || "", content: comment.content, likes: comment.likes || 0, likedBy: parseList(comment.liked_by, []), status: comment.status || "approved" }))
    };
  });
  db.notices = notices.map((item) => ({ id: item.id, title: item.title, summary: item.summary, date: formatDateTime(item.date) }));
  db.realtime = auditLogs.map((item) => ({
    id: item.id,
    actorType: item.actor_type,
    actorId: item.actor_id,
    actorName: item.actor_name,
    action: item.action,
    targetType: item.target_type,
    targetId: item.target_id,
    detail: item.detail || item.action,
    createdAt: formatDateTime(item.created_at)
  }));
}

function parseList(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function progressFromLevel(level) {
  if (level === "钻石会员") return 1500;
  if (level === "黄金会员") return 500;
  return 0;
}

async function persistUser(user) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO users (id, name, phone, email, birthday, password, role, level, points, avatar, bio, coffee_preference, book_preference, address, profile_public, level_progress, last_checkin, favorites, notes, notifications, gifts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email), birthday=VALUES(birthday), password=VALUES(password), role=VALUES(role), level=VALUES(level), points=VALUES(points), avatar=VALUES(avatar), bio=VALUES(bio), coffee_preference=VALUES(coffee_preference), book_preference=VALUES(book_preference), address=VALUES(address), profile_public=VALUES(profile_public), level_progress=VALUES(level_progress), last_checkin=VALUES(last_checkin), favorites=VALUES(favorites), notes=VALUES(notes), notifications=VALUES(notifications), gifts=VALUES(gifts)`,
    [
      user.id,
      user.name,
      user.phone,
      user.email || "",
      user.birthday || null,
      user.password,
      user.role,
      user.level,
      user.points,
      user.avatar || "",
      user.bio || "",
      user.coffeePreference || "",
      user.bookPreference || "",
      user.address || "",
      user.showProfile === false ? 0 : 1,
      user.levelProgress || 0,
      user.lastCheckIn || "",
      JSON.stringify(user.favorites || []),
      JSON.stringify(user.notes || []),
      JSON.stringify(user.notifications || []),
      JSON.stringify(user.gifts || [])
    ]
  );
}

async function getDatabaseOverview() {
  if (!pool) return [];
  const [tables] = await pool.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME", [config.database]);
  const overview = [];
  for (const { TABLE_NAME: tableName } of tables) {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
    const [columns] = await pool.query(
      "SELECT COLUMN_NAME AS name, DATA_TYPE AS type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
      [config.database, tableName]
    );
    overview.push({
      table: tableName,
      count: Number(countRows[0].count || 0),
      columns: columns.map((column) => ({ name: column.name, type: column.type, nullable: column.nullable === "YES" }))
    });
  }
  return overview;
}

async function reloadDatabase() {
  if (!pool) return;
  await loadTables();
}

async function persistReservation(reservation) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO reservations (id, user_id, phone, seat_id, date, time, people, purpose, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), phone=VALUES(phone), seat_id=VALUES(seat_id), date=VALUES(date), time=VALUES(time), people=VALUES(people), purpose=VALUES(purpose), note=VALUES(note), status=VALUES(status)`,
    [reservation.id, reservation.userId, reservation.phone || "", reservation.seatId, reservation.date, reservation.time, reservation.people, reservation.purpose, reservation.note, reservation.status]
  );
}

async function persistProduct(product) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO products (id, name, description, price, stock, category, image)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), stock=VALUES(stock), category=VALUES(category), image=VALUES(image)`,
    [product.id, product.name, product.description, product.price, product.stock, product.category || "creative", product.image]
  );
}

async function persistBook(book) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO books (id, title, author, category, ranking, summary, publisher, published_at, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), author=VALUES(author), category=VALUES(category), ranking=VALUES(ranking), summary=VALUES(summary), publisher=VALUES(publisher), published_at=VALUES(published_at), image=VALUES(image)`,
    [book.id, book.title, book.author, book.category, book.ranking || "", book.summary, book.publisher || "", String(book.publishedAt).replace("T", " "), book.image]
  );
}

async function persistOrder(order) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO orders (id, user_id, user_name, total, status, payment_method, paid_at, payment_review_status, payment_submitted_at, payment_reviewed_at, payment_reviewed_by, earned_points, earned_progress, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), user_name=VALUES(user_name), total=VALUES(total), status=VALUES(status), payment_method=VALUES(payment_method), paid_at=VALUES(paid_at), payment_review_status=VALUES(payment_review_status), payment_submitted_at=VALUES(payment_submitted_at), payment_reviewed_at=VALUES(payment_reviewed_at), payment_reviewed_by=VALUES(payment_reviewed_by), earned_points=VALUES(earned_points), earned_progress=VALUES(earned_progress), created_at=VALUES(created_at)`,
    [
      order.id,
      order.userId,
      order.userName,
      order.total,
      order.status,
      order.paymentMethod || "",
      order.paidAt ? order.paidAt.slice(0, 19).replace("T", " ") : null,
      order.paymentReviewStatus || "not_submitted",
      order.paymentSubmittedAt ? order.paymentSubmittedAt.slice(0, 19).replace("T", " ") : null,
      order.paymentReviewedAt ? order.paymentReviewedAt.slice(0, 19).replace("T", " ") : null,
      order.paymentReviewedBy || 0,
      order.earnedPoints || 0,
      order.earnedProgress || 0,
      order.createdAt.slice(0, 19).replace("T", " ")
    ]
  );
  await pool.execute("DELETE FROM order_items WHERE order_id=?", [order.id]);
  for (const item of order.items) {
    await pool.execute(
      "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
      [order.id, item.productId, item.name, item.price, item.quantity]
    );
  }
}

async function persistActivity(activity) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO activities (id, title, capacity, applied, date, time, registration_start, early_start, location, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), capacity=VALUES(capacity), applied=VALUES(applied), date=VALUES(date), time=VALUES(time), registration_start=VALUES(registration_start), early_start=VALUES(early_start), location=VALUES(location), description=VALUES(description)`,
    [activity.id, activity.title, activity.capacity, activity.applied, activity.date, activity.time || "", activity.registrationStart || null, activity.earlyStart || null, activity.location || "", activity.description || ""]
  );
}

async function persistActivityApplication(application) {
  if (!pool) return;
  await pool.execute(
    "INSERT INTO activity_applications (id, activity_id, user_id, phone, people, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [application.id, application.activityId, application.userId, application.phone, application.people, application.kind || "regular", application.createdAt.slice(0, 19).replace("T", " ")]
  );
}

async function persistPost(post) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO posts (id, user_id, author, avatar, title, content, image, liked_by, likes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), author=VALUES(author), avatar=VALUES(avatar), title=VALUES(title), content=VALUES(content), image=VALUES(image), liked_by=VALUES(liked_by), likes=VALUES(likes)`,
    [post.id, post.userId || 0, post.author, post.avatar || "", post.title, post.content, post.image || "", JSON.stringify(post.likedBy || []), post.likes || 0]
  );
}

async function persistComment(postId, comment) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO comments (id, post_id, user_id, user, avatar, content, likes, liked_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), user=VALUES(user), avatar=VALUES(avatar), content=VALUES(content), likes=VALUES(likes), liked_by=VALUES(liked_by), status=VALUES(status)`,
    [comment.id || null, postId, comment.userId || 0, comment.user, comment.avatar || "", comment.content, comment.likes || 0, JSON.stringify(comment.likedBy || []), comment.status || "approved"]
  );
}

async function persistAdmin(admin) {
  if (!pool) return;
  await pool.execute("UPDATE admins SET name=?, account=?, password=?, role=? WHERE id=?", [admin.name, admin.account, admin.password, admin.role, admin.id]);
}

async function persistNotice(notice) {
  if (!pool) return;
  await pool.execute(
    `INSERT INTO notices (id, title, summary, date) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), date=VALUES(date)`,
    [notice.id, notice.title, notice.summary, String(notice.date).replace("T", " ")]
  );
}

async function persistAuditLog(log) {
  if (!pool || !log) return;
  const entry = typeof log === "string"
    ? { actorType: "system", actorId: 0, actorName: "系统", action: "系统动态", targetType: "", targetId: "", detail: log, createdAt: log.slice(0, 19) }
    : log;
  const [result] = await pool.execute(
    `INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorType || "system",
      Number(entry.actorId || 0),
      entry.actorName || "系统",
      entry.action || "系统动态",
      entry.targetType || "",
      String(entry.targetId || ""),
      entry.detail || entry.action || "",
      String(entry.createdAt || new Date().toISOString()).slice(0, 19).replace("T", " ")
    ]
  );
  entry.id = Number(result.insertId || entry.id || 0);
  return entry;
}

async function persistCartItem(userKey, productId, quantity) {
  if (!pool) return;
  await pool.execute(
    "INSERT INTO carts (user_key, product_id, quantity, created_at) VALUES (?, ?, ?, NOW())",
    [String(userKey), productId, quantity]
  );
}

async function deleteUser(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM users WHERE id=?", [id]);
}

async function deleteProduct(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM products WHERE id=?", [id]);
}

async function deleteBook(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM books WHERE id=?", [id]);
}

async function deleteOrder(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM order_items WHERE order_id=?", [id]);
  await pool.execute("DELETE FROM orders WHERE id=?", [id]);
}

async function deleteReservation(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM reservations WHERE id=?", [id]);
}

async function deleteActivity(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM activity_applications WHERE activity_id=?", [id]);
  await pool.execute("DELETE FROM activities WHERE id=?", [id]);
}

async function deletePost(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM comments WHERE post_id=?", [id]);
  await pool.execute("DELETE FROM posts WHERE id=?", [id]);
}

async function deleteComment(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM comments WHERE id=?", [id]);
}

async function deleteNotice(id) {
  if (!pool) return;
  await pool.execute("DELETE FROM notices WHERE id=?", [id]);
}

module.exports = {
  initDatabase,
  getDatabaseOverview,
  reloadDatabase,
  persistActivity,
  persistActivityApplication,
  persistAdmin,
  persistCartItem,
  persistAuditLog,
  persistComment,
  persistOrder,
  persistPost,
  persistProduct,
  persistBook,
  persistReservation,
  persistUser,
  deleteUser,
  deleteProduct,
  deleteBook,
  deleteOrder,
  deleteReservation,
  deleteActivity,
  deletePost,
  deleteComment,
  persistNotice,
  deleteNotice
};
