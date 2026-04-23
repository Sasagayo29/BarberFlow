#!/usr/bin/env node

/**
 * Script para testar a criação de super admin via API
 * Uso: node test-create-superadmin.mjs
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key';

async function createSuperAdmin() {
  const payload = {
    email: 'superadmin@test.com',
    password: 'SuperAdmin@2026!',
    name: 'Super Admin',
    adminSecret: ADMIN_SECRET,
  };

  console.log('🔧 Testando endpoint createSuperAdmin...');
  console.log(`📍 URL: ${API_URL}/api/trpc/auth.createSuperAdmin`);
  console.log(`📧 Email: ${payload.email}`);
  console.log(`🔐 Senha: ${payload.password}`);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/api/trpc/auth.createSuperAdmin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Super admin criado com sucesso!');
      console.log('');
      console.log('📋 Credenciais de Login:');
      console.log(`   Email: ${payload.email}`);
      console.log(`   Senha: ${payload.password}`);
      console.log('');
      console.log('🔗 Acesse: ' + API_URL);
    } else {
      console.error('❌ Erro ao criar super admin:');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('');
    console.error('💡 Dica: Certifique-se de que o servidor está rodando em ' + API_URL);
  }
}

createSuperAdmin();
