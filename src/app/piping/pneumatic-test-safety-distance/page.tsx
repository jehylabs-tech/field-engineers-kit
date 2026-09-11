import { redirect } from "next/navigation";

export default function LegacyPneumaticSafetyPage() {
  redirect("/calculator/pneumatic-test-safety-distance");
}
