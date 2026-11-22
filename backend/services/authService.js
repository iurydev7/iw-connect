import bcrypt from "bcrypt";
import { randomBytes, createHash } from "node:crypto";
import { Op } from "sequelize";
import { User, Session } from "../models/index.js";

export async function getSession(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const session = await Session.findOne({
    where: {
      tokenHash,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "role"],
        required: true,
      },
    ],
  });

  if (!session) return null;

  return {
    user: session.user.toJSON(),
    tokenHash,
  };
}

export async function login(email, password, remember = false) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    Buffer.byteLength(password) > 72
  ) {
    return null;
  }

  const user = await User.findOne({
    where: {
      email: email.trim().toLowerCase(),
    },
  });

  if (!user) {
    return null;
  }

  const validPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!validPassword) {
    return null;
  }

  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const maxAge = remember
    ? 7 * 24 * 60 * 60 * 1000
    : 12 * 60 * 60 * 1000;

  await Session.create({
    tokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + maxAge),
  });

  return {
    token,
    maxAge,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
export async function logout(token) {
  if (!token || typeof token !== "string") {
    return;
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  await Session.destroy({
    where: {
      tokenHash
    }
  });
}
