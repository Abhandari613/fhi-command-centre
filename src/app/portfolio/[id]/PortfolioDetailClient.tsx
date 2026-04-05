"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle,
  X,
} from "lucide-react";
import { BeforeAfterSlider } from "@/components/client-portal/BeforeAfterSlider";
import type { PortfolioDetail } from "@/app/actions/portfolio-actions";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
};

export function PortfolioDetailClient({ data }: { data: PortfolioDetail }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const hasBeforeAfter =
    data.before_photos.length > 0 && data.after_photos.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#ff6b00] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              variants={item}
              className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight"
            >
              {data.title}
            </motion.h1>

            <motion.div
              variants={item}
              className="flex items-center gap-4 mt-3 text-gray-400"
            >
              <span className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-4 h-4" />
                {data.address}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-4 h-4" />
                {new Date(data.completion_date).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-10"
        >
          {/* Before / After Section */}
          {hasBeforeAfter && (
            <motion.section variants={item}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                The Transformation
              </h2>
              <BeforeAfterSlider
                beforeImage={data.before_photos[0].url}
                afterImage={data.after_photos[0].url}
                className="rounded-xl shadow-lg"
              />
            </motion.section>
          )}

          {/* Photo Gallery */}
          {data.gallery_photos.length > 0 && (
            <motion.section variants={item}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Project Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.gallery_photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    whileHover={{ scale: 1.02 }}
                    className="aspect-square relative rounded-xl overflow-hidden shadow-sm cursor-pointer border border-gray-100 hover:shadow-md transition-shadow"
                    onClick={() => setLightboxUrl(photo.url)}
                  >
                    <Image
                      src={photo.url}
                      alt="Project photo"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Scope of Work */}
          {data.scope_items.length > 0 && (
            <motion.section variants={item}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Scope of Work
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <ul className="space-y-3">
                  {data.scope_items.map((task, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#ff6b00] shrink-0 mt-0.5" />
                      <span className="text-gray-700">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#ff6b00] to-[#e05e00] flex items-center justify-center shadow-sm">
              <span className="font-black text-white text-sm">F</span>
            </div>
            <span className="font-bold text-gray-900">
              Frank&apos;s Home Improvement
            </span>
          </div>
          <a
            href="mailto:frank@frankshomeimprovement.com"
            className="text-sm text-[#ff6b00] hover:underline"
          >
            Contact us for your next project
          </a>
        </div>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-6 right-6 p-2 text-white/50 hover:text-white z-50"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxUrl}
                alt="Full size"
                fill
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
