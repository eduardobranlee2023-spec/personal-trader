import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2"

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') || 'BAAa2eHubsfQ_fFOsy2gjhH5zgK7pfQgluEWU1B9d-BFrxIT_EHAsfWDAO1vJeQvjaSF2Tb5T6rXXOoxA0';
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
const PAYPAL_WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const PAYPAL_API = 'https://api-m.paypal.com'; // Live environment

async function getPayPalAccessToken() {
  const credentials = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }
  const data = await response.json();
  return data.access_token;
}

async function verifyWebhookSignature(req: Request, rawBody: string) {
  const accessToken = await getPayPalAccessToken();
  const headers = req.headers;
  
  const payload = {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody)
  };

  const response = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    
    // Verificamos la firma
    const isValid = await verifyWebhookSignature(req, rawBody);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event_type;
    const resource = event.resource;

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    let subscriptionId = '';
    
    if (eventType === 'PAYMENT.SALE.COMPLETED') {
      subscriptionId = resource.billing_agreement_id;
    } else {
      subscriptionId = resource.id;
    }

    if (!subscriptionId) {
      return new Response('OK', { status: 200 });
    }

    // Buscamos al usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, access_status, subscription_expires_at')
      .eq('paypal_subscription_id', subscriptionId)
      .single();

    if (!profile) {
      console.log('No user found for subscription:', subscriptionId);
      return new Response('OK', { status: 200 });
    }

    const today = new Date();
    
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      // Mes de prueba. Activamos y damos 1 mes de acceso desde hoy.
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      
      await supabase.from('profiles').update({
        access_status: 'activa',
        subscription_expires_at: expires.toISOString(),
      }).eq('id', profile.id);
      
    } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
      // Cobro real completado (después del trial o renovación)
      // Extendemos 1 mes desde el vencimiento actual o desde hoy si ya venció
      let currentExpires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : new Date();
      if (currentExpires < today) {
        currentExpires = new Date();
      }
      currentExpires.setMonth(currentExpires.getMonth() + 1);
      
      await supabase.from('profiles').update({
        access_status: 'activa',
        subscription_expires_at: currentExpires.toISOString(),
        last_payment_confirmed_at: today.toISOString()
      }).eq('id', profile.id);

    } else if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      // No hacemos nada, esperamos a que expire naturalmente o que PayPal reintente.
      console.log('Payment failed, waiting for retry or expiration');
      
    } else if (eventType === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      // Suspendido por falta de pago (después de reintentos)
      await supabase.from('profiles').update({
        access_status: 'vencida'
      }).eq('id', profile.id);
      
    } else if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
      // Cancelado o Expirado
      await supabase.from('profiles').update({
        access_status: eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ? 'cancelada' : 'vencida'
      }).eq('id', profile.id);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
})
