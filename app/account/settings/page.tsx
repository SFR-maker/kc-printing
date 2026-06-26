import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Account Settings</h1>
      <UserProfile />
    </div>
  );
}
