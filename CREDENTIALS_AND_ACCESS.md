# 🔐 Credenciais e Guia de Acesso - Barbearia Gestão

## 📋 Informações do Projeto

**Nome do Projeto**: Barbearia Gestão  
**Versão**: 3f616c3a  
**Status**: ✅ Pronto para Produção  
**Domínio**: https://barberdash-ocmhqsb7.manus.space  
**Dev Server**: https://3000-ih97pkzvvd835dsmicvxv-3b764a65.us2.manus.computer

---

## 🗄️ Banco de Dados

### Credenciais de Conexão

```
Host: gateway05.us-east-1.prod.aws.tidbcloud.com
Porta: 4000
Usuário: 33Ph9itRJmX2Xju.root
Senha: hrLznp531C7Z8vR0vxSI
Banco: oCmhQsb7x4JpBRBGep29Zt
SSL: Habilitado (Amazon RDS)
```

### Acessar o Banco de Dados

**Via Management UI (Recomendado):**
1. Clique no botão **"Dashboard"** no painel de controle do Manus
2. Vá até a aba **"Database"** no lado direito
3. Você terá acesso a:
   - Visualizador de dados (ver todas as tabelas)
   - CRUD completo (criar, editar, deletar registros)
   - SQL Query (executar queries diretas)
   - Credenciais (no canto inferior esquerdo)

**Via Ferramentas Externas:**
- MySQL Workbench
- DBeaver
- CLI: `mysql -h gateway05.us-east-1.prod.aws.tidbcloud.com -u 33Ph9itRJmX2Xju.root -p oCmhQsb7x4JpBRBGep29Zt`

---

## 👥 Usuários do Sistema

### Super Admin (Proprietário)

O primeiro usuário criado é o **Super Admin** via OAuth Manus. Este usuário tem acesso total ao sistema.

**Acesso**: Faça login com sua conta Manus no painel

### Admin (Chef) - Criado Automaticamente

Quando você cria uma barbearia, um usuário **Admin (Chef)** é criado automaticamente:

- **Email**: `chef.{barbershopId}@{barbershop-name}.local`
- **Senha**: Gerada automaticamente (salva no banco)
- **Papel**: `barber_owner` (Chef da barbearia)
- **Função**: Gerenciar equipe, serviços e agendamentos da barbearia

**Como acessar:**
1. Vá para `/admin/dados` (Gerenciamento de Dados)
2. Abra a aba "Admins"
3. Procure pelo usuário com nome `Chef - {Nome da Barbearia}`
4. Copie o email e solicite a senha ao banco de dados

---

## 🔑 Variáveis de Ambiente (Automáticas)

Estas variáveis são injetadas automaticamente pelo Manus:

```env
DATABASE_URL=mysql://33Ph9itRJmX2Xju.root:hrLznp531C7Z8vR0vxSI@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/oCmhQsb7x4JpBRBGep29Zt?ssl={"rejectUnauthorized":true}
JWT_SECRET=[AUTO]
VITE_APP_ID=[AUTO]
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=[AUTO]
OWNER_OPEN_ID=[AUTO]
OWNER_NAME=[AUTO]
BUILT_IN_FORGE_API_URL=[AUTO]
BUILT_IN_FORGE_API_KEY=[AUTO]
VITE_FRONTEND_FORGE_API_KEY=[AUTO]
VITE_FRONTEND_FORGE_API_URL=[AUTO]
```

---

## 📊 Estrutura de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema (super_admin, barber_owner, barber_staff, client) |
| `barbershops` | Barbearias cadastradas |
| `services` | Serviços oferecidos (cortes, barbas, etc) |
| `appointments` | Agendamentos de clientes |
| `payments` | Pagamentos e transações |
| `barbershop_profiles` | Perfis específicos de barbeiros |
| `business_hours` | Horários de funcionamento |
| `barber_availability_overrides` | Exceções de disponibilidade |
| `settings` | Configurações do sistema |
| `social_media_settings` | Redes sociais da barbearia |

---

## 🎯 Funcionalidades Principais

### 1. **Painel de Super Admin** (`/admin/dados`)
- Visualizar estatísticas gerais
- Listar todos os usuários (clientes, barbeiros, admins)
- Limpar dados de teste
- Limpar dados de analytics
- Logs de ações administrativas

### 2. **Dashboard Principal** (`/dashboard`)
- Resumo de agendamentos e receita
- Próximos atendimentos
- Acesso rápido a funcionalidades

### 3. **Agenda** (`/agenda`)
- Visualizar agendamentos por dia/semana/mês
- Confirmar, cancelar ou reagendar
- Notas e observações

