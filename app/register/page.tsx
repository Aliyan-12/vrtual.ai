import RegisterForm from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account · vrtual.ai",
  description: "Register for your account",
};

export default function RegisterPage() {
  return <RegisterForm />
}
