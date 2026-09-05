"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn } from "lucide-react";

const isRaw = (src: string) => src.startsWith("http") || src.startsWith("data:");

export function Gallery({ images, name, badge }: { images: string[]; name: string; badge?: string }) {
  const imgs = images.length ? images : ["/images/products/vertex.jpg"];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-[72px_1fr]">
      {/* Thumbnails */}
      <div className="order-2 lg:order-1 flex lg:flex-col gap-2.5 overflow-x-auto no-scrollbar">
        {imgs.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            className={`relative shrink-0 w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-2xl overflow-hidden transition-all ${
              active === i ? "ring-2 ring-[#0071e3] ring-offset-2 ring-offset-[#f5f5f7]" : "opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={src} alt={`${name} view ${i + 1}`} fill sizes="72px" className="object-cover" unoptimized={isRaw(src)} />
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="order-1 lg:order-2">
        <div
          className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-white cursor-zoom-in group"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={imgs[active]}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover transition-transform duration-200 ${zoom ? "scale-[1.9]" : ""}`}
                style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                unoptimized={isRaw(imgs[active])}
              />
            </motion.div>
          </AnimatePresence>
          {badge && (
            <span className="absolute top-4 left-4 glass-chip text-[#1d1d1f] bg-white/75 text-xs font-semibold rounded-full px-3 py-1.5">
              {badge}
            </span>
          )}
          <span className="absolute bottom-4 right-4 glass-chip bg-white/75 text-[#1d1d1f] text-[11px] font-medium rounded-full px-3 py-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={12} /> Hover to zoom
          </span>
        </div>
      </div>
    </div>
  );
}
