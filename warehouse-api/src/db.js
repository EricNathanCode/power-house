/* One Prisma client for the whole API (it keeps a small pool of database connections). */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = { prisma };
