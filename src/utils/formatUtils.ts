/**
 * Utility functions for formatting currency and other values.
 * Financial values are stored as integers (cents/paise).
 */

/**
 * Formats an integer value (cents/paise) to a decimal string for display.
 * @param value The integer value to format.
 * @returns A formatted string (e.g., "10.00").
 */
export const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '0.00';
    const decimalValue = value / 100;
    return decimalValue.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Formats an integer value (cents/paise) to a decimal string with currency symbol.
 * @param value The integer value to format.
 * @returns A formatted string (e.g., "₹10.00").
 */
export const formatCurrencyWithSymbol = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '₹0.00';
    const decimalValue = value / 100;
    return '₹' + decimalValue.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Parses a decimal string (e.g., "10.50") into an integer (1050).
 * Useful for processing user input from forms.
 * @param value The decimal string to parse.
 * @returns An integer value.
 */
export const parseCurrencyToInt = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
};
