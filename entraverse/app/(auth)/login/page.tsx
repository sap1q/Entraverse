import { Suspense } from "react";
import StorefrontLoginForm from "@/components/features/storefront-auth/StorefrontLoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <StorefrontLoginForm />
    </Suspense>
  );
}
