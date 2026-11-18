import type { Express, Request, Response } from "express";
import { requireSupabaseAdmin } from "../lib/supabaseAdmin";
import { requireBearerUser } from "../middleware/auth";
import { createBookingOrder, confirmBookingPayment } from "../services/razorpayCheckout";

type EventRow = {
  id: string;
  title: string;
  status: string;
  is_visible: boolean;
  price_label: string | null;
  metadata: Record<string, unknown> | null;
};

function getEventAmountInr(event: EventRow): number | null {
  const metadata = event.metadata ?? {};
  const pricing = Array.isArray(metadata.pricing)
    ? metadata.pricing as Array<{ amount?: unknown }>
    : [];
  const raw = pricing[0]?.amount ??
    String(event.price_label ?? "").replace(/[^\d.]/g, "");
  const amount = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount >= 1 ? amount : null;
}

/** POST /api/events/checkout/create-order */
async function handleCreateEventOrder(req: Request, res: Response) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;

    const body = req.body as {
      eventId?: string;
      attendeeName?: string;
      attendeeEmail?: string;
      attendeePhone?: string;
      message?: string;
    };
    if (!body.eventId || !body.attendeeName?.trim() ||
        !body.attendeeEmail?.trim() || !body.attendeePhone?.trim()) {
      return res.status(400).json({ error: "Event and attendee details are required" });
    }

    const supabase = requireSupabaseAdmin();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,title,status,is_visible,price_label,metadata")
      .eq("id", body.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventRow = event as EventRow;
    if (eventRow.status !== "Active" || !eventRow.is_visible) {
      return res.status(400).json({ error: "This event is not accepting registrations" });
    }

    // The server reads the current price from the database. Never trust a price
    // supplied by the app, because the client can be stale or modified.
    const amountInr = getEventAmountInr(eventRow);
    if (amountInr === null) {
      return res.status(400).json({ error: "This event has no valid paid registration price" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("event_registrations")
      .select("id,payment_status")
      .eq("event_id", eventRow.id)
      .eq("user_id", user.id)
      .eq("status", "Registered")
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: "Could not check existing registration" });
    }
    if (existing?.payment_status === "Paid") {
      return res.status(409).json({ error: "You are already registered for this event" });
    }

    const order = await createBookingOrder({
      amountInr,
      receipt: `ev_${eventRow.id.slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { type: "community_event", event_id: eventRow.id, user_id: user.id },
    });
    if (!order.ok) return res.status(502).json({ error: order.error });

    const registrationValues = {
      event_id: eventRow.id,
      user_id: user.id,
      attendee_name: body.attendeeName.trim(),
      attendee_email: body.attendeeEmail.trim(),
      attendee_phone: body.attendeePhone.trim(),
      message: body.message?.trim() ?? "",
      status: "Registered",
      payment_status: "Pending",
      razorpay_order_id: order.orderId,
      checkout_amount: amountInr,
    };

    const write = existing
      ? await supabase.from("event_registrations").update(registrationValues).eq("id", existing.id).select("id").single()
      : await supabase.from("event_registrations").insert(registrationValues).select("id").single();

    if (write.error || !write.data) {
      console.error("[eventCheckout] pending registration save failed:", write.error?.message);
      return res.status(500).json({ error: "Could not save pending event registration" });
    }

    return res.json({
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      amountInr,
      currency: order.currency,
      devMode: order.devMode ?? false,
      keyId: process.env.RAZORPAY_KEY_ID?.trim() ?? null,
    });
  } catch (err) {
    console.error("[eventCheckout] create-order failed:", err);
    return res.status(500).json({ error: "Could not create event payment order" });
  }
}

/** POST /api/events/checkout/confirm */
async function handleConfirmEventPayment(req: Request, res: Response) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;

    const { orderId, paymentId, signature, devMode } = req.body as {
      orderId?: string;
      paymentId?: string;
      signature?: string;
      devMode?: boolean;
    };
    if (!orderId || !paymentId) {
      return res.status(400).json({ error: "orderId and paymentId are required" });
    }

    const supabase = requireSupabaseAdmin();
    const { data: registration, error: registrationError } = await supabase
      .from("event_registrations")
      .select("id,payment_status,checkout_amount,razorpay_payment_id")
      .eq("razorpay_order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (registrationError || !registration) {
      return res.status(404).json({ error: "Pending event registration not found for this payment" });
    }
    if (registration.payment_status === "Paid") {
      return res.json({ paymentId: registration.razorpay_payment_id ?? paymentId, orderId, registrationId: registration.id });
    }

    const verified = await confirmBookingPayment({ orderId, paymentId, signature, devMode });
    if (!verified.ok) return res.status(400).json({ error: verified.error });

    const amountInr = Number(registration.checkout_amount);
    if (!Number.isFinite(amountInr) || amountInr < 1) {
      return res.status(400).json({ error: "Stored event checkout amount is invalid" });
    }

    const { data: updated, error: updateError } = await supabase
      .from("event_registrations")
      .update({
        payment_status: "Paid",
        razorpay_payment_id: verified.paymentId,
        amount_paid: amountInr,
      })
      .eq("id", registration.id)
      .eq("payment_status", "Pending")
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return res.status(500).json({ error: "Payment was received but registration confirmation is pending. Please refresh before retrying." });
    }

    return res.json({ paymentId: verified.paymentId, orderId: verified.orderId, registrationId: updated.id });
  } catch (err) {
    console.error("[eventCheckout] confirmation failed:", err);
    return res.status(500).json({ error: "Event payment confirmation failed" });
  }
}

export function registerEventCheckoutRoutes(app: Express) {
  app.post("/api/events/checkout/create-order", handleCreateEventOrder);
  app.post("/api/events/checkout/confirm", handleConfirmEventPayment);
}
