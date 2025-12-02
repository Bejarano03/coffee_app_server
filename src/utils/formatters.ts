import { BadRequestException } from '@nestjs/common';

export const FLEXIBLE_BIRTHDATE_REGEX = /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})$/;
const US_BIRTHDATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

export const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '');

export const requireTenDigitPhone = (value: string) => {
  const digitsOnly = sanitizePhoneNumber(value);
  if (digitsOnly.length !== 10) {
    throw new BadRequestException('Phone number must contain exactly 10 digits.');
  }
  return digitsOnly;
};

export const parseBirthDateInput = (value: string) => {
  if (!value) {
    throw new BadRequestException('Birth date is required.');
  }

  const trimmed = value.trim();

  if (US_BIRTHDATE_REGEX.test(trimmed)) {
    const [month, day, year] = trimmed.split('-').map((segment) => parseInt(segment, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid birth date.');
    }
    return date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid birth date.');
    }
    return date;
  }

  throw new BadRequestException('Birth date must follow MM-DD-YYYY.');
};

export const formatBirthDateForClient = (value: Date | null) => {
  if (!value) {
    return null;
  }

  const month = (value.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = value.getUTCDate().toString().padStart(2, '0');
  const year = value.getUTCFullYear();
  return `${month}-${day}-${year}`;
};
