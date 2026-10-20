# Email templates

Templates for the emails Birdies & Bets sends. This folder isn't published: the Pages workflow copies only the site files.

| File | What it's for | Unsubscribe link? |
|---|---|---|
| `launch-footer.html`, `launch-footer.txt` | Footer for every launch-news or test-invite email to the early-access list | Yes, required |
| `signup-consent.txt` | Wording for the newsletter service's sign-up form and its confirmation email | n/a |
| `sign-in-code.html` | Supabase → Authentication → Email Templates, for both "Magic Link" and "Confirm signup" | No: a sign-in code isn't marketing |

Replace `[mailing address]` with the PO box or office address before the first send. It goes in emails only, not on the website.

## The unsubscribe link

The footer uses `{UNSUBSCRIBE}` as a stand-in. Swap it for your newsletter service's tag:

| Service | Tag |
|---|---|
| Buttondown | `{{ unsubscribe_url }}` |
| MailerLite | `{$unsubscribe}` |
| Mailchimp | `*\|UNSUB\|*` |

The service also adds the `List-Unsubscribe` header that gives Gmail and Apple Mail their own unsubscribe button. Leave that switched on.

## Rules for marketing emails (CASL in Canada, CAN-SPAM in the US)

St. Margaret's Ventures Inc. is a Canadian business, so Canada's anti-spam law (CASL) applies to every launch email, wherever the reader lives.

- **Consent first.** Only email addresses that signed up through the form (express consent) or that wrote to ask for early access (implied consent, valid for 6 months from their email). Keep the service's record of when and how each address joined.
- **Earlier early-access emails.** People who emailed hello@ before the form existed: import them with the service's double opt-in, so they confirm and you have express consent that doesn't expire.
- **Every email** names St. Margaret's Ventures Inc., includes the mailing address and hello@birdiesandbets.com, and has a working unsubscribe link. The footer template covers all three.
- **Opt-outs** must take effect within 10 business days, and the link must keep working for at least 60 days after you send. Newsletter services do both automatically. If someone replies "unsubscribe" instead, remove them by hand.
- **Never** add people who only received sign-in codes, or players someone added to a round, to the list.
- Subject lines and "from" names must be accurate: "Birdies & Bets" from hello@birdiesandbets.com.
