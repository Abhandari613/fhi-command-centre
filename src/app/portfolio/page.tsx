import { getCompletedPortfolios } from "@/app/actions/portfolio-actions";
import { PortfolioGrid } from "./PortfolioGrid";

export const metadata = {
  title: "Our Work | Frank's Home Improvement",
  description:
    "Browse completed projects by Frank's Home Improvement — quality craftsmanship, every time.",
};

export default async function PortfolioIndexPage() {
  const projects = await getCompletedPortfolios();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-b from-[#ff6b00] to-[#e05e00] flex items-center justify-center shadow-md">
              <span className="font-black text-white text-lg">F</span>
            </div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Frank&apos;s Home Improvement
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Our Work
          </h1>
          <p className="text-lg text-gray-500 mt-2 max-w-lg">
            Quality craftsmanship, every project. Browse our completed work
            below.
          </p>
        </div>
      </header>

      {/* Portfolio Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              No completed projects to show yet.
            </p>
          </div>
        ) : (
          <PortfolioGrid projects={projects} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Frank&apos;s Home Improvement. All
            rights reserved.
          </p>
          <a
            href="mailto:frank@frankshomeimprovement.com"
            className="text-sm text-[#ff6b00] hover:underline mt-1 inline-block"
          >
            Get in touch for your next project
          </a>
        </div>
      </footer>
    </div>
  );
}
