import { notFound } from 'next/navigation';

import {
  buildBaseCashReceiptUrl,
  getBaseCashCreditById,
  mapBaseCashCredit,
  normalizeBaseCashReceiptCode,
} from '@/lib/basecash';
import BaseCashReceiptCard from './BaseCashReceiptCard';

export default async function BaseCashReceiptPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ code?: string }>;
  }
) {
  const { id } = await params;
  const { code } = await searchParams;
  const credit = await getBaseCashCreditById(id);

  if (!credit) {
    notFound();
  }

  if (code && normalizeBaseCashReceiptCode(code) !== normalizeBaseCashReceiptCode(credit.receiptCode)) {
    notFound();
  }

  return <BaseCashReceiptCard credit={mapBaseCashCredit(credit)} receiptUrl={buildBaseCashReceiptUrl(credit)} />;
}
