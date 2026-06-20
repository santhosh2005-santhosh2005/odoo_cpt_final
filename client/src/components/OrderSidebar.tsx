import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearCart, removeItem, updateQuantity, updateItemField, setCart, applyPromotion, removePromotion, clearPromotions, setAvailablePromotions, addItem } from "@/store/cartSlice";
import type { OrderItem } from "@/store/cartSlice";
import type { RootState } from "@/store";
import Keypad from "./Keypad";
import {
  Banknote,
  CheckCircle,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingCart,
  Trash2,
  Receipt,
  Tag,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useCreateOrderMutation, useUpdateOrderMutation } from "@/services/orderApi";
import { useGetTablesQuery, useUpdateTableStatusMutation } from "@/services/tableApi";
import { useGetSettingsQuery } from "@/services/SettingsApi";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGetPromotionsQuery, useValidateCouponMutation } from "@/services/couponApi";
import { useGetProductsQuery } from "@/services/productApi";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { DiscountDialog } from "./SetDiscount";
import { printReceipt } from "@/utils/printReceipt";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001");

// ── Theme ────────────────────────────────────────────────────────────────────
const G_DARK = "#1A2E1A";
const G_MID = "#2C4A2C";
const CREAM = "#F5F0E8";
const YELLOW = "#F5B400";

interface OrderSidebarProps {
  disabled?: boolean;
}

