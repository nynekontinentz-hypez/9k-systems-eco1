import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-neutral-bg1 px-4">
      <SignUp />
    </div>
  );
}
