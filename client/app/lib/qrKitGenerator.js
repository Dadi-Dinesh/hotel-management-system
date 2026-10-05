/**
 * Welcome Kit generation for a newly-approved restaurant application.
 * Bundles a Welcome Letter (with login details), Quick Setup Guide, Printer
 * Setup Guide, and the table QR posters into one ZIP — all fully client-side,
 * reusing the exact same jsPDF setup as posterUtils.js (installed in Phase 5)
 * and posterUtils.js's own generateTablePostersPDF for the QR posters
 * unmodified, rather than re-implementing poster rendering here.
 */
import { generateTablePostersPDF, drawPosterPage } from "./posterUtils";

function hexToRgb(hex) {
  const clean = (hex || "#E8891C").replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function drawFrame(doc, restaurant) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(61, 39, 16);
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const [ar, ag, ab] = hexToRgb(restaurant.accentColor || restaurant.primaryColor);
  doc.setTextColor(ar, ag, ab);
  doc.text("SERVESYNC", pageWidth / 2, 22, { align: "center" });
  return { pageWidth, pageHeight };
}

function heading(doc, text, y, pageWidth) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(61, 39, 16);
  doc.text(text, pageWidth / 2, y, { align: "center" });
}

function paragraph(doc, lines, x, y, maxWidth, lineHeight = 6) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 65, 50);
  let cursorY = y;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, x, cursorY);
    cursorY += wrapped.length * lineHeight;
  });
  return cursorY;
}

