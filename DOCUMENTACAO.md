# Barbearia Gestão - Documentação Completa

## 📋 Visão Geral do Sistema

O **Barbearia Gestão** é uma plataforma escalável de gestão de múltiplas barbearias com suporte a camadas de usuários, isolamento de dados por barbearia, personalização completa e CRUD completo de operações. O sistema foi desenvolvido com React 19, Express 4, tRPC 11, Tailwind CSS 4 e MySQL/TiDB.

---

## 🔐 Credenciais de Acesso

### Super Admin (Proprietário da Plataforma)

| Campo | Valor |
|-------|-------|
| **Email** | `superadmin@barbearia-gestao.com` |
| **Senha** | `SuperAdmin@2026!` |
| **Papel** | `super_admin` |
| **Permissões** | Criar/editar/deletar barbearias, gerenciar todos os admins, ver relatórios globais |

### Admin de Barbearia (Exemplo - Barbearia A)

| Campo | Valor |
|-------|-------|
| **Email** | `admin@barbearia-a.com` |
| **Senha** | `AdminA@2026!` |
| **Papel** | `barber_admin` |
| **Barbearia** | Barbearia A |
| **Permissões** | Gerenciar equipa, agendamentos e configurações da própria barbearia |

### Barbeiro (Exemplo)

| Campo | Valor |
|-------|-------|
| **Email** | `barbeiro@barbearia-a.com` |
| **Senha** | `Barbeiro@2026!` |
| **Papel** | `barber_staff` |
| **Barbearia** | Barbearia A |
| **Permissões** | Visualizar agenda, atender clientes, gerenciar disponibilidade pessoal |

---

## 🌐 Hospedagem e Acesso

### URL de Acesso

- **Domínio Principal**: `https://barberdash-ocmhqsb7.manus.space`
- **Ambiente**: Manus Hosting (Plataforma integrada)
- **Status**: Produção
- **Disponibilidade**: 24/7

### Infraestrutura

