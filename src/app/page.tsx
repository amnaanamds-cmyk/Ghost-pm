import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <SignInButton />
    </main>
  );
}
