/**
 * Converts a numeric amount to Indian Currency words (Rupees and Paise)
 * Uses Indian Numbering system: Thousands, Lakhs, Crores
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const rest = n % 10;
  return `${TENS[ten]}${rest > 0 ? ' ' + ONES[rest] : ''}`;
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let res = '';
  if (hundred > 0) {
    res += `${ONES[hundred]} Hundred`;
    if (rest > 0) res += ' ';
  }
  if (rest > 0) {
    res += twoDigitsToWords(rest);
  }
  return res;
}

export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Rupees Only';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const integerPart = Math.floor(absAmount);
  const paisePart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && paisePart === 0) {
    return 'Zero Rupees Only';
  }

  let words = '';

  if (integerPart > 0) {
    // Break into Crores, Lakhs, Thousands, and Hundreds
    // Crores = integerPart / 1,00,00,000
    const crores = Math.floor(integerPart / 10000000);
    const remCrores = integerPart % 10000000;

    const lakhs = Math.floor(remCrores / 100000);
    const remLakhs = remCrores % 100000;

    const thousands = Math.floor(remLakhs / 1000);
    const hundreds = remLakhs % 1000;

    const parts: string[] = [];

    if (crores > 0) {
      parts.push(`${numberToWordsIndianHelper(crores)} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${twoDigitsToWords(thousands)} Thousand`);
    }
    if (hundreds > 0) {
      parts.push(threeDigitsToWords(hundreds));
    }

    words = parts.join(' ') + ' Rupees';
  }

  if (paisePart > 0) {
    const paiseWords = twoDigitsToWords(paisePart);
    if (words) {
      words += ` and ${paiseWords} Paise`;
    } else {
      words = `${paiseWords} Paise`;
    }
  }

  if (isNegative) {
    words = `Minus ${words}`;
  }

  return `${words.trim()} Only`;
}

function numberToWordsIndianHelper(n: number): string {
  if (n < 100) return twoDigitsToWords(n);
  if (n < 1000) return threeDigitsToWords(n);
  return numberToWordsIndian(n).replace(' Rupees Only', '');
}
