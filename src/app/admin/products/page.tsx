"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, X, Download, Upload, ChevronUp, ChevronDown,
  ImagePlus, Package, Check, ImageUp,
} from "lucide-react";
import type { Product } from "@/db/schema";
import { AdminShell } from "@/components/admin/AdminShell";
import { CATEGORIES, FRAME_SHAPES, FRAME_MATERIALS, LENS_TYPES, GENDERS, formatBDT, productPrice } from "@/lib/utils";

type FormState = {
  id?: string;
  name: string; slug: string; category: string; gender: string;
  frameShape: string; frameMaterial: string; lensType: string;
  price: string; discountPrice: string; stock: string;
  colors: string; shortDescription: string; description: string;
  images: string[]; specs: { key: string; value: string }[];
  metaTitle: string; metaDescription: string; keywords: string;
  featured: boolean; isNew: boolean; active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "", slug: "", category: "eyeglasses", gender: "unisex",
  frameShape: "rectangle", frameMaterial: "acetate", lensType: "clear",
  price: "", discountPrice: "", stock: "10",
  colors: "", shortDescription: "", description: "",
  images: [], specs: [{ key: "Frame Width", value: "" }],
  metaTitle: "", metaDescription: "", keywords: "",
  featured: false, isNew: true, active: true,
};

function toForm(p: Product): FormState {
  return {
    id: p.id, name: p.name, slug: p.slug, category: p.category, gender: p.gender,
    frameShape: p.frameShape, frameMaterial: p.frameMaterial, lensType: p.lensType,
    price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : "",
    stock: String(p.stock),
    colors: (p.colors || []).join(", "), shortDescription: p.shortDescription, description: p.description,
    images: [...(p.images || [])],
    specs: Object.entries(p.specs || {}).map(([key, value]) => ({ key, value })),
    metaTitle: p.metaTitle || "", metaDescription: p.metaDescription || "", keywords: p.keywords || "",
    featured: p.featured, isNew: p.isNew, active: p.active,
  };
}

