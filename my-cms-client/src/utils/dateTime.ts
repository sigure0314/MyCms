import { DISPLAY_DATE_TIME_LOCALE, DISPLAY_TIME_ZONE } from '../config/dateTime';

const propertyDateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_DATE_TIME_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

/** Formats an API timestamp as `yyyy/MM/dd AM|PM hh:mm:ss` in Taiwan time. */
export const formatPropertyDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = Object.fromEntries(
    propertyDateTimeFormatter
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.dayPeriod} ${parts.hour}:${parts.minute}:${parts.second}`;
};
