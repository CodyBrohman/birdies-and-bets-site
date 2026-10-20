# Handling data requests

How to answer an emailed request to delete data (or to see or correct it). Not published. The public instructions are
`delete-account.html` and the privacy policy's "Your rights".

**Deadline: 30 days from the email** (PIPEDA and the GDPR both allow about a month). Aim for a few days.

## 1. Acknowledge

Reply the same week:

> Thanks, we've got your request to delete your Birdies & Bets account. We'll confirm when it's done, within 30 days.

## 2. Check it's their account

- Supabase → Authentication → Users: search for the address the email came from.
- Sign in with Apple with a hidden email: the account shows the relay address (`…@privaterelay.appleid.com`). It must match the address they gave, and their email should come from it or from the Apple ID behind it. If you can't tell, ask them to delete in the app instead.
- No match, or the request comes from someone else's address:

> We couldn't find an account for this address. If you sign in with a different email or with Apple, please write from that address or tell us your Apple relay address. You can also delete the account yourself in the app: Profile → Settings → Account → Delete account.

Never ask for a password or a sign-in code.

## 3. Delete

1. Supabase → Authentication → Users → the user → **Delete user**. That removes the account and, through the database's cascade, every round, player, group, course and setting.
2. SQL editor, with the user's id and email from step 2:
   ```sql
   select public.delete_sign_in_log('<user id>', '<email>');
   ```
   This clears Supabase's sign-in log, which isn't linked to the user (migration 0004). The app's delete-account function does this automatically; run it by hand for email requests, or if a deletion from the app ever leaves entries behind.
3. Remove the address from the newsletter list if it's there.
4. Apple accounts: deleting here can't revoke the app's Apple access (that needs the person's own sign-in). Tell them they can also remove Birdies & Bets under Sign in with Apple in their Apple Account settings.

## 4. Confirm

> Done: your Birdies & Bets account and everything stored with it has been deleted. If the app is still on your phone, sign out or delete it to clear the copy there.

## Someone else added them as a player

Their name sits in another user's rounds. Find the rows:

```sql
select owner, id from public.rounds where data::text ilike '%<name>%';
select owner, id from public.people where data::text ilike '%<name>%';
```

Replace the name with a neutral one (for example "Player") in those rows, or ask the account holder to edit or delete them, then confirm to the person who asked. Children's details: do this whenever a parent or guardian asks.

## Requests to see or correct data

Same identity check. Export the user's rows from each table (`profiles`, `rounds`, `people`, `player_groups`, `courses`, `user_settings`) as JSON and send them, or make the correction. Most of it they can also do themselves in the app.

## Keep a log

One line per request, kept for a year: date received, date done, what was done, how identity was checked. Don't keep the email contents or the data itself.
