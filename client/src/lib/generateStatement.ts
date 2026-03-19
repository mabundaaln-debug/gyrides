import { jsPDF } from "jspdf";

interface TripRow {
  id: string;
  createdAt?: string | Date | null;
  completedAt?: string | Date | null;
  pickupName: string;
  dropoffName: string;
  vehicleType?: string | null;
  rideType?: string | null;
  paymentMethod: string;
  paymentStatus?: string | null;
  fare: number;
  distance?: number | null;
  duration?: number | null;
  status: string;
}

interface StatementData {
  driver: {
    fullName: string;
    phone: string;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
    licensePlate?: string | null;
    idNumber?: string | null;
  };
  month: number;
  year: number;
  trips: TripRow[];
  summary: {
    totalTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    totalFare: number;
    platformFee: number;
    driverPayout: number;
    cashTrips: number;
    cardTrips: number;
  };
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateStatementPDF(data: StatementData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { driver, month, year, trips, summary } = data;
  const W = 210;
  const margin = 16;
  let y = 0;

  const logoDataUrl = await fetchLogoBase64();

  const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  };
  const fmtTime = (d: string | Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  };
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  // ── Header band ──
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 52, "F");

  // Logo image (top-left)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 4, 40, 40);
  } else {
    // Fallback circle logo
    doc.setFillColor(250, 204, 21);
    doc.circle(margin + 10, 26, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("GY", margin + 10, 29, { align: "center" });
  }

  // Company name text (right of logo)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("GY RIDES", margin + 46, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("GIYANI'S TRUSTED RIDE-HAILING SERVICE", margin + 46, 28);
  doc.setFontSize(6.5);
  doc.text("GY Rides — A Division of Mpfuno Medical Services (PTY) LTD", margin + 46, 35);

  // Statement label (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(250, 204, 21);
  doc.text("DRIVER EARNINGS STATEMENT", W - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Period: ${MONTH_NAMES[month - 1]} ${year}`, W - margin, 26, { align: "right" });
  const generatedOn = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  doc.text(`Generated: ${generatedOn}`, W - margin, 33, { align: "right" });

  y = 60;

  // ── Driver Info ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("DRIVER INFORMATION", margin, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 5;

  const colW = (W - margin * 2) / 2;
  const infoItems: [string, string][] = [
    ["Full Name", driver.fullName],
    ["Phone", driver.phone],
    ["Vehicle", driver.vehicleMake && driver.vehicleModel ? `${driver.vehicleMake} ${driver.vehicleModel}${driver.vehicleColor ? ` (${driver.vehicleColor})` : ""}` : "—"],
    ["License Plate", driver.licensePlate || "—"],
  ];

  for (let i = 0; i < infoItems.length; i += 2) {
    const [lA, vA] = infoItems[i];
    const [lB, vB] = infoItems[i + 1] || ["", ""];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text(lA, margin, y);
    if (lB) doc.text(lB, margin + colW, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(vA, margin, y);
    if (vB) doc.text(vB, margin + colW, y);
    y += 7;
  }

  // ── Summary Box ──
  y += 2;
  const summaryH = 52;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, W - margin * 2, summaryH, 3, 3, "F");
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, W - margin * 2, summaryH, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("EARNINGS SUMMARY", margin + 5, y + 8);

  const summaryRows: [string, string, boolean?][] = [
    [`Total Trips`, `${summary.totalTrips}`],
    [`Completed Trips`, `${summary.completedTrips}`],
    [`Cancelled Trips`, `${summary.cancelledTrips}`],
    [`Cash Collections`, `${summary.cashTrips} trip${summary.cashTrips !== 1 ? "s" : ""}`],
    [`Card Payments`, `${summary.cardTrips} trip${summary.cardTrips !== 1 ? "s" : ""}`],
    [`Gross Fare Collected`, `R ${summary.totalFare.toFixed(2)}`],
    [`Platform Commission (15%)`, `R ${summary.platformFee.toFixed(2)}`],
  ];

  let sy = y + 14;
  for (const [label, val] of summaryRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin + 5, sy);
    doc.text(val, W - margin - 5, sy, { align: "right" });
    sy += 5;
  }

  // Driver payout bold line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 5, sy - 1, W - margin - 5, sy - 1);
  sy += 2;
  doc.setFillColor(250, 204, 21);
  doc.roundedRect(margin + 4, sy - 4, W - margin * 2 - 8, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("DRIVER PAYOUT (85%)", margin + 8, sy + 2.5);
  doc.text(`R ${summary.driverPayout.toFixed(2)}`, W - margin - 8, sy + 2.5, { align: "right" });

  y += summaryH + 8;

  // ── Trip Log Table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("TRIP LOG", margin, y);
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  y += 1;

  // Table header
  const cols = { date: margin, route: margin + 24, pay: margin + 106, fare: margin + 125, status: margin + 143 };
  doc.setFillColor(30, 30, 30);
  doc.rect(margin, y, W - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DATE", cols.date + 1, y + 4.5);
  doc.text("ROUTE", cols.route, y + 4.5);
  doc.text("PAYMENT", cols.pay, y + 4.5);
  doc.text("FARE", cols.fare, y + 4.5);
  doc.text("STATUS", cols.status, y + 4.5);
  y += 8;

  const completedInMonth = trips.filter(t => t.status === "completed");
  const otherInMonth = trips.filter(t => t.status !== "completed");
  const sortedTrips = [...completedInMonth, ...otherInMonth];

  let rowAlt = false;
  for (const trip of sortedTrips) {
    if (y > 258) {
      doc.addPage();
      y = 16;
    }
    const rowH = 8;
    if (rowAlt) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, W - margin * 2, rowH, "F");
    }
    rowAlt = !rowAlt;

    const dateStr = fmtDate(trip.createdAt);
    const timeStr = fmtTime(trip.createdAt);
    const route = `${truncate(trip.pickupName, 22)} → ${truncate(trip.dropoffName, 22)}`;
    const payMethod = trip.paymentMethod.charAt(0).toUpperCase() + trip.paymentMethod.slice(1);
    const fareStr = `R ${trip.fare.toFixed(2)}`;
    const statusStr = trip.status === "completed" ? "✓ Done" : trip.status === "cancelled" ? "✗ Cancel" : trip.status;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(50, 50, 50);
    doc.text(dateStr, cols.date + 1, y + 3.5);
    doc.setFontSize(5.5);
    doc.setTextColor(130, 130, 130);
    doc.text(timeStr, cols.date + 1, y + 7);
    doc.setFontSize(6.5);
    doc.setTextColor(50, 50, 50);
    doc.text(truncate(route, 52), cols.route, y + 5);
    doc.text(payMethod, cols.pay, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(fareStr, cols.fare, y + 5);

    if (trip.status === "completed") {
      doc.setTextColor(22, 163, 74);
    } else if (trip.status === "cancelled") {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(180, 100, 0);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(statusStr, cols.status, y + 5);
    doc.setTextColor(50, 50, 50);

    y += rowH;
  }

  // Totals row
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`${summary.completedTrips} completed trips`, margin, y + 3);
  doc.setFontSize(10);
  doc.text(`Total: R ${summary.totalFare.toFixed(2)}`, W - margin, y + 3, { align: "right" });

  // ── Reimbursement Declaration ──
  y += 14;
  if (y > 230) { doc.addPage(); y = 16; }
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(margin, y, W - margin * 2, 34, 3, 3, "F");
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(margin, y, W - margin * 2, 34, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(92, 67, 0);
  doc.text("REIMBURSEMENT DECLARATION", margin + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 40, 0);
  const decl = `This statement confirms that ${driver.fullName} completed ${summary.completedTrips} trip${summary.completedTrips !== 1 ? "s" : ""} during ${MONTH_NAMES[month - 1]} ${year} on the GY Rides platform, generating gross fares of R ${summary.totalFare.toFixed(2)}. After deducting the platform commission of R ${summary.platformFee.toFixed(2)} (15%), the net driver payout is R ${summary.driverPayout.toFixed(2)} (85%).`;
  const declLines = doc.splitTextToSize(decl, W - margin * 2 - 10);
  doc.text(declLines, margin + 5, y + 16);

  // ── Footer ──
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 282, W, 15, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("© Mpfuno Medical Services (PTY) LTD & Dr NI Mabunda. All rights reserved.", W / 2, 287, { align: "center" });
    doc.text(`GY Rides · Giyani, Limpopo, South Africa · WhatsApp: +27 68 642 7644  |  Page ${p} of ${pageCount}`, W / 2, 292, { align: "center" });
  }

  const monthStr = MONTH_NAMES[month - 1].slice(0, 3).toUpperCase();
  doc.save(`GYRides_Statement_${driver.fullName.replace(/\s+/g, "_")}_${monthStr}${year}.pdf`);
}
