const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const { UnauthorizedError } = require("../utils/AppErrors");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenUtils");

const REUSE_GRACE_WINDOW_MS = 5_000;

// ------------- REFRESH --------------
async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new UnauthorizedError("missing refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  let reusedUserId = null;
  let expiredTokenHash = null;

  try {
    return await runInTransaction(async (tx) => {
      const stored = await refreshTokenModel.findByTokenHashForUpdate(
        tokenHash,
        tx,
      );

      if (!stored) {
        throw new UnauthorizedError("invalid refresh token");
      }

      if (stored.used_at) {
        const msSinceUsed = Date.now() - new Date(stored.used_at).getTime();
        if (msSinceUsed <= REUSE_GRACE_WINDOW_MS) {
          throw new UnauthorizedError("token_already_used");
        }
        reusedUserId = stored.user_id;
        throw new UnauthorizedError("invalid refresh token");
      }

      if (new Date(stored.expires_at) <= new Date()) {
        expiredTokenHash = tokenHash;
        throw new UnauthorizedError("refresh token expired");
      }

      const user = await userModel.findById(stored.user_id, tx);

      if (!user) {
        throw new UnauthorizedError("user not found");
      }

      const accessToken = generateAccessToken(user);

      const { rawRefreshToken: newRawRefreshToken, refreshTokenHash } =
        generateRefreshToken();

      await refreshTokenModel.markUsed(stored.id, tx);
      const newTokenId = await refreshTokenModel.insert(
        stored.user_id,
        refreshTokenHash,
        stored.expires_at,
        tx,
      );
      await refreshTokenModel.setRotatedTo(stored.id, newTokenId, tx);

      return {
        accessToken,
        rawRefreshToken: newRawRefreshToken,
        refreshTokenExpiresAt: stored.expires_at,
      };
    });
  } catch (err) {
    if (reusedUserId !== null) {
      await refreshTokenModel.deleteAllByUserId(reusedUserId);
    } else if (expiredTokenHash !== null) {
      await refreshTokenModel.deleteByTokenHash(expiredTokenHash);
    }
    throw err;
  }
}

// ------------- LOGOUT --------------
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);

  await runInTransaction(async (tx) => {
    const idsToDelete = [];
    let current = await refreshTokenModel.findByTokenHashForUpdate(
      tokenHash,
      tx,
    );

    while (current) {
      idsToDelete.push(current.id);
      if (!current.rotated_to_id) break;
      current = await refreshTokenModel.findByIdForUpdate(
        current.rotated_to_id,
        tx,
      );
    }

    if (idsToDelete.length > 0) {
      await refreshTokenModel.deleteByIds(idsToDelete, tx);
    }
  });
}

// ------------- LOGOUT ALL --------------
async function logoutAll(userId) {
  await refreshTokenModel.deleteAllByUserId(userId);
}

module.exports = {
  refresh,
  logout,
  logoutAll,
};
