import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";

// Verbose error reporting enabled for debugging and prevention of white screens
const DEBUG_MODE = true;

// BondPay Merchant Credentials
const BONDPAY_MERCHANT_ID = "100888369";
const BONDPAY_PAYIN_API_KEY = "9ddee38c62ef77bea48dcd5c33dd9690";
const BONDPAY_PAYOUT_API_KEY = "4E0A25A284363C974D156E87F24226C7";
const BONDPAY_CREATE_API_URL = "https://api.bond-payss.com/v1/create";

// Initialize Firebase Firestore for Server Backend
let db: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const apps = getApps();
    const serverApp = apps.length > 0 
      ? apps[0] 
      : initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        }, "bondpay-server-app");
    db = getFirestore(serverApp, config.firestoreDatabaseId || "(default)");
  }
} catch (e) {
  console.error("Firebase server init error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for payment diagnostics
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[API ${req.method}] ${req.path}`, req.body ? JSON.stringify(req.body).slice(0, 200) : "");
    }
    next();
  });

  // API Health & Diagnostics Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      gateway: "bondpay",
      merchantId: BONDPAY_MERCHANT_ID,
      apiUrl: BONDPAY_CREATE_API_URL,
      databaseConnected: Boolean(db),
      timestamp: new Date().toISOString()
    });
  });

  /**
   * CREATE PAYMENT ORDER (BondPay)
   * API Endpoint: POST https://api.bond-payss.com/v1/create
   * Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
   */
  app.post("/api/bondpay/create-order", async (req, res) => {
    try {
      const { amount, userId, merchant_order_no } = req.body || {};

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Valid deposit amount is required (min ₹10)" 
        });
      }

      const orderNumber = merchant_order_no || `ORDER_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const formattedAmount = Number(amount).toFixed(2);

      // Determine public callback URL (enforcing real public host instead of internal localhost/3000 proxies)
      const forwardedProto = req.headers["x-forwarded-proto"] || "https";
      let finalHost = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
      if (!finalHost || finalHost.includes("localhost") || finalHost.includes("127.0.0.1") || finalHost.includes("3000") || finalHost.includes("0.0.0.0") || finalHost.includes("vercel.app") || finalHost.includes("projoy")) {
        finalHost = "ais-dev-wffqsfdcyvoujibjqaj4jk-614342679965.asia-east1.run.app";
      }
      const callbackUrl = `${forwardedProto}://${finalHost}/api/bondpay/callback`;

      // Generate MD5 Signature: md5(merchant_id + amount + merchant_order_no + api_key + callback_url)
      const stringToHash = `${BONDPAY_MERCHANT_ID}${formattedAmount}${orderNumber}${BONDPAY_PAYIN_API_KEY}${callbackUrl}`;
      const signature = crypto.createHash("md5").update(stringToHash).digest("hex");

      const payload = {
        merchant_id: BONDPAY_MERCHANT_ID,
        api_key: BONDPAY_PAYIN_API_KEY,
        amount: formattedAmount,
        merchant_order_no: orderNumber,
        callback_url: callbackUrl,
        extra: userId || "0",
        signature: signature
      };

      console.log("Submitting to BondPay API:", { ...payload, api_key: "***" });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(BONDPAY_CREATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseData = await response.json();
      console.log("BondPay API Response Data:", responseData);

      if (responseData && (responseData.success === true || responseData.payment_url || responseData.status === "created")) {
        const bpOrderNo = responseData.order_no || "";
        const mOrderNo = responseData.merchant_order_no || orderNumber;

        // Persist/update in Firestore database immediately
        if (db && userId) {
          try {
            const txRef = doc(db, "transactions", mOrderNo);
            await setDoc(txRef, {
              userId: userId,
              type: "deposit",
              amount: Number(formattedAmount),
              requestedAmount: Number(formattedAmount),
              paymentAmount: Number(formattedAmount),
              status: "pending",
              date: new Date().toISOString(),
              reference: mOrderNo,
              merchantOrderNo: mOrderNo,
              bondPayOrderNo: bpOrderNo,
              utr: bpOrderNo || mOrderNo
            }, { merge: true });
            console.log(`Saved transaction mapped with merchantOrderNo: ${mOrderNo}, bondPayOrderNo: ${bpOrderNo}, UTR: ${bpOrderNo || mOrderNo}`);
          } catch (dbErr) {
            console.error("Error writing transaction to Firestore in server:", dbErr);
          }
        }

        return res.json({
          success: true,
          payment_url: responseData.payment_url,
          order_no: bpOrderNo,
          merchant_order_no: mOrderNo,
          amount: responseData.amount || formattedAmount,
          status: responseData.status || "created"
        });
      } else {
        return res.status(400).json({
          success: false,
          message: responseData?.message || "Failed to generate BondPay gateway link. Please check merchant account status.",
          raw: responseData
        });
      }
    } catch (error: any) {
      console.error("BondPay Create Order Error:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Internal server error while connecting to BondPay gateway",
        details: DEBUG_MODE ? String(error?.stack || error) : undefined
      });
    }
  });

  /**
   * MANUAL / BACKUP UTR SUBMISSION HANDLER
   * Safely records, triggers BondPays API verification, and updates transaction with UTR without white screens.
   */
  const handleUtrSubmission = async (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { orderId, utr, userId, amount } = req.body || {};

      if (!utr || String(utr).trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 12-digit UPI UTR or Reference Number."
        });
      }

      const cleanUtr = String(utr).trim();
      const depositAmount = Number(amount) || 100;
      const refId = orderId || `DEP_${Date.now()}`;

      let matchedDoc: any = null;
      let finalStatus = "pending";

      if (db) {
        if (orderId) {
          try {
            const snap = await getDoc(doc(db, "transactions", orderId));
            if (snap.exists()) matchedDoc = snap;
          } catch (e) {}

          if (!matchedDoc) {
            const q = query(collection(db, "transactions"), where("reference", "==", orderId));
            const snapQ = await getDocs(q);
            if (!snapQ.empty) matchedDoc = snapQ.docs[0];
          }

          if (!matchedDoc) {
            const q2 = query(collection(db, "transactions"), where("merchantOrderNo", "==", orderId));
            const snapQ2 = await getDocs(q2);
            if (!snapQ2.empty) matchedDoc = snapQ2.docs[0];
          }
        }

        if (matchedDoc) {
          const currentData = matchedDoc.data();
          finalStatus = currentData.status === "completed" || currentData.status === "approved" ? "completed" : "pending";
          await updateDoc(matchedDoc.ref, {
            utr: cleanUtr,
            status: finalStatus,
            updatedAt: new Date().toISOString()
          });
        } else if (userId) {
          const newTxRef = doc(db, "transactions", refId);
          await setDoc(newTxRef, {
            userId: userId,
            type: "deposit",
            amount: depositAmount,
            requestedAmount: depositAmount,
            paymentAmount: depositAmount,
            status: "pending",
            date: new Date().toISOString(),
            reference: refId,
            merchantOrderNo: refId,
            utr: cleanUtr
          });
          const freshSnap = await getDoc(newTxRef);
          if (freshSnap.exists()) matchedDoc = freshSnap;
        }

        // Trigger BondPays API status check or registration
        try {
          const mOrderNo = matchedDoc ? (matchedDoc.data().merchantOrderNo || matchedDoc.data().reference || refId) : refId;
          const stringToHash = `${BONDPAY_MERCHANT_ID}${mOrderNo}${BONDPAY_PAYIN_API_KEY}`;
          const querySig = crypto.createHash("md5").update(stringToHash).digest("hex");

          const queryPayload = {
            merchant_id: BONDPAY_MERCHANT_ID,
            merchant_order_no: mOrderNo,
            signature: querySig
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const queryUrls = [
            "https://api.bond-payss.com/v1/query",
            "https://api.bond-payss.com/v1/order/query",
            "https://api.bond-payss.com/v1/order_status"
          ];

          for (const qUrl of queryUrls) {
            try {
              const queryRes = await fetch(qUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(queryPayload),
                signal: controller.signal
              });

              if (queryRes.ok) {
                const gatewayStatusData: any = await queryRes.json();
                const gwStatus = String(gatewayStatusData?.status || gatewayStatusData?.order_status || "").toLowerCase();
                const isPaid = gwStatus === "success" || gwStatus === "paid" || gwStatus === "1" || gatewayStatusData?.is_paid === true;

                if (isPaid && matchedDoc) {
                  await creditUserForDeposit(matchedDoc, {
                    bpOrderNo: gatewayStatusData.order_no || gatewayStatusData.order_id,
                    amount: gatewayStatusData.amount ? Number(gatewayStatusData.amount) : depositAmount,
                    utr: cleanUtr
                  });
                  finalStatus = "completed";
                  break;
                }
              }
            } catch (singleErr) {
              // continue
            }
          }
          clearTimeout(timeoutId);
        } catch (gwErr) {
          console.warn("BondPay gateway check during UTR submission timed out/skipped:", gwErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: finalStatus === "completed" 
          ? "Payment Verified! Wallet has been credited successfully."
          : "UTR submitted successfully! Your transaction is being verified.",
        utr: cleanUtr,
        status: finalStatus,
        reference: refId
      });
    } catch (error: any) {
      console.error("UTR Submission Error:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to submit UTR details.",
        details: DEBUG_MODE ? String(error?.stack || error) : undefined
      });
    }
  };

  app.post("/api/bondpay/submit-utr", handleUtrSubmission);
  app.post("/api/deposit/submit-utr", handleUtrSubmission);
  app.post("/api/verify_utr.php", handleUtrSubmission);
  app.post("/api/deposit.php", handleUtrSubmission);

  /**
   * ATOMIC HELPER: Credit User Wallet For Successful Deposit
   * Checks for duplicate execution, applies 20% first deposit bonus, and marks completed.
   */
  const creditUserForDeposit = async (txDoc: any, additionalData: { bpOrderNo?: string; utr?: string; amount?: number } = {}) => {
    if (!db || !txDoc) return { success: false, message: "Invalid parameters" };

    const txData = txDoc.data();
    if (txData.status === "completed" || txData.status === "approved") {
      return { success: true, alreadyCompleted: true, message: "Transaction already processed" };
    }

    const batch = writeBatch(db);
    const creditAmt = Number(additionalData.amount) || Number(txData.amount) || 0;
    const targetUserId = txData.userId;
    const bpOrderNo = additionalData.bpOrderNo || txData.bondPayOrderNo || "";
    const merchantOrder = txData.merchantOrderNo || txData.reference || txDoc.id;
    const utr = additionalData.utr || bpOrderNo || txData.utr || merchantOrder;

    batch.update(txDoc.ref, {
      status: "completed",
      bondPayOrderNo: bpOrderNo,
      merchantOrderNo: merchantOrder,
      utr: utr,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (targetUserId) {
      const userRef = doc(db, "users", targetUserId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const currentBalance = Number(userSnap.data().balance || 0);

        // Check first deposit bonus (20%)
        const allTxQuery = query(collection(db, "transactions"), where("userId", "==", targetUserId));
        const allTxSnap = await getDocs(allTxQuery);
        const prevApprovedDeposits = allTxSnap.docs.filter(
          d => d.id !== txDoc.id && d.data().type === "deposit" && (d.data().status === "approved" || d.data().status === "completed")
        );

        if (prevApprovedDeposits.length === 0) {
          const bonusAmount = Math.floor(creditAmt * 0.2);
          batch.update(userRef, { balance: currentBalance + creditAmt + bonusAmount });

          const bonusTxId = `BONUS_${Date.now()}`;
          batch.set(doc(db, "transactions", bonusTxId), {
            userId: targetUserId,
            type: "prize",
            amount: bonusAmount,
            status: "completed",
            date: new Date().toISOString(),
            reference: "First Deposit Bonus (20%)"
          });
          console.log(`[Auto-Credit] User ${targetUserId} received ₹${creditAmt} deposit + ₹${bonusAmount} first deposit bonus.`);
        } else {
          batch.update(userRef, { balance: currentBalance + creditAmt });
          console.log(`[Auto-Credit] User ${targetUserId} received ₹${creditAmt} deposit.`);
        }
      }
    }

    await batch.commit();
    return { success: true, creditedAmount: creditAmt };
  };

  /**
   * PAYMENT CALLBACK HANDLER (BondPay)
   */
  const handleBondPayCallback = async (req: express.Request, res: express.Response) => {
    try {
      console.log("BondPay Callback Received:", req.body);
      const { orderNo, merchantOrder, status, amount } = req.body || {};

      if (!merchantOrder) {
        return res.status(200).json({ status: "ok", message: "Merchant order missing" });
      }

      if (db) {
        let txDoc: any = null;
        const q = query(collection(db, "transactions"), where("reference", "==", merchantOrder));
        const snap = await getDocs(q);

        if (!snap.empty) {
          txDoc = snap.docs[0];
        } else {
          try {
            const directSnap = await getDoc(doc(db, "transactions", merchantOrder));
            if (directSnap.exists()) {
              txDoc = directSnap;
            }
          } catch (e) {}
        }

        if (txDoc) {
          const txData = txDoc.data();
          const isSuccess = String(status).toLowerCase() === "success" || String(status) === "1" || String(status).toLowerCase() === "paid";
          const isFailed = String(status).toLowerCase() === "failed" || String(status).toLowerCase() === "failure" || String(status) === "2";

          if (isSuccess && txData.status !== "completed" && txData.status !== "approved") {
            await creditUserForDeposit(txDoc, {
              bpOrderNo: orderNo,
              amount: Number(amount),
              utr: orderNo || merchantOrder
            });
            console.log(`BondPay Order ${merchantOrder} automatically credited via callback.`);
          } else if (isFailed && txData.status !== "completed" && txData.status !== "approved") {
            await updateDoc(txDoc.ref, {
              status: "failed",
              bondPayOrderNo: orderNo || "",
              failedAt: new Date().toISOString()
            });
            console.log(`BondPay Order ${merchantOrder} marked as failed via callback.`);
          }
        }
      }

      return res.status(200).json({
        status: "ok",
        message: "Callback received and processed successfully"
      });
    } catch (error: any) {
      console.error("BondPay Callback Processing Error:", error);
      return res.status(200).json({ status: "ok", message: "Callback processed with errors" });
    }
  };

  app.post("/api/bondpay/callback", handleBondPayCallback);
  app.post("/api/callback", handleBondPayCallback);

  /**
   * STATUS CHECK & REAL-TIME GATEWAY QUERY API
   * Automatically queries BondPay and auto-credits the user wallet on success.
   */
  app.get("/api/bondpay/check-status/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }

      if (!db) {
        return res.json({ success: true, status: "pending", orderId });
      }

      let txDoc: any = null;
      try {
        const directSnap = await getDoc(doc(db, "transactions", orderId));
        if (directSnap.exists()) txDoc = directSnap;
      } catch (e) {}

      if (!txDoc) {
        const q = query(collection(db, "transactions"), where("reference", "==", orderId));
        const snap = await getDocs(q);
        if (!snap.empty) txDoc = snap.docs[0];
      }

      if (!txDoc) {
        const q2 = query(collection(db, "transactions"), where("merchantOrderNo", "==", orderId));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) txDoc = snap2.docs[0];
      }

      if (!txDoc) {
        return res.status(404).json({ success: false, message: "Transaction record not found", orderId });
      }

      let txData = txDoc.data();
      let currentStatus = txData.status || "pending";

      // If still pending, query BondPay Gateway Status API in real-time
      if (currentStatus === "pending") {
        try {
          const mOrderNo = txData.merchantOrderNo || txData.reference || orderId;
          const stringToHash = `${BONDPAY_MERCHANT_ID}${mOrderNo}${BONDPAY_PAYIN_API_KEY}`;
          const querySig = crypto.createHash("md5").update(stringToHash).digest("hex");

          const queryPayload = {
            merchant_id: BONDPAY_MERCHANT_ID,
            merchant_order_no: mOrderNo,
            signature: querySig
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const queryUrls = [
            "https://api.bond-payss.com/v1/query",
            "https://api.bond-payss.com/v1/order/query",
            "https://api.bond-payss.com/v1/order_status"
          ];

          for (const qUrl of queryUrls) {
            try {
              const queryRes = await fetch(qUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(queryPayload),
                signal: controller.signal
              });

              if (queryRes.ok) {
                const gatewayStatusData: any = await queryRes.json();
                console.log(`BondPay Query response from ${qUrl}:`, gatewayStatusData);

                const gwStatus = String(gatewayStatusData?.status || gatewayStatusData?.order_status || "").toLowerCase();
                const isPaid = gwStatus === "success" || gwStatus === "paid" || gwStatus === "1" || gatewayStatusData?.is_paid === true;
                const isFailed = gwStatus === "failed" || gwStatus === "rejected" || gwStatus === "failure" || gwStatus === "2";

                if (isPaid) {
                  await creditUserForDeposit(txDoc, {
                    bpOrderNo: gatewayStatusData.order_no || gatewayStatusData.order_id,
                    amount: gatewayStatusData.amount ? Number(gatewayStatusData.amount) : undefined,
                    utr: gatewayStatusData.order_no || gatewayStatusData.utr || mOrderNo
                  });
                  currentStatus = "completed";
                  break;
                } else if (isFailed) {
                  await updateDoc(txDoc.ref, {
                    status: "failed",
                    failedAt: new Date().toISOString()
                  });
                  currentStatus = "failed";
                  break;
                }
              }
            } catch (singleErr) {
              // try next query url if exists
            }
          }
          clearTimeout(timeoutId);
        } catch (gwErr) {
          console.warn("Real-time gateway status query skipped/timed out:", gwErr);
        }
      }

      // Re-fetch latest document snapshot to return fresh data
      try {
        const freshSnap = await getDoc(txDoc.ref);
        if (freshSnap.exists()) {
          txData = freshSnap.data();
          currentStatus = txData.status || currentStatus;
        }
      } catch (e) {}

      return res.json({
        success: true,
        transactionId: txDoc.id,
        status: currentStatus,
        amount: txData.amount || 0,
        merchantOrderNo: txData.merchantOrderNo || txData.reference || orderId,
        bondPayOrderNo: txData.bondPayOrderNo || "",
        utr: txData.utr || "",
        type: txData.type || "deposit",
        date: txData.date
      });
    } catch (error: any) {
      console.error("Check Status Error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to check order status" });
    }
  });

  /**
   * ADMIN DIRECT APPROVE / REJECT / UPDATE STATUS
   * Seamlessly updates transaction and credits/adjusts user balance in Firestore
   */
  app.post("/api/bondpay/admin-update-status", async (req, res) => {
    try {
      const { transactionId, status, adminKey } = req.body || {};
      if (!transactionId || !status) {
        return res.status(400).json({ success: false, message: "Transaction ID and target status are required" });
      }

      const targetStatus = String(status).toLowerCase();
      if (!["approved", "completed", "failed", "rejected", "pending"].includes(targetStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      if (!db) {
        return res.status(500).json({ success: false, message: "Database not connected" });
      }

      const txRef = doc(db, "transactions", transactionId);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      const txData = txSnap.data();
      const previousStatus = txData.status;
      const batch = writeBatch(db);

      const isApproving = targetStatus === "approved" || targetStatus === "completed";
      const isRejecting = targetStatus === "rejected" || targetStatus === "failed";

      batch.update(txRef, {
        status: isApproving ? "completed" : targetStatus,
        updatedAt: new Date().toISOString(),
        verifiedAt: isApproving ? new Date().toISOString() : txData.verifiedAt || null
      });

      if (isApproving && previousStatus !== "completed" && previousStatus !== "approved") {
        const userRef = doc(db, "users", txData.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const currentBalance = userSnap.data().balance || 0;
          const depositAmt = Number(txData.amount) || 0;

          // Check if first deposit
          const allTxQuery = query(collection(db, "transactions"), where("userId", "==", txData.userId));
          const allTxSnap = await getDocs(allTxQuery);
          const prevApprovedDeposits = allTxSnap.docs.filter(
            d => d.id !== txSnap.id && d.data().type === "deposit" && (d.data().status === "approved" || d.data().status === "completed")
          );

          if (prevApprovedDeposits.length === 0 && txData.type === "deposit") {
            const bonusAmount = Math.floor(depositAmt * 0.2); // 20% bonus
            batch.update(userRef, { balance: currentBalance + depositAmt + bonusAmount });

            const bonusTxId = `BONUS_${Date.now()}`;
            batch.set(doc(db, "transactions", bonusTxId), {
              userId: txData.userId,
              type: "prize",
              amount: bonusAmount,
              status: "completed",
              date: new Date().toISOString(),
              reference: "First Deposit Bonus (20%)"
            });
          } else {
            batch.update(userRef, { balance: currentBalance + depositAmt });
          }
        }
      } else if (isRejecting && txData.type === "withdraw" && (previousStatus === "completed" || previousStatus === "approved")) {
        // Refund withdrawal if rejected after being approved
        const userRef = doc(db, "users", txData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentBalance = userSnap.data().balance || 0;
          batch.update(userRef, { balance: currentBalance + (Number(txData.amount) || 0) });
        }
      }

      await batch.commit();

      return res.json({
        success: true,
        message: `Transaction ${transactionId} status updated to ${targetStatus} and balance synchronized.`,
        status: isApproving ? "completed" : targetStatus
      });
    } catch (error: any) {
      console.error("Admin Update Status Error:", error);
      return res.status(500).json({ success: false, message: error?.message || "Failed to update status" });
    }
  });

  // Global Express error handler to prevent HTML crashes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Unhandled Error Caught:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error occurred.",
      error: DEBUG_MODE ? String(err?.stack || err) : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
