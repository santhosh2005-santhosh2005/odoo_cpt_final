
import { useEffect, useState } from "react";
import { socket } from "@/utils/socket";
import { useGetSettingsQuery } from "@/services/SettingsApi";
import { QrCode, CheckCircle2 } from "lucide-react";

type CustomerDisplayState = "order" | "payment" | "success";

export default function CustomerDisplay() {
  const [state, setState] = useState<CustomerDisplayState>("order");
  const [cart, setCart] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [taxRate, setTaxRate] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const { data: settingsData } = useGetSettingsQuery({});

  useEffect(() => {
    const handleCashierCartUpdate = (data: any) => {
      console.log("Received cashier cart update:", data);
      setCart(data.cart || []);
      setTotalPrice(data.totalPrice || 0);
      setPaymentMethod(data.paymentMethod || "cash");
      setDiscountPercent(data.discountPercent || 0);
      setTaxRate(data.taxRate || 0);
      
      if (data.paymentStatus === "paid") {
        setState("success");
      } else if (data.isPaymentStep) {
        setState("payment");
      } else if (data.cart.length > 0) {
        setState("order");
      }
    };

    socket.on("cashierCartUpdate", handleCashierCartUpdate);
    return () => {
      socket.off("cashierCartUpdate", handleCashierCartUpdate);
    };
  }, []);

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    return (calculateSubtotal() * discountPercent) / 100;
  };

  const calculateTax = () => {
    const taxable = calculateSubtotal() - calculateDiscount();
    return (taxable * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateTax();
  };

  const renderOrderView = () => (
    <div className="min-h-screen bg-deep-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a1a] p-8 border-b-8 border-golden-yellow">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.3em]">
              {settingsData?.data?.businessName || "ODOO POS CAFE"}
            </p>
            <h1 className="text-6xl font-black italic tracking-tighter uppercase">
              YOUR_ORDER
            </h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
              LIVE_UPDATE
            </p>
            <p className="text-4xl font-black italic text-golden-yellow">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-4 border-b-2 border-gray-700 pb-4 mb-4 font-mono text-[10px] uppercase tracking-widest text-gray-400">
            <div className="col-span-6">ITEM</div>
            <div className="col-span-2 text-center">QTY</div>
            <div className="col-span-2 text-right">PRICE</div>
            <div className="col-span-2 text-right">SUBTOTAL</div>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <p className="text-3xl font-black italic uppercase">NO_ITEMS_YET</p>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-2">
                Place your order at the cashier
              </p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 py-4 border-b border-gray-700">
                <div className="col-span-6">
                  <p className="text-2xl font-black italic uppercase">{item.name}</p>
                  {item.variant && (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                      {item.variant}
                    </p>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <span className="text-3xl font-black text-golden-yellow">x{item.quantity}</span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <span className="text-xl font-black">INR {item.price.toFixed(2)}</span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <span className="text-2xl font-black italic text-golden-yellow">
                    INR {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Total */}
      <div className="bg-[#1a1a1a] border-t-8 border-golden-yellow p-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">SUBTOTAL</p>
              <p className="text-2xl font-black">INR {calculateSubtotal().toFixed(2)}</p>
            </div>
            {calculateDiscount() > 0 && (
              <div className="flex justify-between items-center text-red-500">
                <p className="font-mono text-[10px] uppercase tracking-widest">DISCOUNT</p>
                <p className="text-2xl font-black">-INR {calculateDiscount().toFixed(2)}</p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">TAX</p>
              <p className="text-2xl font-black">INR {calculateTax().toFixed(2)}</p>
            </div>
            <div className="border-t border-golden-yellow pt-4 mt-4 flex justify-between items-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-golden-yellow">TOTAL</p>
              <p className="text-5xl font-black italic text-golden-yellow">
                INR {calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentView = () => (
    <div className="min-h-screen bg-deep-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.3em]">
            PAYMENT_IN_PROGRESS
          </p>
          <h1 className="text-7xl font-black italic tracking-tighter uppercase">
            PLEASE_PAY
          </h1>
        </div>

        <div className="bg-white text-deep-black p-12 border-8 border-golden-yellow shadow-[24px_24px_0px_0px_rgba(245,180,0,0.3)]">
          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2">
            TOTAL_AMOUNT
          </p>
          <p className="text-7xl font-black italic tracking-tighter">
            INR {calculateTotal().toFixed(2)}
          </p>
          
          <div className="mt-8 pt-8 border-t-4 border-deep-black/20">
            <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2">
              PAYMENT_METHOD
            </p>
            <p className="text-4xl font-black italic uppercase">
              {paymentMethod.toUpperCase()}
            </p>
          </div>

          {paymentMethod === "upi" && (
            <div className="mt-12 space-y-6">
              <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                SCAN_TO_PAY
              </p>
              <div className="bg-deep-black p-8 inline-block border-4 border-deep-black shadow-[8px_8px_0px_0px_#000]">
                <QrCode size={200} className="text-white" />
              </div>
              <p className="font-mono text-sm uppercase tracking-widest text-gray-500">
                {settingsData?.data?.upiId || "upi@example.com"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSuccessView = () => (
    <div className="min-h-screen bg-deep-black text-white flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Animated Background Grids */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full border-[100px] border-white/5 rotate-12 scale-150"></div>
        <div className="absolute top-0 left-0 w-full h-full border-[100px] border-golden-yellow/5 -rotate-12 scale-150"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
        <div className="inline-flex items-center justify-center w-40 h-40 bg-golden-yellow text-deep-black border-8 border-white shadow-[24px_24px_0px_0px_rgba(255,255,255,0.1)]">
          <CheckCircle2 size={96} />
        </div>

        <div className="space-y-4">
          <p className="font-mono text-[10px] text-golden-yellow uppercase tracking-[0.4em]">
            PAYMENT_SUCCESSFUL
          </p>
          <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">
            THANK_YOU!
          </h1>
          <p className="text-3xl font-black italic tracking-tighter uppercase text-gray-400">
            FOR_VISITING_ODOO_CAFE
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {state === "order" && renderOrderView()}
      {state === "payment" && renderPaymentView()}
      {state === "success" && renderSuccessView()}
    </>
  );
}
