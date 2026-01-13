import { PrismaClient } from "@/lib/prisma/generated/prisma/client";
import { withAccelerate } from '@prisma/extension-accelerate'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma =
    global.prisma || 
    new PrismaClient({
        adapter: adapter,
        log: ["query", "error"],
        // accelerateUrl: process.env.ACCELERATE_DATABASE_URL
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}
