# Supabase

Versioned SQL lives in `migrations/`.

## Apply Phase 1

**Option A — Dashboard:** open the SQL editor and run  
`migrations/20261104210000_profiles.sql`.

**Option B — CLI** (after `npx supabase login` and link):

```bash
npx supabase init   # once, if you want a full local config.toml
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Keep the service role key out of the Next.js client and out of git.
