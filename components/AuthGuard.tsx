"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === "/login") {
      setIsChecking(false);
      return;
    }

    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
      router.push("/login");
      setIsChecking(false);
    } else {
      setIsChecking(false);
    }
  }, [pathname, router]);

  // Show nothing while checking authentication
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
