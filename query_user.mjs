import { getDb } from './server/db.ts';

const db = await getDb();
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, 1),
});

console.log('Usuário de ID 1:');
console.log(JSON.stringify(user, null, 2));
