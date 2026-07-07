function isPasswordValid(password) {
  if (typeof password !== "string") return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

module.exports = { isPasswordValid };