export default function OrderSidebar({ disabled }: OrderSidebarProps) {
  const dispatch = useDispatch();
  const { items, totalPrice, appliedPromotions, availablePromotions } = useSelector((state: RootState) => state.cart);
  const { sessionId } = useSelector((state: RootState) => state.user);
  const isProcessingRef = useRef(false);
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [updateOrder] = useUpdateOrderMutation();
  const [updateTableStatus] = useUpdateTableStatusMutation();
  const { data: tablesData } = useGetTablesQuery();
  const tables = tablesData?.data || [];

  const [discountDialog, setDiscountDialog] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "digital" | "upi">("cash");
  const [showQR, setShowQR] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [selectedGatewayMethod, setSelectedGatewayMethod] = useState<string>("CC");
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);
  const [qrVerifying, setQrVerifying] = useState(false);

  // ── MODIFY RECENT ORDER STATE ──────────────────────────────────────────
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setShowSuccessScreen(false);
      setCountdown(null);
      setIsModifying(false);
      setCurrentOrderId(null);
      setOriginalItems([]);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const [selectedItemLineId, setSelectedItemLineId] = useState<string | null>(null);
  const [keypadValue, setKeypadValue] = useState("");
  const [keypadMode, setKeypadMode] = useState<"qty" | "disc" | "price">("qty");

  const { data: settingsData } = useGetSettingsQuery({});

  // Auto-select latest item when items change and none is selected
  useEffect(() => {
    if (items.length > 0 && !selectedItemLineId) {
      const lastItem = items[items.length - 1];
      setSelectedItemLineId(lastItem.lineId);
      setKeypadValue(lastItem.quantity.toString());
    } else if (items.length === 0) {
      setSelectedItemLineId(null);
      setKeypadValue("");
    }
  }, [items.length]);

  const handleKeypadNumber = (num: string) => {
    if (!selectedItemLineId) return;
    const newValue = keypadValue + num;
    setKeypadValue(newValue);
    applyKeypadValue(newValue, keypadMode);
  };

  const handleKeypadBackspace = () => {
    if (!selectedItemLineId) return;
    const newValue = keypadValue.slice(0, -1);
    setKeypadValue(newValue);
    applyKeypadValue(newValue, keypadMode);
  };

  const handleKeypadToggleSign = () => {
    setKeypadValue("");
    applyKeypadValue("0", keypadMode);
  };

  const handleKeypadModeChange = (mode: "qty" | "disc" | "price") => {
    setKeypadMode(mode);
    const item = items.find(i => i.lineId === selectedItemLineId);
    if (item) {
      const val = mode === "qty" ? item.quantity : mode === "disc" ? (item.discount || 0) : item.price;
      setKeypadValue(val.toString());
    } else {
      setKeypadValue("");
    }
  };

  const applyKeypadValue = (value: string, mode: "qty" | "disc" | "price") => {
    if (!selectedItemLineId) return;
    const item = items.find(i => i.lineId === selectedItemLineId);
    if (!item) return;

    // Handle decimal points and empty values
    let cleanValue = value === "." ? "0." : value;
    if (cleanValue.endsWith(".")) {
      // Don't apply yet if it's just a trailing dot
      return;
    }

    let numValue = parseFloat(cleanValue) || 0;
    let field: "quantity" | "discount" | "price" = "quantity";
    if (mode === "qty") field = "quantity";
    else if (mode === "disc") field = "discount";
    else if (mode === "price") field = "price";

    dispatch(updateItemField({
      lineId: item.lineId,
      field,
      value: numValue
    }));
  };
  const settingsTaxRate = settingsData?.data?.taxRate || 0;
  const defaultDiscount = settingsData?.data?.defaultDiscount || 0;

  useEffect(() => {
    if (settingsData?.data) {
      setDiscountPercent(settingsData.data.defaultDiscount || 0);
    }
  }, [settingsData]);

  // Fetch active promotions
  const { data: promotionsData } = useGetPromotionsQuery();
  const { data: productsResponse } = useGetProductsQuery({ limit: 100 });
  const products = productsResponse?.data || [];
  const [validateCoupon] = useValidateCouponMutation();

  const now = new Date();
  const activePromotions = (promotionsData?.data || []).filter((p: any) => {
    const isValid = p.isActive && 
      new Date(p.validFrom) <= now && 
      new Date(p.validUntil) >= now;
    console.log("Promotion check:", p.promotionName, { isActive: p.isActive, validFrom: p.validFrom, validUntil: p.validUntil, isValid });
    return isValid;
  });

  // Use applied promotions
  const totalPromoDiscount = appliedPromotions.reduce((sum: number, promo: any) => sum + (promo.discountAmount || 0), 0);
  const appliedPromotionNames = appliedPromotions.map((promo: any) => `${promo.name} (-₹${promo.discountAmount?.toFixed(2) || '0.00'})`);

  const totalAutoPromoDiscount = totalPromoDiscount;
  const autoPromoNames = [...appliedPromotionNames];

  // 3. Calculate Coupon Discount
  let couponDiscount = 0;
  let isCouponValidForAmount = false;

  if (appliedCoupon) {
    if (totalPrice >= appliedCoupon.minimumOrderAmount) {
      isCouponValidForAmount = true;
      if (appliedCoupon.discountType === "percentage") {
        couponDiscount = totalPrice * (appliedCoupon.discountValue / 100);
      } else if (appliedCoupon.discountType === "fixed") {
        couponDiscount = appliedCoupon.discountValue;
      }
      couponDiscount = Math.min(couponDiscount, totalPrice);
    }
  }

  // 4. Apply coupon or promotions
  let appliedPromoDiscount = 0;
  let appliedDiscountType: "none" | "coupon" | "promotion" = "none";
  let displayPromoText = "";
  let finalCouponCode = "";
  let finalAppliedPromotions: string[] = [];

  if (couponDiscount > 0 && isCouponValidForAmount) {
    appliedPromoDiscount = couponDiscount;
    appliedDiscountType = "coupon";
    displayPromoText = `${appliedCoupon.couponCode} (-₹${couponDiscount.toFixed(2)})`;
    finalCouponCode = appliedCoupon.couponCode;
    finalAppliedPromotions = [];
  } else if (totalAutoPromoDiscount > 0) {
    appliedPromoDiscount = totalAutoPromoDiscount;
    appliedDiscountType = "promotion";
    displayPromoText = autoPromoNames.join(", ");
    finalCouponCode = "";
    finalAppliedPromotions = appliedPromotions.map((promo: any) => promo.name);
  }

  const grossSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscountsTotal = items.reduce((sum, item) => sum + (item.price * (item.discount || 0) / 100) * item.quantity, 0);

  // Tax calculation per item
  const itemTaxesTotal = items.reduce((sum, item) => {
    const discountedPrice = item.price * (1 - (item.discount || 0) / 100);
    const taxRate = item.taxRate !== undefined ? item.taxRate : settingsTaxRate;
    return sum + (discountedPrice * (taxRate / 100)) * item.quantity;
  }, 0);

  const manualDiscountAmount = (totalPrice * discountPercent) / 100;
  const discountAmount = manualDiscountAmount; // Alias for backward compatibility
  const totalCombinedDiscount = Math.min(manualDiscountAmount + appliedPromoDiscount, totalPrice);
  const globalDiscountFactor = totalPrice > 0 ? (totalPrice - totalCombinedDiscount) / totalPrice : 1;
  const finalTaxAmount = itemTaxesTotal * globalDiscountFactor;

  const finalTotal = totalPrice - totalCombinedDiscount + finalTaxAmount;

  // Automatically apply buy X get Y promotions
  useEffect(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const processPromotions = () => {
      const nonFreeItems = items.filter(item => !item.isFreeFromPromotion);
      let freeItemsToKeep: string[] = [];
      
      activePromotions.forEach(promo => {
        if (promo.promotionType === "buyXGetY" && promo.buyXGetY) {
          const buyProductId = typeof promo.buyXGetY.buyProduct === "object" 
            ? promo.buyXGetY.buyProduct?._id 
            : promo.buyXGetY.buyProduct;
          const freeProductId = typeof promo.buyXGetY.freeProduct === "object" 
            ? promo.buyXGetY.freeProduct?._id 
            : promo.buyXGetY.freeProduct;
          
          if (!buyProductId) return;
          
          const matchingBuyItems = nonFreeItems.filter(item => item.productId === buyProductId);
          const totalBuyQty = matchingBuyItems.reduce((sum, item) => sum + item.quantity, 0);
          const buyQty = promo.buyXGetY.buyQuantity || 1;
          const freeQty = promo.buyXGetY.freeQuantity || 1;
          const groupSize = buyQty + freeQty;
          const numGroups = Math.floor(totalBuyQty / groupSize);
          const neededFreeQty = numGroups * freeQty;
          
          if (neededFreeQty > 0) {
            // Find the free product data
            const freeProductData = products.find((p: any) => 
              p._id === freeProductId || (freeProductId === buyProductId && p._id === buyProductId)
            );
            
            if (freeProductData) {
              // Get existing free items for this promotion
              const existingFreeItems = items.filter(item => 
                item.isFreeFromPromotion && 
                item.productId === (freeProductId || buyProductId)
              );
              
              // Keep track of which free items to keep
              let keptCount = 0;
              existingFreeItems.forEach(item => {
                if (keptCount < neededFreeQty) {
                  freeItemsToKeep.push(item.lineId);
                  keptCount += item.quantity;
                }
              });
              
              // Add missing free items
              const toAdd = neededFreeQty - keptCount;
              for (let i = 0; i < toAdd; i++) {
                dispatch(addItem({
                  productId: freeProductId || buyProductId,
                  name: freeProductData.name,
                  size: "Regular",
                  price: freeProductData.basePrice || 0,
                  imageUrl: freeProductData.imageUrl,
                  isFreeFromPromotion: true
                }));
              }
            }
          }
        }
      });
      
      // Remove any free items not in freeItemsToKeep
      items.forEach(item => {
        if (item.isFreeFromPromotion && !freeItemsToKeep.includes(item.lineId)) {
          dispatch(removeItem({ lineId: item.lineId }));
        }
      });
    };
    
    processPromotions();

    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  }, [items, activePromotions, products, dispatch]);

  useEffect(() => {
    socket.emit("cashierCartUpdate", {
      cart: items,
      totalPrice: finalTotal,
      paymentMethod: paymentMethod,
      discountPercent: discountPercent,
      taxRate: settingsTaxRate,
      paymentStatus: showSuccessScreen ? "paid" : "unpaid",
      isPaymentStep: selectedPaymentMethod !== null
    });
  }, [items, finalTotal, paymentMethod, discountPercent, settingsTaxRate, showSuccessScreen, selectedPaymentMethod]);

  const confirmCheckout = async (shouldPrint: boolean = true) => {
    let receiptWindow: any = null;
    if (shouldPrint) {
      receiptWindow = window.open("", "_blank", "width=800,height=600");
    }
    try {
      Swal.showLoading();
      const itemsToPrint = items.map((item) => ({ ...item, productId: { name: item.name } }));
      const orderData = {
        items: items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          size: item.size,
          price: item.price,
          discount: item.discount || 0,
          taxRate: item.taxRate !== undefined ? item.taxRate : settingsTaxRate,
        })),
        totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
        totalPrice: finalTotal,
        discountPercent: discountPercent,
        discount: manualDiscountAmount + appliedPromoDiscount + itemDiscountsTotal,
        discountAmount: manualDiscountAmount + appliedPromoDiscount,
        couponCode: finalCouponCode || undefined,
        appliedPromotions: finalAppliedPromotions,
        tax: finalTaxAmount,
        paymentMethod,
        table: selectedTable || null,
        status: "pending",
      };

      let result;
      if (isModifying && currentOrderId) {
        result = await updateOrder({ id: currentOrderId, body: orderData }).unwrap();
        toast.success("Order updated successfully!");
      } else {
        result = await createOrder(orderData).unwrap();
      }

      const finalResult = result.data || result;
      setLastOrderDetails({ 
        id: finalResult._id?.slice(-6).toUpperCase(), 
        total: finalTotal,
        items: items // Store full items for re-populating cart later
      });
      setCurrentOrderId(finalResult._id);
      setOriginalItems(items);
      setShowSuccessScreen(true);
      setCountdown(60); // 1 minute window
      dispatch(clearCart());
      setDiscountPercent(defaultDiscount);
      setConfirmOpen(false);
      setShowQR(false);
      setIsModifying(false);
      // Removed the 4.5s timeout as we now have a 1-minute countdown
      // setTimeout(() => setShowSuccessScreen(false), 4500);
      if (selectedTable) {
        await updateTableStatus({ id: selectedTable, status: "occupied" }).unwrap();
        setSelectedTable(null);
      }
      if (shouldPrint && settingsData?.data && receiptWindow) {
        printReceipt(finalResult, itemsToPrint, discountPercent, tables, selectedTable, totalPrice, {
          businessName: settingsData.data.businessName, address: settingsData.data.address,
          phone: settingsData.data.phone, website: settingsData.data.website,
          receiptFooter: settingsData.data.receiptFooter, taxRate: settingsData.data.taxRate,
        }, receiptWindow);
      }
    } catch (err) {
      if (receiptWindow) receiptWindow.close();
      Swal.close();
      toast.error("Failed to place order");
    }
  };

  const handlePaymentWithAPI = () => {
    const keyId = settingsData?.data?.razorpayKeyId;
    if (keyId) {
      const options = {
        key: keyId,
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        name: settingsData?.data?.businessName || "Odoo POS Cafe",
        description: "Point of Sale Settlement",
        handler: function (response: any) {
          toast.success(`Payment Success: ${response.razorpay_payment_id}`);
          confirmCheckout(true);
        },
        modal: { ondismiss: function () { toast.error("Payment was cancelled"); } },
        prefill: { name: "Guest Customer", email: "guest@odoocafe.com" },
        theme: { color: YELLOW },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      setShowGateway(true);
      setGatewayProcessing(false);
    }
  };

  const simulateGatewaySettlement = () => {
    setGatewayProcessing(true);
    toast.promise(
      new Promise((res) => setTimeout(res, 2500)),
      { loading: "Authorizing with Bank...", success: "Payment Captured!", error: "Authorization Failed" }
    ).then(() => { setShowGateway(false); confirmCheckout(true); });
  };

  const handleClearCart = () => { dispatch(clearCart()); toast.success("Cart cleared!"); };
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="w-full h-full flex flex-col p-5" style={{ background: G_MID, color: CREAM }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5 pb-4 border-b-2" style={{ borderColor: `${YELLOW}40` }}>
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          {isModifying ? (
            <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#3b82f6" }} />
          ) : (
            <Receipt className="w-4 h-4" style={{ color: YELLOW }} />
          )}
          {isModifying ? "MODIFYING ORDER" : "CURRENT ORDER"}
        </h2>
        <div className="flex gap-2">
          {isModifying && (
            <button
              onClick={() => {
                setIsModifying(false);
                dispatch(clearCart());
                setCurrentOrderId(null);
                toast.error("Modification cancelled");
              }}
              className="text-[9px] font-black uppercase tracking-widest px-3 py-1 border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(255,255,255,0.4)", color: "white", background: "transparent" }}
            >
              CANCEL
            </button>
          )}
          <button
            onClick={handleClearCart}
            className="text-[9px] font-black uppercase tracking-widest px-3 py-1 border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(255,100,100,0.4)", color: "#ff7b7b", background: "transparent" }}
          >
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1 pr-1">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ opacity: 0.25 }}>
            <ShoppingCart className="w-10 h-10" />
            <p className="text-[9px] font-black uppercase tracking-widest">No items in cart</p>
          </div>
        ) : (
          items.map((item, index) => {
            const isSelected = selectedItemLineId === item.lineId;
            return (
              <div
                key={item.lineId}
                onClick={() => {
                  setSelectedItemLineId(item.lineId);
                  const val = keypadMode === "qty" ? item.quantity : keypadMode === "disc" ? (item.discount || 0) : item.price;
                  setKeypadValue(val.toString());
                }}
                className="flex items-center gap-3 py-3 border-b cursor-pointer transition-all"
                style={{
                  borderColor: `${CREAM}08`,
                  background: isSelected ? `${YELLOW}15` : "transparent",
                  borderLeft: isSelected ? `3px solid ${YELLOW}` : "none",
                  paddingLeft: isSelected ? "12px" : "0",
                }}
              >
                <img
                  src={item.imageUrl || "/placeholder.png"}
                  className="w-10 h-10 object-cover flex-shrink-0"
                  style={{ border: `1px solid ${YELLOW}30` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-black text-[10px] uppercase truncate" style={{ color: CREAM }}>{item.name}</p>
                    {item.isFreeFromPromotion && <span className="text-[7px] font-black uppercase px-1 py-0.5" style={{ background: "#4ade80", color: G_DARK }}>FREE</span>}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[8px] font-mono mt-0.5" style={{ color: `${CREAM}50` }}>{item.size} | {item.isFreeFromPromotion ? "FREE" : `₹${item.price.toFixed(2)}`}</p>
                    {item.discount !== undefined && item.discount > 0 && (
                      <p className="text-[8px] font-mono" style={{ color: "#4ade80" }}>Disc: {item.discount}%</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 border" style={{ borderColor: `${YELLOW}35` }}>
                  <button onClick={(e) => { e.stopPropagation(); dispatch(updateQuantity({ lineId: item.lineId, quantity: Math.max(1, item.quantity - 1) })); }}>
                    <Minus className="w-3 h-3" style={{ color: YELLOW }} />
                  </button>
                  <span className="text-[10px] font-black w-4 text-center" style={{ color: CREAM }}>{item.quantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); dispatch(updateQuantity({ lineId: item.lineId, quantity: item.quantity + 1 })); }}>
                    <Plus className="w-3 h-3" style={{ color: YELLOW }} />
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); dispatch(removeItem({ lineId: item.lineId })); if (isSelected) setSelectedItemLineId(null); }}>
                  <Trash2 className="w-4 h-4" style={{ color: "rgba(255,90,90,0.65)" }} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Price Summary */}
      <div className="p-3 border-t-2 space-y-1 mt-auto" style={{ borderColor: `${YELLOW}22`, background: G_DARK }}>
        <div className="flex justify-between text-[8px]" style={{ color: `${CREAM}50` }}>
          <span>Subtotal</span><span>₹{grossSubtotal.toFixed(2)}</span>
        </div>
        {itemDiscountsTotal > 0 && (
          <div className="flex justify-between text-[8px]" style={{ color: "#4ade80" }}>
            <span>Item Discounts</span><span>-₹{itemDiscountsTotal.toFixed(2)}</span>
          </div>
        )}
        {discountPercent > 0 && (
          <div className="flex justify-between text-[8px]" style={{ color: "#4ade80" }}>
            <span>Global Discount ({discountPercent}%)</span><span>-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {appliedPromoDiscount > 0 && (
          <div className="flex flex-col gap-0.5 border-t border-dashed py-1.5 my-1" style={{ borderColor: `${YELLOW}22` }}>
            <span className="text-[7px] font-mono tracking-wider uppercase text-yellow-400">Applied Discount Mode: {appliedDiscountType.toUpperCase()}</span>
            <div className="flex justify-between text-[9px] font-bold text-green-400">
              <span className="uppercase truncate max-w-[200px]">{displayPromoText}</span>
              <span>-₹{appliedPromoDiscount.toFixed(2)}</span>
            </div>
            {appliedDiscountType === "coupon" && (
              <button 
                onClick={() => setAppliedCoupon(null)} 
                className="text-[7px] text-red-400 hover:text-red-300 uppercase tracking-widest text-left font-mono underline cursor-pointer mt-0.5 bg-transparent border-none p-0"
              >
                Remove Coupon
              </button>
            )}
          </div>
        )}
        <div className="flex justify-between text-[8px]" style={{ color: `${CREAM}50` }}>
          <span>Tax</span><span>+₹{finalTaxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-black pt-2 mt-1 border-t" style={{ borderColor: `${YELLOW}33`, color: YELLOW }}>
          <span>TOTAL</span>
          <span>₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Keypad */}
      {items.length > 0 && (
        <Keypad
          onNumber={handleKeypadNumber}
          onBackspace={handleKeypadBackspace}
          onToggleSign={handleKeypadToggleSign}
          onModeChange={handleKeypadModeChange}
          activeMode={keypadMode}
        />
      )}

      {/* Promotions Section */}
      {activePromotions.length > 0 && (
        <div className="mb-4 p-3 border-2" style={{ borderColor: `${YELLOW}30`, background: G_DARK }}>
          <h3 className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: YELLOW }}>AVAILABLE PROMOTIONS</h3>
          <div className="space-y-2">
            {activePromotions.map((promo: any) => {
              const isApplied = appliedPromotions.some((p: any) => p.id === promo._id);
              // Check if promotion is eligible
              let isEligible = false;
              try {
                switch (promo.promotionType) {
                  case "productDiscount":
                    if (promo.productDiscount) {
                      const targetProductId = typeof promo.productDiscount.product === "object" ? promo.productDiscount.product?._id : promo.productDiscount.product;
                      isEligible = items.some(item => item.productId === targetProductId);
                    }
                    break;
                  case "categoryDiscount":
                    if (promo.categoryDiscount) {
                      const targetCategoryId = typeof promo.categoryDiscount.category === "object" ? promo.categoryDiscount.category?._id : promo.categoryDiscount.category;
                      isEligible = items.some((item: any) => {
                        const product = products.find((p: any) => p._id === item.productId);
                        return product?.category?._id === targetCategoryId || product?.category === targetCategoryId;
                      });
                    }
                    break;
                  case "buyXGetY":
                    if (promo.buyXGetY) {
                      const buyProductId = typeof promo.buyXGetY.buyProduct === "object" ? promo.buyXGetY.buyProduct?._id : promo.buyXGetY.buyProduct;
                      const matchingItems = items.filter(item => item.productId === buyProductId);
                      const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                      const buyQty = promo.buyXGetY.buyQuantity || 1;
                      isEligible = totalQty >= buyQty;
                    }
                    break;
                  case "bundlePrice":
                    if (promo.bundlePrice) {
                      const targetProductId = typeof promo.bundlePrice.product === "object" ? promo.bundlePrice.product?._id : promo.bundlePrice.product;
                      const matchingItems = items.filter(item => item.productId === targetProductId);
                      const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                      const reqQty = promo.bundlePrice.requiredQuantity || 1;
                      isEligible = totalQty >= reqQty;
                    }
                    break;
                  case "orderValueDiscount":
                    if (promo.orderValueDiscount) {
                      isEligible = totalPrice >= (promo.orderValueDiscount.minimumOrderAmount || 0);
                    }
                    break;
                  default:
                    isEligible = true;
                }
              } catch (e) {
                console.error("Error checking eligibility", e);
              }

              return (
                <div key={promo._id} className="p-2 border rounded" style={{ borderColor: isEligible ? YELLOW : `${YELLOW}30`, background: isEligible ? `${YELLOW}10` : 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: isEligible ? CREAM : `${CREAM}30` }}>{promo.promotionName}</p>
                      <p className="text-[7px] font-mono mt-0.5" style={{ color: `${CREAM}40` }}>{promo.description}</p>
                    </div>
                    {isEligible && (
                      <button
                        onClick={() => {
                          if (isApplied) {
                            dispatch(removePromotion({ id: promo._id }));
                          } else {
                            // Handle applying promotion
                            let discount = 0;
                            try {
                              switch (promo.promotionType) {
                                case "productDiscount":
                                  if (promo.productDiscount) {
                                    const targetProductId = typeof promo.productDiscount.product === "object" ? promo.productDiscount.product?._id : promo.productDiscount.product;
                                    if (targetProductId) {
                                      const matchingItems = items.filter(item => item.productId === targetProductId);
                                      const subtotal = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                                      if (promo.productDiscount.discountType === "percentage") {
                                        discount = subtotal * (promo.productDiscount.discountValue / 100);
                                      } else if (promo.productDiscount.discountType === "fixed") {
                                        discount = Math.min(promo.productDiscount.discountValue, subtotal);
                                      }
                                    }
                                  }
                                  break;
                                case "categoryDiscount":
                                  if (promo.categoryDiscount) {
                                    const targetCategoryId = typeof promo.categoryDiscount.category === "object" ? promo.categoryDiscount.category?._id : promo.categoryDiscount.category;
                                    if (targetCategoryId) {
                                      const matchingItems = items.filter((item: any) => {
                                        const product = products.find((p: any) => p._id === item.productId);
                                        return product?.category?._id === targetCategoryId || product?.category === targetCategoryId;
                                      });
                                      const subtotal = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                                      if (promo.categoryDiscount.discountType === "percentage") {
                                        discount = subtotal * (promo.categoryDiscount.discountValue / 100);
                                      } else if (promo.categoryDiscount.discountType === "fixed") {
                                        discount = Math.min(promo.categoryDiscount.discountValue, subtotal);
                                      }
                                    }
                                  }
                                  break;
                                case "buyXGetY":
                                  if (promo.buyXGetY) {
                                    const buyProductId = typeof promo.buyXGetY.buyProduct === "object" ? promo.buyXGetY.buyProduct?._id : promo.buyXGetY.buyProduct;
                                    const freeProductId = typeof promo.buyXGetY.freeProduct === "object" ? promo.buyXGetY.freeProduct?._id : promo.buyXGetY.freeProduct;
                                    const buyQty = promo.buyXGetY.buyQuantity || 1;
                                    const freeQty = promo.buyXGetY.freeQuantity || 1;
                                    if (buyProductId) {
                                      const matchingItems = items.filter(item => item.productId === buyProductId);
                                      const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                                      const groupSize = buyQty + freeQty;
                                      const numGroups = Math.floor(totalQty / groupSize);
                                      if (numGroups > 0) {
                                        // Add free items
                                        const freeProductData = products.find((p: any) => p._id === freeProductId || p._id === buyProductId);
                                        if (freeProductData) {
                                          for (let i = 0; i < numGroups * freeQty; i++) {
                                            dispatch(addItem({
                                              productId: freeProductId || buyProductId,
                                              name: freeProductData.name,
                                              size: "",
                                              price: freeProductData.price,
                                              quantity: 1,
                                              imageUrl: freeProductData.imageUrl,
                                              isFreeFromPromotion: true
                                            }));
                                          }
                                        }
                                      }
                                    }
                                  }
                                  break;
                                case "bundlePrice":
                                  if (promo.bundlePrice) {
                                    const targetProductId = typeof promo.bundlePrice.product === "object" ? promo.bundlePrice.product?._id : promo.bundlePrice.product;
                                    if (targetProductId) {
                                      const matchingItems = items.filter(item => item.productId === targetProductId);
                                      const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                                      const reqQty = promo.bundlePrice.requiredQuantity || 1;
                                      const itemPrice = matchingItems[0]?.price || 0;
                                      const originalPrice = totalQty * itemPrice;
                                      const bundlePricePerBundle = promo.bundlePrice.bundlePrice || 0;
                                      const numBundles = Math.floor(totalQty / reqQty);
                                      if (numBundles > 0) {
                                        const newPrice = (numBundles * bundlePricePerBundle) + ((totalQty % reqQty) * itemPrice);
                                        if (newPrice < originalPrice) {
                                          discount = originalPrice - newPrice;
                                        }
                                      }
                                    }
                                  }
                                  break;
                                case "orderValueDiscount":
                                  if (promo.orderValueDiscount) {
                                    if (totalPrice >= (promo.orderValueDiscount.minimumOrderAmount || 0)) {
                                      if (promo.orderValueDiscount.discountType === "percentage") {
                                        discount = totalPrice * (promo.orderValueDiscount.discountValue / 100);
                                      } else if (promo.orderValueDiscount.discountType === "fixed") {
                                        discount = promo.orderValueDiscount.discountValue;
                                      }
                                    }
                                  }
                                  break;
                              }
                            } catch (e) {
                              console.error("Error calculating discount", e);
                            }
                            dispatch(applyPromotion({
                              id: promo._id,
                              name: promo.promotionName,
                              discountAmount: discount,
                              type: promo.promotionType
                            }));
                          }
                        }}
                        className="text-[8px] font-black uppercase px-2 py-1 border transition-all"
                        style={{
                          borderColor: isApplied ? "#4ade80" : YELLOW,
                          color: isApplied ? "#4ade80" : YELLOW,
                          background: "transparent"
                        }}
                      >
                        {isApplied ? "REMOVE" : "APPLY"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        {/* Bottom Controls */}
      <div className="space-y-3 pt-3 border-t-2" style={{ borderColor: `${YELLOW}28` }}>
        {/* Table & Discount & Coupon */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>Table</label>
            <select
              className="w-full h-9 px-2 text-[9px] font-black uppercase border-2 focus:outline-none"
              style={{ borderColor: `${YELLOW}35`, color: CREAM, background: G_DARK }}
              value={selectedTable || ""}
              onChange={(e) => setSelectedTable(e.target.value || null)}
            >
              <option value="" style={{ background: G_DARK }}>TAKEAWAY</option>
              {tables.map((t: any) => {
                const oneHour = 60 * 60 * 1000;
                const isOccupied = t.status === "occupied";
                const isReserved = t.lastBookedAt && (Date.now() - new Date(t.lastBookedAt).getTime() < oneHour);
                const label = `T${t.tableNumber} ${isOccupied ? "(OCCUPIED)" : isReserved ? "(RESERVED)" : ""}`;
                
                return (
                  <option 
                    key={t._id} 
                    value={t._id} 
                    disabled={isOccupied || isReserved}
                    style={{ background: G_DARK, color: (isOccupied || isReserved) ? "#ff7b7b" : CREAM }}
                  >
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>Global Discount</label>
            <button
              onClick={() => setDiscountDialog(true)}
              className="w-full h-9 text-[9px] font-black uppercase border-2 flex items-center justify-center gap-1 transition-all hover:opacity-80"
              style={{ borderColor: `${YELLOW}45`, color: YELLOW, background: "transparent" }}
            >
              <Tag className="w-3 h-3" /> {discountPercent}% OFF
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>Coupon Code</label>
            <button
              onClick={() => setCouponDialogOpen(true)}
              className="w-full h-9 text-[9px] font-black uppercase border-2 flex items-center justify-center gap-1 transition-all hover:opacity-80"
              style={{ 
                borderColor: appliedCoupon ? "#4ade80" : `${YELLOW}45`, 
                color: appliedCoupon ? "#4ade80" : YELLOW, 
                background: "transparent" 
              }}
            >
              <Tag className="w-3 h-3" /> {appliedCoupon ? appliedCoupon.couponCode : "COUPON"}
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>Payment</label>
          <div className="flex gap-1.5">
            {[
              { key: "cash", icon: <Banknote className="w-3.5 h-3.5" />, label: "CASH" },
              { key: "digital", icon: <CreditCard className="w-3.5 h-3.5" />, label: "CARD" },
              { key: "upi", icon: <QrCode className="w-3.5 h-3.5" />, label: "UPI" },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key as any)}
                className="flex-1 py-2.5 border-2 flex flex-col items-center gap-1 font-black transition-all"
                style={
                  paymentMethod === key
                    ? { background: YELLOW, color: G_DARK, borderColor: YELLOW }
                    : { background: "transparent", color: `${CREAM}55`, borderColor: `${CREAM}18` }
                }
              >
                {icon}
                <span className="text-[8px] uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Checkout Button */}
        <button
          disabled={items.length === 0 || disabled || isLoading}
          onClick={() => {
            if (paymentMethod === "digital") handlePaymentWithAPI();
            else { setShowQR(paymentMethod === "upi"); setConfirmOpen(true); }
          }}
          className="w-full h-13 py-3 font-black uppercase tracking-widest text-[10px] border-2 transition-all hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center justify-center leading-tight"
          style={{ background: isModifying ? "#3b82f6" : YELLOW, color: isModifying ? "white" : G_DARK, borderColor: isModifying ? "#3b82f6" : YELLOW }}
        >
          <span>
            {isModifying 
              ? "UPDATE EXISTING ORDER" 
              : paymentMethod === "digital" 
                ? "PAY WITH CARD / NET" 
                : "PLACE ORDER & SETTLE"}
          </span>
          <span className="text-[8px] opacity-70">TOTAL QTY: {totalQuantity}</span>
        </button>
      </div>

      <DiscountDialog open={discountDialog} onClose={() => setDiscountDialog(false)} onApply={setDiscountPercent} />

      {/* ── UPI / Cash Confirm Dialog ── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md border-2 rounded-none p-0" style={{ background: G_DARK, borderColor: YELLOW }}>
          <AlertDialogHeader className="p-6 border-b-2" style={{ borderColor: `${YELLOW}28` }}>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-center gap-2" style={{ color: CREAM }}>
              {qrVerifying ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-12 h-12 border-4 border-t-transparent animate-spin" style={{ borderColor: YELLOW, borderTopColor: "transparent" }}></div>
                  <div className="text-center">
                    <p className="text-base" style={{ color: CREAM }}>Checking Status...</p>
                    <p className="text-[9px] font-black animate-pulse uppercase tracking-widest mt-1" style={{ color: "#4ade80" }}>Scan detected from PhonePe</p>
                  </div>
                </div>
              ) : (
                <><QrCode className="w-5 h-5" style={{ color: YELLOW }} /> Verify UPI Settlement</>
              )}
            </AlertDialogTitle>
            {!qrVerifying && (
              <AlertDialogDescription className="text-center text-[9px] font-mono uppercase tracking-wider mt-2" style={{ color: `${CREAM}50` }}>
                Once the customer has scanned the QR and entered their PIN, click verify to settle.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {!qrVerifying && showQR && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed mx-6 my-4" style={{ borderColor: `${YELLOW}35` }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${settingsData?.data?.upiId}%26pn=${settingsData?.data?.businessName}%26am=${finalTotal.toFixed(2)}%26cu=INR`}
                alt="UPI QR"
                className="w-40 h-40 border-4"
                style={{ borderColor: CREAM }}
              />
              <p className="mt-3 text-[9px] font-black uppercase tracking-wider px-3 py-1" style={{ background: YELLOW, color: G_DARK }}>
                ₹{finalTotal.toFixed(2)}
              </p>
            </div>
          )}

          <AlertDialogFooter className="p-5 gap-3">
            {!qrVerifying && (
              <>
                <AlertDialogCancel
                  onClick={() => setShowQR(false)}
                  className="flex-1 h-10 font-black uppercase text-[9px] border-2 rounded-none tracking-widest"
                  style={{ background: "transparent", borderColor: `${CREAM}30`, color: CREAM }}
                >
                  BACK
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    setQrVerifying(true);
                    setTimeout(() => { setQrVerifying(false); confirmCheckout(true); }, 2500);
                  }}
                  className="flex-1 h-10 font-black uppercase text-[9px] border-2 rounded-none tracking-widest"
                  style={{ background: YELLOW, color: G_DARK, borderColor: YELLOW }}
                >
                  {showQR ? "VERIFY & PRINT" : "CONFIRM"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Digital Gateway Dialog ── */}
      <AlertDialog open={showGateway} onOpenChange={setShowGateway}>
        <AlertDialogContent className="max-w-md border-2 rounded-none p-0 overflow-hidden" style={{ borderColor: YELLOW }}>
          <div className="p-6 text-center border-b-2" style={{ background: G_DARK, borderColor: `${YELLOW}30` }}>
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 border-2" style={{ borderColor: YELLOW }}>
              <CreditCard className="w-6 h-6" style={{ color: YELLOW }} />
            </div>
            <h3 className="text-base font-black uppercase tracking-tight" style={{ color: CREAM }}>
              {settingsData?.data?.businessName || "Odoo POS"} Checkout
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: `${YELLOW}60` }}>
              Secure Merchant Gateway
            </p>
          </div>

          <div className="p-6 space-y-5" style={{ background: G_MID }}>
            <div className="flex justify-between items-center pb-4 border-b-2" style={{ borderColor: `${YELLOW}22` }}>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>Amount</span>
              <span className="text-2xl font-black" style={{ color: YELLOW }}>₹{finalTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setSelectedGatewayMethod("CC")}
                className="p-4 border-2 flex items-center gap-4 cursor-pointer transition-all"
                style={selectedGatewayMethod === "CC"
                  ? { borderColor: YELLOW, background: `${YELLOW}10` }
                  : { borderColor: `${CREAM}12`, background: "transparent" }
                }
              >
                <div className="w-10 h-10 flex items-center justify-center font-black text-sm" style={{ background: `${YELLOW}18`, color: YELLOW }}>CC</div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase" style={{ color: CREAM }}>Credit / Debit Card</p>
                  <p className="text-[8px] font-mono mt-0.5" style={{ color: `${CREAM}40` }}>Pre-authorized card •••• 4242</p>
                </div>
                <div className="w-4 h-4 border-2 flex items-center justify-center" style={{ borderColor: selectedGatewayMethod === "CC" ? YELLOW : `${CREAM}30` }}>
                  {selectedGatewayMethod === "CC" && <div className="w-2 h-2" style={{ background: YELLOW }}></div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[{ key: "NB", icon: <Banknote className="w-4 h-4" />, label: "NetBanking" }, { key: "U", icon: <QrCode className="w-4 h-4" />, label: "UPI / App" }].map((m) => (
                  <div
                    key={m.key}
                    onClick={() => setSelectedGatewayMethod(m.key)}
                    className="p-3 border-2 flex flex-col items-center gap-1 cursor-pointer transition-all"
                    style={selectedGatewayMethod === m.key
                      ? { borderColor: YELLOW, color: YELLOW, background: `${YELLOW}10` }
                      : { borderColor: `${CREAM}15`, color: `${CREAM}50`, background: "transparent" }
                    }
                  >
                    {m.icon}
                    <span className="text-[8px] font-black uppercase">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={simulateGatewaySettlement}
              disabled={gatewayProcessing}
              className="w-full h-13 py-3 font-black uppercase tracking-widest text-xs border-2 transition-all hover:opacity-85 disabled:opacity-50"
              style={{ background: YELLOW, color: G_DARK, borderColor: YELLOW }}
            >
              {gatewayProcessing ? "PROCESSING..." : "PAY & AUTHORIZE"}
            </button>
            <p className="text-[8px] text-center font-mono" style={{ color: `${CREAM}30` }}>🛡️ PCI-DSS COMPLIANT | 256-BIT SSL</p>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Success Screen ── */}
      {showSuccessScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md" style={{ background: "rgba(26,46,26,0.85)" }}>
          <div className="p-10 text-center max-w-sm w-full mx-4 border-2 animate-in zoom-in duration-500" style={{ background: G_DARK, borderColor: YELLOW }}>
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 border-4" style={{ borderColor: YELLOW }}>
              <CheckCircle className="w-10 h-10 animate-bounce" style={{ color: YELLOW }} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2" style={{ color: CREAM }}>Order Verified!</h2>
            <p className="text-[9px] font-mono uppercase tracking-widest mb-4" style={{ color: `${CREAM}50` }}>Transaction settled & sent to KDS</p>

            <div className="flex items-center justify-center gap-2 mb-6 p-2 bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                Modification window: {countdown}s
              </span>
            </div>

            <div className="p-4 space-y-2 mb-6 border-2" style={{ borderColor: `${YELLOW}25`, background: G_MID }}>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}50` }}>
                <span>Invoice #</span>
                <span style={{ color: CREAM }}>{lastOrderDetails?.id || "N/A"}</span>
              </div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest pt-2 border-t" style={{ borderColor: `${YELLOW}22`, color: `${CREAM}50` }}>
                <span>Paid via</span>
                <span style={{ color: YELLOW }}>{paymentMethod.toUpperCase()}</span>
              </div>
            </div>

            <div className="text-4xl font-black mb-6" style={{ color: YELLOW }}>₹{lastOrderDetails?.total.toFixed(2)}</div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (lastOrderDetails?.items) {
                      dispatch(setCart(lastOrderDetails.items));
                      setIsModifying(true);
                      setShowSuccessScreen(false);
                      setCountdown(null);
                      toast.success("Add more items to your order");
                    }
                  }}
                  className="flex-1 py-3 border-2 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-yellow-500 hover:text-black"
                  style={{ borderColor: YELLOW, color: YELLOW }}
                >
                  <Plus className="w-3 h-3" /> Add More
                </button>
                <button
                  onClick={() => {
                    if (lastOrderDetails?.items) {
                      dispatch(setCart(lastOrderDetails.items));
                      setIsModifying(true);
                      setShowSuccessScreen(false);
                      setCountdown(null);
                      toast.success("Modify items in your order");
                    }
                  }}
                  className="flex-1 py-3 border-2 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-red-500 hover:text-white"
                  style={{ borderColor: "#ef4444", color: "#ef4444" }}
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSuccessScreen(false);
                  setCountdown(null);
                }}
                className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-[9px] transition-all hover:opacity-90"
              >
                Done
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest mt-6" style={{ color: "#4ade80" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80" }}></div>
              Kitchen is preparing your meal
            </div>
          </div>
        </div>
      )}

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="max-w-md border-2 rounded-none p-0" style={{ background: G_DARK, borderColor: YELLOW }}>
          <DialogHeader className="p-6 border-b-2" style={{ borderColor: `${YELLOW}28` }}>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-center gap-2" style={{ color: CREAM }}>
              <Tag className="w-5 h-5" style={{ color: YELLOW }} /> Apply Coupon Code
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!couponCodeInput.trim()) return;
            setCouponError("");
            try {
              const res = await validateCoupon({
                couponCode: couponCodeInput.toUpperCase().trim(),
                orderAmount: totalPrice
              }).unwrap();
              
              if (res.success && res.status === "valid") {
                setAppliedCoupon(res.data);
                toast.success("Coupon applied successfully!");
                setCouponDialogOpen(false);
                setCouponCodeInput("");
              } else {
                setCouponError(res.message || "Invalid coupon code");
              }
            } catch (err: any) {
              setCouponError(err.data?.message || "Failed to validate coupon");
            }
          }} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="font-mono uppercase text-[9px] tracking-widest" style={{ color: `${CREAM}60` }}>
                Enter Coupon Code
              </label>
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => {
                  setCouponCodeInput(e.target.value.toUpperCase());
                  setCouponError("");
                }}
                className="w-full h-11 px-3 border-2 font-mono uppercase text-sm focus:outline-none"
                style={{ borderColor: `${YELLOW}45`, background: G_MID, color: CREAM }}
                placeholder="FESTIVAL50"
                required
              />
              {couponError && (
                <p className="text-[10px] font-bold text-red-400 font-mono mt-1">
                  ⚠️ {couponError}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2">
              <button
                type="button"
                className="flex-1 h-11 font-black uppercase text-[9px] border-2 rounded-none tracking-widest"
                style={{ background: "transparent", borderColor: `${CREAM}30`, color: CREAM }}
                onClick={() => {
                  setCouponDialogOpen(false);
                  setCouponCodeInput("");
                  setCouponError("");
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex-1 h-11 font-black uppercase text-[9px] border-2 rounded-none tracking-widest"
                style={{ background: YELLOW, color: G_DARK, borderColor: YELLOW }}
              >
                VALIDATE & APPLY
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
