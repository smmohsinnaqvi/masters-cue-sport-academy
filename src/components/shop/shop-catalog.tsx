"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Check,
  Eye,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  createShopImageUploadAction,
  createShopProductAction,
  deleteShopProductAction,
  updateShopProductAction,
} from "@/actions/shop-actions";
import {
  SHOP_CATEGORIES,
  SHOP_IMAGE_BUCKET,
  SHOP_IMAGE_CONTENT_TYPES,
  SHOP_IMAGE_MAX_BYTES,
  type ShopCategory,
  type ShopProductView,
} from "@/constants/shop";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditorState = { product: ShopProductView | null } | null;

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  imagePath: "",
  category: "ACCESSORIES" as ShopCategory,
  price: "",
  discountPercent: "0",
};

const CATEGORY_LABELS = Object.fromEntries(
  SHOP_CATEGORIES.map(({ value, label }) => [value, label]),
) as Record<ShopCategory, string>;

function salePrice(price: number, discountPercent: number) {
  return Math.round((price * (100 - discountPercent)) / 100);
}

function formatRupees(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ShopCatalog({
  initialProducts,
  canManage,
  settingsView = false,
}: {
  initialProducts: ShopProductView[];
  canManage: boolean;
  settingsView?: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [activeCategory, setActiveCategory] = useState<ShopCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailsProduct, setDetailsProduct] = useState<ShopProductView | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ShopProductView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "ALL" || product.category === activeCategory;
      const matchesQuery =
        !query ||
        product.name.toLocaleLowerCase().includes(query) ||
        product.description.toLocaleLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, products, search]);

  function openCreate() {
    setNotice("");
    setPageError("");
    setEditor({ product: null });
  }

  function openEdit(product: ShopProductView) {
    setNotice("");
    setPageError("");
    setEditor({ product });
  }

  function handleSaved(product: ShopProductView, message?: string | null) {
    setProducts((current) => {
      const existing = current.some((item) => item.id === product.id);
      return existing
        ? current.map((item) => (item.id === product.id ? product : item))
        : [...current, product].sort(
            (first, second) =>
              SHOP_CATEGORIES.findIndex((category) => category.value === first.category) -
                SHOP_CATEGORIES.findIndex((category) => category.value === second.category) ||
              first.name.localeCompare(second.name),
          );
    });
    setEditor(null);
    setNotice(message || "Product saved.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setPageError("");
    setNotice("");
    try {
      const result = await deleteShopProductAction(pendingDelete.id);
      setProducts((current) => current.filter((product) => product.id !== pendingDelete.id));
      setPendingDelete(null);
      setNotice(result.cleanupWarning || "Product removed from the shop.");
    } catch (error) {
      setPageError(errorMessage(error, "Unable to delete this product. Please try again."));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-felt/20 bg-gradient-to-br from-surface via-surface to-felt/10 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-felt/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-felt">
              Masters Cue Sports Academy
            </p>
            {settingsView ? (
              <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">
                Cue-sports essentials
              </h2>
            ) : (
              <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">
                Cue-sports essentials
              </h1>
            )}
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Quality gear for the next frame, from the first chalk to the final pot.
            </p>
          </div>
          {canManage ? (
            <Button onClick={openCreate} className="min-h-12 w-full shrink-0 gap-2 sm:w-auto">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add product
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-felt" aria-hidden="true" />
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          )}
        </div>
      </section>

      {settingsView ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface/70 p-3 text-sm text-muted-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-felt" aria-hidden="true" />
          Product changes appear on the customer shop as soon as they are saved.
        </div>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-felt/25 bg-felt/10 px-3 py-2 text-sm text-felt"
        >
          {notice}
        </p>
      ) : null}
      {pageError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {pageError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label="Filter by category"
        >
          <Button
            type="button"
            variant={activeCategory === "ALL" ? "default" : "outline"}
            aria-pressed={activeCategory === "ALL"}
            onClick={() => setActiveCategory("ALL")}
            className="min-h-10 shrink-0 rounded-full px-4"
          >
            All gear
          </Button>
          {SHOP_CATEGORIES.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant={activeCategory === value ? "default" : "outline"}
              aria-pressed={activeCategory === value}
              onClick={() => setActiveCategory(value)}
              className="min-h-10 shrink-0 rounded-full px-4"
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="relative block w-full shrink-0 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search gear"
            aria-label="Search products"
            className="min-h-11 rounded-full pl-9"
          />
        </label>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-5 py-14 text-center">
          <p className="text-base font-semibold">
            {products.length === 0 ? "The shop is getting ready" : "No matching gear"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length === 0
              ? canManage
                ? "Add the first product to start your shop."
                : "Check back soon for cue-sports essentials."
              : "Try another search or choose a different category."}
          </p>
          {canManage && products.length === 0 ? (
            <Button onClick={openCreate} className="mt-5 min-h-11 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add first product
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const discounted = product.discountPercent > 0;
            const currentPrice = salePrice(product.price, product.discountPercent);
            return (
              <Card
                key={product.id}
                className="group overflow-hidden rounded-2xl border-border/80 bg-surface transition-colors hover:border-felt/40"
              >
                <div className="relative aspect-square overflow-hidden bg-background/70">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    unoptimized
                    sizes="(min-width: 1280px) 240px, (min-width: 640px) 33vw, 48vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-background/90 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm sm:left-3 sm:top-3 sm:text-xs">
                    {CATEGORY_LABELS[product.category]}
                  </span>
                  {discounted ? (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-felt px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm sm:right-3 sm:top-3 sm:text-xs">
                      <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                      {product.discountPercent}% off
                    </span>
                  ) : null}
                  {canManage ? (
                    <div className="absolute bottom-2 right-2 flex gap-1.5 sm:bottom-3 sm:right-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-border/80 bg-background/95 shadow-sm"
                        onClick={() => openEdit(product)}
                        aria-label={`Edit ${product.name}`}
                      >
                        <PencilLine className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-border/80 bg-background/95 text-destructive shadow-sm hover:text-destructive"
                        onClick={() => setPendingDelete(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex min-h-[10.25rem] flex-col p-3 sm:min-h-[11rem] sm:p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
                    {product.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">
                    {product.description}
                  </p>
                  <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-3">
                    <span className="text-base font-bold text-felt sm:text-lg">
                      {formatRupees(currentPrice)}
                    </span>
                    {discounted ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatRupees(product.price)}
                        </span>
                        <span className="w-full text-[10px] font-medium text-felt sm:text-xs">
                          You save {formatRupees(product.price - currentPrice)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDetailsProduct(product)}
                    aria-haspopup="dialog"
                    aria-label={`View details for ${product.name}`}
                    className="mt-2 min-h-10 justify-start gap-2 px-2 text-felt hover:text-felt"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    View details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ArrowUpRight className="h-3.5 w-3.5 text-felt" aria-hidden="true" />
        Visit the academy to see or try any item in person.
      </p>

      <Dialog
        open={detailsProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsProduct(null);
        }}
      >
        {detailsProduct ? (
          <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100vh-4rem)] sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl sm:text-2xl">{detailsProduct.name}</DialogTitle>
              <DialogDescription>Complete product details</DialogDescription>
            </DialogHeader>
            <div className="relative h-56 w-full overflow-hidden rounded-xl bg-background/70 sm:h-80">
              <Image
                src={detailsProduct.imageUrl}
                alt={detailsProduct.name}
                fill
                unoptimized
                sizes="(min-width: 640px) 672px, 100vw"
                className="object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-semibold">
                {CATEGORY_LABELS[detailsProduct.category]}
              </span>
              {detailsProduct.discountPercent > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-felt/15 px-3 py-1 text-xs font-semibold text-felt">
                  <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                  {detailsProduct.discountPercent}% off
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {detailsProduct.description}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-4">
              <span className="text-xl font-bold text-felt">
                {formatRupees(salePrice(detailsProduct.price, detailsProduct.discountPercent))}
              </span>
              {detailsProduct.discountPercent > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatRupees(detailsProduct.price)}
                  </span>
                  <span className="w-full text-sm font-medium text-felt">
                    You save{" "}
                    {formatRupees(
                      detailsProduct.price -
                        salePrice(detailsProduct.price, detailsProduct.discountPercent),
                    )}
                  </span>
                </>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      {editor ? (
        <ShopProductDialog
          key={editor.product?.id ?? "new-product"}
          product={editor.product}
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will be removed from the shop and its product image deleted. This cannot be undone.`
                : "This product will be removed from the shop."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep product</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              loading={deleting}
              loadingText="Removing…"
            >
              Remove product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ShopProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  product: ShopProductView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: ShopProductView, message?: string | null) => void;
}) {
  const [name, setName] = useState(product?.name ?? EMPTY_PRODUCT.name);
  const [description, setDescription] = useState(product?.description ?? EMPTY_PRODUCT.description);
  const [category, setCategory] = useState<ShopCategory>(
    product?.category ?? EMPTY_PRODUCT.category,
  );
  const [price, setPrice] = useState(product ? String(product.price) : EMPTY_PRODUCT.price);
  const [discountPercent, setDiscountPercent] = useState(
    product ? String(product.discountPercent) : EMPTY_PRODUCT.discountPercent,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(product?.imageUrl ?? "");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile, product?.imageUrl]);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      let imagePath = product?.imagePath ?? "";
      if (imageFile) {
        const upload = await createShopImageUploadAction({
          contentType: imageFile.type,
          size: imageFile.size,
        });
        const { error: uploadError } = await supabase.storage
          .from(SHOP_IMAGE_BUCKET)
          .uploadToSignedUrl(upload.path, upload.token, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        imagePath = upload.path;
      }
      if (!imagePath) throw new Error("Add a product image before saving.");

      const input = {
        name,
        description,
        imagePath,
        category,
        price: Number(price),
        discountPercent: Number(discountPercent),
      };
      const saved = product
        ? await updateShopProductAction(product.id, input)
        : await createShopProductAction(input);
      const cleanupWarning =
        "cleanupWarning" in saved && typeof saved.cleanupWarning === "string"
          ? saved.cleanupWarning
          : null;
      onSaved(saved, cleanupWarning);
    } catch (reason) {
      setError(errorMessage(reason, "Unable to save this product. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100svh-1.5rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100vh-4rem)] sm:w-full sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-xl sm:text-2xl">
            {product ? "Edit product" : "Add a product"}
          </DialogTitle>
          <DialogDescription>
            Add clear product details so customers can compare gear at a glance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submitProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="space-y-2">
              <Label htmlFor="shop-product-name">Product name</Label>
              <Input
                id="shop-product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Tournament cue"
                required
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-product-category">Category</Label>
              <select
                id="shop-product-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ShopCategory)}
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SHOP_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shop-product-description">Description</Label>
            <Textarea
              id="shop-product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Describe the feel, fit, or use of this item."
              required
              className="min-h-24 resize-y"
            />
            <p className="text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shop-product-price">Price (₹)</Label>
              <Input
                id="shop-product-price"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-product-discount">Discount (%)</Label>
              <Input
                id="shop-product-discount"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="1"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                required
                className="min-h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shop-product-image">
              Product image{" "}
              <span className="text-muted-foreground">(JPEG, PNG, WebP, AVIF · 3 MB max)</span>
            </Label>
            <label
              htmlFor="shop-product-image"
              className={cn(
                "flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border bg-background/60 p-3 transition-colors hover:border-felt/50",
                previewUrl && "min-h-24",
              )}
            >
              {previewUrl ? (
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                  <Image
                    src={previewUrl}
                    alt={
                      imageFile
                        ? "Selected product image preview"
                        : (product?.name ?? "Product image")
                    }
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-felt/10 text-felt">
                  <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {imageFile
                    ? imageFile.name
                    : product
                      ? "Change product photo"
                      : "Choose a product photo"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {imageFile
                    ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB · tap to choose another`
                    : "Use a bright, clear image that fits the product card."}
                </span>
              </span>
              <Input
                id="shop-product-image"
                type="file"
                accept={SHOP_IMAGE_CONTENT_TYPES.join(",")}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPreviewError("");
                  setError("");
                  if (!file) return;
                  if (
                    !SHOP_IMAGE_CONTENT_TYPES.includes(
                      file.type as (typeof SHOP_IMAGE_CONTENT_TYPES)[number],
                    )
                  ) {
                    setPreviewError("Choose a JPEG, PNG, WebP, or AVIF image.");
                    event.target.value = "";
                    return;
                  }
                  if (file.size <= 0 || file.size > SHOP_IMAGE_MAX_BYTES) {
                    setPreviewError("Choose an image smaller than 3 MB.");
                    event.target.value = "";
                    return;
                  }
                  setImageFile(file);
                  event.target.value = "";
                }}
              />
              {product && !imageFile ? (
                <span className="sr-only">Current image: {product.name}</span>
              ) : null}
            </label>
            {previewError ? (
              <p role="alert" className="text-sm text-destructive">
                {previewError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="min-h-11"
            >
              <X className="h-4 w-4 sm:hidden" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              loadingText="Saving product…"
              className="min-h-11"
            >
              {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
