import { Suspense } from "react";
import BusinessWelcome from "@/components/BusinessWelcome";
import { businessWorkspaceRequested } from "@/lib/business-entry-policy";
import Workspace from "./Workspace";
export const metadata = {
  title: "Grow your business | BaseDare",
  description:
    "Attract real people, work with creators and help customers discover your business. Start with a short enquiry; no account needed.",
};
export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return businessWorkspaceRequested(query) ? (
    <Suspense
      fallback={
        <p className="bd-page-top p-6 text-white">Opening your workspace…</p>
      }
    >
      <Workspace />
    </Suspense>
  ) : (
    <BusinessWelcome
      city={typeof query.city === "string" ? query.city : null}
      source={
        typeof query.from === "string" && query.from === "home"
          ? "home-business"
          : "buyer-workspace"
      }
    />
  );
}
