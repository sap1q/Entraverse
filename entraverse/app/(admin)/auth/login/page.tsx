import { Suspense } from "react";
import LoginForm from "@/components/features/auth/LoginForm";

export default function AdminAuthLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