function toBody(f: FormState) {
  return {
    name: f.name, slug: f.slug || f.name, category: f.category, gender: f.gender,
    frameShape: f.frameShape, frameMaterial: f.frameMaterial, lensType: f.lensType,
    price: Number(f.price), discountPrice: f.discountPrice ? Number(f.discountPrice) : null,
    stock: Number(f.stock) || 0,
    colors: f.colors.split(",").map((c) => c.trim()).filter(Boolean),
    shortDescription: f.shortDescription, description: f.description,
    images: f.images,
    specs: Object.fromEntries(f.specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value])),
    metaTitle: f.metaTitle || null, metaDescription: f.metaDescription || null, keywords: f.keywords || null,
    featured: f.featured, isNew: f.isNew, active: f.active,
  };
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#4da3ff] transition-colors placeholder:text-white/25";
const labelCls = "text-xs font-semibold text-white/50 mb-1.5 block";

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [imgUploading, setImgUploading] = useState(false);

  const load = useCallback(async (q = search, cat = catFilter) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ all: "1", limit: "60" });
      if (q) sp.set("search", q);
      if (cat) sp.set("category", cat);
      const res = await fetch(`/api/products?${sp}`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      const json = await res.json();
      setProducts(json.products || []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, router]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search, catFilter), 300);
  }, [search, catFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const toggleAll = () =>
    setSelected((s) => (s.size === products.length ? new Set() : new Set(products.map((p) => p.id))));
  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function save() {
    if (!editing || saving) return;
    if (!editing.name || !editing.price) { notify("Name and price are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(editing.id ? `/api/products/${editing.id}` : "/api/products", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBody(editing)),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      notify(editing.id ? "Product updated" : "Product created");
      setEditing(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    if (!confirm("Delete this product permanently?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    notify("Product deleted");
    load();
  }

  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    if (bulkBusy || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [...selected], ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      notify(`${action} applied to ${json.affected ?? json.imported ?? selected.size} product(s)`);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function exportCSV() {
    const rows = products.filter((p) => selected.size === 0 || selected.has(p.id));
    const header = ["name", "category", "gender", "price", "discountPrice", "stock", "frameShape", "frameMaterial", "lensType", "images", "shortDescription"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header.join(","), ...rows.map((p) =>
      [p.name, p.category, p.gender, p.price, p.discountPrice ?? "", p.stock, p.frameShape, p.frameMaterial, p.lensType, (p.images || []).join("|"), p.shortDescription].map(esc).join(",")
    )].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `shadesh-products-${Date.now()}.csv`;
    a.click();
    notify(`Exported ${rows.length} product(s)`);
  }

  async function importCSV(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { notify("CSV looks empty"); return; }
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const items = lines.slice(1).map((line) => {
      // naive but robust-enough quoted CSV split
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
      return obj;
    });
    const res = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", items }),
    });
    const json = await res.json();
    notify(res.ok ? `Imported ${json.imported} product(s)` : json.error || "Import failed");
    load();
  }

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setImgUploading(true);
    try {
      const dataUrls = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .map(fileToDataUrl)
      );
      setEditing((e) => (e ? { ...e, images: [...e.images, ...dataUrls] } : e));
    } finally {
      setImgUploading(false);
      if (imageFileRef.current) imageFileRef.current.value = "";
    }
  };

  return (
    <AdminShell title="Products" subtitle="Catalogue, pricing, imagery and SEO">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 flex-1 min-w-48 max-w-xs">
          <Search size={15} className="text-white/30 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/25" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm outline-none cursor-pointer [&>option]:bg-[#15151c]">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-colors">
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setEditing({ ...EMPTY_FORM })} className="btn-primary !py-2.5 !px-4 text-xs">
            <Plus size={14} /> New product
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass-dark rounded-2xl px-5 py-3 mb-4 flex flex-wrap items-center gap-2 text-sm">
            <b>{selected.size} selected</b>
            <span className="text-white/25 mx-1">·</span>
            {[10, -10, 20].map((pct) => (
              <button key={pct} onClick={() => bulk("price", { mode: "percent", value: pct })}
                className="text-xs font-semibold bg-white/8 hover:bg-white/15 rounded-full px-3 py-1.5 transition-colors">
                Price {pct > 0 ? "+" : ""}{pct}%
              </button>
            ))}
            {CATEGORIES.map((c) => (
              <button key={c.slug} onClick={() => bulk("category", { category: c.slug })}
                className="text-xs font-semibold bg-white/8 hover:bg-white/15 rounded-full px-3 py-1.5 transition-colors">
                → {c.name}
              </button>
            ))}
            <button onClick={() => { if (confirm(`Delete ${selected.size} product(s)?`)) bulk("delete"); }}
              className="ml-auto text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 transition-colors">
              <Trash2 size={13} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="glass-dark rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/35 border-b border-white/8">
                <th className="p-4 w-10">
                  <button onClick={toggleAll} className={`w-5 h-5 rounded-md border grid place-items-center transition-colors ${selected.size === products.length && products.length > 0 ? "bg-[#4da3ff] border-[#4da3ff]" : "border-white/25"}`}>
                    {selected.size === products.length && products.length > 0 && <Check size={12} />}
                  </button>
                </th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4 text-right">Sold</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-white/5"><td colSpan={8} className="p-3"><div className="skeleton-dark h-12 rounded-xl" /></td></tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="p-16 text-center text-white/35">
                  <Package size={28} className="mx-auto mb-3 opacity-40" /> No products found. Create your first one.
                </td></tr>
              )}
              {!loading && products.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="p-4">
                    <button onClick={() => toggle(p.id)} className={`w-5 h-5 rounded-md border grid place-items-center transition-colors ${selected.has(p.id) ? "bg-[#4da3ff] border-[#4da3ff]" : "border-white/25"}`}>
                      {selected.has(p.id) && <Check size={12} />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="relative w-11 h-11 rounded-xl overflow-hidden bg-white/8 shrink-0">
                        {p.images?.[0] && <Image src={p.images[0]} alt="" fill sizes="44px" className="object-cover" unoptimized={p.images[0].startsWith("http") || p.images[0].startsWith("data:")} />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate max-w-48">{p.name}</p>
                        <p className="text-[11px] text-white/35 truncate">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-white/55 whitespace-nowrap">{CATEGORIES.find((c) => c.slug === p.category)?.name || p.category}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <b>{formatBDT(productPrice(p))}</b>
                    {p.discountPrice && <s className="block text-[11px] text-white/30">{formatBDT(p.price)}</s>}
                  </td>
                  <td className={`p-4 text-right font-semibold ${p.stock === 0 ? "text-rose-400" : p.stock <= 5 ? "text-amber-300" : ""}`}>{p.stock}</td>
                  <td className="p-4 text-right text-white/55">{p.soldCount}</td>
                  <td className="p-4">
                    <div className="flex gap-1.5">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${p.active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/40"}`}>
                        {p.active ? "Live" : "Hidden"}
                      </span>
                      {p.featured && <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#4da3ff]/15 text-[#4da3ff]">Featured</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(toForm(p))} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => removeProduct(p.id)} className="p-2 rounded-xl hover:bg-rose-500/15 text-white/60 hover:text-rose-300 transition-colors" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor drawer */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl glass-dark p-6 md:p-8 safe-bottom overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="headline text-2xl">{editing.id ? "Edit product" : "New product"}</h2>
                <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className={labelCls}>Name *</label>
                  <input className={inputCls} value={editing.name} onChange={(e) => setF("name", e.target.value)} placeholder="Aurora Cat-Eye" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Slug (URL)</label>
                    <input className={inputCls} value={editing.slug} onChange={(e) => setF("slug", e.target.value)} placeholder="auto from name" />
                  </div>
                  <div>
                    <label className={labelCls}>Category *</label>
                    <select className={inputCls + " cursor-pointer [&>option]:bg-[#15151c]"} value={editing.category} onChange={(e) => setF("category", e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Price (৳) *</label>
                    <input className={inputCls} type="number" value={editing.price} onChange={(e) => setF("price", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Sale price</label>
                    <input className={inputCls} type="number" value={editing.discountPrice} onChange={(e) => setF("discountPrice", e.target.value)} placeholder="optional" />
                  </div>
                  <div>
                    <label className={labelCls}>Stock</label>
                    <input className={inputCls} type="number" value={editing.stock} onChange={(e) => setF("stock", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select className={inputCls + " cursor-pointer [&>option]:bg-[#15151c]"} value={editing.gender} onChange={(e) => setF("gender", e.target.value)}>
                      {GENDERS.map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Shape</label>
                    <select className={inputCls + " cursor-pointer [&>option]:bg-[#15151c]"} value={editing.frameShape} onChange={(e) => setF("frameShape", e.target.value)}>
                      {FRAME_SHAPES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Material</label>
                    <select className={inputCls + " cursor-pointer [&>option]:bg-[#15151c]"} value={editing.frameMaterial} onChange={(e) => setF("frameMaterial", e.target.value)}>
                      {FRAME_MATERIALS.map((m) => <option key={m} value={m} className="capitalize">{m === "tr90" ? "TR90" : m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Lens type</label>
                    <select className={inputCls + " cursor-pointer [&>option]:bg-[#15151c]"} value={editing.lensType} onChange={(e) => setF("lensType", e.target.value)}>
                      {LENS_TYPES.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Colours (comma separated)</label>
                    <input className={inputCls} value={editing.colors} onChange={(e) => setF("colors", e.target.value)} placeholder="black, tortoise" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Short description</label>
                  <input className={inputCls} value={editing.shortDescription} onChange={(e) => setF("shortDescription", e.target.value)} placeholder="One-liner shown on cards & top of page" />
                </div>
                <div>
                  <label className={labelCls}>Full description</label>
                  <textarea className={inputCls + " resize-none"} rows={4} value={editing.description} onChange={(e) => setF("description", e.target.value)} />
                </div>

                {/* Images */}
                <div>
                  <label className={labelCls}>Images (first = cover)</label>
                  <div className="grid gap-2">
                    {editing.images.map((img, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/8 shrink-0">
                          <Image src={img} alt="" fill sizes="40px" className="object-cover" unoptimized={img.startsWith("http") || img.startsWith("data:")} />
                        </span>
                        <input className={inputCls + " !py-2.5"} value={img}
                          onChange={(e) => { const next = [...editing.images]; next[i] = e.target.value; setF("images", next); }} />
                        <button type="button" aria-label="Move up" disabled={i === 0}
                          onClick={() => { const next = [...editing.images]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setF("images", next); }}
                          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronUp size={14} /></button>
                        <button type="button" aria-label="Move down" disabled={i === editing.images.length - 1}
                          onClick={() => { const next = [...editing.images]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; setF("images", next); }}
                          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronDown size={14} /></button>
                        <button type="button" aria-label="Remove"
                          onClick={() => setF("images", editing.images.filter((_, j) => j !== i))}
                          className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-300"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <input ref={imageFileRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => handleImageFiles(e.target.files)} />
                      <button type="button" disabled={imgUploading} onClick={() => imageFileRef.current?.click()}
                        className="flex items-center justify-center gap-2 border border-dashed border-white/20 rounded-2xl py-3 text-xs font-semibold text-white/50 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50">
                        <ImageUp size={14} /> {imgUploading ? "Uploading…" : "Upload from PC"}
                      </button>
                      <button type="button" onClick={() => setF("images", [...editing.images, ""])}
                        className="flex items-center justify-center gap-2 border border-dashed border-white/20 rounded-2xl py-3 text-xs font-semibold text-white/50 hover:text-white hover:border-white/40 transition-colors">
                        <ImagePlus size={14} /> Add image URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div>
                  <label className={labelCls}>Specifications (key → value)</label>
                  <div className="grid gap-2">
                    {editing.specs.map((spec, i) => (
                      <div key={i} className="flex gap-2">
                        <input className={inputCls + " !py-2.5"} placeholder="Frame width" value={spec.key}
                          onChange={(e) => { const next = [...editing.specs]; next[i] = { ...spec, key: e.target.value }; setF("specs", next); }} />
                        <input className={inputCls + " !py-2.5"} placeholder="138 mm" value={spec.value}
                          onChange={(e) => { const next = [...editing.specs]; next[i] = { ...spec, value: e.target.value }; setF("specs", next); }} />
                        <button type="button" aria-label="Remove spec" onClick={() => setF("specs", editing.specs.filter((_, j) => j !== i))}
                          className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-300"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setF("specs", [...editing.specs, { key: "", value: "" }])}
                      className="text-xs font-semibold text-[#4da3ff] hover:underline text-left">+ Add specification</button>
                  </div>
                </div>

                {/* SEO */}
                <div className="rounded-2xl border border-white/10 p-4 grid gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">SEO</p>
                  <input className={inputCls + " !py-2.5"} placeholder="Meta title" value={editing.metaTitle} onChange={(e) => setF("metaTitle", e.target.value)} />
                  <textarea className={inputCls + " !py-2.5 resize-none"} rows={2} placeholder="Meta description" value={editing.metaDescription} onChange={(e) => setF("metaDescription", e.target.value)} />
                  <input className={inputCls + " !py-2.5"} placeholder="Keywords, comma separated" value={editing.keywords} onChange={(e) => setF("keywords", e.target.value)} />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-2">
                  {([["featured", "Featured"], ["isNew", "New arrival"], ["active", "Live on store"]] as const).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setF(key, !editing[key])}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${editing[key] ? "bg-[#4da3ff] text-white" : "bg-white/8 text-white/50"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <button onClick={save} disabled={saving} className="btn-primary w-full !py-4 text-sm disabled:opacity-60 mt-2">
                  {saving ? "Saving…" : editing.id ? "Save changes" : "Create product"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] glass-dark rounded-full px-5 py-3 text-sm font-semibold flex items-center gap-2">
            <Check size={15} className="text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
