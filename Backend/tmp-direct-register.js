process.env.TZ = "UTC";
const fs = require("fs");
for (const line of fs.readFileSync("D:/Aurakon/Backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_]+)=(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

console.log("boot: requiring authService...");
const authService = require("./services/authService");
console.log("boot: authService loaded");

(async () => {
  try {
    const user = await authService.register(
      "direct2-warrior@aurakon.test",
      "Password123",
      "directtester2",
      "male"
    );
    console.log("REGISTER RETURNED:", JSON.stringify({ id: user.id, email: user.email }));
  } catch (e) {
    console.error("REG ERR:", e.message);
  } finally {
    setTimeout(() => process.exit(0), 10000);
  }
})();
