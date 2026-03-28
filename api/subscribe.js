export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, interests } = req.body;

  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/pub_4df02325-a182-4138-ae37-e5dc70b85292/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: 'dgpogp-landing',
        utm_medium: 'whitelist-form',
        utm_campaign: 'launch-2026',
        custom_fields: [{ name: 'interests', value: interests }]
      })
    }
  );

  const data = await response.json();
  return res.status(response.ok ? 200 : 400).json(data);
}
