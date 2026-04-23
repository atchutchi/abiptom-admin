import Image from "next/image";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  showLogo?: boolean;
};

export function AuthShell({
  title,
  description,
  children,
  showLogo = true,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#12100b_0%,#2a2113_42%,#fff3c2_100%)] px-4 py-10">
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-[rgb(245_184_0_/_25%)] blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-white/20 blur-3xl" />
      <div className="relative w-full max-w-md space-y-8 rounded-2xl border border-[rgb(245_184_0_/_25%)] bg-[#fffdf8] p-8 shadow-[0_30px_90px_rgb(18_16_11_/_24%)]">
        <div className="text-center">
          {showLogo ? (
            <Image
              src="/brand/abiptom-logo.png"
              alt="ABIPTOM"
              width={180}
              height={48}
              className="mx-auto mb-3 h-11 w-auto"
              priority
            />
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--brand-ink)]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--brand-muted)]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
