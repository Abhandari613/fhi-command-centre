"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { PortfolioProject } from "@/app/actions/portfolio-actions";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
};

export function PortfolioGrid({
  projects,
}: {
  projects: PortfolioProject[];
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={item}>
          <Link href={`/portfolio/${project.id}`}>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group cursor-pointer">
              {/* Hero Image */}
              <div className="aspect-[4/3] relative bg-gray-100">
                {project.hero_photo ? (
                  <Image
                    src={project.hero_photo}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl font-black text-gray-300">
                        F
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#ff6b00] transition-colors">
                  {project.title}
                </h3>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.completion_date).toLocaleDateString(
                      "en-US",
                      { month: "short", year: "numeric" },
                    )}
                  </span>
                </div>

                {project.scope_summary.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.scope_summary.map((task, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                      >
                        {task}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
