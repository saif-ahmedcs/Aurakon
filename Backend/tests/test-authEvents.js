process.env.TZ = "UTC";
require("dotenv").config();

const Module = require("module");
const originalRequire = Module.prototype.require;
const sentEmails = [];

Module.prototype.require = function (id) {
  if (
    id === "../services/emailService" ||
    id.endsWith("services/emailService")
  ) {
    return {
      sendEmail: (args) => {
        sentEmails.push(args);
        return Promise.resolve(null);
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

const authEvents = require("../events/authEvents");
Module.prototype.require = originalRequire;

let pass = 0,
  fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? "PASS" : "FAIL") + " - " + name);
  if (ok) pass++;
  else fail++;
}

const originalLog = console.log;
let lastLog = "";
console.log = (msg) => {
  lastLog = msg;
};

authEvents.emit("USER_REGISTERED", {
  email: "a@test.com",
  rawToken: "secret123",
});
console.log = originalLog;

check("log excludes token", lastLog.includes("secret123"), false);
check(
  "log has event type + email",
  lastLog,
  "[USER_REGISTERED] recipient=a@test.com",
);
check("sendEmail called with recipient", sentEmails[0].to, "a@test.com");
check(
  "sendEmail html contains token in link",
  sentEmails[0].html.includes("secret123"),
  true,
);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
