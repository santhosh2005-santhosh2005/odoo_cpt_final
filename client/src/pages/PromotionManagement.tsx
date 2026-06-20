import { useState } from "react";
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
} from "@/services/couponApi";
import { useGetProductsQuery } from "@/services/productApi";
import { useGetCategoriesQuery } from "@/services/categoryApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { Tag, Percent, Calendar, Plus, Trash2, Edit, Check, X, ShieldAlert } from "lucide-react";

export default function PromotionManagement() {
  const [activeTab, setActiveTab] = useState<"coupons" | "promotions">("coupons");
  
  // Queries & Mutations
  const { data: couponsData, isLoading: couponsLoading } = useGetCouponsQuery();
  const { data: promotionsData, isLoading: promotionsLoading } = useGetPromotionsQuery();
  const { data: productsData } = useGetProductsQuery({ limit: 100 });
  const { data: categoriesData } = useGetCategoriesQuery();
  
  const [createCoupon] = useCreateCouponMutation();
  const [updateCoupon] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const [createPromotion] = useCreatePromotionMutation();
  const [updatePromotion] = useUpdatePromotionMutation();
  const [deletePromotion] = useDeletePromotionMutation();

  // Modals state
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states - Coupon
  const [couponForm, setCouponForm] = useState({
    couponName: "",
    couponCode: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minimumOrderAmount: "",
    maxDiscountAmount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    usageLimitPerCustomer: "",
    isActive: true,
    applicableCategories: [] as string[],
    applicableProducts: [] as string[],
  });

  // Form states - Promotion
  const [promoForm, setPromoForm] = useState({
    promotionName: "",
    description: "",
    promotionType: "productDiscount" as "buyXGetY" | "bundlePrice" | "orderValueDiscount" | "categoryDiscount" | "productDiscount",
    isActive: true,
    validFrom: "",
    validUntil: "",
    buyXGetY: {
      buyProduct: "",
      buyQuantity: 1,
      freeProduct: "",
      freeQuantity: 1,
    },
    bundlePrice: {
      product: "",
      requiredQuantity: 1,
      bundlePrice: 0,
    },
    orderValueDiscount: {
      minimumOrderAmount: 0,
      discountType: "percentage" as "percentage" | "fixed",
      discountValue: 0,
    },
    categoryDiscount: {
      category: "",
      discountType: "percentage" as "percentage" | "fixed",
      discountValue: 0,
    },
    productDiscount: {
      product: "",
      discountType: "percentage" as "percentage" | "fixed",
      discountValue: 0,
    },
  });

  const resetCouponForm = () => {
    setCouponForm({
      couponName: "",
      couponCode: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minimumOrderAmount: "",
      maxDiscountAmount: "",
      validFrom: "",
      validUntil: "",
      usageLimit: "",
      usageLimitPerCustomer: "",
      isActive: true,
      applicableCategories: [],
      applicableProducts: [],
    });
    setEditingItem(null);
  };

  const resetPromoForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setPromoForm({
      promotionName: "",
      description: "",
      promotionType: "productDiscount",
      isActive: true,
      validFrom: today,
      validUntil: "",
      buyXGetY: {
        buyProduct: "",
        buyQuantity: 1,
        freeProduct: "",
        freeQuantity: 1,
      },
      bundlePrice: {
        product: "",
        requiredQuantity: 1,
        bundlePrice: 0,
      },
      orderValueDiscount: {
        minimumOrderAmount: 0,
        discountType: "percentage",
        discountValue: 0,
      },
      categoryDiscount: {
        category: "",
        discountType: "percentage",
        discountValue: 0,
      },
      productDiscount: {
        product: "",
        discountType: "percentage",
        discountValue: 0,
      },
    });
    setEditingItem(null);
  };

  const openEditCoupon = (coupon: any) => {
    setEditingItem(coupon);
    setCouponForm({
      couponName: coupon.couponName || "",
      couponCode: coupon.couponCode,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minimumOrderAmount: coupon.minimumOrderAmount?.toString() || "",
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || "",
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : "",
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : (coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : ""),
      usageLimit: coupon.usageLimit?.toString() || "",
      usageLimitPerCustomer: coupon.usageLimitPerCustomer?.toString() || "",
      isActive: coupon.isActive,
      applicableCategories: coupon.applicableCategories?.map((c: any) => c._id || c) || [],
      applicableProducts: coupon.applicableProducts?.map((p: any) => p._id || p) || [],
    });
    setCouponModalOpen(true);
  };

  const openEditPromo = (promo: any) => {
    setEditingItem(promo);
    setPromoForm({
      promotionName: promo.promotionName,
      description: promo.description || "",
      promotionType: promo.promotionType || "productDiscount",
      isActive: promo.isActive,
      validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().split('T')[0] : "",
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : "",
      buyXGetY: promo.buyXGetY ? {
        buyProduct: typeof promo.buyXGetY.buyProduct === 'object' ? promo.buyXGetY.buyProduct._id : promo.buyXGetY.buyProduct || "",
        buyQuantity: promo.buyXGetY.buyQuantity || 1,
        freeProduct: typeof promo.buyXGetY.freeProduct === 'object' ? promo.buyXGetY.freeProduct._id : promo.buyXGetY.freeProduct || "",
        freeQuantity: promo.buyXGetY.freeQuantity || 1,
      } : {
        buyProduct: "",
        buyQuantity: 1,
        freeProduct: "",
        freeQuantity: 1,
      },
      bundlePrice: promo.bundlePrice ? {
        product: typeof promo.bundlePrice.product === 'object' ? promo.bundlePrice.product._id : promo.bundlePrice.product || "",
        requiredQuantity: promo.bundlePrice.requiredQuantity || 1,
        bundlePrice: promo.bundlePrice.bundlePrice || 0,
      } : {
        product: "",
        requiredQuantity: 1,
        bundlePrice: 0,
      },
      orderValueDiscount: promo.orderValueDiscount || {
        minimumOrderAmount: 0,
        discountType: "percentage",
        discountValue: 0,
      },
      categoryDiscount: promo.categoryDiscount ? {
        category: typeof promo.categoryDiscount.category === 'object' ? promo.categoryDiscount.category._id : promo.categoryDiscount.category || "",
        discountType: promo.categoryDiscount.discountType || "percentage",
        discountValue: promo.categoryDiscount.discountValue || 0,
      } : {
        category: "",
        discountType: "percentage",
        discountValue: 0,
      },
      productDiscount: promo.productDiscount ? {
        product: typeof promo.productDiscount.product === 'object' ? promo.productDiscount.product._id : promo.productDiscount.product || "",
        discountType: promo.productDiscount.discountType || "percentage",
        discountValue: promo.productDiscount.discountValue || 0,
      } : {
        product: "",
        discountType: "percentage",
        discountValue: 0,
      },
    });
    setPromoModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.couponCode || !couponForm.discountValue || !couponForm.couponName || !couponForm.validUntil) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      ...couponForm,
      discountValue: parseFloat(couponForm.discountValue),
      minimumOrderAmount: parseFloat(couponForm.minimumOrderAmount) || 0,
      maxDiscountAmount: couponForm.maxDiscountAmount ? parseFloat(couponForm.maxDiscountAmount) : undefined,
      usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : undefined,
      usageLimitPerCustomer: couponForm.usageLimitPerCustomer ? parseInt(couponForm.usageLimitPerCustomer) : undefined,
    };

    try {
      if (editingItem) {
        await updateCoupon({ id: editingItem._id, body: payload }).unwrap();
        toast.success("Coupon updated successfully.");
      } else {
        await createCoupon(payload).unwrap();
        toast.success("Coupon created successfully.");
      }
      setCouponModalOpen(false);
      resetCouponForm();
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to save coupon.");
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.promotionName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Prepare payload with only relevant fields
    const payload: any = {
      promotionName: promoForm.promotionName,
      description: promoForm.description,
      promotionType: promoForm.promotionType,
      isActive: promoForm.isActive,
      validFrom: promoForm.validFrom,
      validUntil: promoForm.validUntil,
    };

    // Only add the relevant type-specific data
    if (promoForm.promotionType === "buyXGetY" && promoForm.buyXGetY) {
      payload.buyXGetY = {
        ...promoForm.buyXGetY,
        buyProduct: promoForm.buyXGetY.buyProduct || undefined,
        freeProduct: promoForm.buyXGetY.freeProduct || undefined,
      };
    } else if (promoForm.promotionType === "bundlePrice" && promoForm.bundlePrice) {
      payload.bundlePrice = {
        ...promoForm.bundlePrice,
        product: promoForm.bundlePrice.product || undefined,
      };
    } else if (promoForm.promotionType === "orderValueDiscount" && promoForm.orderValueDiscount) {
      payload.orderValueDiscount = promoForm.orderValueDiscount;
    } else if (promoForm.promotionType === "categoryDiscount" && promoForm.categoryDiscount) {
      payload.categoryDiscount = {
        ...promoForm.categoryDiscount,
        category: promoForm.categoryDiscount.category || undefined,
      };
    } else if (promoForm.promotionType === "productDiscount" && promoForm.productDiscount) {
      payload.productDiscount = {
        ...promoForm.productDiscount,
        product: promoForm.productDiscount.product || undefined,
      };
    }

    try {
      if (editingItem) {
        await updatePromotion({ id: editingItem._id, body: payload }).unwrap();
        toast.success("Promotion updated successfully.");
      } else {
        await createPromotion(payload).unwrap();
        toast.success("Promotion created successfully.");
      }
      setPromoModalOpen(false);
      resetPromoForm();
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to save promotion.");
    }
  };

  const handleToggleCouponActive = async (coupon: any) => {
    try {
      await updateCoupon({
        id: coupon._id,
        body: { isActive: !coupon.isActive },
      }).unwrap();
      toast.success(`Coupon ${coupon.couponCode} ${!coupon.isActive ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error("Failed to toggle coupon status.");
    }
  };

  const handleTogglePromoActive = async (promo: any) => {
    try {
      await updatePromotion({
        id: promo._id,
        body: { isActive: !promo.isActive },
      }).unwrap();
      toast.success(`Promotion ${promo.promotionName} ${!promo.isActive ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error("Failed to toggle promotion status.");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCoupon(id).unwrap();
      toast.success("Coupon deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete coupon.");
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      await deletePromotion(id).unwrap();
      toast.success("Promotion deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete promotion.");
    }
  };

  const formatPrice = (value: number) => `₹${value.toFixed(2)}`;

  const getPromoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      buyXGetY: "Buy X Get Y",
      bundlePrice: "Bundle Price",
      orderValueDiscount: "Order Value",
      categoryDiscount: "Category",
      productDiscount: "Product",
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-6 bg-white p-6 rounded-2xl shadow-sm border-l-[12px] border-l-black">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-black text-white rounded-2xl">
            <Percent size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Promotions_Panel</h1>
            <div className="system-status text-[10px] font-bold text-green-500 mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 animate-pulse"></div> Active_Marketing_Systems
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (activeTab === "coupons") {
              resetCouponForm();
              setCouponModalOpen(true);
            } else {
              resetPromoForm();
              setPromoModalOpen(true);
            }
          }}
          className="h-14 border-4 border-black bg-white hover:bg-yellow-400 font-black italic px-6 text-sm flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          <Plus size={16} /> CREATE_{activeTab === "coupons" ? "COUPON" : "PROMOTION"}
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-8 py-4 border-4 border-black font-black italic text-lg tracking-tight transition-all uppercase rounded-none
            ${activeTab === "coupons"
              ? "bg-yellow-400 text-black shadow-none"
              : "bg-white text-black hover:bg-yellow-50 shadow-[4px_4px_0px_0px_#000000] hover:translate-x-0.5 hover:translate-y-0.5"
            }`}
        >
          Coupons_Storage
        </button>
        <button
          onClick={() => setActiveTab("promotions")}
          className={`px-8 py-4 border-4 border-black font-black italic text-lg tracking-tight transition-all uppercase rounded-none
            ${activeTab === "promotions"
              ? "bg-yellow-400 text-black shadow-none"
              : "bg-white text-black hover:bg-yellow-50 shadow-[4px_4px_0px_0px_#000000] hover:translate-x-0.5 hover:translate-y-0.5"
            }`}
        >
          Automated_Promotions
        </button>
      </div>

      {/* Main Grid View */}
      <div className="brutalist-card bg-white border-4 border-black p-8 shadow-none min-h-[400px]">
        {activeTab === "coupons" ? (
          <div>
            {couponsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !couponsData?.data || couponsData.data.length === 0 ? (
              <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">
                <Tag size={48} className="mx-auto mb-4 opacity-30" />
                No active coupons configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-4 border-black font-black italic uppercase text-sm bg-gray-50">
                      <th className="py-4 px-4 border-r-2 border-black">Name</th>
                      <th className="py-4 px-4 border-r-2 border-black">Code</th>
                      <th className="py-4 px-4 border-r-2 border-black">Discount</th>
                      <th className="py-4 px-4 border-r-2 border-black">Min Order</th>
                      <th className="py-4 px-4 border-r-2 border-black">Usage</th>
                      <th className="py-4 px-4 border-r-2 border-black">Status</th>
                      <th className="py-4 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponsData.data.map((coupon: any) => {
                      const isExpired = (coupon.validUntil && new Date(coupon.validUntil) < new Date()) || (coupon.expiryDate && new Date(coupon.expiryDate) < new Date());
                      return (
                        <tr key={coupon._id} className="border-b-2 border-black hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 border-r-2 border-black font-bold">{coupon.couponName || "-"}</td>
                          <td className="py-4 px-4 border-r-2 border-black font-mono font-black text-lg text-blue-600">
                            {coupon.couponCode}
                          </td>
                          <td className="py-4 px-4 border-r-2 border-black font-bold">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% Off`
                              : `${formatPrice(coupon.discountValue)} Off`}
                          </td>
                          <td className="py-4 px-4 border-r-2 border-black font-mono">
                            {formatPrice(coupon.minimumOrderAmount || 0)}
                          </td>
                          <td className="py-4 px-4 border-r-2 border-black font-mono">
                            {coupon.usageCount || 0}
                            {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                          </td>
                          <td className="py-4 px-4 border-r-2 border-black">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={coupon.isActive}
                                onCheckedChange={() => handleToggleCouponActive(coupon)}
                              />
                              <span className={`text-[10px] font-black uppercase ${coupon.isActive ? "text-green-600" : "text-gray-400"}`}>
                                {coupon.isActive ? "ACTIVE" : "INACTIVE"}
                                {isExpired && " (EXPIRED)"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 space-x-2">
                            <button
                              onClick={() => openEditCoupon(coupon)}
                              className="p-2 border-2 border-black hover:bg-yellow-400 transition-colors"
                              title="Edit Coupon"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id)}
                              className="p-2 border-2 border-black text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete Coupon"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {promotionsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !promotionsData?.data || promotionsData.data.length === 0 ? (
              <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">
                <Percent size={48} className="mx-auto mb-4 opacity-30" />
                No active promotions configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-4 border-black font-black italic uppercase text-sm bg-gray-50">
                      <th className="py-4 px-4 border-r-2 border-black">Promo Name</th>
                      <th className="py-4 px-4 border-r-2 border-black">Type</th>
                      <th className="py-4 px-4 border-r-2 border-black">Usage</th>
                      <th className="py-4 px-4 border-r-2 border-black">Status</th>
                      <th className="py-4 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionsData.data.map((promo: any) => (
                      <tr key={promo._id} className="border-b-2 border-black hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 border-r-2 border-black font-bold">
                          {promo.promotionName}
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black bg-blue-100">
                            {getPromoTypeLabel(promo.promotionType)}
                          </span>
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black font-mono">
                          {promo.usageCount || 0}
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={promo.isActive}
                              onCheckedChange={() => handleTogglePromoActive(promo)}
                            />
                            <span className={`text-[10px] font-black uppercase ${promo.isActive ? "text-green-600" : "text-gray-400"}`}>
                              {promo.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 space-x-2">
                          <button
                            onClick={() => openEditPromo(promo)}
                            className="p-2 border-2 border-black hover:bg-yellow-400 transition-colors"
                            title="Edit Promotion"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePromo(promo._id)}
                            className="p-2 border-2 border-black text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                            title="Delete Promotion"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      <Dialog open={couponModalOpen} onOpenChange={setCouponModalOpen}>
        <DialogContent className="border-4 border-black rounded-none p-0 overflow-hidden max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 bg-black text-white">
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight">
              {editingItem ? "EDIT_COUPON_RECORD" : "CREATE_NEW_COUPON"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Coupon Name *</Label>
                <Input
                  type="text"
                  value={couponForm.couponName}
                  onChange={(e) => setCouponForm({ ...couponForm, couponName: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder="Summer Sale"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Coupon Code *</Label>
                <Input
                  type="text"
                  value={couponForm.couponCode}
                  onChange={(e) => setCouponForm({ ...couponForm, couponCode: e.target.value.toUpperCase() })}
                  className="h-12 border-2 border-black rounded-none font-bold uppercase"
                  placeholder="SUMMER20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Description</Label>
              <Input
                type="text"
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                className="h-12 border-2 border-black rounded-none font-bold"
                placeholder="Get 20% off on all orders"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Type</Label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                  className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                >
                  <option value="percentage">PERCENTAGE (%)</option>
                  <option value="fixed">FIXED AMOUNT (₹)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Value *</Label>
                <Input
                  type="number"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder={couponForm.discountType === "percentage" ? "20" : "100"}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Min Order Amount (₹)</Label>
                <Input
                  type="number"
                  value={couponForm.minimumOrderAmount}
                  onChange={(e) => setCouponForm({ ...couponForm, minimumOrderAmount: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder="500"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Max Discount Amount (₹)</Label>
                <Input
                  type="number"
                  value={couponForm.maxDiscountAmount}
                  onChange={(e) => setCouponForm({ ...couponForm, maxDiscountAmount: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder="200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Valid From</Label>
                <Input
                  type="date"
                  value={couponForm.validFrom}
                  onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Valid Until *</Label>
                <Input
                  type="date"
                  value={couponForm.validUntil}
                  onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Usage Limit</Label>
                <Input
                  type="number"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Usage Limit Per Customer</Label>
                <Input
                  type="number"
                  value={couponForm.usageLimitPerCustomer}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimitPerCustomer: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t pt-4 border-gray-100">
              <Switch
                checked={couponForm.isActive}
                onCheckedChange={(checked) => setCouponForm({ ...couponForm, isActive: checked })}
              />
              <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Enabled status</Label>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-2 border-black rounded-none font-bold h-12 flex-1"
                onClick={() => setCouponModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black hover:bg-yellow-400 hover:text-black border-2 border-black rounded-none font-bold h-12 flex-1"
              >
                Save Coupon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Promotion Modal */}
      <Dialog open={promoModalOpen} onOpenChange={setPromoModalOpen}>
        <DialogContent className="border-4 border-black rounded-none p-0 overflow-hidden max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 bg-black text-white">
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight">
              {editingItem ? "EDIT_PROMO_RECORD" : "CREATE_NEW_PROMOTION"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePromo} className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Promotion Name *</Label>
              <Input
                type="text"
                value={promoForm.promotionName}
                onChange={(e) => setPromoForm({ ...promoForm, promotionName: e.target.value })}
                className="h-12 border-2 border-black rounded-none font-bold"
                placeholder="Summer Combo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Description</Label>
              <Input
                type="text"
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                className="h-12 border-2 border-black rounded-none font-bold"
                placeholder="Get a great deal on summer items"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Promotion Type</Label>
                <select
                  value={promoForm.promotionType}
                  onChange={(e) => setPromoForm({ ...promoForm, promotionType: e.target.value as any })}
                  className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                >
                  <option value="productDiscount">Product Discount</option>
                  <option value="categoryDiscount">Category Discount</option>
                  <option value="orderValueDiscount">Order Value Discount</option>
                  <option value="buyXGetY">Buy X Get Y Free</option>
                  <option value="bundlePrice">Bundle Price</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Valid From *</Label>
                <Input
                  type="date"
                  value={promoForm.validFrom}
                  onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Valid Until *</Label>
                <Input
                  type="date"
                  value={promoForm.validUntil}
                  onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                  className="h-12 border-2 border-black rounded-none font-bold"
                  required
                />
              </div>
            </div>

            {/* Promotion Type Specific Fields */}
            {promoForm.promotionType === "productDiscount" && (
              <div className="space-y-4 border-2 border-black p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Product</Label>
                    <select
                      value={promoForm.productDiscount.product}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        productDiscount: { ...promoForm.productDiscount, product: e.target.value }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="">Select Product</option>
                      {productsData?.data?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Type</Label>
                    <select
                      value={promoForm.productDiscount.discountType}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        productDiscount: { ...promoForm.productDiscount, discountType: e.target.value as any }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="percentage">PERCENTAGE (%)</option>
                      <option value="fixed">FIXED AMOUNT (₹)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Value</Label>
                    <Input
                      type="number"
                      value={promoForm.productDiscount.discountValue}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        productDiscount: { ...promoForm.productDiscount, discountValue: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {promoForm.promotionType === "categoryDiscount" && (
              <div className="space-y-4 border-2 border-black p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Category</Label>
                    <select
                      value={promoForm.categoryDiscount.category}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        categoryDiscount: { ...promoForm.categoryDiscount, category: e.target.value }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categoriesData?.data?.map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Type</Label>
                    <select
                      value={promoForm.categoryDiscount.discountType}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        categoryDiscount: { ...promoForm.categoryDiscount, discountType: e.target.value as any }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="percentage">PERCENTAGE (%)</option>
                      <option value="fixed">FIXED AMOUNT (₹)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Value</Label>
                    <Input
                      type="number"
                      value={promoForm.categoryDiscount.discountValue}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        categoryDiscount: { ...promoForm.categoryDiscount, discountValue: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {promoForm.promotionType === "orderValueDiscount" && (
              <div className="space-y-4 border-2 border-black p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Min Order Amount (₹)</Label>
                    <Input
                      type="number"
                      value={promoForm.orderValueDiscount.minimumOrderAmount}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        orderValueDiscount: { ...promoForm.orderValueDiscount, minimumOrderAmount: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Type</Label>
                    <select
                      value={promoForm.orderValueDiscount.discountType}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        orderValueDiscount: { ...promoForm.orderValueDiscount, discountType: e.target.value as any }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="percentage">PERCENTAGE (%)</option>
                      <option value="fixed">FIXED AMOUNT (₹)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Discount Value</Label>
                    <Input
                      type="number"
                      value={promoForm.orderValueDiscount.discountValue}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        orderValueDiscount: { ...promoForm.orderValueDiscount, discountValue: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {promoForm.promotionType === "buyXGetY" && (
              <div className="space-y-4 border-2 border-black p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Buy Product</Label>
                    <select
                      value={promoForm.buyXGetY.buyProduct}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        buyXGetY: { ...promoForm.buyXGetY, buyProduct: e.target.value }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="">Select Product</option>
                      {productsData?.data?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Buy Quantity</Label>
                    <Input
                      type="number"
                      value={promoForm.buyXGetY.buyQuantity}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        buyXGetY: { ...promoForm.buyXGetY, buyQuantity: parseInt(e.target.value) || 1 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Free Product</Label>
                    <select
                      value={promoForm.buyXGetY.freeProduct}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        buyXGetY: { ...promoForm.buyXGetY, freeProduct: e.target.value }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="">Select Product</option>
                      {productsData?.data?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Free Quantity</Label>
                    <Input
                      type="number"
                      value={promoForm.buyXGetY.freeQuantity}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        buyXGetY: { ...promoForm.buyXGetY, freeQuantity: parseInt(e.target.value) || 1 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {promoForm.promotionType === "bundlePrice" && (
              <div className="space-y-4 border-2 border-black p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Product</Label>
                    <select
                      value={promoForm.bundlePrice.product}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        bundlePrice: { ...promoForm.bundlePrice, product: e.target.value }
                      })}
                      className="w-full h-12 px-3 border-2 border-black font-bold focus:outline-none"
                    >
                      <option value="">Select Product</option>
                      {productsData?.data?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Required Quantity</Label>
                    <Input
                      type="number"
                      value={promoForm.bundlePrice.requiredQuantity}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        bundlePrice: { ...promoForm.bundlePrice, requiredQuantity: parseInt(e.target.value) || 1 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Bundle Price (₹)</Label>
                    <Input
                      type="number"
                      value={promoForm.bundlePrice.bundlePrice}
                      onChange={(e) => setPromoForm({
                        ...promoForm,
                        bundlePrice: { ...promoForm.bundlePrice, bundlePrice: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-12 border-2 border-black rounded-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t pt-4 border-gray-100">
              <Switch
                checked={promoForm.isActive}
                onCheckedChange={(checked) => setPromoForm({ ...promoForm, isActive: checked })}
              />
              <Label className="font-mono uppercase text-[10px] tracking-widest text-gray-500">Enabled status</Label>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-2 border-black rounded-none font-bold h-12 flex-1"
                onClick={() => setPromoModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black hover:bg-yellow-400 hover:text-black border-2 border-black rounded-none font-bold h-12 flex-1"
              >
                Save Promotion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
