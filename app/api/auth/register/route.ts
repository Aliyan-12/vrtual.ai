// import { prisma } from "@/lib/utils/prisma";
import { hashPassword } from "@/lib/utils/password";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return new Response("Missing fields", { status: 400 });
  }

  // const existingUser = await prisma.user.findUnique({
  //   where: { email },
  // });
  const existingUser = null;

  if (existingUser) {
    return new Response("User already exists", { status: 409 });
  }

  const hashedPassword = await hashPassword(password);

  // await prisma.user.create({
  //   data: {
  //     name: name,
  //     email: email,
  //     password: hashedPassword,
  //   },
  // });

  return Response.json({ success: true, message: "User registered." });
}
