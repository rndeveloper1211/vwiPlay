import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert, ToastAndroid } from "react-native";
import { generatePDF } from "react-native-html-to-pdf";
import Share from "react-native-share";
import { APP_URLS, IMAGE_BASE_URL } from "../utils/network/urls";
import { translate } from "../utils/languageUtils/I18n";
import { wScale } from "../utils/styles/dimensions";

const PDFGenerator = ({ route }) => {
  const {
    Status,
    Debitamount,
    Reqesttime,
    Recharge_number,
    Operator_name,
    Request_ID,
    operator_type,
    Circle,
    Recharge_amount,
    Operatorid,
    RemainPost,
    RemainPre,
    frm_name,
  } = route.params;

const generateAndSharePDF = async () => {
  try {
    const statusColor =
      Status === "SUCCESS"
        ? "#22c55e"
        : Status === "FAILED"
        ? "#ef4444"
        : "#f59e0b";

    const statusIcon =
      Status === "SUCCESS"
        ? "✔"
        : Status === "FAILED"
        ? "✘"
        : "⏳";

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8"/>
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Poppins', Arial, sans-serif;
              background: #f0f4ff;
              padding: 24px;
              color: #1e293b;
            }

            .card {
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              max-width: 480px;
              margin: 0 auto;
            }

            /* ── Header ── */
            .header {
              background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
              padding: 28px 24px 20px;
              text-align: center;
              color: white;
            }
            .logo {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              border: 3px solid rgba(255,255,255,0.4);
              object-fit: contain;
              background: white;
              padding: 4px;
              margin-bottom: 10px;
            }
            .app-name {
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.5px;
              margin-bottom: 14px;
            }

            /* ── Status Badge ── */
            .status-badge {
              display: inline-block;
              background: rgba(255,255,255,0.15);
              border: 2px solid rgba(255,255,255,0.5);
              border-radius: 30px;
              padding: 6px 20px;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 1px;
            }
            .status-icon {
              display: inline-block;
              width: 20px;
              height: 20px;
              background: ${statusColor};
              border-radius: 50%;
              text-align: center;
              line-height: 20px;
              font-size: 11px;
              color: white;
              margin-right: 6px;
              font-weight: bold;
            }
            .date-text {
              font-size: 11px;
              color: rgba(255,255,255,0.75);
              margin-top: 10px;
            }

            /* ── Amount Section ── */
            .amount-section {
              background: #f8faff;
              padding: 20px 24px;
              text-align: center;
              border-bottom: 1px dashed #cbd5e1;
            }
            .amount-label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .amount-value {
              font-size: 32px;
              font-weight: 700;
              color: #1e293b;
            }
            .operator-tag {
              display: inline-block;
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 11px;
              font-weight: 600;
              padding: 3px 10px;
              border-radius: 20px;
              margin-top: 6px;
            }

            /* ── Info Rows ── */
            .section {
              padding: 16px 24px;
              border-bottom: 1px solid #f1f5f9;
            }
            .section-title {
              font-size: 10px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 10px;
            }
            .row:last-child { margin-bottom: 0; }
            .row-label {
              font-size: 12px;
              color: #64748b;
              flex: 1;
            }
            .row-value {
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
              text-align: right;
              flex: 1;
            }

            /* ── Balance Cards ── */
            .balance-section {
              padding: 16px 24px;
              border-bottom: 1px solid #f1f5f9;
            }
            .balance-grid {
              display: flex;
              gap: 10px;
            }
            .balance-card {
              flex: 1;
              background: #f8faff;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px;
              text-align: center;
            }
            .balance-card-label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .balance-card-value {
              font-size: 15px;
              font-weight: 700;
              color: #1e293b;
            }
            .balance-card.post .balance-card-value { color: #22c55e; }

            /* ── Footer ── */
            .footer {
              background: #f8faff;
              padding: 16px 24px;
              text-align: center;
            }
            .footer-text {
              font-size: 11px;
              color: #94a3b8;
              line-height: 1.6;
            }
            .txn-id-pill {
              display: inline-block;
              background: #e2e8f0;
              color: #475569;
              font-size: 10px;
              font-weight: 600;
              padding: 3px 10px;
              border-radius: 20px;
              margin-top: 8px;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="card">

            <!-- Header -->
            <div class="header">
              <img 
                class="logo" 
                src=${IMAGE_BASE_URL+`app_logo.png`}
                onerror="this.style.display='none'"
              />
              <div class="app-name">${APP_URLS.AppName}</div>
              <div class="status-badge">
                <span class="status-icon">${statusIcon}</span>
                Transaction ${Status}
              </div>
              <div class="date-text">${Reqesttime}</div>
            </div>

            <!-- Amount -->
            <div class="amount-section">
              <div class="amount-label">Debit Amount</div>
              <div class="amount-value">₹ ${Debitamount}</div>
              <div class="operator-tag">${Operator_name} • ${Circle}</div>
            </div>

            <!-- Transaction Details -->
            <div class="section">
              <div class="section-title">Transaction Details</div>
              <div class="row">
                <span class="row-label">Transaction ID</span>
                <span class="row-value">${Request_ID}</span>
              </div>
              <div class="row">
                <span class="row-label">Retailer Firm</span>
                <span class="row-value">${frm_name || "-"}</span>
              </div>
              <div class="row">
                <span class="row-label">Operator ID</span>
                <span class="row-value">${Operatorid}</span>
              </div>
              <div class="row">
                <span class="row-label">Recharge Number</span>
                <span class="row-value">${Recharge_number}</span>
              </div>
            </div>

            <!-- Amount Breakdown -->
            <div class="section">
              <div class="section-title">Amount Breakdown</div>
              <div class="row">
                <span class="row-label">Recharge Amount</span>
                <span class="row-value">₹ ${Recharge_amount}</span>
              </div>
              <div class="row">
                <span class="row-label">Debit Amount</span>
                <span class="row-value">₹ ${Debitamount}</span>
              </div>
            </div>

            <!-- Balance -->
            <div class="balance-section">
              <div class="section-title">Balance Summary</div>
              <div class="balance-grid">
                <div class="balance-card">
                  <div class="balance-card-label">Pre Balance</div>
                  <div class="balance-card-value">₹ ${RemainPre}</div>
                </div>
                <div class="balance-card post">
                  <div class="balance-card-label">Post Balance</div>
                  <div class="balance-card-value">₹ ${RemainPost}</div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-text">
                Thank you for using <strong>${APP_URLS.AppName}</strong><br/>
                This is a system generated receipt.
              </div>
              <div class="txn-id-pill">TXN ID: ${Request_ID}</div>
            </div>

          </div>
        </body>
      </html>
    `;

    const options = {
      html: htmlContent,
      fileName: `TXN-${Request_ID}`,
      directory: "Documents",
    };

    const file = await generatePDF(options);

    await Share.open({
      url: `file://${file.filePath}`,
      type: "application/pdf",
      title: translate("Share Receipt"),
      message: `${translate("Transaction Receipt")} - ${APP_URLS.AppName}`,
    });
  } catch (error) {
    if (error?.message !== "User did not share") {
      ToastAndroid.show(
        translate("Failed to generate PDF"),
        ToastAndroid.SHORT
      );
      console.log("PDF Error:", error);
    }
  }
};
  return (
    <TouchableOpacity style={styles.pdfButton} onPress={generateAndSharePDF}>
      <Text style={styles.pdfButtonText}>
        {translate("Download / Share PDF")}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pdfButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  pdfButtonText: {
    color: "#fff",
    fontSize: wScale(16),
    fontWeight: "bold",
  },
});

export default PDFGenerator;