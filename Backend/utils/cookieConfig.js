const ALLOWED_INSECURE_ENVS = new Set(["development", "test"]);
const nodeEnv = process.env.NODE_ENV;

if (nodeEnv !== "production" && !ALLOWED_INSECURE_ENVS.has(nodeEnv)) {
  throw new Error(
    `NODE_ENV must be explicitly set to "production", "development", or "test" (got: ${JSON.stringify(nodeEnv)}). Refusing to start with an unrecognized environment, since this controls whether the refresh-token cookie is issued with Secure.`,
  );
}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !ALLOWED_INSECURE_ENVS.has(nodeEnv),
  sameSite: "strict",
  path: "/api/auth",
};

module.exports = { REFRESH_COOKIE_OPTIONS };
