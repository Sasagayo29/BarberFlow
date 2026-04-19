import Stripe from "stripe";
import { getDb } from "../db";
import { payments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {});

export async function handleStripeWebhook(event: Stripe.Event) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    return;
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("[Stripe Webhook] Payment succeeded:", paymentIntent.id);

      // Atualizar status do pagamento no banco de dados
      if (paymentIntent.metadata?.payment_id) {
        await db
          .update(payments)
          .set({
            status: "completed",
            stripePaymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, paymentIntent.metadata.payment_id));

        console.log("[Stripe Webhook] Payment status updated to completed");
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("[Stripe Webhook] Payment failed:", paymentIntent.id);

      // Atualizar status do pagamento como falho
      if (paymentIntent.metadata?.payment_id) {
        await db
          .update(payments)
          .set({
            status: "failed",
            stripePaymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, paymentIntent.metadata.payment_id));

        console.log("[Stripe Webhook] Payment status updated to failed");
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.log("[Stripe Webhook] Charge refunded:", charge.id);

      // Atualizar status do pagamento como refundado
      if (charge.payment_intent) {
        await db
          .update(payments)
          .set({
            status: "refunded",
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, charge.payment_intent.toString()));

        console.log("[Stripe Webhook] Payment status updated to refunded");
      }
      break;
    }

    default:
      console.log("[Stripe Webhook] Unhandled event type:", event.type);
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Stripe.Event | null {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed:", error);
    return null;
  }
}
