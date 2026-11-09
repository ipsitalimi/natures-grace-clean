import type { Express, Request, Response } from "express";
import { requireSupabaseAdmin } from "../lib/supabaseAdmin";
import { requireRole } from "../middleware/auth";
import { dispatchUserNotification } from "../services/notificationDispatch";
import { sendEmailToUserId } from "../services/email/emailService";
import { insertActivityLog } from "../services/activityLogAdmin";
import { createRazorpayRefund } from "../services/razorpayRefund";
import { reverseOrderEarning } from "../services/sellerWalletLedger";
import { reverseBookingEarning } from "../services/practitionerWalletLedger";
import { fetchCommissionRate } from "../services/platformSettings";
import {
  restoreOrderStock,
  restorePromoUsageOnRefund,
} from "../services/orderFulfillment";

type PayoutStatus = "Pending" | "Under Review" | "Processing" | "Completed" | "Rejected";

async function notifyPayoutStatus(
  payoutType: "seller" | "practitioner",
  payoutId: string,
  status: PayoutStatus,
  rejectionReason?: string
) {
  if (status !== "Completed" && status !== "Rejected") return;
  const supabase = requireSupabaseAdmin();
  const table = payoutType === "seller" ? "seller_payouts" : "practitioner_payouts";
  const relation = payoutType === "seller"
    ? "seller_wallets(sellers(profile_id))"
    : "practitioner_wallets(practitioners(profile_id))";
  const { data } = await supabase.from(table).select(`amount, ${relation}`).eq("id", payoutId).maybeSingle();
  const row = data as Record<string, unknown> | null;
  const nested = payoutType === "seller"
    ? (row?.seller_wallets as { sellers?: { profile_id?: string } } | null)?.sellers
    : (row?.practitioner_wallets as { practitioners?: { profile_id?: string } } | null)?.practitioners;
  const profileId = nested?.profile_id;
  if (!profileId) return;
  const amountStr = `₹${Number(row?.amount ?? 0).toLocaleString("en-IN")}`;
  await dispatchUserNotification(supabase, {
    userId: profileId,
    event: status === "Completed" ? "withdrawal_completed" : "withdrawal_received",
    message: status === "Completed"
      ? `Your withdrawal of ${amountStr} has been completed.`
      : `Your withdrawal request was not approved. Funds returned to your wallet. ${rejectionReason ?? ""}`.trim(),
    linkRoute: "Main",
  });
}

