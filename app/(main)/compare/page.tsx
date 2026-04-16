import { Suspense } from "react";
import { CompareBanksPage } from "@/components/pages/compare-banks-page";

export default function CompareRoutePage() {
  return (
    <Suspense fallback={null}>
      <CompareBanksPage />
    </Suspense>
  );
}
