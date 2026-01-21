import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from '@/lib/utils/prisma'
import { verifyPassword } from "@/lib/utils/password";
import type { Session, User } from "next-auth";

type SessionStrategy = "jwt" | "database";

export const authOptions = {
  // adapter: PrismaAdapter(prisma),

  session: {
    strategy: "database" as SessionStrategy,
  },

  providers: [],
  // providers: [
  //   CredentialsProvider({
  //     name: "Credentials",
  //     credentials: {
  //       email: { label: "Email", type: "email" },
  //       password: { label: "Password", type: "password" },
  //     },
  //     async authorize(credentials) {
  //       console.log("Credentials received:", credentials);
  //       if (!credentials?.email || !credentials.password) {
  //           console.log("Missing email or password");
  //           return null;
  //       };

  //       const user = await prisma.user.findUnique({
  //         where: { email: credentials.email },
  //       });

  //       if (!user) {
  //           console.log("User not found");
  //           return null;
  //       }

  //       const isValid = await verifyPassword(credentials.password, user.password!);

  //       if (!isValid) {
  //           console.log("Invalid password for user:", user.email);
  //           return null;
  //       }
        
  //       console.log("User authorized:", user.email);
  //       return { id: user.id, email: user.email, name: user.name };
  //     },
  //   }),
  //   GoogleProvider({
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   }),
  // ],

  callbacks: {
    session({ session, user }: { session: Session; user: User }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
