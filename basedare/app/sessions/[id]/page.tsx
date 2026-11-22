import LocalEconomy from "@/components/local-economy/LocalEconomy";
export const metadata = {
  title: "Session | BaseDare",
  description:
    "Join the audience or request a guest role in a real local Session.",
};
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LocalEconomy session={(await params).id} />;
}
