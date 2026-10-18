require("dotenv").config({ quiet: true });
const connectDatabase = require("./config/database");
const createApp = require("./app");
async function start() {
  await connectDatabase();
  await Promise.all(
    ["User", "Destination", "Favorite", "Itinerary"].map((name) =>
      require(`./models/${name}`).init(),
    ),
  );
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () =>
    console.log(`TravelMate đang chạy tại http://localhost:${port}`),
  );
  server.on("error", (error) => {
    console.error("Không thể mở cổng:", error.message);
    process.exit(1);
  });
  const stop = () =>
    server.close(async () => {
      await require("mongoose").disconnect();
      process.exit(0);
    });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
start().catch((error) => {
  console.error(
    "Không thể khởi động:",
    error.message,
    "\nKiểm tra .env và MongoDB Server.",
  );
  process.exit(1);
});
