import { Prisma } from '@prisma/client';

export function isCreatorReviewTableMissingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes('CreatorReview');
  }

  return false;
}
