import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-neutral-bg1 px-4">
      <SignIn />
    </div>
  );
}
