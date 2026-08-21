/**
 * Email Task Handler
 * Simulates transactional email delivery with delay & error handling
 */
async function processEmailTask(payload, simulateFailure) {
  const recipient = payload.to || 'user@example.com';
  const subject = payload.subject || 'Welcome to Task Queue Engine!';

  console.log(`  [Email Handler] Sending email to: ${recipient} | Subject: "${subject}"...`);

  // Simulate network/SMTP delay (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (simulateFailure) {
    throw new Error(`SMTP Connection Timeout (Simulated Failure for ${recipient})`);
  }

  return {
    delivered: true,
    recipient,
    subject,
    sentAt: new Date().toISOString(),
    messageId: `<msg-${Math.random().toString(36).substring(7)}@smtp.local>`,
  };
}

module.exports = processEmailTask;
