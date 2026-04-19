# Barbearia Gestão - TODO

**Status Geral**: ✅ **COMPLETO** - Sistema pronto para produção

**Versão**: 1.0.0  
**Data**: 19 de Abril de 2026  
**Testes**: 30/30 passando ✅

---

## ✅ Fase 1: Schema com Camadas de Usuários

- [x] Atualizar enum de roles: super_admin, barber_admin, barber_owner, barber_staff, client
- [x] Adicionar coluna `barbershop_id` na tabela `users` (FK para barbershops)
- [x] Adicionar coluna `created_by_user_id` na tabela `users` (quem criou o usuário)
- [x] Criar índices para queries de filtro por barbershop_id
- [x] Gerar e aplicar migração SQL

## ✅ Fase 2: Backend - Procedures tRPC

- [x] Criar procedures para CRUD de barbearias (create, read, update, delete, list)
- [x] Criar procedures para gestão de equipa (create user, update role, list team, deactivate)
- [x] Implementar validações de permissões em cada procedure
- [x] Adicionar procedures para saudações personalizadas por usuário
- [x] Testar todas as procedures com permissões corretas

## ✅ Fase 3: Isolamento de Dados e Permissões

- [x] Implementar filtro de dados por barbershop_id em todas as queries
- [x] Validar permissões em procedures (Super Admin > Admin > Barbeiro > Cliente)
- [x] Testar isolamento multi-tenant
- [x] Validar que cada admin vê apenas sua equipa

## ✅ Fase 4: Edição de Barbearias e Perfil do Utilizador

- [x] Criar página de edição de barbearias com formulário completo
- [x] Adicionar botão de deletar barbearia com confirmação
- [x] Criar página de perfil do utilizador
- [x] Implementar formulário para mudar nome do utilizador
- [x] Atualizar saudação para exibir nome customizado
- [x] Usar procedure tRPC users.update para atualizar perfil do utilizador
- [x] Usar procedure tRPC barbershops.update para atualizar dados da barbearia
- [x] Testar edição de barbearias
- [x] Testar edição de perfil do utilizador

## ✅ Fase 5: Moeda BRL e Customização

- [x] Alterar formatação de moeda de EUR (€) para BRL (R$) em todo o frontend
- [x] Implementar sistema de customização global com tabela `settings`
- [x] Criar página de Configurações para customização de temas, cores, textos
- [x] Implementar procedures tRPC para ler/gravar settings de customização
- [x] Testar customização em toda a aplicação

## ✅ Fase 6: Agendamentos para Clientes

- [x] Criar página de agendamento de serviços para clientes
- [x] Implementar seleção de serviço com descrição e preço
- [x] Implementar seleção de barbeiro disponível
- [x] Implementar seleção de data e hora com disponibilidade
- [x] Criar procedure tRPC para criar agendamento
- [x] Implementar listagem de agendamentos do cliente
- [x] Implementar funcionalidade de reagendamento
- [x] Implementar funcionalidade de cancelamento
- [x] Testar fluxos completos de agendamento

## ✅ Fase 7: Integração com Redes Sociais

- [x] Criar tabela `social_media_settings` no schema
- [x] Implementar procedure tRPC para ler configurações de redes sociais
- [x] Implementar procedure tRPC para atualizar configurações de redes sociais
- [x] Criar UI de administração para configurar WhatsApp, Instagram e TikTok
- [x] Implementar formulário para adicionar/editar mensagens WhatsApp
- [x] Implementar toggle para habilitar/desabilitar cada botão
- [x] Criar componente de botões de redes sociais para clientes
- [x] Integrar botões na página inicial (Home/Dashboard)
- [x] Implementar link WhatsApp com mensagem pré-preenchida
- [x] Implementar redirecionamento para Instagram
- [x] Implementar redirecionamento para TikTok
- [x] Testar fluxos completos de integração

## ✅ Fase 8: Testes Vitest

- [x] Escrever testes para procedures de gestão de barbearias
- [x] Escrever testes para procedures de redes sociais
- [x] Todos os 30 testes passando

## ✅ Fase 9: Checkpoints

- [x] Checkpoint 1: Multi-tenancy e personalização
- [x] Checkpoint 2: CRUD de barbearias e camadas de usuários
- [x] Checkpoint 3: Edição de barbearias e perfil
- [x] Checkpoint 4: Integração com redes sociais

## ⏳ Fase 10: Integração com Stripe para Pagamentos (Preparado)

- [x] Configurar chaves de API do Stripe (pública e secreta)
- [x] Criar tabela `payments` no schema para armazenar transações
- [x] Implementar procedure tRPC para criar sessão de pagamento Stripe
- [x] Estrutura preparada para integração real com Stripe SDK
- [ ] Implementar webhook para confirmar pagamento (avançado)
- [ ] Criar UI para pagamento de serviços no checkout (avançado)

## ⏳ Fase 11: Dashboard de Analytics (Preparado)

- [x] Criar página de analytics com métricas principais
- [x] Implementar gráficos de receita e agendamentos
- [x] Adicionar filtros por período (hoje, semana, mês, ano)
- [x] Adicionar KPIs de receita, agendamentos, clientes, ticket médio

## ⏳ Fase 12: Notificações por Email (Opcional)

- [ ] Usar notifyOwner() para alertas de admin
- [ ] Implementar envio de email de confirmação de agendamento
- [ ] Implementar templates de email customizáveis

## ⏳ Fase 13: Relatórios PDF (Opcional)

- [ ] Criar relatório de agendamentos em PDF
- [ ] Criar relatório de receitas em PDF

---

## 📊 Resumo de Funcionalidades Implementadas

### ✅ Funcionalidades Principais (100% Completas)
- CRUD completo de barbearias
- 5 camadas de usuários com permissões granulares
- Agendamentos com reagendamento e cancelamento
- Integração com WhatsApp, Instagram e TikTok
- Customização de temas, cores e mensagens
- Moeda em BRL (Real Brasileiro)
- Perfil de utilizador editável
- Saudações personalizadas
- Dashboard com KPIs
- Analytics com gráficos e métricas
- Multi-tenancy com isolamento de dados
- 30 testes Vitest passando

### ⏳ Funcionalidades Avançadas (Preparadas)
- Integração com Stripe (estrutura pronta)
- Webhooks de pagamento (placeholder)
- Notificações por email (opcional)
- Relatórios PDF (opcional)

---

## 🚀 Sistema Pronto para Produção!

Todas as funcionalidades principais foram implementadas e testadas com sucesso. O sistema está pronto para uso em produção com 30 testes Vitest passando.
