import { jsPDF } from "jspdf";

interface ReceiptData {
  trip: {
    id: string;
    pickupName: string;
    dropoffName: string;
    fare: number;
    distance?: number | null;
    duration?: number | null;
    paymentMethod: string;
    paymentStatus?: string | null;
    rideType?: string;
    vehicleType?: string;
    createdAt?: string | Date | null;
    completedAt?: string | Date | null;
  };
  riderName: string;
  driverName: string;
  driverVehicle?: string;
  licensePlate?: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { trip, riderName, driverName, driverVehicle, licensePlate } = data;

  const W = 210;
  const margin = 18;
  let y = 0;

  // ── Header band ──
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 42, "F");

  // Logo placeholder circle
  doc.setFillColor(250, 204, 21);
  doc.circle(margin + 8, 21, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("GY", margin + 8, 23.5, { align: "center" });

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("GY RIDES", margin + 20, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("GIYANI'S TRUSTED RIDE-HAILING SERVICE", margin + 20, 25);
  doc.setFontSize(7);
  doc.text("Powered by Mpfuno Medical Services & Dr NI Mabunda", margin + 20, 31);

  // Receipt label right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(250, 204, 21);
  doc.text("PAYMENT RECEIPT", W - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`#${trip.id.slice(-8).toUpperCase()}`, W - margin, 25, { align: "right" });

  const tripDate = trip.completedAt || trip.createdAt;
  const dateStr = tripDate ? new Date(tripDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-ZA");
  const timeStr = tripDate ? new Date(tripDate).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "";
  doc.text(`${dateStr}  ${timeStr}`, W - margin, 32, { align: "right" });

  y = 52;

  // ── Route section ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("TRIP ROUTE", margin, y);
  y += 5;

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 5;

  // From dot
  doc.setFillColor(34, 197, 94);
  doc.circle(margin + 2, y + 1.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("FROM", margin + 7, y);
  doc.setFont("helvetica", "normal");
  doc.text(trip.pickupName, margin + 7, y + 5);
  y += 13;

  // Dashed line between
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1.5], 0);
  doc.line(margin + 2, y - 4, margin + 2, y + 1);
  doc.setLineDashPattern([], 0);

  // To dot
  doc.setFillColor(0, 0, 0);
  doc.circle(margin + 2, y + 1.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("TO", margin + 7, y);
  doc.setFont("helvetica", "normal");
  doc.text(trip.dropoffName, margin + 7, y + 5);
  y += 16;

  // ── Trip details grid ──
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, W - margin, y);
  y += 6;

  const details: [string, string][] = [
    ["Ride Type", trip.rideType ? trip.rideType.charAt(0).toUpperCase() + trip.rideType.slice(1) : "Private"],
    ["Vehicle", trip.vehicleType || "Standard"],
    ["Distance", trip.distance ? `${trip.distance.toFixed(1)} km` : "—"],
    ["Duration", trip.duration ? `${trip.duration} min` : "—"],
  ];

  const colW = (W - margin * 2) / 2;
  for (let i = 0; i < details.length; i += 2) {
    const [labelA, valA] = details[i];
    const [labelB, valB] = details[i + 1] || ["", ""];
    const xA = margin;
    const xB = margin + colW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(labelA, xA, y);
    if (labelB) doc.text(labelB, xB, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(valA, xA, y);
    if (valB) doc.text(valB, xB, y);
    y += 7;
  }

  // Driver info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("Driver", margin, y);
  doc.text("Vehicle", margin + colW, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(driverName, margin, y);
  doc.text(driverVehicle || "—", margin + colW, y);
  y += 7;

  if (licensePlate) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text("License Plate", margin, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(licensePlate, margin, y);
    y += 7;
  }

  // ── Payment section ──
  y += 2;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, W - margin * 2, 32, 3, 3, "F");
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, W - margin * 2, 32, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("PAYMENT SUMMARY", margin + 5, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Rider", margin + 5, y + 14);
  doc.text(riderName, W - margin - 5, y + 14, { align: "right" });

  doc.text("Payment Method", margin + 5, y + 20);
  doc.text(trip.paymentMethod.charAt(0).toUpperCase() + trip.paymentMethod.slice(1), W - margin - 5, y + 20, { align: "right" });

  // Fare line
  doc.setDrawColor(230, 230, 230);
  doc.line(margin + 5, y + 23, W - margin - 5, y + 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Total", margin + 5, y + 30);
  doc.text(`R ${trip.fare.toFixed(2)}`, W - margin - 5, y + 30, { align: "right" });

  // Payment status badge
  const pStatus = (trip.paymentStatus as string) || "paid";
  if (pStatus === "paid") {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(W - margin - 30, y + 5, 28, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(22, 163, 74);
    doc.text("✓ PAID", W - margin - 16, y + 10.5, { align: "center" });
  } else {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(W - margin - 30, y + 5, 28, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(220, 38, 38);
    doc.text("PENDING", W - margin - 16, y + 10.5, { align: "center" });
  }

  y += 38;

  // ── Footer ──
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 280, W, 17, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("© Mpfuno Medical Services & Dr NI Mabunda. All rights reserved.", W / 2, 286, { align: "center" });
  doc.text("GY Rides · Giyani, Limpopo, South Africa · support via WhatsApp: +27 68 642 7644", W / 2, 291, { align: "center" });

  const filename = `GYRides_Receipt_${trip.id.slice(-8).toUpperCase()}.pdf`;
  doc.save(filename);
}
