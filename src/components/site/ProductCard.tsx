"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Product } from "@/db/schema";
import { discountPercent, formatBDT, productPrice, CATEGORY_LABELS } from "@/lib/utils";
import { Stars } from "./Reveal";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const pct = discountPercent(product.price, product.discountPrice);
  const img = product.images?.[0] || "/images/products/vertex.jpg";
  const imgIsRaw = img.startsWith("http") || img.startsWith("data:");

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block relative rounded-[1.75rem] overflow-hidden bg-white/70 border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)] transition-shadow duration-500"
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[#ececef]">
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            unoptimized={imgIsRaw}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="glass-chip text-[10px] font-semibold tracking-wide uppercase text-[#1d1d1f] bg-white/70 rounded-full px-2.5 py-1 border-white/70">
                New
              </span>
            )}
            {pct > 0 && (
              <span className="text-[10px] font-bold tracking-wide text-white bg-gradient-to-r from-rose-500 to-orange-500 rounded-full px-2.5 py-1 shadow-lg shadow-rose-500/30">
                -{pct}%
              </span>
            )}
          </div>
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#1d1d1f] bg-white rounded-full px-4 py-2 shadow-lg">Out of Stock</span>
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-white/85 backdrop-blur rounded-full px-2.5 py-1">
              <Flame size={11} /> Only {product.stock} left
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 md:p-5">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#86868b]">
            {CATEGORY_LABELS[product.category] || product.category} · {product.gender}
          </p>
          <h3 className="mt-1 font-semibold text-[15px] md:text-base leading-snug text-[#1d1d1f] line-clamp-1">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars rating={product.rating} />
            <span className="text-[11px] text-[#86868b]">
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
          <div className="mt-2.5 flex items-end justify-between gap-1">
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#1d1d1f]">{formatBDT(productPrice(product))}</span>
              {pct > 0 && (
                <span className="ml-1.5 text-xs sm:text-sm text-[#86868b] line-through">{formatBDT(product.price)}</span>
              )}
            </div>
            {product.soldCount > 30 && (
              <span className="hidden sm:block text-[10px] font-medium text-[#86868b] shrink-0">{product.soldCount}+ sold</span>
            )}
          </div>
          <div className="hidden md:block mt-3 h-9 overflow-hidden">
            <div className="btn-primary !py-2 !px-4 text-xs w-full opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400">
              Order Now — COD
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
