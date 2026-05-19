import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all users, check for ones created in the last 6 minutes
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 50);
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    const newUsers = allUsers.filter(u => new Date(u.created_date) > sixMinutesAgo);

    for (const user of newUsers) {
      const name = user.full_name || 'Unknown';
      const email = user.email || 'Unknown';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'mplandry77@gmail.com',
        subject: `New CommandBoard Sign-Up: ${name}`,
        body: `A new user has signed up for CommandBoard.\n\nName: ${name}\nEmail: ${email}\n\nSigned up: ${new Date(user.created_date).toLocaleString()}`,
      });
    }

    return Response.json({ checked: allUsers.length, notified: newUsers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});