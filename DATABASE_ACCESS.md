# 📊 Guia de Acesso ao Banco de Dados

## Visão Geral

O sistema **Barbearia Gestão** utiliza um banco de dados MySQL/TiDB para armazenar todos os dados da aplicação. Existem várias formas de acessar e gerenciar os dados.

---

## 🔑 Forma 1: Management UI Database Panel (Recomendado)

Esta é a forma **mais fácil e segura** de acessar o banco de dados.

### Passos:

1. **Abra o Management UI** do seu projeto Manus
2. Clique no botão **"Dashboard"** no painel de controle
3. Vá até a aba **"Database"** no lado direito
4. Você terá acesso a:
   - **Visualizador de dados**: Ver todas as tabelas e registros
   - **CRUD completo**: Criar, editar, deletar registros
   - **Query Editor**: Executar SQL direto
   - **Credenciais**: No canto inferior esquerdo

### Vantagens:
- ✅ Interface visual amigável
- ✅ Sem necessidade de ferramentas externas
- ✅ Seguro e autenticado
- ✅ Backup automático
- ✅ Logs de todas as operações

---

## 🛠️ Forma 2: Ferramentas Externas (MySQL Workbench, DBeaver, etc)

Se preferir usar ferramentas de terceiros:

### Obter Credenciais:

1. Vá ao Management UI → **Settings** → **Database**
2. Copie as credenciais:
   - **Host**: `[seu-host-mysql]`
   - **User**: `[seu-usuario]`
   - **Password**: `[sua-senha]`
   - **Database**: `[seu-banco]`
   - **Port**: `3306`

### Conectar via Linha de Comando:

```bash
mysql -h [HOST] -u [USER] -p[PASSWORD] [DATABASE]
```

Exemplo:
```bash
mysql -h db.example.com -u admin -psenha123 barbearia_gestao
```

### Conectar via MySQL Workbench:

1. Abra MySQL Workbench
2. Clique em `+` para criar nova conexão
3. Preencha os campos com as credenciais
4. **Importante**: Ative **SSL** se recomendado
5. Teste a conexão
6. Clique em "OK"

---

## 📋 Estrutura do Banco de Dados

### Tabelas Principais:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (clientes, barbeiros, admins) |
| `barbershops` | Barbearias cadastradas |
| `appointments` | Agendamentos de clientes |
| `payments` | Histórico de pagamentos |
| `services` | Serviços oferecidos |
| `barber_profiles` | Perfis de barbeiros |
| `business_hours` | Horários de funcionamento |
| `settings` | Configurações da barbearia |
| `social_media_settings` | Integração com redes sociais |

---

## 🔍 Consultas Úteis

### Listar Todos os Usuários:

```sql
SELECT id, name, email, role, status, createdAt FROM users;
```

### Listar Usuários de Teste (oauth.local):

```sql
SELECT id, name, email, role FROM users WHERE email LIKE '%oauth.local%';
```

### Contar Agendamentos por Status:

```sql
SELECT status, COUNT(*) as total FROM appointments GROUP BY status;
```

### Listar Pagamentos Recentes:

```sql
SELECT id, userId, amount, status, createdAt FROM payments ORDER BY createdAt DESC LIMIT 10;
```

### Deletar Usuários de Teste:

```sql
DELETE FROM users WHERE email LIKE '%oauth.local%' AND role = 'client';
```

⚠️ **CUIDADO**: Esta operação é irreversível!

---

## 🔐 Segurança

### Boas Práticas:

1. **Nunca compartilhe credenciais** por email ou chat
2. **Use SSL** ao conectar remotamente
3. **Faça backups** antes de operações destrutivas
4. **Limite acesso** apenas a super_admins
5. **Audite logs** de alterações importantes
6. **Use senhas fortes** para o banco de dados

### Permissões de Usuários:

- **Super Admin**: Acesso total ao banco
- **Admin de Barbearia**: Acesso apenas aos dados da sua barbearia
- **Barbeiro**: Acesso apenas aos seus agendamentos
- **Cliente**: Acesso apenas aos seus dados

---

## 🧹 Limpeza de Dados de Teste

### Via Painel Admin (Recomendado):

1. Faça login como **super_admin**
2. Vá para **Dashboard** → **Gerenciamento de Dados** (`/admin/dados`)
3. Clique em **"Limpar Dados de Teste"**
4. Selecione o que deseja limpar:
   - Agendamentos de teste
   - Pagamentos de teste
   - Usuários de teste (oauth.local)
4. Confirme a ação

### Via SQL (Avançado):

```sql
-- Limpar agendamentos de teste
DELETE FROM appointments WHERE notes LIKE '%teste%' OR notes LIKE '%test%';

-- Limpar pagamentos de teste
DELETE FROM payments WHERE description LIKE '%teste%' OR description LIKE '%test%';

-- Limpar usuários de teste
DELETE FROM users WHERE email LIKE '%oauth.local%' AND role = 'client';
```

---

## 📊 Painel Admin de Gerenciamento

Acesse `/admin/dados` (apenas super_admin) para:

- ✅ Ver estatísticas gerais do sistema
- ✅ Listar todos os usuários
- ✅ Gerenciar status de usuários
- ✅ Resetar senhas
- ✅ Limpar dados de teste com confirmação dupla
- ✅ Ver logs de ações administrativas
- ✅ Fazer backup antes de operações destrutivas

---

## 🆘 Troubleshooting

### Erro: "Connection refused"

- Verifique se o host está correto
- Verifique se a porta 3306 está aberta
- Ative SSL se necessário

### Erro: "Access denied for user"

- Verifique username e password
- Verifique se o usuário tem permissão no banco
- Resete a senha via Management UI

### Erro: "Unknown database"

- Verifique o nome do banco de dados
- Crie o banco se não existir

---

## 📞 Suporte

Se tiver dúvidas sobre acesso ao banco de dados:

1. Consulte o Management UI → **Database** → **Conexão Info**
2. Verifique os logs em `.manus-logs/`
3. Contate o suporte do Manus em https://help.manus.im

---

**Última atualização**: 19 de Abril de 2026
