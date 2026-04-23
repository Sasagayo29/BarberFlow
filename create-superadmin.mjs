import { randomBytes, scryptSync } from 'crypto';
import mysql from 'mysql2/promise';

// Configuração do banco
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barbearia_gestao',
});

// Dados do super admin
const email = 'superadmin@test.com';
const password = 'SuperAdmin@2026!';
const name = 'Super Admin';

// Hash da senha
function hashPassword(pwd) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pwd, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const hashedPassword = hashPassword(password);

try {
  // Verificar se usuário já existe
  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    console.log('❌ Usuário já existe com este email');
    process.exit(1);
  }

  // Inserir novo super admin
  const [result] = await connection.execute(
    'INSERT INTO users (email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [email, hashedPassword, name, 'super_admin']
  );

  console.log('✅ Super Admin criado com sucesso!');
  console.log('');
  console.log('📧 Email:', email);
  console.log('🔐 Senha:', password);
  console.log('👤 Nome:', name);
  console.log('🎯 Role:', 'super_admin');
  console.log('');
  console.log('ID do usuário:', result.insertId);

} catch (error) {
  console.error('❌ Erro ao criar super admin:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
