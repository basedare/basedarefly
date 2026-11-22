import "server-only";
import { SESSION_RECORDING_CONSENT } from "./adventure-sharing";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  requireEconomy as need,
  validateSchedule,
  type EconomyInput,
} from "./local-economy";
import { socialContext, hiddenPerson } from "./social-targets-server";
import { calculateDistance } from "./geo";

type Tx = Prisma.TransactionClient;
const liveTag = { status: { in: ["ACTIVE", "VERIFIED"] }, revokedAt: null };
export async function economyActor(tx: Tx, wallet: string) {
  const actor = await tx.streamerTag.findFirst({
    where: {
      ...liveTag,
      walletAddress: { equals: wallet, mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
  });
  need(actor, "Claim an active @tag before hosting or participating.", 403);
  return actor;
}
async function tagOwns(tx: Tx, tagId: string, wallet: string) {
  return Boolean(
    await tx.streamerTag.findFirst({
      where: {
        id: tagId,
        ...liveTag,
        walletAddress: { equals: wallet, mode: "insensitive" },
      },
    })
  );
}
export async function nodeAuthority(
  tx: Tx,
  id: string,
  wallet: string,
  ownerOnly = false
) {
  const n = await tx.localNode.findUnique({ where: { id } });
  need(n && n.status !== "WITHDRAWN", "Node is unavailable.", 404);
  need(
    await tagOwns(tx, n.ownerTagId, n.ownerWallet),
    "Node owner is unavailable.",
    403
  );
  if (n.ownerWallet === wallet && (await tagOwns(tx, n.ownerTagId, wallet)))
    return n;
  const member = await tx.nodeMembership.findUnique({
    where: { nodeId_wallet: { nodeId: id, wallet } },
  });
  need(
    !ownerOnly &&
      member?.role === "ADMIN" &&
      member.status === "ACCEPTED" &&
      (await tagOwns(tx, member.tagId, wallet)),
    "Only a current Node administrator can do that.",
    403
  );
  return n;
}
async function venue(tx: Tx, id: string) {
  const v = await tx.venue.findUnique({ where: { id } });
  need(v?.status === "ACTIVE", "Choose a current public venue.", 404);
  return v;
}
function venueOperator(
  v: {
    claimedBy: string | null;
    claimedAt: Date | null;
    claimRequestStatus: string | null;
  },
  wallet: string
) {
  return (
    v.claimedBy?.toLowerCase() === wallet &&
    v.claimedAt &&
    v.claimRequestStatus === "APPROVED"
  );
}
async function unblocked(tx: Tx, a: string, b: string) {
  const tags = await tx.streamerTag.findMany({
    where: { walletAddress: { in: [a, b], mode: "insensitive" } },
    select: { id: true, walletAddress: true },
  });
  const aIds = tags
    .filter((t) => t.walletAddress.toLowerCase() === a)
    .map((t) => t.id);
  const bIds = tags
    .filter((t) => t.walletAddress.toLowerCase() === b)
    .map((t) => t.id);
  const blocked = await tx.meetupBlock.findFirst({
    where: {
      OR: [
        { blockerBaretagId: { in: aIds }, blockedBaretagId: { in: bIds } },
        { blockerBaretagId: { in: bIds }, blockedBaretagId: { in: aIds } },
      ],
    },
  });
  need(!blocked, "This interaction is unavailable.", 403);
}
async function audit(
  tx: Tx,
  wallet: string,
  action: string,
  id: string,
  dedupeKey?: string
) {
  await tx.founderEvent.create({
    data: {
      eventType: "LOCAL_ECONOMY_AUDIT",
      source: "server",
      subjectType: action,
      subjectId: id,
      actor: wallet,
      status: "RECORDED",
      dedupeKey: dedupeKey ?? "economy:" + randomBytes(16).toString("hex"),
    },
  });
}
async function opportunityHost(tx: Tx, id: string, wallet: string) {
  const o = await tx.localOpportunity.findUnique({ where: { id } });
  need(o, "Opportunity unavailable.", 404);
  if (o.nodeId) await nodeAuthority(tx, o.nodeId, wallet);
  else {
    need(
      o.authorWallet === wallet && (await tagOwns(tx, o.authorTagId, wallet)),
      "Only the current organizer can do that.",
      403
    );
    need(
      venueOperator(await venue(tx, o.venueId), wallet),
      "Venue authority is no longer current.",
      403
    );
  }
  return o;
}
async function currentOpportunity(tx: Tx, id: string) {
  const o = await tx.localOpportunity.findUnique({ where: { id } });
  need(
    o?.status === "OPEN" && o.expiresAt > new Date() && o.startsAt > new Date(),
    "This opportunity is no longer accepting requests."
  );
  await venue(tx, o.venueId);
  need(
    await tagOwns(tx, o.authorTagId, o.authorWallet),
    "Organizer unavailable."
  );
  if (o.nodeId) {
    const n = await nodeAuthority(tx, o.nodeId, o.authorWallet);
    need(n.status === "PUBLISHED" && n.publicConsent, "Node unavailable.");
  } else
    need(
      venueOperator(await venue(tx, o.venueId), o.authorWallet),
      "Venue authority is no longer current."
    );
  return o;
}
async function sessionHost(tx: Tx, id: string, wallet: string) {
  const s = await tx.baseDareSession.findUnique({
    where: { id },
    include: { meetup: true },
  });
  need(s, "Session unavailable.", 404);
  if (s.nodeId) await nodeAuthority(tx, s.nodeId, wallet);
  else
    need(
      s.hostWallet === wallet && (await tagOwns(tx, s.hostTagId, wallet)),
      "Only the current host can do that.",
      403
    );
  return s;
}
export async function currentSession(tx: Tx, id: string) {
  const s = await tx.baseDareSession.findUnique({
    where: { id },
    include: { meetup: true },
  });
  need(
    s?.meetup.status === "active" && s.endsAt > new Date(),
    "Session ended or cancelled."
  );
  need(await tagOwns(tx, s.hostTagId, s.hostWallet), "Host unavailable.");
  await venue(tx, s.meetup.venueId!);
  if (s.nodeId) {
    const n = await nodeAuthority(tx, s.nodeId, s.hostWallet);
    need(n.status === "PUBLISHED" && n.publicConsent, "Node unavailable.");
  }
  return s;
}
async function noBookingConflict(
  tx: Tx,
  wallet: string,
  startsAt: Date,
  endsAt: Date,
  nodeId?: string | null
) {
  const conflict = await tx.opportunityRequest.findFirst({
    where: {
      status: "CONFIRMED",
      opportunity: {
        status: "OPEN",
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      OR: [
        { wallet },
        ...(nodeId ? [{ opportunity: { targetNodeId: nodeId } }] : []),
      ],
    },
  });
  const sessionConflict = await tx.baseDareSession.findFirst({
    where: {
      meetup: { status: "active", startTime: { lt: endsAt } },
      endsAt: { gt: startsAt },
      OR: [
        { hostWallet: wallet },
        { guests: { some: { wallet, status: "APPROVED" } } },
      ],
    },
  });
  need(
    !conflict && !sessionConflict,
    "This participant or Node already has an overlapping confirmed booking or Session."
  );
}
/** One short DB lock serializes MVP decisions, capacity and schedule checks across instances. No provider calls in this transaction. */
export async function executeEconomy(walletInput: string, c: EconomyInput) {
  const wallet = walletInput.toLowerCase();
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('local-economy-v1'))::text`;
      const actor = await economyActor(tx, wallet);
      const createKey = c.action.endsWith(".create")
        ? "economy-create:" +
          wallet +
          ":" +
          createHash("sha256").update(JSON.stringify(c)).digest("hex")
        : undefined;
      if (createKey) {
        const previous = await tx.founderEvent.findUnique({
          where: { dedupeKey: createKey },
        });
        if (previous?.subjectId) return { id: previous.subjectId };
      }
      const dailyActions = await tx.founderEvent.count({
        where: {
          eventType: "LOCAL_ECONOMY_AUDIT",
          actor: wallet,
          occurredAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      need(
        dailyActions < 200,
        "Daily participation action limit reached. Try again tomorrow.",
        429
      );
      let result: { id: string };
      switch (c.action) {
        case "node.create": {
          need(
            (await tx.localNode.count({
              where: { ownerWallet: wallet, status: { not: "WITHDRAWN" } },
            })) < 5,
            "You can manage five active Nodes."
          );
          result = await tx.localNode.create({
            data: {
              slug: c.slug,
              name: c.name,
              about: c.about,
              category: c.category,
              city: c.city,
              ownerWallet: wallet,
              ownerTagId: actor.id,
            },
          });
          break;
        }
        case "node.publish": {
          await nodeAuthority(tx, c.id, wallet, true);
          result = await tx.localNode.update({
            where: { id: c.id },
            data: { status: "PUBLISHED", publicConsent: true },
          });
          break;
        }
        case "node.withdraw": {
          await nodeAuthority(tx, c.id, wallet, true);
          result = await tx.localNode.update({
            where: { id: c.id },
            data: { status: "WITHDRAWN", publicConsent: false },
          });
          await tx.localOpportunity.updateMany({
            where: {
              OR: [{ nodeId: c.id }, { targetNodeId: c.id }],
              status: "OPEN",
            },
            data: { status: "CANCELLED" },
          });
          const sessions = await tx.baseDareSession.findMany({
            where: { nodeId: c.id },
            select: { meetupId: true },
          });
          await tx.meetup.updateMany({
            where: { id: { in: sessions.map((s) => s.meetupId) } },
            data: { status: "cancelled" },
          });
          break;
        }
        case "member.invite": {
          await nodeAuthority(tx, c.id, wallet, true);
          const target = await tx.streamerTag.findFirst({
            where: {
              ...liveTag,
              tag: {
                in: [c.tag.replace(/^@/, ""), "@" + c.tag.replace(/^@/, "")],
                mode: "insensitive",
              },
            },
          });
          need(
            target && target.walletAddress.toLowerCase() !== wallet,
            "Choose another active @tag."
          );
          const targetWallet = target.walletAddress.toLowerCase();
          await unblocked(tx, wallet, targetWallet);
          need(
            (await tx.nodeMembership.count({ where: { nodeId: c.id } })) < 30,
            "This pilot supports thirty invitations per Node."
          );
          result = await tx.nodeMembership.create({
            data: {
              nodeId: c.id,
              wallet: targetWallet,
              tagId: target.id,
              role: c.role,
            },
          });
          break;
        }
        case "member.respond": {
          const m = await tx.nodeMembership.findUnique({ where: { id: c.id } });
          need(
            m && m.wallet === wallet && (await tagOwns(tx, m.tagId, wallet)),
            "This invitation belongs to another identity.",
            403
          );
          const n = await tx.localNode.findUniqueOrThrow({
            where: { id: m.nodeId },
          });
          need(
            n.status !== "WITHDRAWN" &&
              (await tagOwns(tx, n.ownerTagId, n.ownerWallet)),
            "Node unavailable."
          );
          await unblocked(tx, wallet, n.ownerWallet);
          need(
            m.status === "INVITED",
            "This invitation has already been answered."
          );
          result = await tx.nodeMembership.update({
            where: { id: m.id },
            data: {
              status: c.accept ? "ACCEPTED" : "DECLINED",
              publicConsent: c.accept && c.publicConsent,
            },
          });
          break;
        }
        case "member.remove": {
          const m = await tx.nodeMembership.findUnique({ where: { id: c.id } });
          need(m, "Member unavailable.", 404);
          if (m.wallet !== wallet)
            await nodeAuthority(tx, m.nodeId, wallet, true);
          result = await tx.nodeMembership.update({
            where: { id: m.id },
            data: { status: "REVOKED", publicConsent: false },
          });
          break;
        }
        case "opportunity.create": {
          const v = await venue(tx, c.venueId);
          if (c.nodeId) {
            const n = await nodeAuthority(tx, c.nodeId, wallet);
            need(n.status === "PUBLISHED", "Publish your Node first.");
          } else
            need(
              venueOperator(v, wallet),
              "Use your published Node or a venue you currently manage.",
              403
            );
          if (c.targetNodeId) {
            need(
              venueOperator(v, wallet),
              "Direct booking offers require current venue authority.",
              403
            );
            need(c.capacity === 1, "A direct offer books one Node.");
            const target = await tx.localNode.findUnique({
              where: { id: c.targetNodeId },
            });
            need(
              target?.status === "PUBLISHED" && target.ownerWallet !== wallet,
              "Choose another published Node."
            );
            await unblocked(tx, wallet, target.ownerWallet);
          }
          const startsAt = new Date(c.startsAt),
            endsAt = new Date(c.endsAt),
            expiresAt = new Date(c.expiresAt);
          validateSchedule(startsAt, endsAt);
          need(
            expiresAt > new Date() && expiresAt <= startsAt,
            "Requests must close before the activity starts."
          );
          need(
            c.compensation === "PAID"
              ? c.amountMinor && c.currency
              : !c.amountMinor && !c.currency,
            "Paid terms need an amount and currency; free/barter terms cannot include a price."
          );
          need(
            (await tx.localOpportunity.count({
              where: {
                authorWallet: wallet,
                createdAt: { gt: new Date(Date.now() - 86400000) },
              },
            })) < 10,
            "Daily opportunity limit reached."
          );
          const terms = {
            venueId: c.venueId,
            nodeId: c.nodeId,
            targetNodeId: c.targetNodeId,
            kind: c.kind,
            title: c.title,
            description: c.description,
            compensation: c.compensation,
            amountMinor: c.amountMinor,
            currency: c.currency,
            exchangeTerms: c.exchangeTerms,
            startsAt: c.startsAt,
            endsAt: c.endsAt,
            expiresAt: c.expiresAt,
            capacity: c.capacity,
          };
          const termsHash = createHash("sha256")
            .update(JSON.stringify(terms))
            .digest("hex");
          result = await tx.localOpportunity.create({
            data: {
              ...terms,
              authorWallet: wallet,
              authorTagId: actor.id,
              startsAt,
              endsAt,
              expiresAt,
              termsHash,
            },
          });
          break;
        }
        case "opportunity.request": {
          const o = await currentOpportunity(tx, c.id);
          need(
            o.authorWallet !== wallet,
            "You cannot book your own opportunity."
          );
          await unblocked(tx, wallet, o.authorWallet);
          need(
            c.termsHash === o.termsHash,
            "The displayed terms do not match. Refresh before accepting."
          );
          if (o.targetNodeId) await nodeAuthority(tx, o.targetNodeId, wallet);
          else
            need(
              !c.decline,
              "Use request withdrawal for a public opportunity."
            );
          const old = await tx.opportunityRequest.findUnique({
            where: { opportunityId_wallet: { opportunityId: o.id, wallet } },
          });
          if (old) {
            if (o.targetNodeId)
              need(
                c.decline
                  ? old.status === "DECLINED"
                  : old.status === "CONFIRMED",
                "This direct offer already has a different response."
              );
            result = old;
            break;
          }
          if (o.targetNodeId) {
            need(
              (await tx.opportunityRequest.count({
                where: {
                  opportunityId: o.id,
                  status: { in: ["CONFIRMED", "DECLINED"] },
                },
              })) === 0,
              "This direct offer has already been accepted."
            );
            if (!c.decline)
              await noBookingConflict(
                tx,
                wallet,
                o.startsAt,
                o.endsAt,
                o.targetNodeId
              );
          }
          need(
            (await tx.opportunityRequest.count({
              where: { opportunityId: o.id },
            })) < 100,
            "Request limit reached."
          );
          result = await tx.opportunityRequest.create({
            data: {
              opportunityId: o.id,
              wallet,
              tagId: actor.id,
              message: c.message,
              termsHash: o.termsHash,
              status: o.targetNodeId
                ? c.decline
                  ? "DECLINED"
                  : "CONFIRMED"
                : "PENDING",
            },
          });
          break;
        }
        case "opportunity.decide": {
          const r = await tx.opportunityRequest.findUnique({
            where: { id: c.id },
          });
          need(r, "Request unavailable.", 404);
          const o = await opportunityHost(tx, r.opportunityId, wallet);
          await currentOpportunity(tx, o.id);
          await unblocked(tx, wallet, r.wallet);
          need(
            await tagOwns(tx, r.tagId, r.wallet),
            "Applicant identity is no longer current."
          );
          if (r.status === c.decision) {
            result = r;
            break;
          }
          need(r.status === "PENDING", "This request has already changed.");
          if (c.decision === "CONFIRMED") {
            need(
              (await tx.opportunityRequest.count({
                where: { opportunityId: o.id, status: "CONFIRMED" },
              })) < o.capacity,
              "This opportunity is full."
            );
            await noBookingConflict(tx, r.wallet, o.startsAt, o.endsAt);
          }
          result = await tx.opportunityRequest.update({
            where: { id: r.id },
            data: { status: c.decision },
          });
          break;
        }
        case "opportunity.cancel": {
          await opportunityHost(tx, c.id, wallet);
          result = await tx.localOpportunity.update({
            where: { id: c.id },
            data: { status: "CANCELLED" },
          });
          await tx.opportunityRequest.updateMany({
            where: {
              opportunityId: c.id,
              status: { in: ["PENDING", "CONFIRMED"] },
            },
            data: { status: "CANCELLED" },
          });
          break;
        }
        case "booking.cancel":
        case "booking.complete": {
          const r = await tx.opportunityRequest.findUnique({
            where: { id: c.id },
            include: { opportunity: true },
          });
          need(r, "Booking unavailable.", 404);
          const isParticipant =
            r.wallet === wallet && (await tagOwns(tx, r.tagId, wallet));
          if (!isParticipant)
            await opportunityHost(tx, r.opportunityId, wallet);
          if (c.action === "booking.cancel") {
            need(
              !r.hostCompletedAt && !r.participantCompletedAt,
              "Use a report to correct an attested completion."
            );
            need(
              ["PENDING", "CONFIRMED", "CANCELLED"].includes(r.status),
              "Completed bookings cannot be cancelled."
            );
            result = await tx.opportunityRequest.update({
              where: { id: r.id },
              data: { status: "CANCELLED" },
            });
          } else {
            need(
              r.opportunity.status === "OPEN" &&
                r.status === "CONFIRMED" &&
                r.opportunity.endsAt <= new Date(),
              "Only an ended confirmed booking can be attested."
            );
            await unblocked(
              tx,
              wallet,
              isParticipant ? r.opportunity.authorWallet : r.wallet
            );
            result = await tx.opportunityRequest.update({
              where: { id: r.id },
              data: isParticipant
                ? {
                    participantCompletedAt:
                      r.participantCompletedAt ?? new Date(),
                  }
                : { hostCompletedAt: r.hostCompletedAt ?? new Date() },
            });
          }
          break;
        }
        case "session.create": {
          const v = await venue(tx, c.venueId);
          if (c.nodeId) {
            const n = await nodeAuthority(tx, c.nodeId, wallet);
            need(n.status === "PUBLISHED", "Publish your Node first.");
          }
          const startTime = new Date(c.startsAt),
            endsAt = new Date(c.endsAt);
          validateSchedule(startTime, endsAt);
          need(
            startTime.getTime() <= Date.now() + 72 * 3600000 &&
              endsAt.getTime() - startTime.getTime() <= 4 * 3600000,
            "Sessions start within 72 hours and last up to four hours."
          );
          need(
            (await tx.baseDareSession.count({
              where: {
                hostWallet: wallet,
                createdAt: { gt: new Date(Date.now() - 86400000) },
              },
            })) < 5,
            "Daily Session limit reached."
          );
          await noBookingConflict(tx, wallet, startTime, endsAt);
          const meetup = await tx.meetup.create({
            data: {
              creatorBaretagId: actor.id,
              title: c.title,
              type: "jam",
              venueId: v.id,
              placeLabel: v.name,
              approxLat: v.latitude,
              approxLng: v.longitude,
              startTime,
              note: c.description,
            },
          });
          await tx.meetupRsvp.create({
            data: { meetupId: meetup.id, baretagId: actor.id },
          });
          result = await tx.baseDareSession.create({
            data: {
              meetupId: meetup.id,
              nodeId: c.nodeId,
              hostWallet: wallet,
              hostTagId: actor.id,
              endsAt,
              guestCapacity: c.guestCapacity,
              recordingPolicy: c.recordingPolicy,
            },
          });
          break;
        }
        case "session.apply": {
          const s = await currentSession(tx, c.id);
          need(
            s.meetup.startTime > new Date(),
            "Guest applications have closed."
          );
          need(
            s.hostWallet !== wallet,
            "The host does not need a guest request."
          );
          await unblocked(tx, wallet, s.hostWallet);
          const old = await tx.sessionGuest.findUnique({
            where: { sessionId_wallet: { sessionId: s.id, wallet } },
          });
          if (old) {
            result = old;
            break;
          }
          need(
            (await tx.sessionGuest.count({ where: { sessionId: s.id } })) < 100,
            "Application limit reached."
          );
          result = await tx.sessionGuest.create({
            data: {
              sessionId: s.id,
              wallet,
              tagId: actor.id,
              role: c.role,
              application: c.application,
            },
          });
          break;
        }
        case "session.decide": {
          const g = await tx.sessionGuest.findUnique({ where: { id: c.id } });
          need(g, "Guest request unavailable.", 404);
          const s = await sessionHost(tx, g.sessionId, wallet);
          await currentSession(tx, s.id);
          need(s.meetup.startTime > new Date(), "Guest decisions have closed.");
          await unblocked(tx, wallet, g.wallet);
          need(
            await tagOwns(tx, g.tagId, g.wallet),
            "Guest identity unavailable."
          );
          if (g.status === c.decision) {
            result = g;
            break;
          }
          need(g.status === "PENDING", "This request has already changed.");
          if (c.decision === "APPROVED") {
            need(
              (await tx.sessionGuest.count({
                where: { sessionId: s.id, status: "APPROVED" },
              })) < s.guestCapacity,
              "Guest capacity reached."
            );
            await noBookingConflict(tx, g.wallet, s.meetup.startTime, s.endsAt);
          }
          result = await tx.sessionGuest.update({
            where: { id: g.id },
            data: { status: c.decision },
          });
          break;
        }
        case "session.leave": {
          const g = await tx.sessionGuest.findUnique({ where: { id: c.id } });
          need(g, "Guest request unavailable.", 404);
          if (g.wallet !== wallet) await sessionHost(tx, g.sessionId, wallet);
          need(
            !g.hostAttestedAt && !g.participantAttestedAt,
            "An attested record cannot be withdrawn; report a correction."
          );
          result = await tx.sessionGuest.update({
            where: { id: g.id },
            data: { status: "WITHDRAWN" },
          });
          break;
        }
        case "session.cancel": {
          const s = await sessionHost(tx, c.id, wallet);
          await tx.meetup.update({
            where: { id: s.meetupId },
            data: { status: "cancelled" },
          });
          await tx.sessionGuest.updateMany({
            where: { sessionId: s.id, status: { in: ["PENDING", "APPROVED"] } },
            data: { status: "CANCELLED" },
          });
          result = s;
          break;
        }
        case "session.attest": {
          const g = await tx.sessionGuest.findUnique({
            where: { id: c.id },
            include: { session: { include: { meetup: true } } },
          });
          need(g, "Participation unavailable.", 404);
          need(
            g.status === "APPROVED" &&
              g.session.meetup.status === "active" &&
              g.session.endsAt <= new Date(),
            "Only an ended approved Session can be attested."
          );
          if (g.wallet === wallet) {
            need(
              await tagOwns(tx, g.tagId, wallet),
              "Guest identity unavailable."
            );
            await unblocked(tx, wallet, g.session.hostWallet);
            result = await tx.sessionGuest.update({
              where: { id: g.id },
              data: {
                participantAttestedAt: g.participantAttestedAt ?? new Date(),
              },
            });
          } else {
            await sessionHost(tx, g.sessionId, wallet);
            await unblocked(tx, wallet, g.wallet);
            result = await tx.sessionGuest.update({
              where: { id: g.id },
              data: { hostAttestedAt: g.hostAttestedAt ?? new Date() },
            });
          }
          break;
        }
        case "recording.grant": {
          const s = await tx.baseDareSession.findUnique({
            where: { id: c.id },
            include: { meetup: true },
          });
          need(
            s &&
              s.meetup.status === "active" &&
              s.recordingPolicy === "SEPARATE_CONSENT",
            "Recording is not allowed for this Session."
          );
          const submission = await tx.adventureSubmission.findUnique({
            where: { id: c.submissionId },
          });
          need(
            submission?.wallet.toLowerCase() === wallet &&
              submission.privateMediaCid &&
              submission.sourceKey &&
              submission.mediaType === "VIDEO" &&
              submission.privateMediaMime === "video/mp4" &&
              ["PENDING", "APPROVED"].includes(submission.status),
            "Choose your own current privately uploaded video Moment."
          );
          need(
            submission.activityId === "session-recording" &&
              submission.publicConsentVersion === SESSION_RECORDING_CONSENT &&
              submission.sessionId === s.id &&
              submission.venueSlug ===
                (await venue(tx, s.meetup.venueId!)).slug,
            "Choose a Session recording at this venue."
          );
          need(
            s.hostWallet === wallet ||
              (await tx.sessionGuest.findFirst({
                where: { sessionId: s.id, wallet, status: "APPROVED" },
              })) ||
              (await tx.meetupRsvp.findUnique({
                where: {
                  meetupId_baretagId: {
                    meetupId: s.meetupId,
                    baretagId: actor.id,
                  },
                },
              })),
            "Join the audience or be an approved guest before contributing."
          );
          await unblocked(tx, wallet, s.hostWallet);
          const expiresAt = new Date(c.expiresAt);
          need(
            expiresAt > new Date() &&
              expiresAt.getTime() <= Date.now() + 365 * 86400000,
            "Choose rights expiry within one year."
          );
          need(
            c.publication
              ? c.destinations.length > 0
              : c.destinations.length === 0,
            "Publication destinations require a separate explicit publication grant."
          );
          result = await tx.sessionRecordingGrant.create({
            data: {
              id: randomBytes(16).toString("hex"),
              sessionId: s.id,
              submissionId: submission.id,
              wallet,
              sourceSha256: submission.sourceKey,
              processing: c.processing,
              publication: c.publication,
              destinations: c.destinations,
              requiredCredit: c.requiredCredit,
              rightsVersion: c.rightsVersion,
              rightsConfirmed: true,
              expiresAt,
            },
          });
          break;
        }
        case "recording.approve":
        case "recording.withdraw": {
          const g = await tx.sessionRecordingGrant.findUnique({
            where: { id: c.id },
            include: { session: true },
          });
          need(g, "Recording unavailable.", 404);
          if (c.action === "recording.approve") {
            await sessionHost(tx, g.sessionId, wallet);
            need(
              !g.withdrawnAt && g.expiresAt > new Date(),
              "This permission expired or was withdrawn."
            );
            result = await tx.sessionRecordingGrant.update({
              where: { id: g.id },
              data: { hostApprovedAt: g.hostApprovedAt ?? new Date() },
            });
          } else {
            if (g.wallet !== wallet) await sessionHost(tx, g.sessionId, wallet);
            result = await tx.sessionRecordingGrant.update({
              where: { id: g.id },
              data: { withdrawnAt: g.withdrawnAt ?? new Date() },
            });
          }
          break;
        }
        case "report": {
          const exists =
            c.kind === "NODE"
              ? await tx.localNode.findUnique({ where: { id: c.id } })
              : c.kind === "OPPORTUNITY"
              ? await tx.localOpportunity.findUnique({ where: { id: c.id } })
              : await tx.baseDareSession.findUnique({ where: { id: c.id } });
          need(exists, "Item unavailable.", 404);
          result = await tx.founderEvent.create({
            data: {
              eventType: "LOCAL_ECONOMY_REPORT",
              subjectType: c.kind,
              subjectId: c.id,
              actor: wallet,
              title: c.reason,
              status: "NEW",
              dedupeKey: "economy-report:" + wallet + ":" + c.kind + ":" + c.id,
            },
          });
          break;
        }
      }
      await audit(tx, wallet, c.action, result.id, createKey);
      return { id: result.id };
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

const nodeWithAuthority = {
  include: { members: { where: { status: "ACCEPTED", role: "ADMIN" } } },
} as const;
const venueSelect = {
  id: true,
  slug: true,
  name: true,
  latitude: true,
  longitude: true,
  status: true,
  timezone: true,
} as const;
export async function readEconomy(
  wallet: string | null,
  query: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    node?: string;
    session?: string;
    opportunity?: string;
    venue?: string;
  } = {},
  includePrivate = true
) {
  const context = await socialContext(wallet);
  const tags = await prisma.streamerTag.findMany({
    where: liveTag,
    select: { id: true, walletAddress: true, tag: true },
  });
  const current = (id: string, w: string) =>
    tags.some(
      (t) =>
        t.id === id &&
        t.walletAddress.toLowerCase() === w &&
        !hiddenPerson(context, id, w)
    );
  const now = new Date();
  const [nodeRows, offers, sessions] = await Promise.all([
    prisma.localNode.findMany({
      where: {
        ...(query.node
          ? { OR: [{ id: query.node }, { slug: query.node }] }
          : {}),
        status: "PUBLISHED",
        publicConsent: true,
      },
      include: {
        members: {
          where: { status: "ACCEPTED", publicConsent: true },
          take: 30,
        },
      },
      take: 201,
      orderBy: { createdAt: "desc" },
    }),
    prisma.localOpportunity.findMany({
      where: {
        status: "OPEN",
        expiresAt: { gt: now },
        ...(query.opportunity ? { id: query.opportunity } : {}),
        ...(query.node
          ? { node: { OR: [{ id: query.node }, { slug: query.node }] } }
          : {}),
        venue: { status: "ACTIVE" },
        targetNodeId: null,
        ...(query.venue ? { venueId: query.venue } : {}),
      },
      include: { venue: true, node: nodeWithAuthority },
      take: 201,
      orderBy: { startsAt: "asc" },
    }),
    prisma.baseDareSession.findMany({
      where: {
        ...(query.session ? { id: query.session } : { endsAt: { gt: now } }),
        ...(query.node
          ? { node: { OR: [{ id: query.node }, { slug: query.node }] } }
          : {}),
        meetup: {
          ...(query.session ? {} : { status: "active" }),
          ...(query.venue ? { venueId: query.venue } : {}),
        },
      },
      include: {
        meetup: { include: { _count: { select: { rsvps: true } } } },
        node: nodeWithAuthority,
        _count: { select: { guests: { where: { status: "APPROVED" } } } },
      },
      take: 201,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const nearby = (lat: number, lng: number) =>
    query.lat === undefined ||
    query.lng === undefined ||
    calculateDistance(query.lat, query.lng, lat, lng) <= (query.radiusKm ?? 25);
  const venueRows = await prisma.venue.findMany({
    where: {
      status: "ACTIVE",
      ...(query.venue ? { id: query.venue } : {}),
      ...(query.lat !== undefined && query.lng !== undefined
        ? {
            latitude: {
              gte: query.lat - (query.radiusKm ?? 25) / 110,
              lte: query.lat + (query.radiusKm ?? 25) / 110,
            },
          }
        : {}),
    },
    select: venueSelect,
    take: 301,
  });
  const activeVenues = new Set(venueRows.map((v) => v.id));
  const completed = await prisma.opportunityRequest.findMany({
    where: {
      status: "CONFIRMED",
      hostCompletedAt: { not: null },
      participantCompletedAt: { not: null },
      opportunity: { status: "OPEN", venue: { status: "ACTIVE" } },
    },
    include: {
      opportunity: {
        select: {
          nodeId: true,
          targetNodeId: true,
          authorWallet: true,
          authorTagId: true,
        },
      },
    },
    take: 501,
  });
  const nodes = nodeRows
    .filter((n) => current(n.ownerTagId, n.ownerWallet))
    .slice(0, 200)
    .map((n) => ({
      id: n.id,
      slug: n.slug,
      name: n.name,
      about: n.about,
      category: n.category,
      city: n.city,
      mutuallyConfirmedBookings:
        completed.length > 500
          ? null
          : completed.filter(
              (r) =>
                [r.opportunity.nodeId, r.opportunity.targetNodeId].includes(
                  n.id
                ) &&
                current(r.tagId, r.wallet) &&
                current(r.opportunity.authorTagId, r.opportunity.authorWallet)
            ).length,
      members: n.members
        .filter((m) => current(m.tagId, m.wallet))
        .map((m) => ({
          tag: tags.find((t) => t.id === m.tagId)!.tag,
          role: m.role,
        })),
    }));
  const nodeHost = (n: (typeof offers)[number]["node"], w: string) =>
    !n ||
    (n.status === "PUBLISHED" &&
      n.publicConsent &&
      current(n.ownerTagId, n.ownerWallet) &&
      (n.ownerWallet === w ||
        n.members.some((m) => m.wallet === w && current(m.tagId, m.wallet))));
  const placeDto = (v: (typeof venueRows)[number]) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    latitude: v.latitude,
    longitude: v.longitude,
    timezone: v.timezone,
    status: v.status,
  });
  const opportunities = offers
    .filter(
      (o) =>
        nodeHost(o.node, o.authorWallet) &&
        (o.nodeId || venueOperator(o.venue, o.authorWallet)) &&
        current(o.authorTagId, o.authorWallet) &&
        (!o.node ||
          (o.node.status === "PUBLISHED" &&
            o.node.publicConsent &&
            current(o.node.ownerTagId, o.node.ownerWallet))) &&
        nearby(o.venue.latitude, o.venue.longitude)
    )
    .slice(0, 200)
    .map((o) => ({
      id: o.id,
      kind: o.kind,
      title: o.title,
      description: o.description,
      compensation: o.compensation,
      amountMinor: o.amountMinor,
      currency: o.currency,
      exchangeTerms: o.exchangeTerms,
      termsHash: o.termsHash,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
      expiresAt: o.expiresAt,
      capacity: o.capacity,
      venue: placeDto(o.venue),
      node: o.node
        ? { id: o.node.id, slug: o.node.slug, name: o.node.name }
        : null,
    }));

  const publicSessions = sessions
    .filter(
      (s) =>
        nodeHost(s.node, s.hostWallet) &&
        current(s.hostTagId, s.hostWallet) &&
        activeVenues.has(s.meetup.venueId!) &&
        (!s.node ||
          (s.node.status === "PUBLISHED" &&
            s.node.publicConsent &&
            current(s.node.ownerTagId, s.node.ownerWallet))) &&
        nearby(s.meetup.approxLat, s.meetup.approxLng)
    )
    .slice(0, 200)
    .map((s) => ({
      id: s.id,
      status:
        s.meetup.status !== "active"
          ? "CANCELLED"
          : s.endsAt <= now
          ? "ENDED"
          : "ACTIVE",
      meetupId: s.meetupId,
      title: s.meetup.title,
      description: s.meetup.note,
      startsAt: s.meetup.startTime,
      endsAt: s.endsAt,
      venue: venueRows.find((v) => v.id === s.meetup.venueId)!,
      nodeId: s.nodeId,
      guestCapacity: s.guestCapacity,
      approvedGuests: s._count.guests,
      audienceCount: s.meetup._count.rsvps,
      recordingPolicy: s.recordingPolicy,
    }));
  const mine = wallet && includePrivate ? await privateEconomy(wallet) : null;
  return {
    nodes,
    opportunities,
    sessions: publicSessions,
    venues: venueRows.filter((v) => nearby(v.latitude, v.longitude)),
    limited:
      nodeRows.length > 200 ||
      offers.length > 200 ||
      sessions.length > 200 ||
      venueRows.length > 300,
    mine,
  };
}
export async function privateEconomy(wallet: string) {
  const administered = await prisma.localNode.findMany({
    where: {
      status: { not: "WITHDRAWN" },
      OR: [
        { ownerWallet: wallet },
        { members: { some: { wallet, role: "ADMIN", status: "ACCEPTED" } } },
      ],
    },
  });
  const managed: string[] = [];
  for (const n of administered) {
    try {
      await nodeAuthority(prisma, n.id, wallet);
      managed.push(n.id);
    } catch {
      /* Revoked/transferred identity has history, never new operator access. */
    }
  }
  const [
    nodes,
    invitations,
    opportunities,
    requests,
    sessions,
    guests,
    recordings,
    submissions,
  ] = await Promise.all([
    prisma.localNode.findMany({
      where: { id: { in: managed } },
      include: { members: true },
      take: 30,
    }),
    prisma.nodeMembership.findMany({
      where: { wallet },
      include: { node: { select: { name: true } } },
      take: 100,
    }),
    prisma.localOpportunity.findMany({
      where: {
        OR: [
          { authorWallet: wallet, nodeId: null },
          { nodeId: { in: managed } },
          { targetNodeId: { in: managed } },
        ],
      },
      include: { venue: { select: venueSelect }, requests: true },
      take: 100,
    }),
    prisma.opportunityRequest.findMany({
      where: { wallet },
      include: { opportunity: true },
      take: 100,
    }),
    prisma.baseDareSession.findMany({
      where: {
        OR: [{ hostWallet: wallet, nodeId: null }, { nodeId: { in: managed } }],
      },
      include: { meetup: true, guests: true },
      take: 50,
    }),
    prisma.sessionGuest.findMany({
      where: { wallet },
      include: { session: { include: { meetup: true } } },
      take: 100,
    }),
    prisma.sessionRecordingGrant.findMany({
      where: {
        OR: [
          { wallet },
          {
            session: {
              OR: [
                { hostWallet: wallet, nodeId: null },
                { nodeId: { in: managed } },
              ],
            },
          },
        ],
      },
      include: { submission: { select: { caption: true, status: true } } },
      take: 100,
    }),
    prisma.adventureSubmission.findMany({
      where: {
        wallet,
        activityId: "session-recording",
        privateMediaCid: { not: null },
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { id: true, caption: true, status: true },
      take: 30,
    }),
  ]);
  const tagIds = [
    ...new Set([
      ...nodes.flatMap((n) => n.members.map((m) => m.tagId)),
      ...opportunities.flatMap((o) => o.requests.map((r) => r.tagId)),
      ...sessions.flatMap((s) => s.guests.map((g) => g.tagId)),
    ]),
  ];
  const displayTags = await prisma.streamerTag.findMany({
    where: { id: { in: tagIds }, ...liveTag },
    select: { id: true, tag: true, walletAddress: true },
  });
  const label = (tagId: string, w: string) =>
    displayTags.find(
      (t) => t.id === tagId && t.walletAddress.toLowerCase() === w
    )?.tag ?? "Former participant";
  return {
    nodes: nodes.map((n) => ({
      ...n,
      members: n.members.map((m) => ({
        ...m,
        displayTag: label(m.tagId, m.wallet),
      })),
    })),
    invitations,
    opportunities: opportunities.map((o) => ({
      ...o,
      directStatus: o.targetNodeId
        ? o.requests.find((r) => ["CONFIRMED", "DECLINED"].includes(r.status))
            ?.status ?? "AWAITING_RESPONSE"
        : null,
      requests: (o.authorWallet === wallet || managed.includes(o.nodeId ?? "")
        ? o.requests
        : o.requests.filter((r) => r.wallet === wallet)
      ).map((r) => ({ ...r, displayTag: label(r.tagId, r.wallet) })),
    })),
    requests,
    sessions: sessions.map((s) => ({
      ...s,
      guests: s.guests.map((g) => ({
        ...g,
        displayTag: label(g.tagId, g.wallet),
      })),
    })),
    guests,
    recordings,
    submissions,
  };
}
export type EconomySnapshot = Awaited<ReturnType<typeof readEconomy>>;

export async function currentSessionSourceIds(ids: string[], db: Tx = prisma) {
  if (!ids.length) return new Set<string>();
  const sources = await db.baseDareSession.findMany({
    where: { id: { in: ids }, meetup: { status: "active" } },
    include: { meetup: true, node: nodeWithAuthority },
  });
  const tagIds = [
    ...new Set(
      sources.flatMap((s) => [
        s.hostTagId,
        ...(s.node
          ? [s.node.ownerTagId, ...s.node.members.map((m) => m.tagId)]
          : []),
      ])
    ),
  ];
  const [tags, places] = await Promise.all([
    db.streamerTag.findMany({
      where: { id: { in: tagIds }, ...liveTag },
      select: { id: true, walletAddress: true },
    }),
    db.venue.findMany({
      where: {
        id: {
          in: sources.flatMap((s) =>
            s.meetup.venueId ? [s.meetup.venueId] : []
          ),
        },
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);
  const wallets = new Map(
    tags.map((t) => [t.id, t.walletAddress.toLowerCase()])
  );
  const venues = new Set(places.map((v) => v.id));
  return new Set(
    sources
      .filter((s) => {
        if (
          !venues.has(s.meetup.venueId!) ||
          wallets.get(s.hostTagId) !== s.hostWallet
        )
          return false;
        const n = s.node;
        return (
          !n ||
          (n.status === "PUBLISHED" &&
            n.publicConsent &&
            wallets.get(n.ownerTagId) === n.ownerWallet &&
            (n.ownerWallet === s.hostWallet ||
              n.members.some(
                (m) =>
                  m.wallet === s.hostWallet && wallets.get(m.tagId) === m.wallet
              )))
        );
      })
      .map((s) => s.id)
  );
}
export async function sessionSourceCurrent(sessionId: string, db: Tx = prisma) {
  return (await currentSessionSourceIds([sessionId], db)).has(sessionId);
}
