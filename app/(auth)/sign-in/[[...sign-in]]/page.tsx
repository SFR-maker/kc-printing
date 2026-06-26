import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-kc-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-kc-teal mb-4">
            <span className="text-xl font-black text-kc-coral">KC</span>
          </div>
          <h1 className="text-2xl font-black text-kc-dark">Welcome back</h1>
          <p className="text-kc-muted text-sm mt-1">Sign in to your KC Printing account</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
