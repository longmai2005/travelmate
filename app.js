const express = require("express");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
const mongoose = require("mongoose");
const MongoStoreModule = require("connect-mongo");
const MongoStore = MongoStoreModule.default || MongoStoreModule;
const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");
const { fail } = require("./utils/validation");
function createApp() {
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    process.env.SESSION_SECRET === "replace_with_secure_random_secret"
  )
    throw new Error("SESSION_SECRET cần ít nhất 32 ký tự ngẫu nhiên.");
  const app = express();
  app.disable("x-powered-by");
  app.get("/healthz", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const healthy = mongoose.connection.readyState === 1;
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "unavailable" });
  });
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-src https://www.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    next();
  });
  app.use(express.json({ limit: "150kb" }));
  app.use((req, res, next) => {
    if (
      (req.path.startsWith("/api/") || req.path === "/admin") &&
      mongoose.connection.readyState !== 1
    )
      fail("MongoDB tạm ngắt kết nối. Vui lòng thử lại sau.", 503);
    next();
  });
  app.use(
    session({
      name: "travelmate.sid",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions",
        ttl: 7 * 86400,
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 86400000,
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (mongoose.connection.readyState !== 1)
      fail("MongoDB tạm ngắt kết nối. Vui lòng thử lại sau.", 503);
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (
        req.body != null &&
        (typeof req.body !== "object" || Array.isArray(req.body))
      )
        fail("Nội dung yêu cầu phải là một đối tượng JSON.");
      req.body ||= {};
      const sent = req.get("X-CSRF-Token");
      const expected = req.session.csrfToken;
      if (
        !sent ||
        !expected ||
        !/^[a-f0-9]{64}$/.test(sent) ||
        sent.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
      )
        fail("Phiên bảo mật đã thay đổi. Hãy tải lại trang.", 403);
      const origin = req.get("origin");
      if (origin && origin !== `${req.protocol}://${req.get("host")}`)
        fail("Nguồn yêu cầu không hợp lệ.", 403);
    }
    next();
  });
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/destinations", require("./routes/destinationRoutes"));
  app.use("/api/favorites", require("./routes/favoriteRoutes"));
  app.use("/api/itineraries", require("./routes/itineraryRoutes"));
  app.use("/api/shared-itineraries", require("./routes/sharedItineraryRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "API không tồn tại." }),
  );
  app.get("/README.md", (req, res) =>
    res.sendFile(require("path").join(__dirname, "README.md")),
  );
  app.get("/admin", requireAuth, requireAdmin, (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "views/admin.html"));
  });
  app.get("/share/:token", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.sendFile(path.join(__dirname, "views/trip.html"));
  });
  app.get("/trip-print/:id", requireAuth, (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "views/trip.html"));
  });
  ["explore", "planner", "favorites"].forEach((page) =>
    app.get(`/${page}`, (req, res) =>
      res.sendFile(path.join(__dirname, `public/${page}.html`)),
    ),
  );
  app.get("/vendor/lucide.js", (req, res) =>
    res.sendFile(
      path.join(__dirname, "node_modules/lucide/dist/umd/lucide.js"),
    ),
  );
  app.use(express.static(path.join(__dirname, "public")));
  app.use((req, res) =>
    res.status(404).send('Không tìm thấy trang. <a href="/">Về TravelMate</a>'),
  );
  app.use(require("./middleware/errorMiddleware"));
  return app;
}
module.exports = createApp;
