/**
 * Nivo POS - Supabase SMS Hook Webhook Handler
 * File: api/auth/send-otp.ts
 *
 * This Vercel Serverless Function connects Supabase Auth "Send SMS Hook"
 * to Indian SMS Gateways (MSG91, 2Factor.in) or logs OTP during development.
 */

interface SupabaseSmsHookPayload {
  user?: {
    id?: string;
    phone?: string;
    email?: string;
  };
  sms?: {
    otp?: string;
  };
  recipient?: string;
  otp?: string;
}

export default async function handler(req: any, res: any) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Supabase SMS Hook requires POST',
    });
  }

  try {
    const body: SupabaseSmsHookPayload =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    // Extract phone and OTP from Supabase hook variations
    const phone = body.user?.phone || body.recipient;
    const otp = body.sms?.otp || body.otp;

    if (!phone) {
      return res.status(400).json({
        error: 'Missing recipient phone number',
        received: body,
      });
    }

    if (!otp) {
      return res.status(400).json({
        error: 'Missing OTP code',
        received: body,
      });
    }

    // Sanitize phone number (strip whitespace, ensure +91 for Indian mobile)
    let cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+91${cleanPhone.replace(/^0+/, '')}`;
    }

    const indianMobileWithoutCountryCode = cleanPhone.replace(/^\+91/, '');

    // Provider check
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
    const twoFactorApiKey = process.env.TWOFACTOR_API_KEY;

    // 1. MSG91 Integration
    if (msg91AuthKey && msg91TemplateId) {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: msg91AuthKey,
        },
        body: JSON.stringify({
          template_id: msg91TemplateId,
          mobile: cleanPhone.replace('+', ''),
          otp: otp,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`MSG91 Error: ${JSON.stringify(data)}`);
      }

      return res.status(200).json({
        success: true,
        message: 'OTP dispatched via MSG91',
        provider: 'msg91',
        recipient: cleanPhone,
      });
    }

    // 2. 2Factor.in Integration (Common Indian SMS Gateway)
    if (twoFactorApiKey) {
      const endpoint = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${indianMobileWithoutCountryCode}/${otp}/NivoPOS_OTP`;
      const response = await fetch(endpoint, { method: 'GET' });
      const data = await response.json();

      if (data.Status !== 'Success') {
        throw new Error(`2Factor Error: ${JSON.stringify(data)}`);
      }

      return res.status(200).json({
        success: true,
        message: 'OTP dispatched via 2Factor.in',
        provider: 'twofactor',
        recipient: cleanPhone,
      });
    }

    // 3. Development / Sandbox Fallback
    console.log(`[Nivo POS SMS Hook] (Simulated Dev Mode) Phone: ${cleanPhone} | OTP: ${otp}`);

    return res.status(200).json({
      success: true,
      message:
        'OTP simulated successfully. Configure MSG91_AUTH_KEY or TWOFACTOR_API_KEY in production.',
      provider: 'development-mock',
      recipient: cleanPhone,
      simulatedOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
    });
  } catch (err: any) {
    console.error('[Nivo POS SMS Hook] Exception:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while sending OTP',
    });
  }
}