### 4. **Serviços** (`/servicos`)
- Gerenciar serviços (cortes, barbas, etc)
- Definir preços e duração
- Vincular com barbeiros

### 5. **Equipa** (`/equipa`)
- Adicionar/remover barbeiros
- Gerenciar permissões
- Definir disponibilidade

### 6. **Agendamento de Clientes** (`/agendar`)
- Interface para clientes agendar
- Seleção de serviço, barbeiro, data e hora
- Confirmação automática

### 7. **Dashboard de Clientes** (`/meu-painel`)
- Histórico de agendamentos
- Histórico de pagamentos
- Perfil do cliente

### 8. **Relatórios** (`/relatorios`)
- Gerar PDFs com estatísticas
- Receita, agendamentos, desempenho
- Download automático

### 9. **Analytics** (`/analytics`)
- Visualizar dados de uso
- Gráficos e estatísticas
- Limpeza de dados antigos

### 10. **Notificações em Tempo Real** (WebSocket)
- Notificar barbeiros de novos agendamentos
- Alertas de cancelamento
- Reagendamentos

---

## ⚙️ Configuração Inicial

### Passo 1: Criar Primeira Barbearia

1. Faça login como Super Admin
2. Vá para `/barbearias`
3. Clique em "Criar Barbearia"
4. Preencha os dados (nome, telefone, email, endereço)
5. **Um admin (chef) será criado automaticamente**

### Passo 2: Configurar Serviços

1. Vá para `/servicos`
2. Clique em "Novo Serviço"
3. Defina nome, preço, duração e barbeiro responsável

### Passo 3: Adicionar Barbeiros

1. Vá para `/equipa`
2. Clique em "Adicionar Barbeiro"
3. Defina nome, email e permissões

### Passo 4: Configurar Horários

1. Vá para `/configuracoes`
2. Defina horários de funcionamento
3. Configure exceções (feriados, folgas)

---

## 🧪 Dados de Teste

O banco foi zerado. Para testar o sistema:

1. **Criar usuários de teste** via `/admin/dados`
2. **Criar barbearia de teste** via `/barbearias`
3. **Criar serviços de teste** via `/servicos`
4. **Criar agendamentos de teste** via `/agenda`

---

## 🔐 Segurança

### Autenticação
- OAuth Manus (login seguro)
- JWT para sessões
- Cookies seguros (HttpOnly, Secure, SameSite)

### Autorização
- Controle de acesso baseado em papéis (RBAC)
- Verificação de permissões em todas as operações
- Auditoria de ações administrativas

### Dados
- Senhas com hash scrypt
- Criptografia de dados sensíveis
- Backup automático antes de operações destrutivas

---

## 🚀 Deployment

### Publicar o Projeto

1. Clique no botão **"Publish"** no Management UI
2. Selecione o domínio desejado
3. Confirme a publicação
4. O site estará disponível em poucos minutos

### Domínios Disponíveis

- **Auto-gerado**: `barberdash-ocmhqsb7.manus.space`
- **Customizado**: Você pode adicionar seu próprio domínio nas configurações

---

## 📞 Suporte e Troubleshooting

### Problema: Não consigo fazer login

**Solução:**
1. Verifique se sua conta Manus está ativa
2. Tente fazer logout e login novamente
3. Limpe cookies do navegador

### Problema: Dados não salvam

**Solução:**
1. Verifique a conexão com o banco de dados
2. Verifique se há espaço em disco
3. Reinicie o servidor

### Problema: Notificações não chegam

**Solução:**
1. Verifique se o WebSocket está conectado
2. Abra o console do navegador (F12)
3. Procure por mensagens de erro de conexão

---

## 📚 Documentação Adicional

- **DATABASE_ACCESS.md**: Guia completo de acesso ao banco de dados
- **README.md**: Documentação técnica do projeto
- **Código-fonte**: Disponível em `/home/ubuntu/barbearia-gestao`

---

## ✅ Checklist de Implementação

- [x] Banco de dados zerado e pronto
- [x] Super Admin criado (via OAuth Manus)
- [x] Admin (Chef) criado automaticamente ao criar barbearia
- [x] Painel de gerenciamento de dados
- [x] Limpeza de analytics
- [x] Dashboard com nome real do usuário
- [x] Sistema de agendamento para clientes
- [x] WebSocket para notificações em tempo real
- [x] Job scheduler para lembretes automáticos
- [x] Geração de PDFs com relatórios
- [x] 30 testes passando
- [x] Sistema pronto para produção

---

**Última atualização**: 19 de Abril de 2026  
**Versão do Sistema**: 3f616c3a  
**Status**: ✅ Pronto para Uso