function drawWelcomeLetter(doc, { restaurant, adminEmail, tempPassword, dashboardUrl }) {
  const { pageWidth } = drawFrame(doc, restaurant);
  heading(doc, "Welcome to ServeSync!", 45, pageWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(61, 39, 16);
  doc.text(restaurant.name, pageWidth / 2, 55, { align: "center" });

  let y = paragraph(
    doc,
    [
      "Congratulations — your application has been approved and your restaurant is now",
      "live on ServeSync. QR ordering, live kitchen updates, and billing are all active.",
    ],
    20,
    75,
    pageWidth - 40
  );

  y += 10;
  doc.setDrawColor(232, 137, 28);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, y, pageWidth - 40, 38, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 100, 80);
  doc.text("YOUR LOGIN DETAILS", 28, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(61, 39, 16);
  doc.text(`Email: ${adminEmail}`, 28, y + 20);
  doc.text(`Temporary Password: ${tempPassword}`, 28, y + 28);
  doc.setFontSize(9);
  doc.setTextColor(120, 100, 80);
  doc.text("Please change this password after your first login.", 28, y + 35);

  y += 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 100, 80);
  doc.text("DASHBOARD LINK", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(232, 137, 28);
  doc.text(dashboardUrl, 20, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(160, 140, 120);
  doc.text("Powered by ServeSync", pageWidth / 2, doc.internal.pageSize.getHeight() - 18, { align: "center" });
}

function drawQuickSetupGuide(doc, restaurant) {
  const { pageWidth } = drawFrame(doc, restaurant);
  heading(doc, "Quick Setup Guide", 45, pageWidth);

  const steps = [
    ["1. Log In", "Use the email and temporary password from your Welcome Letter at the Dashboard Link."],
    ["2. Change Your Password", "Go to Account Settings and set a new password right away."],
    ["3. Review Your Menu", "Your menu starts empty — add categories and items from Menu Management, with photos if you like."],
    ["4. Print Your Table QR Codes", "The Table QR Posters (included in this kit) are ready to print and place on every table."],
    ["5. Invite Your Staff", "From Staff Management, send invites to your captains and kitchen team."],
    ["6. Set Up Printing (Optional)", "See the Printer Setup Guide in this kit if you use a receipt/KOT printer."],
    ["7. Go Live", "Once your menu and tables are ready, you're set — scan a QR code yourself to see the customer experience."],
  ];

  let y = 65;
  steps.forEach(([title, body]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(232, 137, 28);
    doc.text(title, 20, y);
    y += 7;
    y = paragraph(doc, [body], 20, y, pageWidth - 40, 5.5);
    y += 6;
  });
}

function drawPrinterSetupGuide(doc, restaurant) {
  const { pageWidth } = drawFrame(doc, restaurant);
  heading(doc, "Printer Setup Guide", 45, pageWidth);

  let y = paragraph(
    doc,
    [
      "ServeSync prints kitchen order tickets (KOTs) and customer bills automatically",
      "through the Printer Agent — a small app that runs on a computer at your",
      "restaurant and connects to a USB or network thermal printer.",
    ],
    20,
    60,
    pageWidth - 40
  );

  y += 8;
  const steps = [
    ["1. Install the Printer Agent", "On a computer at your restaurant, download and run the ServeSync Printer Agent (see your dashboard's Printer Settings for the download link)."],
    ["2. Connect Your Printer", "Plug in your USB thermal printer, or note your network printer's IP address."],
    ["3. Configure in the Dashboard", "Go to Admin > Printer Settings to select your printer port (or IP) and test a print."],
    ["4. Choose Kitchen Mode", "LIVE mode prints KOTs the instant an order is placed; NORMAL mode prints when a captain accepts it."],
  ];

  steps.forEach(([title, body]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(232, 137, 28);
    doc.text(title, 20, y);
    y += 7;
    y = paragraph(doc, [body], 20, y, pageWidth - 40, 5.5);
    y += 6;
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 100, 80);
  paragraph(doc, ["No printer yet? No problem — ServeSync works fully without one; orders and bills are always visible on-screen."], 20, y + 4, pageWidth - 40, 5);
}

/**
 * Builds the complete Welcome Kit and downloads it as one ZIP:
 * welcome-letter.pdf, quick-setup-guide.pdf, printer-setup-guide.pdf, and
 * table-qr-posters.pdf (generated via posterUtils.js, unmodified design).
 */
export async function generateWelcomeKit({ restaurant, tables, adminEmail, tempPassword, dashboardUrl }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const welcomeDoc = new jsPDF({ unit: "mm", format: "a4" });
  drawWelcomeLetter(welcomeDoc, { restaurant, adminEmail, tempPassword, dashboardUrl });
  zip.file("welcome-letter.pdf", welcomeDoc.output("blob"));

  const setupDoc = new jsPDF({ unit: "mm", format: "a4" });
  drawQuickSetupGuide(setupDoc, restaurant);
  zip.file("quick-setup-guide.pdf", setupDoc.output("blob"));

  const printerDoc = new jsPDF({ unit: "mm", format: "a4" });
  drawPrinterSetupGuide(printerDoc, restaurant);
  zip.file("printer-setup-guide.pdf", printerDoc.output("blob"));

  if (tables?.length) {
    const postersBlob = await generateTablePostersPDF({ restaurant, tables, returnBlob: true });
    zip.file("table-qr-posters.pdf", postersBlob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${restaurant.slug || "restaurant"}-welcome-kit.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates the complete Welcome Kit as a single master PDF document
 * (Welcome Letter + Quick Start Guide + Printer Setup Guide + Table QR Posters).
 */
export async function generateWelcomeKitPDF({ restaurant, tables, adminEmail, tempPassword, dashboardUrl }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Page 1: Welcome Letter & Credentials
  drawWelcomeLetter(doc, { restaurant, adminEmail, tempPassword, dashboardUrl });

  // Page 2: Quick Setup Guide
  doc.addPage();
  drawQuickSetupGuide(doc, restaurant);

  // Page 3: Printer Setup Guide
  doc.addPage();
  drawPrinterSetupGuide(doc, restaurant);

  // Remaining Pages: Table QR Posters
  if (tables?.length) {
    for (let i = 0; i < tables.length; i++) {
      doc.addPage();
      // eslint-disable-next-line no-await-in-loop
      await drawPosterPage(doc, restaurant, tables[i]);
    }
  }

  doc.save(`${restaurant.slug || "restaurant"}-qr-kit.pdf`);
  return doc;
}

const ROLE_LABELS = { ADMIN: "Restaurant Admin", CAPTAIN: "Captain", KITCHEN: "Kitchen" };

/** Credentials letter listing every role login (Restaurant Admin, Captain, Kitchen). */
function drawCredentialsLetter(doc, { restaurant, accounts, loginUrl }) {
  const { pageWidth } = drawFrame(doc, restaurant);
  heading(doc, "Your ServeSync Access", 45, pageWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(61, 39, 16);
  doc.text(restaurant.name, pageWidth / 2, 55, { align: "center" });

  let y = paragraph(
    doc,
    [
      "Your restaurant is live on ServeSync. Each role below signs in from the same login page",
      "and only ever sees this restaurant's data. Change every temporary password after first login.",
    ],
    20,
    72,
    pageWidth - 40
  );

  y += 6;
  accounts.forEach((account) => {
    doc.setDrawColor(232, 137, 28);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, y, pageWidth - 40, 30, 3, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(120, 100, 80);
    doc.text((ROLE_LABELS[account.role] || account.role).toUpperCase(), 28, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(61, 39, 16);
    doc.text(`Login: ${account.email}`, 28, y + 17);
    doc.text(`Temporary Password: ${account.tempPassword}`, 28, y + 24);
    y += 36;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 100, 80);
  doc.text("SIGN IN AT", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(232, 137, 28);
  doc.text(loginUrl, 20, y + 7);

  doc.setFontSize(9);
  doc.setTextColor(160, 140, 120);
  doc.text("Confidential — share only with the restaurant owner.", pageWidth / 2, doc.internal.pageSize.getHeight() - 18, { align: "center" });
}

/**
 * ServeSync Admin → client handover package: credentials letter for all
 * role logins, the setup guides, and (when the raw QR tokens are available,
 * i.e. right after approval or a QR regeneration) the table QR posters.
 */
export async function generateClientPackagePDF({ restaurant, accounts, loginUrl, tables = [] }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawCredentialsLetter(doc, { restaurant, accounts, loginUrl });
  doc.addPage();
  drawQuickSetupGuide(doc, restaurant);
  doc.addPage();
  drawPrinterSetupGuide(doc, restaurant);

  for (let i = 0; i < tables.length; i++) {
    doc.addPage();
    // eslint-disable-next-line no-await-in-loop
    await drawPosterPage(doc, restaurant, tables[i]);
  }

  doc.save(`${restaurant.slug || "restaurant"}-servesync-access.pdf`);
}
