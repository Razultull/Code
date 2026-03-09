export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  organizer?: { email: string; displayName?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  status: string;
  htmlLink?: string;
  /** Direct conference/meeting link (Google Meet, Zoom, Teams, etc.) */
  conferenceLink?: string;
}
