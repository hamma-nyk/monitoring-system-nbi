import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Agar tidak terjadi memory leak (terlalu banyak koneksi) di mode development Next.js
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Fungsi khusus untuk Prisma v7 (Menggunakan driver PG Node.js)
const createPrismaClient = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter, log: ["error"] });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
