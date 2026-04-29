import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { alertActivationIntake } from '@/lib/telegram';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const ActivationIntakeSchema = z.object({
  company: z.string().min(2).max(140),
  contactName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  buyerType: z.enum(['venue', 'brand', 'agency', 'event', 'other']),
  city: z.string().min(2).max(140),
  venue: z.string().max(180).optional().default(''),
  budgetRange: z.enum(['500_1500', '1500_5000', '5000_15000', '15000_plus']),
  timeline: z.enum(['this_week', 'this_month', 'next_90_days', 'exploring']),
  goal: z.enum(['foot_traffic', 'ugc', 'launch', 'event', 'repeat_visits', 'other']),
  packageId: z.enum(['pilot-drop', 'local-signal', 'city-takeover']).optional().default('local-signal'),
  website: z.string().max(240).optional().default(''),
  notes: z.string().max(1200).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
});

const BUDGET_FLOORS: Record<z.infer<typeof ActivationIntakeSchema>['budgetRange'], number> = {
  '500_1500': 500,
  '1500_5000': 1500,
  '5000_15000': 5000,
  '15000_plus': 15000,
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 4,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'activation-intake',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many activation requests. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const validation = ActivationIntakeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = validation.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const company = normalizeText(input.company);
    const contactName = normalizeText(input.contactName);
    const city = normalizeText(input.city);
    const venue = normalizeText(input.venue || '');
    const website = normalizeText(input.website || '');
    const notes = input.notes.trim();
    const amount = BUDGET_FLOORS[input.budgetRange];

    const event = await prisma.founderEvent.create({
      data: {
        eventType: 'ACTIVATION_INTAKE',
        source: 'site',
        subjectType: 'activation_lead',
        subjectId: null,
        dedupeKey: `activation-intake:${Date.now()}:${randomUUID()}`,
        title: `${company} wants a paid activation`,
        amount,
        status: 'NEW',
        actor: input.email.toLowerCase(),
        href: '/admin/daily-command-loop',
        metadataJson: {
          company,
          contactName,
          email: input.email.toLowerCase(),
          buyerType: input.buyerType,
          city,
          venue,
          budgetRange: input.budgetRange,
          timeline: input.timeline,
          goal: input.goal,
          packageId: input.packageId,
          website,
          notes,
          clientIp,
        } satisfies Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    void alertActivationIntake({
      leadId: event.id,
      company,
      contactName,
      email: input.email.toLowerCase(),
      buyerType: input.buyerType,
      city,
      venue,
      budgetRange: input.budgetRange,
      timeline: input.timeline,
      goal: input.goal,
      packageId: input.packageId,
      website,
      notes,
    }).catch((error) => {
      console.error('[ACTIVATION_INTAKE] Telegram alert failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTIVATION_INTAKE] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to route activation request' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
