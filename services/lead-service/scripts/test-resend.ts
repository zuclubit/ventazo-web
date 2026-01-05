/**
 * Test script for Resend email integration
 * Run with: npx tsx scripts/test-resend.ts
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { ResendProvider } from '../src/infrastructure/email/resend.provider';
import { EmailTemplate } from '../src/infrastructure/email/types';

// Load environment variables
config();

async function testResendIntegration() {
  console.log('='.repeat(60));
  console.log('Testing Resend Email Integration');
  console.log('='.repeat(60));

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@zuclubit.com';
  const fromName = process.env.RESEND_FROM_NAME || 'Zuclubit CRM';

  if (!apiKey) {
    console.error('ERROR: RESEND_API_KEY not found in environment');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`From: ${fromName} <${fromEmail}>`);
  console.log('');

  const provider = new ResendProvider();

  // Initialize
  console.log('1. Initializing Resend provider...');
  const initResult = await provider.initialize({
    apiKey,
    fromEmail,
    fromName,
  });

  if (initResult.isFailure) {
    console.error(`   FAILED: ${initResult.error}`);
    process.exit(1);
  }
  console.log('   SUCCESS: Provider initialized');
  console.log('');

  // Test sending a simple email
  console.log('2. Testing simple email send...');

  // Replace with your test email
  const testEmail = process.argv[2] || 'test@example.com';
  console.log(`   Sending to: ${testEmail}`);

  const sendResult = await provider.send({
    to: testEmail,
    subject: 'Prueba de Integración - Zuclubit CRM',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">Zuclubit CRM</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <h2>Prueba de Integración Exitosa</h2>
          <p>Este correo confirma que la integración de Resend está funcionando correctamente.</p>
          <p><strong>Detalles:</strong></p>
          <ul>
            <li>Proveedor: Resend</li>
            <li>Fecha: ${new Date().toLocaleString('es-MX')}</li>
            <li>Ambiente: ${process.env.NODE_ENV || 'development'}</li>
          </ul>
        </div>
        <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Zuclubit CRM. Todos los derechos reservados.</p>
        </div>
      </div>
    `,
    tags: [
      { name: 'type', value: 'test' },
      { name: 'integration', value: 'resend' },
    ],
  });

  if (sendResult.isFailure) {
    console.error(`   FAILED: ${sendResult.error}`);
    process.exit(1);
  }

  const result = sendResult.getValue();
  if (result.success) {
    console.log(`   SUCCESS: Email sent!`);
    console.log(`   Message ID: ${result.messageId}`);
  } else {
    console.error(`   FAILED: ${result.error}`);
    process.exit(1);
  }
  console.log('');

  // Test with template
  console.log('3. Testing template-based email...');

  const templateResult = await provider.sendLeadNotification(testEmail, {
    userName: 'Usuario de Prueba',
    companyName: 'Empresa Demo S.A.',
    contactName: 'Juan Pérez',
    contactEmail: 'juan@empresa-demo.com',
    leadSource: 'Website',
    leadScore: 85,
    leadId: '123e4567-e89b-12d3-a456-426614174000',
  });

  if (templateResult.isFailure) {
    console.error(`   FAILED: ${templateResult.error}`);
  } else {
    const templateSendResult = templateResult.getValue();
    if (templateSendResult.success) {
      console.log(`   SUCCESS: Template email sent!`);
      console.log(`   Message ID: ${templateSendResult.messageId}`);
    } else {
      console.error(`   FAILED: ${templateSendResult.error}`);
    }
  }
  console.log('');

  // List available templates
  console.log('4. Available Email Templates:');
  const templates = provider.getAvailableTemplates();
  templates.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t}`);
  });
  console.log('');

  // Shutdown
  await provider.shutdown();

  console.log('='.repeat(60));
  console.log('Test completed!');
  console.log('='.repeat(60));
}

testResendIntegration().catch(console.error);
