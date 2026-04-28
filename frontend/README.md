# QuickAid Frontend (Phase 2 + 3)

Frontend implementation for:
- UI wireframe/mockup translated into working interface
- Ticket submission form (HTML/CSS/JS)
- Client-side form validation
- Track ticket by email
- Azure App Service static hosting ready

## Files

- `index.html`: app structure and form screens
- `styles.css`: responsive styling and states
- `app.js`: validation, API calls, submit/track logic
- `web.config`: Azure App Service static hosting settings (Windows)

## Run Locally

Open `index.html` in browser, or serve this folder with any static server.

By default, app runs in demo mode:
- submit creates mock ticket in browser memory
- track reads mock tickets by email

## Connect Real Backend

Set global config before `app.js` load:

```html
<script>
  window.QUICKAID_API_BASE = "https://<your-function-app>.azurewebsites.net";
</script>
```

Expected endpoints:
- `POST /api/submit_ticket`
- `GET /api/get_tickets?email={email}`

## Validation Rules Implemented

- Required: name, email, category, subject, description
- Email format check
- Subject max 120 chars
- Description max 2000 chars
- Basic unsafe character guard (`<` and `>`)
- Prevent duplicate submit while request is pending

## Azure App Service Deployment (Static Files)

1. Create Azure App Service (Windows, Free Tier).
2. Deploy files in `frontend/` to `wwwroot` (Zip Deploy or VS Code extension).
3. Verify `index.html` is default page.
4. Set backend URL script in `index.html` if using real backend.
5. Test:
   - submit valid ticket
   - submit invalid ticket and confirm validation errors
   - track tickets by email

## Suggested Screenshot Checklist

- Submit Ticket page
- Validation error state
- Success state showing ticket ID
- Track Tickets results list
- Live App Service URL in browser bar
