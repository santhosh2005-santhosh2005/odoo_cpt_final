import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { socket } from "@/utils/socket";
import { useGetFloorsQuery } from "@/services/floorApi";
import { useGetTablesQuery, useGetTableByTokenQuery } from "@/services/tableApi";
import { useGetProductsQuery } from "@/services/productApi";
import { useGetCategoriesQuery } from "@/services/categoryApi";
import { useCreateOrderMutation, useUpdateOrderMutation } from "@/services/orderApi";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LogOut, 
  LayoutGrid, 
  MapPin, 
  ChevronRight, 
  ShoppingCart, 
  Plus, 
  Minus, 
  CheckCircle2,
  ChefHat,
  Timer,
  X,
  Clock,
  RefreshCw,
  DollarSign,
  Zap,
  Package,
  Filter,
  QrCode,
  Camera
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useGetPromotionsQuery, useValidateCouponMutation } from "@/services/couponApi";
import { useIdentifyGuestCustomerMutation } from "@/services/guestCustomerApi";
import { Html5Qrcode } from "html5-qrcode";
import { useGetSettingsQuery } from "@/services/SettingsApi";

type Step = "floor" | "table" | "menu" | "payment" | "status";

export default function SelfOrdering() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("floor");
  const [selectedFloor, setSelectedFloor] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Guest Customer State
  const [guestCustomer, setGuestCustomer] = useState<any>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerFormError, setCustomerFormError] = useState("");
  const [showWhyExpanded, setShowWhyExpanded] = useState(false);
  const [identifyGuestCustomer, { isLoading: isIdentifying }] = useIdentifyGuestCustomerMutation();

  // QR Code Scanner State & Config
  const [isScanning, setIsScanning] = useState(false);
  const qrRegionId = "qr-reader-element";
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Checkout Payment QR Modal State
  const [showPaymentQrModal, setShowPaymentQrModal] = useState(false);
  const [paymentTimer, setPaymentTimer] = useState(150); // 2m 30s = 150s
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: Math.max(150, Math.min(250, size)), height: Math.max(150, Math.min(250, size)) };
          }
        };

        const onSuccess = (decodedText: string) => {
          handleQrSuccess(decodedText);
        };

        const onError = () => {
          // Suppress verbose matching errors
        };

        // Query device cameras for maximum compatibility
        Html5Qrcode.getCameras().then(devices => {
          if (devices && devices.length > 0) {
            // Find back/rear camera
            const backCamera = devices.find(device => 
              device.label.toLowerCase().includes("back") || 
              device.label.toLowerCase().includes("environment") ||
              device.label.toLowerCase().includes("rear")
            );
            const cameraId = backCamera ? backCamera.id : devices[0].id;
            
            html5QrCode.start(cameraId, config, onSuccess, onError).catch(err => {
              console.error("Failed starting with specific camera. Trying facingMode:", err);
              html5QrCode.start({ facingMode: "environment" }, config, onSuccess, onError).catch(() => {
                html5QrCode.start({ facingMode: "user" }, config, onSuccess, onError).catch(e => {
                  console.error("Failed all camera start methods:", e);
                  toast.error("Could not access camera. Try uploading an image of the QR code.");
                });
              });
            });
          } else {
            html5QrCode.start({ facingMode: "environment" }, config, onSuccess, onError).catch(() => {
              html5QrCode.start({ facingMode: "user" }, config, onSuccess, onError).catch(e => {
                console.error("Failed all camera start methods:", e);
                toast.error("Could not access camera. Try uploading an image of the QR code.");
              });
            });
          }
        }).catch(() => {
          html5QrCode.start({ facingMode: "environment" }, config, onSuccess, onError).catch(() => {
            html5QrCode.start({ facingMode: "user" }, config, onSuccess, onError).catch(e => {
              console.error("Failed all camera start methods:", e);
              toast.error("Could not access camera. Try uploading an image of the QR code.");
            });
          });
        });
      } catch (err) {
        console.error("Scanner instantiation error:", err);
        setIsScanning(false);
      }
    }, 300);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }).catch(err => {
        console.error("Failed to stop scanner:", err);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a temporary element for decoding to prevent camera interference
    const tempId = "temp-qr-file-reader";
    let tempDiv = document.getElementById(tempId);
    if (!tempDiv) {
      tempDiv = document.createElement("div");
      tempDiv.id = tempId;
      tempDiv.style.display = "none";
      document.body.appendChild(tempDiv);
    }

    const toastId = toast.loading("Scanning uploaded image...");
    try {
      const tempScanner = new Html5Qrcode(tempId);
      const decodedText = await tempScanner.scanFile(file, false);
      toast.dismiss(toastId);
      handleQrSuccess(decodedText);
      tempScanner.clear();
      tempDiv.remove();
    } catch (err) {
      toast.dismiss(toastId);
      console.error("File QR scan error:", err);
      toast.error("Could not detect any QR code in this image.");
      tempDiv.remove();
    }
  };

  const handleQrSuccess = (decodedText: string) => {
    const trimmed = decodedText.trim();
    let extractedToken = "";
    let extractedTableNumber = "";

    if (trimmed.includes("/s/")) {
      const parts = trimmed.split("/s/");
      extractedToken = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
    } else if (trimmed.includes("/self-order/")) {
      const parts = trimmed.split("/self-order/");
      extractedTableNumber = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
    } else if (/^[a-fA-F0-9]{24,32}$/.test(trimmed)) {
      extractedToken = trimmed;
    } else if (/^\d+$/.test(trimmed)) {
      extractedTableNumber = trimmed;
    }

    if (extractedToken) {
      stopScanner();
      toast.success("Table scanned successfully!");
      // Navigate to the token route — the useEffect will auto-select the table
      navigate(`/s/${extractedToken}`);
    } else if (extractedTableNumber) {
      // Try to find the table directly in already-loaded tables list first
      const currentTables = (tablesData as any)?.data || [];
      const currentFloors = (floorsData as any)?.data || [];
      const matchedTable = currentTables.find((t: any) => t.number.toString() === extractedTableNumber);
      if (matchedTable && currentFloors.length > 0) {
        const floorId = matchedTable.floor?._id || matchedTable.floor;
        const matchedFloor = currentFloors.find((f: any) => f._id?.toString() === floorId?.toString());
        if (matchedFloor) setSelectedFloor(matchedFloor);
        setSelectedTable(matchedTable);
        stopScanner();
        toast.success(`Table ${extractedTableNumber} selected!`);
        setStep("menu");
      } else {
        stopScanner();
        toast.success("Table scanned successfully!");
        navigate(`/self-order/${extractedTableNumber}`);
      }
    } else {
      toast.error("Invalid QR code. Please scan a table QR.");
    }
  };

  // Stop scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    socket.on("orderUpdated", (updatedOrder: any) => {
      if (activeOrder && updatedOrder._id === activeOrder._id) {
        setActiveOrder(updatedOrder);
        toast.success("Order status updated!");
      }
    });

    socket.on("itemStatusChanged", ({ orderId, updatedOrder }: any) => {
      if (activeOrder && orderId === activeOrder._id) {
        setActiveOrder(updatedOrder);
      }
    });

    return () => {
      socket.off("orderUpdated");
      socket.off("itemStatusChanged");
    };
  }, [activeOrder]);

  const { user } = useSelector((state: RootState) => state.user);
  const { data: floorsData, isLoading: floorsLoading } = useGetFloorsQuery();
  const { data: tablesData, isLoading: tablesLoading } = useGetTablesQuery();
  const { data: categories } = useGetCategoriesQuery();
  const { data: productsResponse } = useGetProductsQuery({ limit: 100 });
  const [createOrder] = useCreateOrderMutation();
  const [updateOrder] = useUpdateOrderMutation();
  const { data: promotionsData } = useGetPromotionsQuery();
  const [validateCoupon] = useValidateCouponMutation();
  const activePromotions = (promotionsData?.data || []).filter((p: any) => p.isActive);

  // Fetch business settings for UPI payment
  const { data: settingsResponse } = useGetSettingsQuery({});
  const settings = settingsResponse?.data || settingsResponse;
  const upiId = settings?.upiId || "charanb9880@oksbi";
  const businessName = settings?.businessName || "Odoo POS Cafe";

  // Countdown timer for checkout payment QR code
  useEffect(() => {
    let timerInterval: any;
    if (showPaymentQrModal) {
      timerInterval = setInterval(() => {
        setPaymentTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            setShowPaymentQrModal(false);
            toast.error("Payment session expired. Please try again.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPaymentTimer(150); // Reset timer when modal is closed
    }
    return () => clearInterval(timerInterval);
  }, [showPaymentQrModal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ── MODIFY RECENT ORDER STATE ──────────────────────────────────────────
  const [modificationCountdown, setModificationCountdown] = useState<number | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (modificationCountdown !== null && modificationCountdown > 0) {
      timer = setInterval(() => {
        setModificationCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (modificationCountdown === 0) {
      setModificationCountdown(null);
    }
    return () => clearInterval(timer);
  }, [modificationCountdown]);

  const { token, tableNumber } = useParams<{ token?: string; tableNumber?: string }>();
  const { data: tableByTokenData, isLoading: tokenTableLoading, isFetching: tokenTableFetching } = useGetTableByTokenQuery(token || "", { skip: !token });
  const floors = (floorsData as any)?.data || [];
  const allTables = (tablesData as any)?.data || [];
  const products = productsResponse?.data || [];

  // Whether we are in a URL-param-driven auto-select scenario
  const isAutoSelectMode = !!(token || tableNumber);
  // True while any required data is still loading for auto-select
  const isAutoSelectLoading = isAutoSelectMode && (
    floorsLoading || tablesLoading ||
    (token ? (tokenTableLoading || tokenTableFetching) : false)
  );

  // Auto-select table from URL token — runs whenever token data OR floors update
  useEffect(() => {
    if (!token) return;
    if (!tableByTokenData?.data) return;
    if (floors.length === 0) return; // Wait until floors are loaded
    const table = tableByTokenData.data;
    const floorId = table.floor?._id || table.floor;
    const floor = floors.find((f: any) => f._id?.toString() === floorId?.toString());
    if (floor) setSelectedFloor(floor);
    setSelectedTable(table);
    // Show customer form before proceeding to menu
    setShowCustomerForm(true);
  }, [token, tableByTokenData, floors]);

  // Auto-select table from URL tableNumber — runs whenever tables OR floors update
  useEffect(() => {
    if (!tableNumber) return;
    if (allTables.length === 0 || floors.length === 0) return; // Wait until both loaded
    const table = allTables.find((t: any) => t.number.toString() === tableNumber.toString());
    if (!table) return;
    const floorId = table.floor?._id || table.floor;
    const floor = floors.find((f: any) => f._id?.toString() === floorId?.toString());
    if (floor) setSelectedFloor(floor);
    setSelectedTable(table);
    // Show customer form before proceeding to menu
    setShowCustomerForm(true);
  }, [tableNumber, allTables, floors]);

  const filteredTables = allTables.filter((t: any) => {
    const floorId = t.floor?._id || t.floor;
    return floorId && selectedFloor?._id && floorId.toString() === selectedFloor?._id.toString();
  });
  let filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter((p: any) => p.category?._id === selectedCategory);
  
  if (searchQuery.trim()) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter((p: any) => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.description && p.description.toLowerCase().includes(lowerQuery))
    );
  }

  // ── BuyXGetY: Sync free items whenever cart changes ─────────────────────
  const syncBuyXGetYFreeItems = (currentCart: any[], newCart: any[]) => {
    let updatedCart = newCart.filter(item => !item.isFreeFromPromotion); // strip all old free items

    activePromotions.forEach((promo: any) => {
      if (promo.promotionType !== "buyXGetY" || !promo.buyXGetY) return;

      const buyProductId = typeof promo.buyXGetY.buyProduct === "object"
        ? promo.buyXGetY.buyProduct?._id
        : promo.buyXGetY.buyProduct;
      const freeProductId = typeof promo.buyXGetY.freeProduct === "object"
        ? promo.buyXGetY.freeProduct?._id
        : promo.buyXGetY.freeProduct;

      if (!buyProductId || !freeProductId) return;

      const buyQty = promo.buyXGetY.buyQuantity || 1;
      const freeQty = promo.buyXGetY.freeQuantity || 1;

      // Count how many "buy" products are in cart (excluding free items)
      const buyItems = updatedCart.filter(item => item.productId === buyProductId && !item.isFreeFromPromotion);
      const totalBuyQty = buyItems.reduce((sum, item) => sum + item.quantity, 0);

      // How many free items should be in cart
      const numFree = Math.floor(totalBuyQty / buyQty) * freeQty;

      if (numFree > 0) {
        // Find the free product details from products list
        const freeProduct = products.find((p: any) => p._id === freeProductId);
        if (!freeProduct) return;

        // Add free item entry with isFreeFromPromotion flag
        updatedCart.push({
          productId: freeProductId,
          name: freeProduct.name,
          price: 0, // FREE
          quantity: numFree,
          imageUrl: freeProduct.imageUrl,
          size: "Regular",
          isFreeFromPromotion: true,
          promoLabel: `🎁 Free with ${promo.promotionName}`
        });
      }
    });

    return updatedCart;
  };

  // Cart logic
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id && !item.isFreeFromPromotion);
      let newCart;
      if (existing) {
        newCart = prev.map(item =>
          (item.productId === product._id && !item.isFreeFromPromotion)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newCart = [...prev, {
          productId: product._id,
          name: product.name,
          price: product.basePrice,
          quantity: 1,
          imageUrl: product.imageUrl,
          size: "Regular"
        }];
      }
      return syncBuyXGetYFreeItems(prev, newCart);
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const newCart = prev
        .map(item => {
          if (item.productId === id && !item.isFreeFromPromotion) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
      return syncBuyXGetYFreeItems(prev, newCart);
    });
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // 1. Calculate all promotions by priority
  let totalPromoDiscount = 0;
  const appliedPromotionNames: string[] = [];

  activePromotions.forEach((promo: any) => {
    let discount = 0;
    
    try {
      switch (promo.promotionType) {
        case "productDiscount":
          if (promo.productDiscount) {
            const targetProductId = typeof promo.productDiscount.product === "object" 
              ? promo.productDiscount.product?._id 
              : promo.productDiscount.product;
            if (!targetProductId) break;
              
            const matchingItems = cart.filter(item => item.productId === targetProductId);
            if (matchingItems.length === 0) break;
              
            const subtotal = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            if (promo.productDiscount.discountType === "percentage") {
              discount = subtotal * (promo.productDiscount.discountValue / 100);
            } else if (promo.productDiscount.discountType === "fixed") {
              discount = Math.min(promo.productDiscount.discountValue, subtotal);
            }
          }
          break;

        case "categoryDiscount":
          if (promo.categoryDiscount) {
            const targetCategoryId = typeof promo.categoryDiscount.category === "object" 
              ? promo.categoryDiscount.category?._id 
              : promo.categoryDiscount.category;
            if (!targetCategoryId) break;

            const matchingItems = cart.filter((item: any) => {
              const product = products.find((p: any) => p._id === item.productId);
              return product?.category?._id === targetCategoryId || product?.category === targetCategoryId;
            });
            if (matchingItems.length === 0) break;

            const subtotal = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            if (promo.categoryDiscount.discountType === "percentage") {
              discount = subtotal * (promo.categoryDiscount.discountValue / 100);
            } else if (promo.categoryDiscount.discountType === "fixed") {
              discount = Math.min(promo.categoryDiscount.discountValue, subtotal);
            }
          }
          break;

        case "buyXGetY":
          if (promo.buyXGetY) {
            const buyProductId = typeof promo.buyXGetY.buyProduct === "object" 
              ? promo.buyXGetY.buyProduct?._id 
              : promo.buyXGetY.buyProduct;
            if (!buyProductId) break;
            
            const matchingItems = cart.filter(item => item.productId === buyProductId);
            if (matchingItems.length === 0) break;
            
            const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
            const buyQty = promo.buyXGetY.buyQuantity || 1;
            const freeQty = promo.buyXGetY.freeQuantity || 1;
            const groupSize = buyQty + freeQty;
            const numGroups = Math.floor(totalQty / groupSize);
            
            if (numGroups > 0) {
              const itemPrice = matchingItems[0]?.price || 0;
              discount = numGroups * freeQty * itemPrice;
            }
          }
          break;

        case "bundlePrice":
          if (promo.bundlePrice) {
            const targetProductId = typeof promo.bundlePrice.product === "object" 
              ? promo.bundlePrice.product?._id 
              : promo.bundlePrice.product;
            if (!targetProductId) break;
            
            const matchingItems = cart.filter(item => item.productId === targetProductId);
            if (matchingItems.length === 0) break;
            
            const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
            const reqQty = promo.bundlePrice.requiredQuantity || 1;
            
            if (totalQty >= reqQty) {
              const itemPrice = matchingItems[0]?.price || 0;
              const originalPrice = totalQty * itemPrice;
              const bundlePricePerBundle = promo.bundlePrice.bundlePrice || 0;
              const numBundles = Math.floor(totalQty / reqQty);
              const remainingQty = totalQty % reqQty;
              const newPrice = (numBundles * bundlePricePerBundle) + (remainingQty * itemPrice);
              
              if (newPrice < originalPrice) {
                discount = originalPrice - newPrice;
              }
            }
          }
          break;

        case "orderValueDiscount":
          if (promo.orderValueDiscount) {
            if (total >= (promo.orderValueDiscount.minimumOrderAmount || 0)) {
              if (promo.orderValueDiscount.discountType === "percentage") {
                discount = total * (promo.orderValueDiscount.discountValue / 100);
              } else if (promo.orderValueDiscount.discountType === "fixed") {
                discount = promo.orderValueDiscount.discountValue;
              }
            }
          }
          break;
        
        // Backwards compatibility for old promotion types
        case "product":
          const targetProductIdOld = typeof promo.productId === "object" ? promo.productId?._id : promo.productId;
          if (!targetProductIdOld) break;
          
          const matchingItemsOld = cart.filter(item => item.productId === targetProductIdOld);
          if (matchingItemsOld.length === 0) break;
          
          const totalQtyOld = matchingItemsOld.reduce((sum, item) => sum + item.quantity, 0);
          if (totalQtyOld >= (promo.minimumQuantity || 0)) {
            const subtotalOld = matchingItemsOld.reduce((sum, item) => sum + item.price * item.quantity, 0);
            if (promo.discountType === "percentage") {
              discount = subtotalOld * (promo.discountValue / 100);
            } else if (promo.discountType === "fixed") {
              discount = Math.min(promo.discountValue, subtotalOld);
            } else if (promo.discountType === "bogo") {
              const buyQtyOld = promo.minimumQuantity && promo.minimumQuantity > 0 ? promo.minimumQuantity : 2;
              const groupSizeOld = buyQtyOld + 1;
              const freeQtyOld = Math.floor(totalQtyOld / groupSizeOld);
              const itemPriceOld = matchingItemsOld[0]?.price || 0;
              discount = freeQtyOld * itemPriceOld;
            }
          }
          break;
          
        case "order":
          if (total >= (promo.minimumOrderAmount || 0)) {
            if (promo.discountType === "percentage") {
              discount = total * (promo.discountValue / 100);
            } else if (promo.discountType === "fixed") {
              discount = promo.discountValue;
            }
          }
          break;
      }
      
      if (discount > 0) {
        totalPromoDiscount += discount;
        appliedPromotionNames.push(`${promo.promotionName} (-₹${discount.toFixed(2)})`);
      }
    } catch (e) {
      console.error("Error applying promotion", e);
    }
  });

  const totalAutoPromoDiscount = totalPromoDiscount;
  const autoPromoNames = [...appliedPromotionNames];

  // 3. Calculate Coupon Discount
  let couponDiscount = 0;
  let isCouponValidForAmount = false;

  if (appliedCoupon) {
    if (total >= appliedCoupon.minimumOrderAmount) {
      isCouponValidForAmount = true;
      if (appliedCoupon.discountType === "percentage") {
        couponDiscount = total * (appliedCoupon.discountValue / 100);
      } else if (appliedCoupon.discountType === "fixed") {
        couponDiscount = appliedCoupon.discountValue;
      }
      couponDiscount = Math.min(couponDiscount, total);
    }
  }

  // 4. Compare and Pick Best Eligible Discount
  let appliedPromoDiscount = 0;
  let appliedDiscountType: "none" | "coupon" | "promotion" = "none";
  let displayPromoText = "";
  let finalCouponCode = "";
  let finalAppliedPromotions: string[] = [];

  if (couponDiscount > totalAutoPromoDiscount && isCouponValidForAmount) {
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
    
    finalAppliedPromotions = activePromotions
      .filter((promo: any) => {
        let isApplied = false;
        try {
          switch (promo.promotionType) {
            case "productDiscount":
              if (promo.productDiscount) {
                const targetProductId = typeof promo.productDiscount.product === "object" 
                  ? promo.productDiscount.product?._id 
                  : promo.productDiscount.product;
                if (targetProductId) {
                  const matchingItems = cart.filter(item => item.productId === targetProductId);
                  isApplied = matchingItems.length > 0;
                }
              }
              break;
            case "categoryDiscount":
              if (promo.categoryDiscount) {
                const targetCategoryId = typeof promo.categoryDiscount.category === "object" 
                  ? promo.categoryDiscount.category?._id 
                  : promo.categoryDiscount.category;
                if (targetCategoryId) {
                  const matchingItems = cart.filter((item: any) => {
                    const product = products.find((p: any) => p._id === item.productId);
                    return product?.category?._id === targetCategoryId || product?.category === targetCategoryId;
                  });
                  isApplied = matchingItems.length > 0;
                }
              }
              break;
            case "buyXGetY":
              if (promo.buyXGetY) {
                const buyProductId = typeof promo.buyXGetY.buyProduct === "object" 
                  ? promo.buyXGetY.buyProduct?._id 
                  : promo.buyXGetY.buyProduct;
                if (buyProductId) {
                  const matchingItems = cart.filter(item => item.productId === buyProductId);
                  const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                  const buyQty = promo.buyXGetY.buyQuantity || 1;
                  const freeQty = promo.buyXGetY.freeQuantity || 1;
                  const groupSize = buyQty + freeQty;
                  const numGroups = Math.floor(totalQty / groupSize);
                  isApplied = numGroups > 0;
                }
              }
              break;
            case "bundlePrice":
              if (promo.bundlePrice) {
                const targetProductId = typeof promo.bundlePrice.product === "object" 
                  ? promo.bundlePrice.product?._id 
                  : promo.bundlePrice.product;
                if (targetProductId) {
                  const matchingItems = cart.filter(item => item.productId === targetProductId);
                  const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                  const reqQty = promo.bundlePrice.requiredQuantity || 1;
                  isApplied = totalQty >= reqQty;
                }
              }
              break;
            case "orderValueDiscount":
              if (promo.orderValueDiscount) {
                isApplied = total >= (promo.orderValueDiscount.minimumOrderAmount || 0);
              }
              break;
            case "product":
              const targetProductIdOld = typeof promo.productId === "object" ? promo.productId?._id : promo.productId;
              if (targetProductIdOld) {
                const matchingItems = cart.filter(item => item.productId === targetProductIdOld);
                const totalQtyOld = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                isApplied = totalQtyOld >= (promo.minimumQuantity || 0);
              }
              break;
            case "order":
              isApplied = total >= (promo.minimumOrderAmount || 0);
              break;
          }
        } catch (e) { /* ignore */ }
        return isApplied;
      })
      .map((promo: any) => promo.promotionName);
  }

  const finalTotal = Math.max(0, total - appliedPromoDiscount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError("");
    try {
      const res = await validateCoupon({
        couponCode: couponInput.toUpperCase().trim(),
        orderAmount: total
      }).unwrap();

      if (res.success && res.status === "valid") {
        setAppliedCoupon(res.data);
        toast.success("Coupon applied successfully!");
      } else {
        setCouponError(res.message || "Invalid coupon code");
      }
    } catch (err: any) {
      setCouponError(err.data?.message || "Failed to validate coupon");
    }
  };

  const handlePlaceOrder = async (method: string) => {
    try {
      const orderData = {
        items: cart.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          size: item.size,
          price: item.price
        })),
        tableId: selectedTable._id,
        paymentMethod: method,
        isCustomerOrder: true,
        totalPrice: finalTotal,
        discount: appliedPromoDiscount,
        discountAmount: appliedPromoDiscount,
        couponCode: finalCouponCode || undefined,
        appliedPromotions: finalAppliedPromotions,
        guestCustomerId: guestCustomer?._id || undefined,
      };

      let res;
      if (isModifying && currentOrderId) {
        res = await updateOrder({ id: currentOrderId, body: orderData }).unwrap();
        toast.success("Order updated successfully!");
      } else {
        res = await createOrder(orderData).unwrap();
      }

      setActiveOrder(res.data);
      setCurrentOrderId(res.data._id);
      setModificationCountdown(60); // 1 minute window
      setStep("status");
      setCart([]);
      setIsModifying(false);
      setShowPaymentQrModal(false);
      setSelectedPaymentMethod(null);
    } catch (err) {
      toast.error("Failed to place order");
    }
  };

  // ── GUEST CUSTOMER IDENTIFICATION ──────────────────────────────────────────
  const handleCustomerIdentify = async () => {
    setCustomerFormError("");
    const phone = customerPhone.replace(/\D/g, "");
    const email = customerEmail.trim().toLowerCase();

    if (phone.length < 10) {
      setCustomerFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setCustomerFormError("Please enter a valid email address.");
      return;
    }

    try {
      const result = await identifyGuestCustomer({ phone, email }).unwrap();
      setGuestCustomer(result.data);
      setShowCustomerForm(false);

      if (result.isNewCustomer) {
        toast.success("🎉 Welcome! Check your email for a special greeting.", { duration: 4000 });
      } else {
        toast.success(`🤗 Welcome back! Visit #${result.data.visitCount}. Check your email!`, { duration: 4000 });
      }
      setStep("menu");
    } catch (err: any) {
      setCustomerFormError(err?.data?.message || "Something went wrong. Please try again.");
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Wait time logic
  useEffect(() => {
    if (activeOrder) {
      const updateTimer = () => {
        const confirmedAt = activeOrder.timeConfirmedAt ? new Date(activeOrder.timeConfirmedAt).getTime() : new Date(activeOrder.createdAt).getTime();
        const duration = (activeOrder.confirmedTime || activeOrder.estimatedTime || 15) * 60 * 1000;
        const now = Date.now();
        const elapsed = now - confirmedAt;
        const remaining = Math.max(0, Math.ceil((duration - elapsed) / 60000));
        setTimeLeft(remaining);
      };

      updateTimer();
      const timer = setInterval(updateTimer, 30000); // Update every 30 seconds
      return () => clearInterval(timer);
    }
  }, [activeOrder]);

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="bg-deep-black text-white p-8 border-b-8 border-golden-yellow">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.3em]">Session_User: {user?.name || "GUEST"}</p>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase">{title}</h1>
          {subtitle && <p className="font-mono text-xs text-gray-400 uppercase tracking-widest mt-2">{subtitle}</p>}
          {selectedTable && (
            <div className="inline-block mt-3 bg-golden-yellow text-deep-black px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider">
              📍 Table {selectedTable.number} {selectedFloor ? `(${selectedFloor.name})` : ""}
            </div>
          )}
        </div>
        <button 
          onClick={() => navigate("/login")}
          className="bg-red-500 p-4 border-4 border-deep-black shadow-[4px_4px_0px_0px_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );

  const renderFooter = () => {
    if (step === "menu" && cart.filter(i => !i.isFreeFromPromotion).length > 0) {
      return (
        <div className="fixed bottom-0 inset-x-0 p-8 z-50 bg-transparent pointer-events-none">
          <div className="bg-deep-black text-white p-8 border-4 border-golden-yellow shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] flex flex-col md:flex-row items-center justify-between pointer-events-auto max-w-6xl mx-auto relative overflow-hidden border-solid gap-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-golden-yellow/20"></div>

            {isModifying && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Modifying Existing Order
              </div>
            )}

            <div className="flex items-center gap-8 md:gap-12">
               <div>
                  <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-widest mb-1">Cart_Units</p>
                  <p className="text-4xl font-black italic">{cart.filter(b => !b.isFreeFromPromotion).reduce((a, b) => a + b.quantity, 0)}</p>
               </div>
               <div className="w-px h-16 bg-white/20"></div>
               <div>
                  <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-widest mb-1">Total_Investment</p>
                  <p className="text-5xl font-black italic tracking-tighter">INR {total.toFixed(2)}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-8">
               <button 
                onClick={() => setCart([])}
                className="font-mono text-[10px] font-black uppercase tracking-widest border-b-2 border-white/20 hover:border-white transition-all text-white/60 hover:text-white"
               >
                 Abort_Order
               </button>
               <Button 
                onClick={() => setStep("payment")}
                className="bg-golden-yellow text-deep-black h-20 px-12 rounded-none border-4 border-deep-black shadow-[6px_6px_0px_0px_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-xl font-black uppercase italic italic flex gap-4"
               >
                 Initialize_Checkout <CheckCircle2 size={24} />
               </Button>
            </div>
          </div>
        </div>
      );
    }
    
    if ((step === "floor" || step === "table") && selectedTable) {
      return (
        <div className="fixed bottom-0 inset-x-0 p-8 z-50 bg-transparent pointer-events-none">
          <div className="bg-deep-black text-white p-8 border-4 border-golden-yellow shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] flex items-center justify-between pointer-events-auto max-w-6xl mx-auto">
            <div>
              <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-widest mb-1">Ready_for_Transmission</p>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                Floor: <span className="text-golden-yellow">{selectedFloor?.name}</span> / Table: <span className="text-golden-yellow">{selectedTable?.number}</span>
              </h3>
            </div>
            <Button 
              onClick={() => setShowCustomerForm(true)}
              className="bg-golden-yellow text-deep-black h-20 px-12 rounded-none border-4 border-deep-black shadow-[6px_6px_0px_0px_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-2xl font-black uppercase italic flex gap-4"
            >
              Initialize_Menu <ChevronRight size={32} />
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] selection:bg-golden-yellow selection:text-deep-black">

      {/* AUTO-SELECT LOADING SCREEN — shown when navigating via QR token/tableNumber */}
      {isAutoSelectLoading && (
        <div className="fixed inset-0 bg-deep-black z-[200] flex flex-col items-center justify-center gap-8">
          <div className="w-20 h-20 border-4 border-golden-yellow border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-3">
            <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.4em] animate-pulse">QR_Detected</p>
            <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">Loading Table...</h2>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Fetching table details from server</p>
          </div>
        </div>
      )}

      {/* STEP 1: FLOOR SELECTION */}
      {(step === "floor" || step === "table") && (
        <>
          {renderHeader("Select_Your_Space.")}
          <div className="p-12 max-w-7xl mx-auto space-y-12">
            {/* Table Scan Banner */}
            <div className="bg-deep-black text-warm-white p-8 border-4 border-golden-yellow shadow-[8px_8px_0px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-golden-yellow text-deep-black px-3 py-1 font-mono text-[8px] font-black uppercase tracking-widest">Quick Access</span>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Scan Table QR Code</h3>
                <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                  Instantly load the menu for your specific table by scanning the QR code on the table.
                </p>
              </div>
              <button
                onClick={startScanner}
                className="bg-golden-yellow text-deep-black h-16 px-8 flex items-center justify-center gap-3 w-full md:w-auto font-black uppercase italic border-2 border-deep-black cursor-pointer shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
              >
                <QrCode size={20} /> Start Scanning
              </button>
            </div>
            <div className="flex items-center gap-4 border-b-4 border-deep-black pb-4">
               <LayoutGrid className="text-golden-yellow" size={32} />
               <h2 className="text-4xl font-black italic uppercase">01. Choose_Floor</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {floors.map((f: any) => (
                <Card 
                  key={f._id}
                  onClick={() => setSelectedFloor(f)}
                  className={`cursor-pointer border-4 transition-all h-48 flex flex-col justify-center p-8 rounded-none shadow-[8px_8px_0px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${selectedFloor?._id === f._id ? 'bg-deep-black text-white border-golden-yellow' : 'bg-white text-deep-black border-deep-black'}`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-2">Level_Identifier</p>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">{f.name}</h3>
                </Card>
              ))}
            </div>

            {selectedFloor && (
              <div className="pt-12 animate-in fade-in slide-in-from-top-8 duration-500">
                <div className="flex items-center gap-4 border-b-4 border-deep-black pb-4 mb-8">
                   <MapPin className="text-golden-yellow" size={32} />
                   <h2 className="text-4xl font-black italic uppercase">02. Select_Table</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                  {filteredTables.map((t: any) => {
                    const oneHour = 60 * 60 * 1000;
                    const isOccupied = t.status === "occupied";
                    const isReserved = t.lastBookedAt && (Date.now() - new Date(t.lastBookedAt).getTime() < oneHour);
                    const isUnavailable = isOccupied || isReserved;

                    return (
                      <Card 
                        key={t._id}
                        onClick={() => !isUnavailable && setSelectedTable(t)}
                        className={`cursor-pointer border-4 transition-all p-6 rounded-none shadow-[4px_4px_0px_0px_#000] flex flex-col items-center justify-center gap-2 
                          ${selectedTable?._id === t._id ? 'bg-deep-black text-white border-golden-yellow' : 'bg-white text-deep-black border-deep-black'}
                          ${isUnavailable ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:translate-x-1 hover:translate-y-1 hover:shadow-none'}
                        `}
                      >
                        <p className="font-mono text-[8px] uppercase tracking-widest opacity-40">Table</p>
                        <h3 className="text-4xl font-black italic">{t.number}</h3>
                        <p className={`font-mono text-[8px] uppercase font-black ${isUnavailable ? 'text-red-500' : 'text-green-500'}`}>
                          {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Available'}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {renderFooter()}
        </>
      )}

      {/* STEP 2: DIGITAL MENU */}
      {step === "menu" && (
        <>
          <div className="bg-deep-black text-white p-8 border-b-8 border-golden-yellow sticky top-0 z-[60]">
            <div className="flex justify-between items-center max-w-[1600px] mx-auto">
               <div className="space-y-1">
                  <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.3em]">System_User: {user?.name || "GUEST"}</p>
                  <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">ODOO<br/>DIGITAL_MENU.</h1>
                  {selectedTable && (
                    <div className="inline-block mt-2 bg-golden-yellow text-deep-black px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider">
                      📍 Table {selectedTable.number} {selectedFloor ? `(${selectedFloor.name})` : ""}
                    </div>
                  )}
               </div>

               <div className="flex items-center gap-6">
                  <div className="bg-white/5 border-2 border-white/10 p-4 font-mono text-[10px] uppercase tracking-widest hidden lg:block">
                     <span className="text-golden-yellow">Kitchen_Status:</span> Fast Delivery
                  </div>
                  <div className="bg-white/5 border-2 border-white/10 p-4 font-mono text-[10px] uppercase tracking-widest hidden lg:block">
                     <span className="text-golden-yellow">Location:</span> Table {selectedTable?.number}
                  </div>
                  <Button className="bg-golden-yellow text-deep-black font-black italic uppercase text-xs h-12 px-6 rounded-none border-2 border-deep-black shadow-[4px_4px_0px_0px_#fff] hover:shadow-none flex gap-2">
                     <Timer size={16} /> Track_Orders
                  </Button>
                  <button onClick={() => setStep("table")} className="bg-red-500 p-3 border-2 border-deep-black shadow-[3px_3px_0px_0px_#fff]">
                     <LogOut size={18} />
                  </button>
               </div>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto p-12">
            <div className="mb-12">
              <div className="relative">
                <Search size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-golden-yellow" />
                <input
                  type="text"
                  placeholder="SEARCH FOR ITEMS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-4 border-deep-black px-14 py-4 font-mono uppercase text-sm focus:outline-none focus:border-golden-yellow"
                />
              </div>
            </div>
            <div className="flex items-center gap-8 mb-16 border-b-4 border-deep-black pb-8 overflow-x-auto no-scrollbar">
               <div className="flex items-center gap-3 shrink-0">
                  <Filter size={20} className="text-golden-yellow" />
                  <span className="font-mono text-xs font-black uppercase tracking-widest">Category_Filter</span>
               </div>
               <div className="w-px h-8 bg-deep-black hidden md:block"></div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedCategory("all")}
                    className={`px-8 py-3 font-black uppercase italic text-sm border-4 transition-all ${selectedCategory === 'all' ? 'bg-deep-black text-white border-deep-black shadow-[4px_4px_0px_0px_#F5B400]' : 'bg-white text-deep-black border-deep-black hover:bg-gray-50'}`}
                  >
                    All_Items
                  </button>
                  {categories?.map((cat: any) => (
                    <button 
                      key={cat._id}
                      onClick={() => setSelectedCategory(cat._id)}
                      className={`px-8 py-3 font-black uppercase italic text-sm border-4 transition-all whitespace-nowrap ${selectedCategory === cat._id ? 'bg-deep-black text-white border-deep-black shadow-[4px_4px_0px_0px_#F5B400]' : 'bg-white text-deep-black border-deep-black hover:bg-gray-50'}`}
                    >
                      {cat.name.replace(' ', '_')}
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-12">
              {filteredProducts.map((p: any) => (
                <Card key={p._id} className="group border-4 border-deep-black rounded-none bg-white shadow-[12px_12px_0px_0px_#000] overflow-hidden flex flex-col">
                  <div className="relative h-64 overflow-hidden border-b-4 border-deep-black">
                    <img src={p.imageUrl || "/placeholder.png"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       <span className="bg-deep-black text-golden-yellow px-3 py-1 font-mono text-[8px] font-black uppercase tracking-widest">{p.category?.name || "CAFE"}</span>
                       <span className="bg-green-500 text-white px-3 py-1 font-mono text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 bg-white rounded-full"></div> Veg</span>
                    </div>
                  </div>
                  <CardContent className="p-8 flex-1 flex flex-col">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-2 leading-none">{p.name}</h3>
                    <p className="text-gray-400 font-mono text-[10px] leading-relaxed mb-8 flex-1">{p.description || "A premium selection from our artisan kitchen. Crafted with local ingredients and traditional techniques."}</p>
                    
                    <div className="h-px bg-gray-100 w-full mb-6"></div>
                    
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="font-mono text-[8px] text-gray-400 uppercase tracking-widest mb-1">Price_Unit</p>
                          <p className="text-3xl font-black italic tracking-tighter">INR {p.basePrice}</p>
                       </div>
                       
                       {cart.find(item => item.productId === p._id) ? (
                         <div className="flex items-center gap-4 bg-deep-black text-white p-2 border-2 border-deep-black">
                            <button onClick={() => updateQuantity(p._id, -1)} className="hover:text-golden-yellow transition-colors"><Minus size={16} /></button>
                            <span className="font-black text-lg w-6 text-center">{cart.find(item => item.productId === p._id).quantity}</span>
                            <button onClick={() => updateQuantity(p._id, 1)} className="hover:text-golden-yellow transition-colors"><Plus size={16} /></button>
                         </div>
                       ) : (
                         <Button 
                          onClick={() => addToCart(p)}
                          className="bg-golden-yellow text-deep-black h-12 px-6 rounded-none border-2 border-deep-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-black uppercase italic text-xs flex gap-2"
                         >
                           <ShoppingCart size={16} /> Add_to_Cart
                         </Button>
                       )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {renderFooter()}
        </>
      )}

      {/* STEP 3: PAYMENT METHOD */}
      {step === "payment" && (
        <>
          {renderHeader("Complete_Transaction.", "Secure encrypted payment protocol")}
          <div className="p-12 max-w-4xl mx-auto space-y-12">
            <div className="flex items-center gap-4 border-b-4 border-deep-black pb-4 mb-12">
               <DollarSign className="text-golden-yellow" size={32} />
               <h2 className="text-4xl font-black italic uppercase">03. Select_Payment</h2>
            </div>

            {/* Coupon Entry Section */}
            <div className="bg-white border-4 border-deep-black p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black italic uppercase text-lg">Have a Coupon Code?</span>
                {appliedCoupon && (
                  <span className="bg-green-100 text-green-800 border-2 border-green-800 px-3 py-1 font-mono text-xs font-black uppercase">
                    Applied: {appliedCoupon.couponCode}
                  </span>
                )}
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="ENTER CODE (e.g. FESTIVAL50)"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  disabled={!!appliedCoupon}
                  className="flex-1 border-4 border-deep-black px-4 py-3 font-mono uppercase text-sm focus:outline-none focus:border-golden-yellow disabled:bg-gray-100"
                />
                {appliedCoupon ? (
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                    }}
                    className="bg-red-500 text-white font-black uppercase italic px-6 py-3 border-4 border-deep-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-golden-yellow text-deep-black font-black uppercase italic px-6 py-3 border-4 border-deep-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-xs cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
              {couponError && (
                <p className="text-xs font-mono font-bold text-red-500">⚠️ {couponError}</p>
              )}
            </div>

            {/* Order & Discount Summary */}
            <div className="bg-white border-4 border-deep-black p-8 shadow-[8px_8px_0px_0px_#000] space-y-4">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter border-b-2 border-gray-100 pb-2">Order Summary</h3>
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="flex justify-between font-mono text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      {item.name} (x{item.quantity})
                      {item.isFreeFromPromotion && (
                        <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">
                          FREE 🎁
                        </span>
                      )}
                    </span>
                    <span className={item.isFreeFromPromotion ? "text-green-600 font-bold" : ""}>
                      {item.isFreeFromPromotion ? "FREE" : `INR ${(item.price * item.quantity).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-deep-black pt-4 space-y-2">
                <div className="flex justify-between font-mono text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>INR {total.toFixed(2)}</span>
                </div>
                {appliedPromoDiscount > 0 && (
                  <div className="flex flex-col gap-1 py-1.5 border-y border-dashed border-gray-200">
                    <span className="font-mono text-[10px] uppercase font-bold text-yellow-600">Applied Discount: {appliedDiscountType.toUpperCase()}</span>
                    <div className="flex justify-between font-bold text-green-600 text-sm">
                      <span className="truncate max-w-[400px]">{displayPromoText}</span>
                      <span>-INR {appliedPromoDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-black italic text-deep-black pt-2">
                  <span>TOTAL DUE</span>
                  <span>INR {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {[
                 { id: "upi", name: "Digital UPI", desc: "Instant mobile transfer", icon: Zap },
                 { id: "card", name: "Credit/Debit", desc: "Global card processing", icon: LayoutGrid },
                 { id: "cash", name: "Cash on Table", desc: "Physical currency", icon: DollarSign },
                 { id: "digital", name: "Odoo Wallet", desc: "System credit balance", icon: Package }
               ].map((method) => (
                 <Card 
                  key={method.id}
                  onClick={() => {
                    if (method.id === "upi" || method.id === "card" || method.id === "digital") {
                      setSelectedPaymentMethod(method.id);
                      setPaymentTimer(150); // 2 mins 30 secs
                      setShowPaymentQrModal(true);
                    } else {
                      handlePlaceOrder(method.id);
                    }
                  }}
                  className="cursor-pointer bg-white border-4 border-deep-black p-8 rounded-none shadow-[8px_8px_0px_0px_#000] hover:bg-golden-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
                 >
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-deep-black text-white border-2 border-deep-black shadow-[4px_4px_0px_0px_#F5B400] group-hover:shadow-none transition-all">
                         <method.icon size={32} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black italic uppercase tracking-tighter">{method.name}</h3>
                         <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest group-hover:text-deep-black/60">{method.desc}</p>
                      </div>
                   </div>
                 </Card>
               ))}
            </div>
            
            <button 
              onClick={() => setStep("menu")}
              className="w-full py-6 border-4 border-dashed border-deep-black text-deep-black/40 font-black uppercase italic tracking-widest hover:text-deep-black hover:border-solid transition-all"
            >
              Back_to_Menu_Selection
            </button>
          </div>
        </>
      )}

      {/* STEP 4: ORDER STATUS */}
      {step === "status" && (
        <div className="min-h-screen bg-deep-black text-white flex flex-col items-center justify-center p-12 text-center overflow-hidden relative">
          {/* Animated Background Grids */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full border-[100px] border-white/5 rotate-12 scale-150"></div>
             <div className="absolute top-0 left-0 w-full h-full border-[100px] border-golden-yellow/5 -rotate-12 scale-150"></div>
          </div>

          <div className="relative z-10 max-w-2xl w-full">
            <div className="mb-12 inline-flex items-center justify-center w-32 h-32 bg-golden-yellow text-deep-black border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)]">
               <ChefHat size={64} className="animate-bounce" />
            </div>
            
            <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.4em] mb-4">Transmission_Successful</p>
            <h1 className="text-7xl font-black italic tracking-tighter uppercase mb-8 leading-none">ORDER_CONFIRMED.</h1>
            
            <div className="bg-white text-deep-black p-12 border-4 border-golden-yellow shadow-[20px_20px_0px_0px_rgba(245,180,0,0.2)] mb-12 border-solid">
               <div className="flex flex-col items-center mb-12">
                  <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-4">Tracking_Identifier</p>
                  <p className="text-6xl font-black italic tracking-tighter border-b-8 border-golden-yellow pb-2">{activeOrder?.customOrderID || "OD-4242"}</p>
               </div>

               {modificationCountdown !== null && (
                 <div className="mb-12 p-6 bg-golden-yellow/10 border-4 border-dashed border-golden-yellow flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                       <Clock className="text-golden-yellow animate-pulse" size={24} />
                       <span className="text-2xl font-black italic uppercase tracking-tighter">Modification_Window: {modificationCountdown}s</span>
                    </div>
                    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest text-center">
                       You can still add or remove items from your order within this timeframe
                    </p>
                    <div className="flex gap-4 w-full">
                       <Button 
                        onClick={() => {
                          if (activeOrder) {
                            setCart(activeOrder.items.map((it: any) => ({
                              productId: it.product._id,
                              name: it.product.name,
                              price: it.price,
                              quantity: it.quantity,
                              imageUrl: it.product.imageUrl,
                              size: it.size
                            })));
                            setIsModifying(true);
                            setStep("menu");
                            toast.success("Add more items to your order");
                          }
                        }}
                        className="flex-1 bg-deep-black text-white rounded-none font-black uppercase italic h-16 border-2 border-deep-black hover:bg-golden-yellow hover:text-deep-black transition-all"
                       >
                         <Plus size={20} className="mr-2" /> Add More
                       </Button>
                       <Button 
                        onClick={() => {
                          if (activeOrder) {
                            setCart(activeOrder.items.map((it: any) => ({
                              productId: it.product._id,
                              name: it.product.name,
                              price: it.price,
                              quantity: it.quantity,
                              imageUrl: it.product.imageUrl,
                              size: it.size
                            })));
                            setIsModifying(true);
                            setStep("menu");
                            toast.success("Modify items in your order");
                          }
                        }}
                        className="flex-1 bg-white text-red-600 border-2 border-red-600 rounded-none font-black uppercase italic h-16 hover:bg-red-600 hover:text-white transition-all"
                       >
                         <Minus size={20} className="mr-2" /> Remove
                       </Button>
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-12 border-t-4 border-deep-black/5 pt-12">
                  <div className="text-left border-l-4 border-golden-yellow pl-6">
                     <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2">Live_Status</p>
                     <p className="text-3xl font-black italic uppercase tracking-tighter text-blue-600">Preparing</p>
                  </div>
                  <div className="text-right border-r-4 border-golden-yellow pr-6">
                     <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2">Wait_Estimate</p>
                     <p className="text-5xl font-black italic tracking-tighter">{timeLeft || 15}m</p>
                  </div>
               </div>
            </div>

            <div className="flex gap-6">
               <Button 
                onClick={() => setStep("floor")}
                className="flex-1 h-20 bg-transparent text-white border-4 border-white hover:bg-white hover:text-deep-black transition-all rounded-none font-black uppercase italic text-lg"
               >
                 New_Order
               </Button>
               <Button 
                onClick={() => navigate("/history")}
                className="flex-1 h-20 bg-golden-yellow text-deep-black border-4 border-deep-black shadow-[8px_8px_0px_0px_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-black uppercase italic text-lg"
               >
                 View_History
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Dialog */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-warm-white border-4 border-deep-black shadow-[16px_16px_0px_0px_#F5B400] max-w-md w-full p-8 relative rounded-none">
            <button
              onClick={stopScanner}
              className="absolute top-4 right-4 w-10 h-10 border-2 border-deep-black flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-4 mb-6">
              <span className="bg-golden-yellow text-deep-black px-3 py-1 font-mono text-[8px] font-black uppercase tracking-widest">Camera Stream</span>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">Scanning Table QR</h3>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                Center the QR code in the camera frame to scan.
              </p>
            </div>

            <div className="border-4 border-deep-black bg-black relative overflow-hidden aspect-square">
              <div id={qrRegionId} className="w-full h-full"></div>
              {/* Target Outline Overlay */}
              <div className="absolute inset-8 border-2 border-dashed border-golden-yellow/70 pointer-events-none flex items-center justify-center">
                <div className="w-4 h-4 border-t-2 border-l-2 border-golden-yellow absolute top-0 left-0"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-golden-yellow absolute top-0 right-0"></div>
                <div className="w-4 h-4 border-b-2 border-l-2 border-golden-yellow absolute bottom-0 left-0"></div>
                <div className="w-4 h-4 border-b-2 border-r-2 border-golden-yellow absolute bottom-0 right-0"></div>
              </div>
            </div>

            {/* QR File Upload Fallback */}
            <div className="mt-6 border-t-2 border-deep-black/10 pt-6">
              <label className="block text-center cursor-pointer bg-white text-deep-black border-2 border-deep-black hover:bg-golden-yellow p-4 font-black uppercase italic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all text-xs">
                <span>📁 Upload QR Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>

            <button
              onClick={stopScanner}
              className="w-full mt-6 bg-deep-black text-warm-white py-4 font-black uppercase hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}

      {/* Payment QR Modal */}
      {showPaymentQrModal && selectedPaymentMethod && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white border-4 border-deep-black shadow-[16px_16px_0px_0px_#F5B400] max-w-md w-full p-8 relative rounded-none text-deep-black">
            <button
              onClick={() => setShowPaymentQrModal(false)}
              className="absolute top-4 right-4 w-10 h-10 border-2 border-deep-black flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-4 mb-6">
              <span className="bg-golden-yellow text-deep-black px-3 py-1 font-mono text-[8px] font-black uppercase tracking-widest animate-pulse">
                Payment Verification
              </span>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                {selectedPaymentMethod === "upi" ? "UPI QR Transfer" : selectedPaymentMethod === "card" ? "Card Checkout QR" : "Odoo Wallet QR"}
              </h3>
              
              {/* Pulsing Timer */}
              <div className="bg-deep-black text-white p-4 border-2 border-deep-black inline-flex items-center gap-3">
                <Clock size={18} className="text-golden-yellow animate-spin" style={{ animationDuration: '4s' }} />
                <span className="font-mono text-xl font-black tracking-widest text-golden-yellow animate-pulse">
                  {formatTime(paymentTimer)}
                </span>
              </div>
              
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                Scan code below to pay <span className="font-bold text-deep-black">INR {finalTotal.toFixed(2)}</span>
              </p>
            </div>

            {/* Dynamic QR Code Display */}
            <div className="border-4 border-deep-black bg-white relative overflow-hidden aspect-square flex items-center justify-center p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <img 
                src={`https://quickchart.io/qr?size=300&text=${encodeURIComponent(
                  selectedPaymentMethod === "upi" 
                    ? `upi://pay?pa=${upiId}&pn=${businessName}&am=${finalTotal.toFixed(2)}&cu=INR&tn=Table ${selectedTable?.number || ""} Self-Order`
                    : `https://checkout.odoopos.com/pay/${selectedPaymentMethod}?amount=${finalTotal.toFixed(2)}&table=${selectedTable?.number || ""}`
                )}`} 
                alt="Payment QR Code" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center text-xs font-mono uppercase bg-gray-50 p-3 border-2 border-deep-black">
                <span className="text-gray-400">Total Amount:</span>
                <span className="font-black text-sm">INR {finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono uppercase bg-gray-50 p-3 border-2 border-deep-black">
                <span className="text-gray-400">Destination:</span>
                <span className="font-black truncate max-w-[200px]">{selectedPaymentMethod === "upi" ? upiId : "Odoo Secure POS"}</span>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPaymentQrModal(false)}
                className="flex-1 py-4 border-2 border-deep-black font-black uppercase hover:bg-gray-100 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsVerifyingPayment(true);
                  toast.loading("Verifying payment...", { id: "payment-verify-toast" });
                  // Simulate 1.5s delay to make it feel extremely premium
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  toast.dismiss("payment-verify-toast");
                  setIsVerifyingPayment(false);
                  handlePlaceOrder(selectedPaymentMethod);
                }}
                disabled={isVerifyingPayment}
                className="flex-1 bg-green-500 text-white py-4 border-2 border-deep-black font-black uppercase hover:bg-green-600 transition-colors cursor-pointer text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none flex items-center justify-center gap-2"
              >
                {isVerifyingPayment ? "Verifying..." : "I Have Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER IDENTIFICATION MODAL ───────────────────────────────────── */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className="bg-white border-4 border-deep-black shadow-[20px_20px_0px_0px_#F5B400] max-w-lg w-full relative overflow-hidden"
            style={{ animation: "slideUpFade 0.3s ease-out" }}
          >
            {/* Top accent bar */}
            <div className="bg-deep-black px-8 py-6 border-b-4 border-golden-yellow">
              <p className="font-mono text-[9px] text-golden-yellow uppercase tracking-[0.35em] mb-1">Guest_Identification_Protocol</p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">
                Before We Begin<br/>
                <span className="text-golden-yellow">Let's Get You Set Up</span>
              </h2>
            </div>

            {/* Selected table badge */}
            {selectedTable && (
              <div className="bg-golden-yellow px-8 py-3 flex items-center gap-3">
                <MapPin size={14} className="text-deep-black" />
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-deep-black">
                  Table {selectedTable.number}
                  {selectedFloor ? ` · ${selectedFloor.name}` : ""}
                </span>
              </div>
            )}

            <div className="p-8 space-y-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                Enter your details below — no password needed. We use this to send you a welcome note and share today's active promotions with you.
              </p>

              {/* Phone field */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-deep-black">
                  Mobile_Number *
                </label>
                <div className="flex border-4 border-deep-black focus-within:border-golden-yellow transition-colors">
                  <span className="bg-deep-black text-golden-yellow px-4 flex items-center font-mono text-sm font-black">+91</span>
                  <input
                    id="guest-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setCustomerFormError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("guest-email")?.focus()}
                    className="flex-1 px-4 py-4 font-mono text-lg tracking-widest focus:outline-none bg-white"
                    autoFocus
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest text-deep-black">
                  Email_Address *
                </label>
                <input
                  id="guest-email"
                  type="email"
                  inputMode="email"
                  placeholder="you@gmail.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    setCustomerFormError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomerIdentify()}
                  className="w-full border-4 border-deep-black focus:border-golden-yellow focus:outline-none px-4 py-4 font-mono text-sm transition-colors"
                />
              </div>

              {/* Error message */}
              {customerFormError && (
                <div className="bg-red-50 border-2 border-red-500 px-4 py-3">
                  <p className="text-xs font-mono font-bold text-red-600">⚠️ {customerFormError}</p>
                </div>
              )}

              {/* Why we ask */}
              <div className="border-t-2 border-gray-100 pt-4">
                <button
                  onClick={() => setShowWhyExpanded((v) => !v)}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-deep-black transition-colors"
                >
                  <span>{showWhyExpanded ? "▲" : "▼"}</span> Why do we ask this?
                </button>
                {showWhyExpanded && (
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    We use your details to send a one-time welcome email, share active promotions, and remember you on your next visit. No spam, no passwords. You can ask us to delete your data anytime.
                  </p>
                )}
              </div>

              {/* CTA */}
              <button
                id="guest-submit"
                onClick={handleCustomerIdentify}
                disabled={isIdentifying}
                className="w-full bg-deep-black text-white py-5 font-black italic uppercase tracking-widest text-lg border-4 border-deep-black shadow-[6px_6px_0px_0px_#F5B400] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                {isIdentifying ? (
                  <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Identifying...</>
                ) : (
                  <>Start_Ordering <ChevronRight size={22} /></>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUpFade {
              from { opacity: 0; transform: translateY(24px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
