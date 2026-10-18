const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const createApp = require("../app");
const connect = require("../config/database");
const User = require("../models/User");
const Destination = require("../models/Destination");
const Favorite = require("../models/Favorite");
const Itinerary = require("../models/Itinerary");

test(
  "Tích hợp Express + MongoDB thật trong database test riêng",
  { timeout: 90000 },
  async (t) => {
    const databaseName = `travelmate_test_${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
    const uri = process.env.TEST_MONGO_BASE_URI || "mongodb://127.0.0.1:27017";
    process.env.SESSION_SECRET = crypto.randomBytes(48).toString("hex");
    process.env.NODE_ENV = "test";
    await connect(`${uri}/${databaseName}`);
    const server = createApp().listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const clients = [];
    function client() {
      const state = { cookie: "", token: "" };
      clients.push(state);
      return state;
    }
    async function request(
      state,
      path,
      method = "GET",
      body,
      token = state.token,
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(state.cookie ? { Cookie: state.cookie } : {}),
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const cookie = response.headers.get("set-cookie");
      if (cookie) state.cookie = cookie.split(";")[0];
      const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson ? await response.json() : await response.text();
      if (data.csrfToken) state.token = data.csrfToken;
      return { status: response.status, data, headers: response.headers };
    }
    const a = client(),
      b = client(),
      anon = client(),
      admin = client();
    let destination, missing, trip;
    const password = crypto.randomBytes(14).toString("base64url");
    try {
      await Promise.all([
        User.init(),
        Destination.init(),
        Favorite.init(),
        Itinerary.init(),
      ]);
      [destination, missing] = await Destination.create(
        require("../data/destinations")
          .slice(0, 2)
          .map((d, i) => ({
            ...d,
            estimatedCostPerPersonVnd: i === 0 ? 200000 : null,
          })),
      );
      await t.test(
        "Bốn trang chính và tài nguyên nội bộ phục vụ thành công",
        async () => {
          for (const route of [
            "/",
            "/explore",
            "/planner",
            "/favorites",
            "/vendor/lucide.js",
            "/js/common.js",
          ])
            assert.equal((await request(anon, route)).status, 200, route);
        },
      );
      await t.test(
        "401 cho API cá nhân, /admin bị bảo vệ và HTML admin không public",
        async () => {
          for (const route of [
            "/api/favorites",
            "/api/itineraries",
            "/api/admin/stats",
            "/api/admin/users",
            "/api/admin/itineraries",
            "/admin",
          ])
            assert.equal((await request(anon, route)).status, 401, route);
          assert.equal((await request(anon, "/admin.html")).status, 404);
          assert.equal((await request(anon, "/views/admin.html")).status, 404);
        },
      );
      await t.test("CSRF bắt buộc cho đăng ký", async () => {
        assert.equal(
          (
            await request(a, "/api/auth/register", "POST", {
              email: "a@example.test",
              password,
            })
          ).status,
          403,
        );
        await request(a, "/api/auth/csrf");
      });
      await t.test(
        "Đăng ký: email không hợp lệ và mật khẩu xác nhận sai",
        async () => {
          assert.equal(
            (
              await request(a, "/api/auth/register", "POST", {
                fullName: "A",
                email: "bad",
                password,
                confirmPassword: password,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(a, "/api/auth/register", "POST", {
                fullName: "A",
                email: "a@example.test",
                password,
                confirmPassword: "different",
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Đăng ký, hash, role user, cookie HttpOnly và tái tạo session",
        async () => {
          const oldCookie = a.cookie,
            oldToken = a.token;
          const result = await request(a, "/api/auth/register", "POST", {
            fullName: "Người kiểm thử A",
            email: "a@example.test",
            password,
            confirmPassword: password,
            role: "admin",
          });
          assert.equal(result.status, 201);
          assert.equal(result.data.user.role, "user");
          assert.equal(result.data.user.passwordHash, undefined);
          assert.notEqual(a.cookie, oldCookie);
          assert.notEqual(a.token, oldToken);
          assert.match(result.headers.get("set-cookie"), /HttpOnly/i);
          assert.match(result.headers.get("set-cookie"), /SameSite=Lax/i);
          const user = await User.findOne({ email: "a@example.test" }).select(
            "+passwordHash",
          );
          assert.notEqual(user.passwordHash, password);
          assert.ok(await bcrypt.compare(password, user.passwordHash));
        },
      );
      await t.test("Email trùng trả 409", async () => {
        assert.equal(
          (
            await request(a, "/api/auth/register", "POST", {
              fullName: "A",
              email: "a@example.test",
              password,
              confirmPassword: password,
            })
          ).status,
          409,
        );
      });
      await t.test(
        "Phiên tồn tại qua request mới và sai mật khẩu trả 401",
        async () => {
          assert.equal(
            (await request(a, "/api/auth/me")).data.user.email,
            "a@example.test",
          );
          await request(b, "/api/auth/csrf");
          assert.equal(
            (
              await request(b, "/api/auth/login", "POST", {
                email: "a@example.test",
                password: "wrong-password",
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        "Tài khoản thứ hai đăng ký và user không có quyền admin",
        async () => {
          assert.equal(
            (
              await request(b, "/api/auth/register", "POST", {
                fullName: "B",
                email: "b@example.test",
                password,
                confirmPassword: password,
              })
            ).status,
            201,
          );
          for (const route of [
            "/api/admin/stats",
            "/api/admin/destinations",
            "/admin",
          ])
            assert.equal((await request(b, route)).status, 403);
        },
      );
      await t.test(
        "Tìm kiếm, lọc giá (null không phải miễn phí), phân trang, ObjectId",
        async () => {
          assert.equal(
            (await request(anon, "/api/destinations?q=Hội%20An")).data.total,
            1,
          );
          assert.equal(
            (await request(anon, "/api/destinations?budget=medium")).data.total,
            1,
          );
          assert.equal(
            (await request(anon, "/api/destinations?budget=low")).data.total,
            0,
          );
          assert.equal(
            (await request(anon, "/api/destinations?limit=1&page=2")).data.items
              .length,
            1,
          );
          assert.equal(
            (await request(anon, "/api/destinations/not-an-id")).status,
            400,
          );
        },
      );
      await t.test(
        "Yêu thích được lưu MongoDB, chống trùng và cách ly tài khoản",
        async () => {
          for (let i = 0; i < 2; i++)
            assert.equal(
              (
                await request(a, "/api/favorites", "POST", {
                  destinationId: String(destination._id),
                })
              ).status,
              201,
            );
          assert.equal(await Favorite.countDocuments(), 1);
          assert.equal(
            (await request(a, "/api/favorites")).data.items.length,
            1,
          );
          assert.equal(
            (await request(b, "/api/favorites")).data.items.length,
            0,
          );
        },
      );
      const body = {
        title: "Ba ngày Đà Nẵng",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        travelers: 2,
        budgetLimitVnd: 1000000,
        notes: "Ghi chú <script>alert(1)</script>",
        days: ["2026-11-10", "2026-11-11", "2026-11-12"].map((date) => ({
          date,
          items: [],
        })),
      };
      body.days[0].items = [
        {
          destinationId: String(destination._id),
          visitTime: "09:30",
          note: "Ngày đầu",
        },
        { destinationId: String(missing._id) },
      ];
      await t.test(
        "Tạo lịch trình, đọc lại, tính tổng và đánh dấu thiếu giá",
        async () => {
          const result = await request(a, "/api/itineraries", "POST", body);
          assert.equal(result.status, 201);
          trip = result.data.itinerary;
          assert.equal(trip.budget.total, 400000);
          assert.equal(trip.budget.missing, 1);
          assert.equal(
            (await request(a, `/api/itineraries/${trip._id}`)).data.itinerary
              .title,
            body.title,
          );
          assert.equal(await Itinerary.countDocuments(), 1);
        },
      );
      await t.test(
        "Chặn tài khoản khác đọc, cập nhật và xóa lịch trình",
        async () => {
          for (const method of ["GET", "PUT", "DELETE"])
            assert.equal(
              (
                await request(
                  b,
                  `/api/itineraries/${trip._id}`,
                  method,
                  method === "PUT" ? body : undefined,
                )
              ).status,
              404,
            );
        },
      );
      await t.test(
        "Chặn ngày quá dài, giá âm và trùng điểm cùng ngày",
        async () => {
          assert.equal(
            (
              await request(a, "/api/itineraries", "POST", {
                ...body,
                endDate: "2026-11-20",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(a, "/api/itineraries", "POST", {
                ...body,
                budgetLimitVnd: -1,
              })
            ).status,
            400,
          );
          const copy = structuredClone(body);
          copy.days[0].items.push(copy.days[0].items[0]);
          assert.equal(
            (await request(a, "/api/itineraries", "POST", copy)).status,
            400,
          );
        },
      );
      await t.test(
        "Chuyển điểm sang ngày khác, override chi phí, lưu và tải lại",
        async () => {
          const copy = structuredClone(body);
          copy.days[1].items = [copy.days[0].items.shift()];
          copy.days[1].items[0].customCostPerPersonVnd = 100000;
          const result = await request(
            a,
            `/api/itineraries/${trip._id}`,
            "PUT",
            copy,
          );
          assert.equal(result.status, 200);
          assert.equal(result.data.itinerary.budget.total, 200000);
          assert.equal(
            (await request(a, `/api/itineraries/${trip._id}`)).data.itinerary
              .days[1].items[0].visitTime,
            "09:30",
          );
        },
      );
      await t.test(
        "Xóa ngày có hoạt động cần xác nhận tại backend",
        async () => {
          const copy = { ...body, endDate: "2026-11-10", days: [body.days[0]] };
          assert.equal(
            (await request(a, `/api/itineraries/${trip._id}`, "PUT", copy))
              .status,
            409,
          );
          assert.equal(
            (
              await request(a, `/api/itineraries/${trip._id}`, "PUT", {
                ...copy,
                confirmDateRemoval: true,
              })
            ).status,
            200,
          );
        },
      );
      await t.test("Đăng nhập admin qua cùng API", async () => {
        const init = require("node:child_process").spawnSync(
          process.execPath,
          [require("node:path").join(__dirname, "../scripts/seedAdmin.js")],
          {
            env: {
              ...process.env,
              MONGO_URI: `${uri}/${databaseName}`,
              ADMIN_EMAIL: "admin@example.test",
              ADMIN_NAME: "Quản trị test",
              ADMIN_PASSWORD: password,
            },
            encoding: "utf8",
          },
        );
        assert.equal(init.status, 0, init.stderr);
        assert.equal(
          (await User.findOne({ email: "admin@example.test" })).role,
          "admin",
        );
        await request(admin, "/api/auth/csrf");
        assert.equal(
          (
            await request(admin, "/api/auth/login", "POST", {
              email: "admin@example.test",
              password,
            })
          ).status,
          200,
        );
        assert.equal((await request(admin, "/admin")).status, 200);
        assert.equal((await request(admin, "/api/admin/stats")).data.users, 3);
      });
      let created;
      await t.test(
        "Admin xem người dùng, thống kê sử dụng và không lộ thông tin xác thực",
        async () => {
          assert.equal((await request(b, "/api/admin/users")).status, 403);
          const owner = (await request(a, "/api/auth/me")).data.user;
          const result = (
            await request(admin, "/api/admin/users?role=user&limit=1")
          ).data;
          assert.equal(result.total, 2);
          assert.equal(result.pages, 2);
          const page2 = (
            await request(admin, "/api/admin/users?role=user&limit=1&page=2")
          ).data;
          assert.notEqual(result.items[0]._id, page2.items[0]._id);
          const profile = (
            await request(admin, `/api/admin/users/${owner._id}`)
          ).data;
          assert.equal(profile.user.itineraryCount, 1);
          assert.equal(profile.user.favoriteCount, 1);
          assert.equal(profile.recentItineraries[0]._id, trip._id);
          assert.ok(profile.user.lastLoginAt);
          assert.ok(!JSON.stringify(profile).includes("passwordHash"));
          assert.ok(!JSON.stringify(profile).includes("sessionVersion"));
          assert.equal(
            (await request(admin, "/api/admin/users?role=owner")).status,
            400,
          );
          assert.equal(
            (await request(admin, "/api/admin/users?status=bad")).status,
            400,
          );
          assert.equal(
            (await request(admin, "/api/admin/users/not-an-id")).status,
            400,
          );
          assert.equal(
            (
              await request(
                admin,
                `/api/admin/users/${new mongoose.Types.ObjectId()}`,
              )
            ).status,
            404,
          );
          assert.equal(
            (await request(admin, "/api/admin/users?q=%5B%2A%5D")).data.total,
            0,
          );
        },
      );
      await t.test(
        "Admin xem toàn bộ lịch trình, người tạo, ghi chú và ngân sách; bộ lọc không làm sai trạng thái",
        async () => {
          const owner = (await request(b, "/api/auth/me")).data.user;
          const today = require("../utils/adminData").todayInVietnam();
          const shift = (n) =>
            new Date(Date.parse(today) + n * 86400000)
              .toISOString()
              .slice(0, 10);
          const fixtures = await Itinerary.create(
            [4, 0, -1].map((n) => ({
              userId: owner._id,
              title: `Chuyến kiểm thử ${n}`,
              startDate: shift(n),
              endDate: shift(n),
              travelers: 3,
              budgetLimitVnd: 0,
              notes: "Ghi chú chuyến đi",
              days: [
                {
                  date: shift(n),
                  notes: "Ghi chú ngày",
                  items: [
                    {
                      destinationId: missing._id,
                      visitTime: "09:00",
                      note: "Ghi chú hoạt động",
                      customCostPerPersonVnd: 0,
                      order: 0,
                    },
                  ],
                },
              ],
            })),
          );
          try {
            assert.equal(
              (await request(b, "/api/admin/itineraries")).status,
              403,
            );
            assert.equal(
              (await request(admin, `/api/itineraries/${trip._id}`)).status,
              404,
            );
            const all = (await request(admin, "/api/admin/itineraries")).data;
            assert.equal(all.total, 4);
            for (const [n, status] of [
              [4, "upcoming"],
              [0, "ongoing"],
              [-1, "completed"],
            ]) {
              const filtered = (
                await request(
                  admin,
                  `/api/admin/itineraries?userId=${owner._id}&status=${status}&from=${shift(-20)}&to=${shift(20)}`,
                )
              ).data;
              assert.equal(filtered.total, 1);
              assert.equal(filtered.items[0].title, `Chuyến kiểm thử ${n}`);
              assert.equal(filtered.items[0].budget.total, 0);
              assert.equal(filtered.items[0].budget.missing, 0);
            }
            assert.equal(
              (
                await request(
                  admin,
                  `/api/admin/itineraries?status=upcoming&to=${shift(-1)}`,
                )
              ).data.total,
              0,
            );
            const one = (
              await request(
                admin,
                `/api/admin/itineraries?userId=${owner._id}&limit=1`,
              )
            ).data;
            const two = (
              await request(
                admin,
                `/api/admin/itineraries?userId=${owner._id}&limit=1&page=2`,
              )
            ).data;
            assert.equal(one.total, 3);
            assert.equal(one.pages, 3);
            assert.notEqual(one.items[0]._id, two.items[0]._id);
            assert.equal(
              (
                await request(
                  admin,
                  `/api/admin/itineraries?q=${encodeURIComponent(owner.email)}`,
                )
              ).data.total,
              3,
            );
            const detail = (
              await request(admin, `/api/admin/itineraries/${fixtures[0]._id}`)
            ).data.itinerary;
            assert.equal(detail.owner.email, owner.email);
            assert.equal(detail.notes, "Ghi chú chuyến đi");
            assert.equal(detail.days[0].notes, "Ghi chú ngày");
            assert.equal(detail.days[0].items[0].note, "Ghi chú hoạt động");
            assert.equal(
              detail.days[0].items[0].destinationId.name,
              missing.name,
            );
            assert.ok(!JSON.stringify(detail).includes("passwordHash"));
            assert.ok(!JSON.stringify(detail).includes("sessionVersion"));
            const original = (await request(a, `/api/itineraries/${trip._id}`))
              .data.itinerary;
            assert.deepEqual(
              (await request(admin, `/api/admin/itineraries/${trip._id}`)).data
                .itinerary.budget,
              original.budget,
            );
            for (const suffix of [
              "from=2026-02-30",
              "from=2026-12-01&to=2026-01-01",
              "sort=invalid",
              "status=invalid",
              "userId=invalid",
            ])
              assert.equal(
                (await request(admin, `/api/admin/itineraries?${suffix}`))
                  .status,
                400,
              );
            assert.equal(
              (await request(admin, "/api/admin/itineraries/not-an-id")).status,
              400,
            );
            assert.equal(
              (
                await request(
                  admin,
                  `/api/admin/itineraries/${new mongoose.Types.ObjectId()}`,
                )
              ).status,
              404,
            );
            const stats = (await request(admin, "/api/admin/stats")).data;
            assert.equal(stats.itineraries, 4);
            assert.equal(stats.upcoming + stats.ongoing + stats.completed, 4);
            assert.equal(stats.activity.length, 7);
            assert.equal(stats.today, today);
            assert.ok(stats.activity.at(-1).itineraries >= 3);
            assert.ok(
              stats.recentItineraries.some(
                (t) => t.owner.email === owner.email,
              ),
            );
            assert.ok(
              stats.popularDestinations.some(
                (d) => d._id === String(missing._id) && d.count >= 3,
              ),
            );
          } finally {
            await Itinerary.deleteMany({
              _id: { $in: fixtures.map((t) => t._id) },
            });
          }
        },
      );
      await t.test(
        "Khóa/mở khóa bảo toàn dữ liệu, thu hồi phiên và bảo vệ admin",
        async () => {
          const c = client();
          await request(c, "/api/auth/csrf");
          const registered = await request(c, "/api/auth/register", "POST", {
            email: "moderation@example.test",
            fullName: "Thành viên kiểm thử khóa",
            password,
            confirmPassword: password,
          });
          const id = registered.data.user._id;
          const ownTrip = (await request(c, "/api/itineraries", "POST", body))
            .data.itinerary;
          try {
            const adminSelf = (await request(admin, "/api/auth/me")).data.user;
            assert.equal(
              (
                await request(
                  admin,
                  `/api/admin/users/${adminSelf._id}/status`,
                  "PATCH",
                  { isActive: false, reason: "test" },
                )
              ).status,
              403,
            );
            assert.equal(
              (
                await request(c, `/api/admin/users/${id}/status`, "PATCH", {
                  isActive: false,
                  reason: "test",
                })
              ).status,
              403,
            );
            assert.equal(
              (
                await request(admin, `/api/admin/users/${id}/status`, "PATCH", {
                  isActive: "false",
                })
              ).status,
              400,
            );
            assert.equal(
              (
                await request(admin, `/api/admin/users/${id}/status`, "PATCH", {
                  isActive: false,
                  reason: "",
                })
              ).status,
              400,
            );
            const locked = await request(
              admin,
              `/api/admin/users/${id}/status`,
              "PATCH",
              { isActive: false, reason: "Kiểm thử trạng thái", role: "admin" },
            );
            assert.equal(locked.status, 200);
            assert.equal(locked.data.user.role, "user");
            assert.equal(locked.data.user.isActive, false);
            assert.equal(locked.data.user.lockReason, "Kiểm thử trạng thái");
            assert.ok(locked.data.user.lockedAt);
            assert.equal((await request(c, "/api/itineraries")).status, 403);
            assert.equal((await request(c, "/api/auth/me")).data.user, null);
            assert.equal(
              (
                await request(c, "/api/auth/login", "POST", {
                  email: "moderation@example.test",
                  password,
                })
              ).status,
              403,
            );
            assert.equal(
              (await request(admin, "/api/admin/users?status=locked")).data
                .total,
              1,
            );
            assert.equal(
              (await request(admin, "/api/admin/stats")).data.lockedUsers,
              1,
            );
            assert.equal(
              (await request(admin, `/api/admin/itineraries/${ownTrip._id}`))
                .status,
              200,
            );
            assert.equal(
              (
                await request(admin, `/api/admin/users/${id}/status`, "PATCH", {
                  isActive: true,
                })
              ).status,
              200,
            );
            assert.equal((await request(c, "/api/itineraries")).status, 401);
            assert.equal((await request(c, "/api/auth/me")).data.user, null);
            assert.equal(
              (
                await request(c, "/api/auth/login", "POST", {
                  email: "moderation@example.test",
                  password,
                })
              ).status,
              200,
            );
            assert.ok(
              (await request(c, "/api/itineraries")).data.items.some(
                (t) => t._id === ownTrip._id,
              ),
            );
            assert.equal(
              (await request(admin, "/api/admin/users?status=locked")).data
                .total,
              0,
            );
          } finally {
            await Itinerary.deleteMany({ userId: id });
            await User.deleteOne({ _id: id });
          }
        },
      );
      await t.test(
        "Admin tạo, sửa, xác thực dữ liệu và từ chối user thường",
        async () => {
          const data = {
            ...require("../data/destinations")[5],
            name: "Điểm kiểm thử",
            slug: undefined,
          };
          assert.equal(
            (await request(b, "/api/admin/destinations", "POST", data)).status,
            403,
          );
          assert.equal(
            (
              await request(admin, "/api/admin/destinations", "POST", {
                ...data,
                latitude: 999,
              })
            ).status,
            400,
          );
          const result = await request(
            admin,
            "/api/admin/destinations",
            "POST",
            data,
          );
          assert.equal(result.status, 201);
          created = result.data.destination;
          assert.equal(
            (
              await request(
                admin,
                `/api/admin/destinations/${created._id}`,
                "PUT",
                { ...created, name: "Địa điểm đã sửa" },
              )
            ).data.destination.name,
            "Địa điểm đã sửa",
          );
        },
      );
      await t.test(
        "Ẩn / khôi phục; public chỉ thấy active, lịch sử vẫn có điểm đã ẩn",
        async () => {
          assert.equal(
            (
              await request(
                admin,
                `/api/admin/destinations/${destination._id}`,
                "DELETE",
              )
            ).status,
            200,
          );
          assert.equal(
            (await request(anon, `/api/destinations/${destination._id}`))
              .status,
            404,
          );
          assert.ok(
            !(await request(anon, "/api/destinations")).data.items.some(
              (d) => d._id === String(destination._id),
            ),
          );
          const historical = (await request(a, `/api/itineraries/${trip._id}`))
            .data.itinerary;
          assert.equal(
            historical.days[0].items[0].destinationId.isActive,
            false,
          );
          const another = structuredClone(body);
          assert.equal(
            (await request(b, "/api/itineraries", "POST", another)).status,
            400,
          );
          assert.equal(
            (
              await request(
                admin,
                `/api/admin/destinations/${destination._id}/restore`,
                "PATCH",
              )
            ).status,
            200,
          );
          assert.equal(
            (await request(anon, `/api/destinations/${destination._id}`))
              .status,
            200,
          );
        },
      );
      await t.test("CSRF sai không thể xóa và logout hủy phiên", async () => {
        assert.equal(
          (
            await request(
              a,
              `/api/itineraries/${trip._id}`,
              "DELETE",
              undefined,
              "invalid",
            )
          ).status,
          403,
        );
        assert.equal(
          (await request(a, "/api/auth/logout", "POST")).status,
          200,
        );
        assert.equal((await request(a, "/api/auth/me")).data.user, null);
        assert.equal((await request(a, "/api/itineraries")).status, 401);
        await request(a, "/api/auth/csrf");
        assert.equal(
          (
            await request(a, "/api/auth/login", "POST", {
              email: "a@example.test",
              password,
            })
          ).status,
          200,
        );
      });
      await t.test(
        "Xóa yêu thích và lịch trình cập nhật dữ liệu thật",
        async () => {
          assert.equal(
            (await request(a, `/api/favorites/${destination._id}`, "DELETE"))
              .status,
            200,
          );
          assert.equal(await Favorite.countDocuments(), 0);
          assert.equal(
            (await request(a, `/api/itineraries/${trip._id}`, "DELETE")).status,
            200,
          );
          assert.equal(await Itinerary.countDocuments(), 0);
        },
      );
      await t.test(
        "JSON sai kiểu bị từ chối và token Unicode không gây lỗi server",
        async () => {
          assert.equal(
            (await request(b, "/api/favorites", "POST", [])).status,
            400,
          );
          assert.equal(
            (await request(b, "/api/favorites", "POST", {}, "á".repeat(64)))
              .status,
            403,
          );
        },
      );
      await t.test("Giới hạn thử đăng nhập trả 429", async () => {
        let limited = false;
        for (let i = 0; i < 31; i++) {
          const result = await request(b, "/api/auth/login", "POST", {
            email: "nobody@example.test",
            password: "short",
          });
          if (result.status === 429) {
            limited = true;
            break;
          }
        }
        assert.ok(limited);
      });
      await t.test("MongoDB ngắt kết nối trả 503 rõ ràng", async () => {
        await mongoose.disconnect();
        try {
          assert.equal((await request(b, "/api/destinations")).status, 503);
        } finally {
          await connect(`${uri}/${databaseName}`);
        }
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
      // Chỉ xóa database test vừa tạo; không đụng database travelmate của người dùng.
      assert.equal(mongoose.connection.name, databaseName);
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);
