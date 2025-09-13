export async function sendTextEmail(to: string, subject: string, text: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Hassan', email: 'hassan@letsenjoypk.com' },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('Brevo Error:', error);
    throw new Error(error.message || 'Failed to send email');
  }

  return await res.json();
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Hassan', email: 'hassan@letsenjoypk.com' },
      to: [{ email: to }],
      subject: 'Welcome to the Platform!',
      textContent: `Hello${name ? ` ${name}` : ''}, thanks for signing up!`,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('Failed to send email via Brevo:', error);
    throw new Error(error.message || 'Brevo email failed');
  }

  return await res.json();
}
