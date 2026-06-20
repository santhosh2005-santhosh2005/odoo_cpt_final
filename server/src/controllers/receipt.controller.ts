import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { Order } from "../models/Order";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

// Generate receipt PDF
export const generateReceiptPDF = async (orderId: string) => {
  const order = await Order.findById(orderId)
    .populate("customer", "name email")
    .populate("employee", "name")
    .populate("items.product");

  if (!order) throw new Error("Order not found");

  // Create a PDF document
  const doc = new PDFDocument({ margin: 50 });

  const buffers: Buffer[] = [];
  doc.on("data", (buffer) => buffers.push(buffer));
  const pdfPromise = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(buffers)))
  );

  // Header
  doc
    .fontSize(20)
    .text("Odoo Cafe", { align: "center" })
    .moveDown(0.5)
    .fontSize(12)
    .text("123 Main Street, City", { align: "center" })
    .text("Phone: +1 234 567 8900", { align: "center" })
    .moveDown(1);

  // Order Info
  doc
    .fontSize(16)
    .text("Receipt", { underline: true, align: "center" })
    .moveDown(0.5)
    .fontSize(12);

  doc
    .text(`Order Number: ${order.orderNumber || (order as any).customOrderID || order._id}`)
    .text(`Date: ${new Date(order.createdAt).toLocaleString()}`)
    .text(`Customer: ${(order.customer as any)?.name || "Walk-in"}`)
    .text(`Employee: ${(order.employee as any)?.name || "N/A"}`)
    .moveDown(1);

  // Items
  doc.text("Items:").moveDown(0.5);
  order.items.forEach((item: any) => {
    const productName = item.product?.name || "Item";
    doc
      .text(
        `${item.quantity} x ${productName} - $${item.price.toFixed(2)}`,
        { continued: false }
      )
      .moveDown(0.25);
  });

  // Totals
  doc.moveDown(1);
  const subtotal = order.totalAmount || order.totalPrice || 0;
  const discount = order.discountAmount || (order.discountPercent ? (subtotal * order.discountPercent) / 100 : 0);
  const tax = order.tax || (order.taxRate ? ((subtotal - discount) * order.taxRate) / 100 : 0);
  const total = subtotal - discount + tax;

  doc.text(`Subtotal: $${subtotal.toFixed(2)}`);
  if (discount > 0) doc.text(`Discount: -$${discount.toFixed(2)}`);
  doc.text(`Tax: $${tax.toFixed(2)}`);
  doc.fontSize(14).text(`Total: $${total.toFixed(2)}`).moveDown(1);
  doc.fontSize(12).text(`Payment Method: ${order.paymentMethod || "Cash"}`).moveDown(2);

  // Footer
  doc.text("Thank you for your visit!", { align: "center" });
  doc.text("Please come again!", { align: "center" });

  doc.end();

  return pdfPromise;
};

// Download receipt
export const downloadReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pdfBuffer = await generateReceiptPDF(id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Email receipt
export const emailReceipt = async (req: Request, res: Response) => {
  try {
    const { orderId, recipientEmail } = req.body;

    const order = await Order.findById(orderId).populate("customer", "email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const email = recipientEmail || (order.customer as any)?.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not available"
      });
    }

    const pdfBuffer = await generateReceiptPDF(orderId);

    // Configure nodemailer
    // Use Ethereal for testing (real SMTP would require actual credentials)
    let transporter;
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to Ethereal for testing
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || "Odoo Cafe <no-reply@odoo-cafe.com>",
      to: email,
      subject: `Receipt for Order ${order.orderNumber || order._id}`,
      text: `Thank you for your order at Odoo Cafe! Please find your receipt attached.`,
      attachments: [
        {
          filename: `receipt-${orderId}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal, log the preview URL
    if (!process.env.SMTP_HOST) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    res.status(200).json({
      success: true,
      message: "Receipt sent successfully",
      previewUrl: process.env.SMTP_HOST ? undefined : nodemailer.getTestMessageUrl(info),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
