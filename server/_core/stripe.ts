import Stripe from "stripe";
import { ENV } from "./env";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  customerName: string;
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: params.lineItems,
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      customer_name: params.customerName,
      ...params.metadata,
    },
  });

  return session;
}

export async function confirmPayment(paymentIntentId: string) {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent;
}

export async function getCustomer(customerId: string) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  return customer;
}

export async function createCustomer(params: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });
  return customer;
}
