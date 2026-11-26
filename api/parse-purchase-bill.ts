/**
 * Nivo POS - Purchase Bill OCR Parsing Handler (Proxy to extract-bill)
 * File: api/parse-purchase-bill.ts
 */
import handler, { ExtractedBillItem, ExtractedBillResponse } from './extract-bill';

export type ParsedBillItem = ExtractedBillItem;
export type ParsedBillResponse = ExtractedBillResponse;

export default handler;
