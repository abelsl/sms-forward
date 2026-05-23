import { TransactionPayload } from '../types';

/**
 * Normalizes Ethiopian date formats (DD/MM/YYYY HH:MM:SS) to standard DB format (YYYY-MM-DD HH:MM:SS)
 */
const formatTimestamp = (dateStr: string): string => {
  try {
    if (!dateStr) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    if (dateStr.includes('/')) {
      const [datePart, timePart] = dateStr.trim().split(/\s+/);
      const [day, month, year] = datePart.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart || '00:00:00'}`;
    }
    return dateStr.replace('T', ' ').substring(0, 19);
  } catch (e) {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
};

export const parseSMS = (sender: string, rawMessage: string): TransactionPayload | null => {
  // Completely safe string cleaning to wipe away hidden chat app markers/non-breaking spaces
  const cleanSender = sender.toLowerCase().trim();
  // console.log("Parsed Sender [clean sender]:", cleanSender);

  // 1. DYNAMIC SOURCE IDENTIFICATION 
  // Prevents the gateway phone number from locking into Telebirr if it's a CBE text
  let source: 'telebirr' | 'cbe'| 'CBE'| '127' | 'cbebirr'| 'CBEBirr' |'+251960411182' | null = null;

  if (cleanSender.includes('127') || cleanSender.includes('telebirr')) {
    source = 'telebirr';
  } else if (cleanSender.includes('cbe')|| cleanSender.includes('CBE')|| cleanSender.includes('CBEBirr')|| cleanSender.includes('cbebirr')) {
    source = 'cbe';
  }

  if (!source) return null;

  // 2. TELEBIRR PARSING LOGIC
  if (source === 'telebirr') {
    // Captures standard transaction numbers or fallbacks on deep links
    const txIdMatch = rawMessage.match(/(?:transaction number is\s+|receipt\/)([A-Z0-9]+)/i);
    // Captures both outgoing "transferred ETB 60.00" or incoming "received ETB 50.00"
    const amountMatch = rawMessage.match(/(?:transferred|received|credited|amt:?)\s*ETB\s*([\d,]+\.\d{2})/i);
    // Captures recipient or sender name cleanly up to the phone payload or date break
    const contactMatch = rawMessage.match( /(?:Credited with ETB\s+[\d.,]+\s+from|from)\s+([A-Z\s\W\d_]+?)(?=\s*\(?\+?251|$)/i);
    const dateMatch = rawMessage.match(/on\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i);
    const balanceMatch = rawMessage.match(/(?:balance is\s+ETB\s+)([\d,]+\.\d{2})/i);
    // Dynamic URL extraction targeting the transactional receipt domain
    const linkMatch = rawMessage.match(/(https:\/\/transactioninfo\.ethiotelecom\.et\/[^\s\n]+)/i);

    if (txIdMatch && amountMatch) {
      return {
        source: 'telebirr',
        transaction_id: txIdMatch[1].trim(),
        amount: parseFloat(amountMatch[1].replace(/,/g, '')),
        sender_name: contactMatch ? contactMatch[1].trim() : 'Unknown Party',
        timestamp: dateMatch ? formatTimestamp(dateMatch[1]) : formatTimestamp(''),
        balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : undefined,
        raw_message: rawMessage,
        receipt_url: linkMatch ? linkMatch[1].trim() : undefined, // Ensure your TransactionPayload interface supports this optional key
      } as any; 
    }
  }
if (source === 'cbe') {
  // Transaction ID: prefer Ref No first, fallback to link id
  const txIdMatch =
    rawMessage.match(/Ref\s*No\s*([A-Z0-9]+)/i) ||
    rawMessage.match(/(?:\?id=)([A-Z0-9]+)/i);

  // Amount: supports Credited / Debited / Transferred formats
 const amountMatch = rawMessage.match(
  /(?:credited|debited|received|transferred|transfered)[^\d]*ETB\s*([\d,]+\.\d{2})/i
);

  // Sender/receiver name (very flexible)
  const contactMatch = rawMessage.match(
  /(?:to|from)\s+(.+?)(?=\b(?:,?\s+on|\s+at|\s+Ref|\s+Current Balance|$))/i
  );

  // Date + time
  const dateMatch = rawMessage.match(
    /on\s+(\d{2}\/\d{2}\/\d{4})\s*(?:at\s*)?(\d{2}:\d{2}:\d{2})/i
  );

  const balanceMatch = rawMessage.match(
    /Current Balance is\s+ETB\s+([\d,]+\.\d{2})/i
  );

  // Deep link
  const linkMatch = rawMessage.match(/https:\/\/apps\.cbe\.com\.et[^\s\n]+/i);

  if (txIdMatch && amountMatch) {
    const parsedDate = dateMatch
      ? `${dateMatch[1]} ${dateMatch[2]}`
      : '';

    return {
      source: 'cbe',
      transaction_id: txIdMatch[1].trim(),
      amount: parseFloat(amountMatch[1].replace(/,/g, '')),
      sender_name: contactMatch ? contactMatch[1].trim() : 'CBE Customer',
      timestamp: formatTimestamp(parsedDate),
      balance: balanceMatch
        ? parseFloat(balanceMatch[1].replace(/,/g, ''))
        : undefined,
      raw_message: rawMessage,
      receipt_url: linkMatch ? linkMatch[0].trim() : undefined,
    } as any;
  }
}


  console.warn("Source matched but Regex failed to capture TxID or Amount. Message:", rawMessage);
  return null;
};