export function registerAdminOperationsRoutes(app: Express) {
  app.get("/api/admin/bookings/schedule", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const supabase = requireSupabaseAdmin();
    let query = supabase
      .from("practitioner_bookings")
      .select("id, booking_number, user_id, practitioner_id, client_name, service_name, session_date, session_time, duration_minutes, booking_status, payment_status, meeting_link")
      .in("booking_status", ["Pending", "Confirmed"])
      .order("session_date", { ascending: true })
      .order("session_time", { ascending: true });

    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    if (from) query = query.gte("session_date", from);
    if (to) query = query.lte("session_date", to);

    const { data, error } = await query.limit(250);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ sessions: data ?? [] });
  });

  app.patch("/api/admin/bookings/:id/schedule", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const bookingId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { sessionDate, sessionTime, meetingLink } = req.body as {
      sessionDate?: string;
      sessionTime?: string;
      meetingLink?: string | null;
    };
    if (!sessionDate || !/^\\d{4}-\\d{2}-\\d{2}$/.test(sessionDate)) {
      return res.status(400).json({ error: "Session date must use YYYY-MM-DD." });
    }
    if (!sessionTime || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(sessionTime)) {
      return res.status(400).json({ error: "Session time must use 24-hour HH:MM." });
    }
    if (meetingLink != null && meetingLink.trim()) {
      try {
        const parsed = new URL(meetingLink.trim());
        if (parsed.protocol !== "https:") throw new Error("HTTPS required");
      } catch {
        return res.status(400).json({ error: "Meeting link must be a valid HTTPS URL." });
      }
    }

    const supabase = requireSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from("practitioner_bookings")
      .select("id, booking_status")
      .eq("id", bookingId)
      .maybeSingle();
    if (fetchError || !existing) return res.status(404).json({ error: "Booking not found." });
    if (!["Pending", "Confirmed"].includes(existing.booking_status)) {
      return res.status(409).json({ error: "Only pending or confirmed sessions can be rescheduled." });
    }

    const { data: booking, error } = await supabase
      .from("practitioner_bookings")
      .update({
        session_date: sessionDate,
        session_time: sessionTime,
        meeting_link: meetingLink?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .in("booking_status", ["Pending", "Confirmed"])
      .select("id, session_date, session_time, meeting_link")
      .maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    if (!booking) return res.status(409).json({ error: "Booking changed before the schedule update was saved." });

    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "booking",
      description: `Booking ${bookingId} rescheduled by admin`,
      targetType: "booking",
      targetId: bookingId,
    });
    return res.json({ ok: true, booking });
  });

  app.get("/api/admin/payouts", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const supabase = requireSupabaseAdmin();
    const [sellerPayouts, practitionerPayouts] = await Promise.all([
      supabase
        .from("seller_payouts")
        .select("*, seller_wallets(seller_id, sellers(store_name, profile_id))")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("practitioner_payouts")
        .select("*, practitioner_wallets(practitioner_id, practitioners(name, profile_id))")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return res.json({
      seller: sellerPayouts.data ?? [],
      practitioner: practitionerPayouts.data ?? [],
    });
  });

  app.post("/api/admin/payouts/:type/:id/status", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const typeParam = String(Array.isArray(req.params.type) ? req.params.type[0] : req.params.type);
    const payoutId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status, rejectionReason } = req.body as {
      status: PayoutStatus;
      rejectionReason?: string;
    };

    const allowed: PayoutStatus[] = ["Under Review", "Processing", "Completed", "Rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (typeParam !== "seller" && typeParam !== "practitioner") {
      return res.status(400).json({ error: "Invalid type" });
    }

    const supabase = requireSupabaseAdmin();
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_update_payout_status", {
      p_payout_type: typeParam,
      p_payout_id: payoutId,
      p_status: status,
      p_admin_id: admin.id,
      p_rejection_reason: rejectionReason ?? null,
    });
    if (rpcError) return res.status(400).json({ error: rpcError.message });
    const rpcResult = rpcData as { ok?: boolean; error?: string; already_applied?: boolean } | null;
    if (!rpcResult?.ok) {
      return res.status(400).json({ error: rpcResult?.error ?? "Could not update payout status" });
    }

    if (!rpcResult.already_applied) {
      await notifyPayoutStatus(typeParam, payoutId, status, rejectionReason);
    }

    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "settings",
      description: `Payout ${payoutId} marked ${status}`,
      targetType: "payout",
      targetId: payoutId,
    });

    return res.json({ ok: true });
  });

  app.get("/api/admin/refunds", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const { data, error } = await requireSupabaseAdmin()
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ refunds: data ?? [] });
  });

  app.post("/api/admin/refunds/:id/status", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const { status, adminNotes } = req.body as {
      status: "in_review" | "approved" | "rejected";
      adminNotes?: string;
    };
    if (!["in_review", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid refund status" });
    }
    const refundId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const supabase = requireSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("id", refundId)
      .maybeSingle();

    if (fetchError || !existing) {
      return res.status(404).json({ error: "Refund request not found" });
    }

    const existingStatus = String((existing as { status: string }).status);
    if (existingStatus === "approved" || existingStatus === "rejected") {
      return res.status(409).json({ error: `Refund already ${existingStatus}` });
    }

    const userId = (existing as { user_id: string }).user_id;
    const orderId = (existing as { order_id?: string | null }).order_id;
    const bookingId = (existing as { booking_id?: string | null }).booking_id;

    if (status === "approved" && Boolean(orderId) === Boolean(bookingId)) {
      return res.status(400).json({ error: "Refund request must reference exactly one order or booking" });
    }

    if (status === "approved") {
      const commissionRate = await fetchCommissionRate(supabase);
      let refundError: string | undefined;

      if (orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select(
            "id, order_number, seller_id, status, payment_status, total, razorpay_payment_id, seller_promo_id, platform_promo_id"
          )
          .eq("id", orderId)
          .maybeSingle();

        if (!order) {
          refundError = "Order not found";
        } else if (!order.razorpay_payment_id) {
          refundError = "Order has no Razorpay payment ID — process refund manually";
        } else {
          const razorpayRefund = await createRazorpayRefund({
            paymentId: order.razorpay_payment_id as string,
            amountInr: Number(order.total),
            notes: { refund_request_id: refundId },
          });
          if (!razorpayRefund.ok) {
            refundError = razorpayRefund.error;
          }
        }

        if (!refundError && order) {
          await reverseOrderEarning(
            supabase,
            {
              id: order.id,
              order_number: order.order_number,
              seller_id: order.seller_id,
              status: order.status,
              payment_status: order.payment_status,
              total: Number(order.total),
            },
            commissionRate
          );
          await restoreOrderStock(supabase, orderId);
          await restorePromoUsageOnRefund(supabase, {
            seller_promo_id: (order as { seller_promo_id?: string | null }).seller_promo_id ?? null,
            platform_promo_id: (order as { platform_promo_id?: string | null }).platform_promo_id ?? null,
          });
          await supabase
            .from("orders")
            .update({ payment_status: "Refunded", status: "Cancelled" })
            .eq("id", orderId);
        }
      } else if (bookingId) {
        const { data: booking } = await supabase
          .from("practitioner_bookings")
          .select(
            "id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name, razorpay_payment_id"
          )
          .eq("id", bookingId)
          .maybeSingle();

        if (!booking) {
          refundError = "Booking not found";
        } else if (!booking.razorpay_payment_id) {
          refundError = "Booking has no Razorpay payment ID — process refund manually";
        } else {
          const razorpayRefund = await createRazorpayRefund({
            paymentId: booking.razorpay_payment_id as string,
            amountInr: Number(booking.amount),
            notes: { refund_request_id: refundId },
          });
          if (!razorpayRefund.ok) {
            refundError = razorpayRefund.error;
          }
        }

        if (!refundError && booking) {
          await reverseBookingEarning(
            supabase,
            {
              id: booking.id,
              booking_number: booking.booking_number,
              practitioner_id: booking.practitioner_id,
              booking_status: booking.booking_status,
              payment_status: booking.payment_status,
              amount: Number(booking.amount),
              service_name: booking.service_name,
            },
            commissionRate
          );
          await supabase
            .from("practitioner_bookings")
            .update({ payment_status: "Refunded", booking_status: "Cancelled" })
            .eq("id", bookingId);
        }
      }

      if (refundError) {
        return res.status(502).json({ error: refundError });
      }
    }

    const { data: refund, error } = await supabase
      .from("refund_requests")
      .update({
        status,
        admin_notes: adminNotes ?? null,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", refundId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    if (status === "approved") {
      await dispatchUserNotification(supabase, {
        userId,
        event: "refund_approved",
        message: "Your refund request has been approved. Funds will return within 7–10 business days.",
        linkRoute: "OrderHistory",
        emailVars: { reference: refundId },
      });
    } else if (status === "rejected") {
      await dispatchUserNotification(supabase, {
        userId,
        event: "refund_rejected",
        message: "Your refund request was reviewed and could not be approved.",
        linkRoute: "OrderHistory",
        emailVars: { reference: refundId },
      });
    }

    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "store",
      description: `Refund request ${refundId} marked ${status}`,
      targetType: "refund",
      targetId: refundId,
    });

    return res.json({ ok: true, refund });
  });

  app.post("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;

    const userId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { role } = req.body as { role?: string };
    if (!role || !["User", "Seller", "Practitioner", "Admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_provision_user_role", {
      p_user_id: userId,
      p_role: role,
      p_admin_id: admin.id,
    });

    if (error) return res.status(400).json({ error: error.message });
    const result = data as { ok?: boolean; error?: string };
    if (!result?.ok) {
      return res.status(400).json({ error: result?.error ?? "Could not update role" });
    }

    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "user",
      description: `User ${userId} role set to ${role}`,
      targetType: "user",
      targetId: userId,
    });

    return res.json({ ok: true, role });
  });
}
