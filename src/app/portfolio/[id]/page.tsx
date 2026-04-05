import { getPortfolioData } from "@/app/actions/portfolio-actions";
import { notFound } from "next/navigation";
import { PortfolioDetailClient } from "./PortfolioDetailClient";

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
  const data = await getPortfolioData(id);
  if (!data) return { title: "Project Not Found" };

  return {
    title: `${data.title} | Frank's Home Improvement`,
    description: `Completed project at ${data.address} — ${data.scope_items.slice(0, 3).join(", ")}`,
  };
}

export default async function PortfolioDetailPage({
  params,
}: PortfolioDetailPageProps) {
  const { id } = await params;
  const data = await getPortfolioData(id);

  if (!data) notFound();

  return <PortfolioDetailClient data={data} />;
}
