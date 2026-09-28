import { handleScheduleRoster, scheduleRosterServer } from '../src/schedule/rosterServer.js';

export default function handler(request, response) {
  // Lazy initialization keeps authentication failures and credential errors inside the handler.
  return handleScheduleRoster(request, response, args => scheduleRosterServer()(args));
}