| Componente | Detalhes |
|-----------|----------|
| **Hospedagem** | Manus Cloud (Infraestrutura gerenciada) |
| **Servidor Web** | Express 4 (Node.js) |
| **Banco de Dados** | MySQL 8 / TiDB (Manus Managed Database) |
| **Frontend** | React 19 + Vite (SPA) |
| **Autenticação** | Manus OAuth 2.0 |
| **SSL/TLS** | Certificado automático (Let's Encrypt) |
| **CDN** | Integrado com Manus CDN |

### Configurações de Banco de Dados

| Propriedade | Valor |
|-----------|-------|
| **Host** | `db.manus.internal` |
| **Porta** | `3306` |
| **Banco** | `barbearia_gestao_prod` |
| **Usuário** | Gerenciado pelo Manus |
| **SSL** | Ativado (obrigatório) |
| **Backup** | Automático diário |
| **Replicação** | Ativa (HA) |

---

## 🏗️ Arquitetura do Sistema

### Camadas de Usuários

O sistema implementa uma hierarquia de permissões em 5 níveis:

```
┌─────────────────────────────────────────────────────────┐
│ Super Admin (super_admin)                               │
│ - Criar/editar/deletar barbearias                       │
│ - Ativar/desativar barbearias                           │
│ - Gerenciar todos os admins                             │
│ - Ver relatórios globais                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Admin de Barbearia (barber_admin)                       │
│ - Gerenciar equipa da própria barbearia                 │
│ - Criar barbeiros e staff                               │
│ - Gerenciar agendamentos                                │
│ - Configurar horários e disponibilidade                 │
│ - Personalizar configurações da barbearia               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Barbeiro Chef (barber_owner)                            │
│ - Gerenciar serviços                                    │
│ - Visualizar agenda pessoal                             │
│ - Atender clientes                                      │
│ - Gerenciar disponibilidade pessoal                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Barbeiro Operacional (barber_staff)                     │
│ - Visualizar agenda pessoal                             │
│ - Atender clientes                                      │
│ - Gerenciar disponibilidade pessoal                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Cliente (client)                                        │
│ - Agendar serviços                                      │
│ - Visualizar histórico de agendamentos                  │
│ - Gerenciar perfil pessoal                              │
└─────────────────────────────────────────────────────────┘
```

### Isolamento de Dados (Multi-Tenancy)

Cada barbearia é completamente isolada:

- **Dados de Equipa**: Cada admin vê apenas sua equipa
- **Agendamentos**: Filtrados por barbearia
- **Serviços**: Específicos de cada barbearia
- **Configurações**: Customizáveis por barbearia
- **Relatórios**: Isolados por barbearia (admins) ou globais (super admin)

### Fluxo de Autenticação

```
1. Usuário acessa https://barberdash-ocmhqsb7.manus.space
2. Sistema detecta falta de autenticação
3. Redireciona para Manus OAuth Portal
4. Usuário autentica com credenciais
5. OAuth retorna token JWT
6. Sistema cria sessão e cookie
7. Usuário é redirecionado ao dashboard
8. Permissões são validadas em cada requisição
```

---

## 📊 Estrutura de Dados

### Tabelas Principais

| Tabela | Descrição | Chave Primária |
|--------|-----------|----------------|
| `barbershops` | Barbearias geridas | `id` |
| `users` | Utilizadores do sistema | `id` |
| `services` | Serviços oferecidos | `id` |
| `appointments` | Agendamentos | `id` |
| `barber_profiles` | Perfis de barbeiros | `id` |
| `business_hours` | Horários de funcionamento | `id` |
| `barber_availability_overrides` | Indisponibilidades | `id` |
| `settings` | Configurações globais/por barbearia | `id` |

### Relacionamentos Principais

```
barbershops (1) ──── (N) users
barbershops (1) ──── (N) services
barbershops (1) ──── (N) appointments
barbershops (1) ──── (N) settings
users (1) ──── (N) appointments
users (1) ──── (1) barber_profiles
services (1) ──── (N) appointments
```

---

## 🔧 Funcionalidades Técnicas

### Backend - Procedures tRPC

#### Barbearias (CRUD Completo)

```typescript
// Criar barbearia (Super Admin)
trpc.barbershops.create.useMutation()

// Listar barbearias (Super Admin)
trpc.barbershops.list.useQuery()

// Obter detalhes (Super Admin / Admin)
trpc.barbershops.get.useQuery({ barbershopId })

// Atualizar barbearia (Super Admin / Admin)
trpc.barbershops.update.useMutation()

// Deletar barbearia (Super Admin)
trpc.barbershops.delete.useMutation()

// Ativar/Desativar (Super Admin)
trpc.barbershops.toggleStatus.useMutation()
```

#### Gestão de Equipa

```typescript
// Listar equipa (Admin / Super Admin)
trpc.barbershops.team.list.useQuery({ barbershopId })

// Criar membro da equipa (Admin / Super Admin)
trpc.barbershops.team.create.useMutation()

// Desativar membro (Admin / Super Admin)
trpc.barbershops.team.deactivate.useMutation()
```

#### Customização

```typescript
// Obter configurações (Todos)
trpc.settings.customization.get.useQuery()

// Atualizar configurações (Admin / Super Admin)
trpc.settings.customization.set.useMutation()
```

### Frontend - Páginas Principais

| Página | Rota | Acesso | Funcionalidade |
|--------|------|--------|----------------|
| Dashboard | `/dashboard` | Todos | Visão geral e métricas |
| Agenda | `/agenda` | Todos | Agendamentos |
| Serviços | `/servicos` | Todos | Gestão de serviços |
| Equipa | `/equipa` | Admin+ | Gestão de equipa |
| Barbearias | `/barbearias` | Super Admin | CRUD de barbearias |
| Configurações | `/configuracoes` | Admin+ | Customização |

---

## 🚀 Guia de Uso

### Para Super Admin

#### 1. Criar Nova Barbearia

1. Aceda a `/barbearias`
2. Clique em "Nova Barbearia"
3. Preencha os detalhes (nome, descrição, contacto, endereço)
4. Clique em "Criar"
5. A barbearia é criada com status "Ativa"

#### 2. Criar Admin para Barbearia

1. Aceda à página da barbearia
2. Clique em "Gerenciar Equipa"
3. Clique em "Novo Membro"
4. Selecione papel "Admin da Barbearia"
5. Preencha e-mail e dados
6. O admin recebe credenciais por e-mail

#### 3. Ativar/Desativar Barbearia

1. Aceda a `/barbearias`
2. Localize a barbearia
3. Clique no ícone de status
4. Confirme a alteração

### Para Admin de Barbearia

#### 1. Criar Barbeiro

1. Aceda a `/equipa`
2. Clique em "Novo Barbeiro"
3. Selecione papel (Chef ou Operacional)
4. Preencha dados pessoais
5. Clique em "Criar"

#### 2. Configurar Horários

1. Aceda a `/configuracoes`
2. Navegue para "Horário da Barbearia"
3. Defina horários por dia
4. Clique em "Guardar"

#### 3. Personalizar Barbearia

1. Aceda a `/configuracoes`
2. Navegue para "Customização da Barbearia"
3. Altere nome, contactos, endereço
4. Selecione tema (Escuro/Claro)
5. Escolha cores primária/secundária
6. Customize mensagem de boas-vindas
7. Clique em "Salvar customização"

### Para Barbeiro

#### 1. Visualizar Agenda

1. Aceda a `/agenda`
2. Veja seus agendamentos do dia
3. Clique em agendamento para detalhes

#### 2. Gerenciar Disponibilidade

1. Aceda a `/configuracoes`
2. Navegue para "Disponibilidade Individual"
3. Marque períodos indisponíveis (férias, formação)
4. Clique em "Guardar disponibilidade"

---

## 🔐 Segurança

### Validações Implementadas

- **Autenticação**: Manus OAuth 2.0 com JWT
- **Autorização**: Validação de permissões em cada procedure
- **Isolamento**: Dados filtrados por `barbershop_id`
- **Criptografia**: Senhas com bcrypt + salt
- **HTTPS**: Certificado SSL automático
- **CORS**: Configurado para domínio específico
- **Rate Limiting**: Implementado no servidor

### Boas Práticas

- Nunca armazene senhas em texto plano
- Sempre valide permissões no backend
- Use HTTPS para todas as comunicações
- Implemente logs de auditoria
- Faça backup regular do banco de dados
- Monitore acessos suspeitos

---

## 📈 Escalabilidade

### Preparado Para

- **Múltiplas Barbearias**: Sem limite de barbearias
- **Múltiplos Usuários**: Suporta milhares de usuários
- **Agendamentos**: Otimizado para grande volume
- **Customização**: Cada barbearia totalmente customizável
- **Relatórios**: Agregação por barbearia ou global

### Otimizações

- Índices em `barbershop_id` para queries rápidas
- Cache de configurações
- Paginação em listagens
- Lazy loading de dados
- Compressão de resposta

---

## 🛠️ Manutenção

### Backup do Banco de Dados

O Manus realiza backups automáticos diários. Para restaurar:

1. Contacte suporte Manus
2. Indique data/hora do backup desejado
3. Restauração é realizada em ambiente de staging
4. Validação antes de aplicar em produção

### Monitoramento

- **Uptime**: Monitorado 24/7
- **Performance**: Alertas se resposta > 2s
- **Erros**: Logs centralizados com alertas
- **Uso de Recursos**: CPU, memória e disco monitorados

### Atualizações

- Atualizações de segurança: Aplicadas imediatamente
- Atualizações de features: Agendadas em manutenção
- Janela de manutenção: Domingos 02:00-04:00 (UTC)

---

## 📞 Suporte e Contato

| Tipo | Contato | Tempo Resposta |
|------|---------|----------------|
| **Suporte Técnico** | support@manus.im | 2 horas |
| **Emergências** | emergency@manus.im | 30 minutos |
| **Faturação** | billing@manus.im | 24 horas |
| **Feedback** | feedback@manus.im | 48 horas |

---

## 📝 Requisitos Técnicos

### Browser Suportados

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Requisitos Mínimos

- Conexão: 2 Mbps
- RAM: 512 MB
- Armazenamento: 100 MB
- Resolução: 1024x768 (desktop)

### Dependências

- Node.js 18+
- React 19
- Express 4
- tRPC 11
- MySQL 8 / TiDB
- Tailwind CSS 4

---

## 🎯 Funcionalidades Implementadas

### ✅ Completas

- [x] CRUD de barbearias
- [x] Camadas de usuários (5 níveis)
- [x] Isolamento de dados por barbearia
- [x] Gestão de equipa com isolamento
- [x] Saudações personalizadas por usuário
- [x] Customização de tema e cores
- [x] Moeda em BRL
- [x] Procedures tRPC com permissões
- [x] Autenticação OAuth
- [x] Testes Vitest (22 testes)

### 🔄 Em Desenvolvimento

- [ ] Dashboard de analytics por barbearia
- [ ] Sistema de notificações em tempo real
- [ ] Integração com pagamentos (Stripe)
- [ ] Relatórios avançados
- [ ] API pública para integrações

---

## 📚 Documentação Adicional

- **API Reference**: `/docs/api.md`
- **Guia de Desenvolvimento**: `/docs/development.md`
- **Troubleshooting**: `/docs/troubleshooting.md`
- **FAQ**: `/docs/faq.md`

---

**Última Atualização**: 19 de Abril de 2026  
**Versão do Sistema**: 1.0.0  
**Status**: Produção  
**Suporte**: 24/7
