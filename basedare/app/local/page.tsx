import LocalEconomy from "@/components/local-economy/LocalEconomy";
export const metadata = {
  title: "Your local network | BaseDare",
  description: "Discover local people, places, opportunities and Sessions.",
};
export default async function LocalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  return (
    <LocalEconomy
      opportunity={
        typeof q.opportunity === "string"
          ? q.opportunity.slice(0, 100)
          : undefined
      }
      offerTo={
        typeof q.offerTo === "string" ? q.offerTo.slice(0, 100) : undefined
      }
    />
  );
}
