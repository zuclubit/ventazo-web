/**
 * Script para enviar emails de prueba
 * Ejecutar: npx tsx scripts/test-emails.ts <email_destino>
 */

import { config } from 'dotenv';
config();

import { ResendProvider } from '../src/infrastructure/email/resend.provider';
import { EmailTemplate } from '../src/infrastructure/email/types';

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Por favor proporciona un email de destino:');
  console.error('   npx tsx scripts/test-emails.ts tu@email.com');
  process.exit(1);
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@zuclubit.com';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Zuclubit CRM';

if (!RESEND_API_KEY.startsWith('re_')) {
  console.error('❌ RESEND_API_KEY no está configurada correctamente');
  process.exit(1);
}

async function sendTestEmails() {
  console.log('📧 Iniciando envío de emails de prueba...');
  console.log(`📬 Destinatario: ${testEmail}`);
  console.log('');

  const emailProvider = new ResendProvider();

  const initResult = await emailProvider.initialize({
    apiKey: RESEND_API_KEY,
    defaultFrom: FROM_EMAIL,
    defaultFromName: FROM_NAME,
  });

  if (initResult.isFailure) {
    console.error('❌ Error al inicializar el proveedor de email:', initResult.error);
    process.exit(1);
  }

  console.log('✅ Proveedor de email inicializado\n');

  const testCases = [
    {
      name: 'Welcome User',
      template: EmailTemplate.USER_WELCOME,
      subject: '🎉 ¡Bienvenido a Zuclubit CRM! (TEST)',
      variables: {
        userName: 'Oscar Valois',
        appName: 'Zuclubit CRM',
        actionUrl: 'https://app.zuclubit.com/dashboard',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Lead Created',
      template: EmailTemplate.LEAD_WELCOME,
      subject: '📥 Nuevo Lead: Acme Corporation (TEST)',
      variables: {
        userName: 'Oscar Valois',
        companyName: 'Acme Corporation',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        leadSource: 'Website',
        leadScore: 85,
        scoreClass: 'score-hot',
        actionUrl: 'https://app.zuclubit.com/leads/123',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
        supportEmail: 'soporte@zuclubit.com',
      },
    },
    {
      name: 'Lead Qualified',
      template: EmailTemplate.LEAD_QUALIFIED,
      subject: '⭐ Lead Calificado: Tech Solutions (TEST)',
      variables: {
        userName: 'Oscar Valois',
        companyName: 'Tech Solutions',
        leadScore: 92,
        actionUrl: 'https://app.zuclubit.com/leads/456',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Lead Converted',
      template: EmailTemplate.LEAD_CONVERTED,
      subject: '🎉 ¡Lead Convertido!: Global Inc (TEST)',
      variables: {
        userName: 'Oscar Valois',
        companyName: 'Global Inc',
        actionUrl: 'https://app.zuclubit.com/customers/789',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Opportunity Won',
      template: EmailTemplate.OPPORTUNITY_WON,
      subject: '🏆 ¡Oportunidad Ganada! - Proyecto Enterprise (TEST)',
      variables: {
        ownerName: 'Oscar Valois',
        opportunityName: 'Proyecto Enterprise',
        opportunityAmount: '$50,000.00 USD',
        wonReason: 'Mejor propuesta técnica y precio competitivo',
        closeDate: new Date().toLocaleDateString('es-ES'),
        actionUrl: 'https://app.zuclubit.com/opportunities/101',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Task Assigned',
      template: EmailTemplate.TASK_ASSIGNED,
      subject: '📋 Nueva Tarea: Llamada de seguimiento (TEST)',
      variables: {
        assigneeName: 'Oscar Valois',
        taskTitle: 'Llamada de seguimiento con cliente',
        taskDescription: 'Realizar llamada de seguimiento para revisar propuesta enviada y resolver dudas.',
        taskPriority: 'high',
        taskDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        assignedBy: 'María García',
        actionUrl: 'https://app.zuclubit.com/tasks/202',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Payment Confirmation',
      template: EmailTemplate.PAYMENT_CONFIRMATION,
      subject: '✅ Pago Confirmado - $1,500.00 USD (TEST)',
      variables: {
        customerName: 'Oscar Valois',
        paymentAmount: '$1,500.00 USD',
        paymentReference: 'PAY-2025-001234',
        paymentDate: new Date().toLocaleDateString('es-ES'),
        paymentMethod: 'Tarjeta de crédito ****4242',
        actionUrl: 'https://app.zuclubit.com/payments/303',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Customer Welcome',
      template: EmailTemplate.CUSTOMER_WELCOME,
      subject: '🎉 ¡Bienvenido como Cliente! (TEST)',
      variables: {
        customerName: 'Oscar Valois',
        companyName: 'Zuclubit Solutions',
        actionUrl: 'https://app.zuclubit.com/portal',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Quote Sent',
      template: EmailTemplate.QUOTE_SENT,
      subject: '📄 Cotización Enviada: Servicios de Consultoría (TEST)',
      variables: {
        userName: 'Oscar Valois',
        companyName: 'Empresa ABC',
        contactName: 'Roberto Sánchez',
        contactEmail: 'roberto@empresaabc.com',
        quoteAmount: '$25,000.00 USD',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        actionUrl: 'https://app.zuclubit.com/quotes/404',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
    {
      name: 'Contract Signature Request',
      template: EmailTemplate.CONTRACT_SIGNATURE_REQUEST,
      subject: '✍️ Firma Requerida: Contrato de Servicios (TEST)',
      variables: {
        signatoryName: 'Oscar Valois',
        contractTitle: 'Contrato de Servicios Profesionales 2025',
        customerName: 'Tech Innovations S.A.',
        contractValue: '$75,000.00 USD',
        actionUrl: 'https://app.zuclubit.com/contracts/505/sign',
        appName: 'Zuclubit CRM',
        currentYear: new Date().getFullYear(),
      },
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const test of testCases) {
    process.stdout.write(`📤 Enviando: ${test.name}... `);

    try {
      const result = await emailProvider.send({
        to: testEmail,
        subject: test.subject,
        template: test.template,
        variables: test.variables,
        tags: [
          { name: 'type', value: 'test' },
          { name: 'template', value: test.template },
        ],
      });

      if (result.isSuccess) {
        console.log('✅ Enviado');
        successCount++;
      } else {
        console.log(`❌ Error: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
      failCount++;
    }

    // Pequeña pausa entre emails para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Resultados:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failCount}`);
  console.log(`   📬 Total: ${testCases.length}`);
  console.log('='.repeat(50));

  if (successCount > 0) {
    console.log(`\n📥 Revisa tu bandeja de entrada en: ${testEmail}`);
  }
}

sendTestEmails().catch(console.error);
