# Google Analytics setup

CareCova sends page views to GA4 only for the public marketing and application entry pages listed in `src/hooks/usePageTracking.js`. Query strings, tokenized pages, and authenticated portal pages are excluded. Dashboard reports also filter to those public routes, so older admin traffic does not appear in the public page and acquisition reports.

The Analytics page includes traffic and engagement totals, daily/monthly trends, popular pages, traffic channels and sources, landing pages, campaigns, devices, countries, events, and optional Google organic search and paid advertising data. The app sends `eligibility_check_completed` and `application_submitted` events without application or health details.

## Environment variables

Set these variables in the local environment and in the Vercel project:

| Variable | Where it is used | Value |
| --- | --- | --- |
| `VITE_GA_MEASUREMENT_ID` | Browser build | GA4 web stream measurement ID, such as `G-XXXXXXXXXX` |
| `GA4_PROPERTY_ID` | Server function | Numeric GA4 property ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Server function | The service account JSON as a single-line JSON value |

The service account needs Viewer access to the GA4 property. Keep its private key in ignored local environment files or the hosting provider's encrypted environment settings. Do not commit the downloaded service-account JSON file or paste its key into source code.

To count eligibility checks and submitted applications under **Key events**, mark `eligibility_check_completed` and `application_submitted` as key events in GA4. Event counts are available even if you do not mark them as key events.

The organic search panel requires the GA4 property to be linked with Google Search Console. Paid cost metrics require linked Google Ads or imported campaign cost data. If either integration is unavailable, the rest of the Analytics page remains available.

For Vercel, add the browser variable to the build environment and the two server variables to the runtime environment for each required deployment target, then redeploy. The `/api/analytics` function reads the server variables at runtime and the browser measurement ID is embedded during the build.
