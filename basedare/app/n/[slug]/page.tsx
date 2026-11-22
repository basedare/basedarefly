import { notFound } from "next/navigation";
import LocalEconomy from "@/components/local-economy/LocalEconomy";
import { readEconomy } from "@/lib/local-economy-server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Local Node | BaseDare" };
export default async function NodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await readEconomy(null, { node: slug });
  if (!snapshot.nodes.length) notFound();
  return <LocalEconomy node={slug} />;
}
