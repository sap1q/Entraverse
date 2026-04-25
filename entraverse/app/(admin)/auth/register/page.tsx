import { Suspense } from "react";
import StorefrontRegisterForm from "@/components/features/storefront-auth/StorefrontRegisterForm";

export default function AdminAuthRegisterPage() {
  return (
    <Suspense fallback={null}>
      <StorefrontRegisterForm />
    </Suspense>
  );
}
