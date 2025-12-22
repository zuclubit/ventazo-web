/**
 * Script para probar SMS y WhatsApp via Twilio
 *
 * Uso:
 *   npx tsx scripts/test-twilio.ts sms +521234567890
 *   npx tsx scripts/test-twilio.ts whatsapp +521234567890
 *   npx tsx scripts/test-twilio.ts all +521234567890
 */

import { config } from 'dotenv';
config();

import { TwilioProvider } from '../src/infrastructure/sms/twilio.provider';
import { getTwilioConfig } from '../src/config/environment';

const mode = process.argv[2] || 'all';
const phoneNumber = process.argv[3];

if (!phoneNumber) {
  console.error('❌ Por favor proporciona un número de teléfono:');
  console.error('   npx tsx scripts/test-twilio.ts sms +521234567890');
  console.error('   npx tsx scripts/test-twilio.ts whatsapp +521234567890');
  console.error('   npx tsx scripts/test-twilio.ts all +521234567890');
  process.exit(1);
}

async function main() {
  console.log('🔧 Verificando configuración de Twilio...\n');

  const config = getTwilioConfig();

  console.log('📋 Configuración:');
  console.log(`   Account SID: ${config.accountSid ? config.accountSid.substring(0, 10) + '...' : '❌ No configurado'}`);
  console.log(`   Auth Token: ${config.authToken ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   API Key SID: ${config.apiKeySid ? config.apiKeySid.substring(0, 10) + '...' : '(no usado)'}`);
  console.log(`   API Key Secret: ${config.apiKeySecret ? '✅ Configurado' : '(no usado)'}`);
  console.log(`   Phone Number (SMS): ${config.phoneNumber || '❌ No configurado'}`);
  console.log(`   WhatsApp Number: ${config.whatsappNumber || '❌ No configurado'}`);
  console.log(`   SMS Enabled: ${config.isEnabled ? '✅' : '❌'}`);
  console.log(`   WhatsApp Enabled: ${config.isWhatsAppEnabled ? '✅' : '❌'}`);
  console.log('');

  const provider = new TwilioProvider();

  // Test SMS
  if (mode === 'sms' || mode === 'all') {
    console.log('📱 Probando SMS...');

    if (!provider.isAvailable()) {
      console.log('   ❌ SMS no está disponible. Verifica la configuración.');
    } else {
      const smsResult = await provider.send(
        phoneNumber,
        `🔔 Prueba de SMS desde Zuclubit CRM\n\nEste es un mensaje de prueba enviado el ${new Date().toLocaleString('es-MX')}.\n\n¡Funciona correctamente! ✅`
      );

      if (smsResult.success) {
        console.log(`   ✅ SMS enviado exitosamente`);
        console.log(`   📨 Message SID: ${smsResult.messageId}`);
        console.log(`   📊 Status: ${smsResult.status}`);
        console.log(`   📦 Segmentos: ${smsResult.numSegments}`);
      } else {
        console.log(`   ❌ Error al enviar SMS: ${smsResult.error}`);
        console.log(`   🔢 Código: ${smsResult.errorCode}`);
      }
    }
    console.log('');
  }

  // Test WhatsApp
  if (mode === 'whatsapp' || mode === 'all') {
    console.log('💬 Probando WhatsApp...');

    if (!provider.isWhatsAppAvailable()) {
      console.log('   ❌ WhatsApp no está disponible. Verifica la configuración.');
      console.log('   💡 Asegúrate de configurar TWILIO_WHATSAPP_NUMBER');
    } else {
      const waResult = await provider.sendWhatsApp({
        to: phoneNumber,
        body: `🔔 *Prueba de WhatsApp* desde Zuclubit CRM\n\n✅ Este es un mensaje de prueba enviado el ${new Date().toLocaleString('es-MX')}.\n\n¡El sistema de mensajería está funcionando correctamente!`,
      });

      if (waResult.success) {
        console.log(`   ✅ WhatsApp enviado exitosamente`);
        console.log(`   📨 Message SID: ${waResult.messageId}`);
        console.log(`   📊 Status: ${waResult.status}`);
      } else {
        console.log(`   ❌ Error al enviar WhatsApp: ${waResult.error}`);
        console.log(`   🔢 Código: ${waResult.errorCode}`);

        if (waResult.error?.includes('21608') || waResult.error?.includes('sandbox')) {
          console.log('\n   💡 Nota: Para WhatsApp en modo Sandbox:');
          console.log('      1. El destinatario debe haber enviado "join <sandbox-keyword>" al número de Twilio');
          console.log('      2. Ve a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
        }
      }
    }
    console.log('');
  }

  // Test phone validation
  if (mode === 'validate' || mode === 'all') {
    console.log('🔍 Validando número de teléfono...');

    const validation = await provider.validatePhoneNumber(phoneNumber);

    if (validation.valid) {
      console.log(`   ✅ Número válido`);
      console.log(`   📱 Formato: ${validation.formatted}`);
      console.log(`   📡 Carrier: ${validation.carrier || 'Desconocido'}`);
      console.log(`   📋 Tipo: ${validation.type || 'Desconocido'}`);
    } else {
      console.log(`   ❌ Número no válido o no se pudo verificar`);
    }
    console.log('');
  }

  console.log('✨ Prueba completada');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
