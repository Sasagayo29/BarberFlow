import { createHash } from "crypto";

// Função para hash de senha (mesmo algoritmo usado no backend)
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

// Dados do super admin
const superAdmin = {
  name: "Riquelmy",
  email: "riquelmymiyasawaborges@gmail.com",
  password: "Hianck@290721",
  role: "super_admin",
  status: "active",
  loginMethod: "email",
};

// SQL para inserir o super admin
const passwordHash = hashPassword(superAdmin.password);
const now = new Date().toISOString().slice(0, 19).replace("T", " ");

const sql = `
INSERT INTO users (name, email, passwordHash, role, status, loginMethod, createdAt, updatedAt)
VALUES (
  '${superAdmin.name}',
  '${superAdmin.email}',
  '${passwordHash}',
  '${superAdmin.role}',
  '${superAdmin.status}',
  '${superAdmin.loginMethod}',
  '${now}',
  '${now}'
);
`;

console.log("SQL para inserir super admin Riquelmy:");
console.log(sql);
console.log("\nCredenciais:");
console.log(`Email: ${superAdmin.email}`);
console.log(`Senha: ${superAdmin.password}`);
console.log(`Role: ${superAdmin.role}`);
