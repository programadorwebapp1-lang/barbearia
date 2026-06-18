"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Clock, Copy, MapPin, QrCode, RefreshCw, ShoppingBag, Scissors, Sparkles } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { BarberIcon } from "@/components/app-icons";
import { Button, Card, Empty, Input, Modal, PageHeader, Skeleton, StatCard } from "@/components/system-ui";
import { fireSwal } from "@/lib/swal";

type AnyRecord = Record<string, any>;

const PAGE_SIZE = 9;

const navItems = [
  { id: "dashboard", label: "Início", icon: Calendar },
  { id: "book", label: "Agendar", icon: Scissors },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "appointments", label: "Agendamentos", icon: Clock },
  { id: "address", label: "Endereço", icon: MapPin },
  { id: "doctors", label: "Barbeiros", icon: Scissors },
];

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resolveShortDescription(text?: string) {
  if (!text) return "Produto disponível para compra.";
  return text.length > 90 ? `${text.slice(0, 90).trim()}...` : text;
}

export default function ClienteProdutosPage() {
  const router = useRouter();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [selectedProduct, setSelectedProduct] = useState<AnyRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentInfo, setPaymentInfo] = useState<AnyRecord | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadData(nextPage = page) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(PAGE_SIZE),
    });
    const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const json = await response.json().catch(() => ({}));
    setData(json);
    setMeta(json.meta || { page: nextPage, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    setPage(nextPage);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const products = useMemo(() => (data?.products || []).filter((item: AnyRecord) => item.status !== "inactive"), [data]);

  async function openPurchase(product: AnyRecord) {
    const result = await fireSwal({
      icon: "question",
      title: "Comprar produto?",
      text: `Deseja continuar com ${product.name}?`,
      showCancelButton: true,
      confirmButtonText: "Sim, continuar",
      cancelButtonText: "Agora não",
    });
    if (!result.isConfirmed) return;
    setSelectedProduct(product);
    setQuantity(1);
    setPaymentInfo(null);
  }

  async function createPixPayment() {
    if (!selectedProduct) return;
    if (quantity < 1) {
      await fireSwal({ icon: "error", title: "Quantidade inválida", text: "Informe uma quantidade válida." });
      return;
    }
    if (quantity > Number(selectedProduct.stock || 0)) {
      await fireSwal({ icon: "error", title: "Estoque insuficiente", text: "A quantidade escolhida ultrapassa o estoque." });
      return;
    }

    setBusy(true);
    try {
      const orderResponse = await fetch("/api/product-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct._id, quantity }),
      });
      const orderJson = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        throw new Error(orderJson.error || "Não foi possível criar o pedido.");
      }

      const paymentResponse = await fetch("/api/payments/mercadopago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderJson.order._id }),
      });
      const paymentJson = await paymentResponse.json().catch(() => ({}));
      if (!paymentResponse.ok) {
        throw new Error(paymentJson.error || "Não foi possível gerar o Pix.");
      }

      setPaymentInfo({
        ...paymentJson,
        totalAmount: orderJson.order.totalAmount,
        orderId: orderJson.order._id,
      });

      await fireSwal({
        icon: "success",
        title: "Pix gerado",
        text: "O pedido foi criado e o código Pix está disponível para pagamento.",
      });
    } catch (error) {
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: error instanceof Error ? error.message : "Não foi possível concluir a compra.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyPixCode() {
    if (!paymentInfo?.pixCopyPaste) return;
    await navigator.clipboard.writeText(paymentInfo.pixCopyPaste);
    await fireSwal({ icon: "success", title: "Copiado", text: "Código Pix copiado para a área de transferência." });
  }

  const totalSelected = Number(selectedProduct?.price || 0) * quantity;

  return (
    <RoleShell
      userName={data?.user?.name || "Cliente"}
      roleLabel="Cliente"
      navItems={navItems}
      active="products"
      onNavigate={(id) => {
        if (id === "dashboard") router.push("/cliente");
        if (id === "book") router.push("/cliente?tab=book");
        if (id === "appointments") router.push("/cliente?tab=appointments");
        if (id === "address") {
          window.open("https://maps.app.goo.gl/aBFog7BSRxvbQS4k7", "_blank", "noopener,noreferrer");
          return;
        }
        if (id === "doctors") router.push("/cliente/medicos");
        if (id === "products") router.push("/cliente/produtos");
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden flex flex-col">
                <Skeleton className="aspect-[4/3] rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <PageHeader
            title="Produtos"
            sub="Escolha itens da barbearia e finalize com Pix"
            action={
              <Button variant="secondary" onClick={() => loadData()}>
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Produtos ativos" value={meta.total} icon={ShoppingBag} color="bg-orange-50 text-orange-600" />
            <StatCard label="Com foto" value={products.filter((item: AnyRecord) => Boolean(item.photoUrl)).length} icon={Sparkles} color="bg-violet-50 text-violet-600" />
            <StatCard label="Disponíveis" value={products.filter((item: AnyRecord) => Number(item.stock || 0) > 0).length} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
          </div>

          {error ? (
            <Card className="p-8">
              <Empty label={error} />
            </Card>
          ) : products.length === 0 ? (
            <Card className="p-8">
              <Empty label="Nenhum produto cadastrado no momento." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product: AnyRecord) => {
                const inStock = Number(product.stock || 0) > 0;

                return (
                  <Card key={product._id} className="overflow-hidden flex flex-col">
                    <div className="aspect-[4/3] bg-slate-100">
                      {product.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.photoUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 flex items-center justify-center text-white">
                          <ShoppingBag className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{product.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">{resolveShortDescription(product.description)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inStock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {inStock ? `${product.stock} em estoque` : "Sem estoque"}
                        </span>
                      </div>

                      <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Preço</p>
                          <p className="text-lg font-semibold text-slate-900">{formatMoney(Number(product.price || 0))}</p>
                        </div>
                        <Button disabled={!inStock} onClick={() => openPurchase(product)}>
                          Comprar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span>
              Página {meta.page} de {meta.totalPages} · {meta.total} produtos
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={meta.page <= 1 || loading} onClick={() => loadData(Math.max(1, meta.page - 1))}>
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => loadData(Math.min(meta.totalPages, meta.page + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>

          {selectedProduct && (
            <Modal
              title="Resumo da compra"
              onClose={() => {
                setSelectedProduct(null);
                setPaymentInfo(null);
              }}
              wide
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-white flex-shrink-0">
                        {selectedProduct.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedProduct.photoUrl} alt={selectedProduct.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-orange-100 text-orange-600">
                            <ShoppingBag className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">{selectedProduct.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{selectedProduct.description || "Sem descrição"}</p>
                        <p className="text-sm text-slate-600 mt-3">
                          Categoria: <span className="font-medium">{selectedProduct.category || "Geral"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Quantidade</span>
                      <Input
                        type="number"
                        min={1}
                        max={Number(selectedProduct.stock || 1)}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      />
                    </label>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Valor unitário</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{formatMoney(Number(selectedProduct.price || 0))}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{formatMoney(totalSelected)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={createPixPayment} disabled={busy || Number(selectedProduct.stock || 0) <= 0}>
                      {busy ? "Gerando Pix..." : "Pagar com Pix"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
                  <h4 className="font-semibold text-orange-900">Pagamento</h4>
                  <div className="mt-4 space-y-3 text-sm text-orange-950">
                    <div className="flex justify-between gap-4">
                      <span>Produto</span>
                      <span className="font-medium text-right">{selectedProduct.name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Quantidade</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Total</span>
                      <span className="font-medium">{formatMoney(totalSelected)}</span>
                    </div>
                  </div>

                  {paymentInfo ? (
                    <div className="mt-5 space-y-4 rounded-2xl bg-white/80 border border-orange-100 p-4">
                      <div className="flex items-center gap-2 text-orange-900 font-semibold">
                        <QrCode className="w-4 h-4" />
                        Pix gerado
                      </div>
                      {paymentInfo.qrCodeBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`data:image/png;base64,${paymentInfo.qrCodeBase64}`} alt="QR Code Pix" className="w-full rounded-xl border border-orange-100 bg-white" />
                      ) : null}
                      {paymentInfo.qrCode ? <pre className="whitespace-pre-wrap break-words text-xs bg-white rounded-xl border border-orange-100 p-3">{paymentInfo.qrCode}</pre> : null}
                      <Button variant="secondary" className="w-full" onClick={copyPixCode}>
                        <Copy className="w-4 h-4" />
                        Copiar código Pix
                      </Button>
                      <p className="text-xs text-orange-800">
                        O estoque só será baixado depois que o Mercado Pago confirmar o pagamento.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-white/70 border border-orange-100 p-4 text-sm text-orange-900">
                      Finalize a compra para gerar o QR Code do Pix.
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </RoleShell>
  );
}
