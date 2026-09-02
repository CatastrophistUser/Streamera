import { defineSchedule } from "eve/schedules";

// Vercel evaluates cron in UTC. 06:00 UTC daily.
// Hobby-plan cron is limited to a daily cadence, which is the intended rhythm here.
export default defineSchedule({
  cron: "0 6 * * *",
  markdown: [
    "Run the daily provider health check.",
    "",
    "Read the current provider list, check every provider's movie and tv embed URL,",
    "and replace any that are dead using the approved candidates skill.",
    "",
    "If everything is healthy, finish silently: write nothing and send no notification.",
  ].join("\n"),
});
