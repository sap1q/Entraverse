import { Suspense } from "react";
import StorefrontRegisterForm from "@/components/features/storefront-auth/StorefrontRegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <StorefrontRegisterForm />
    </Suspense>
  );
}
