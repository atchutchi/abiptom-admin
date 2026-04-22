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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-white p-8 shadow-sm">
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
