# Barbearia Gestão - TODO

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
- [x] Usar procedure tRPC users.update para atualizar perfil do utilizador
- [x] Usar procedure tRPC barbershops.update para atualizar dados da barbearia

## ✅ Fase 3: Isolamento de Dados

- [x] Filtrar serviços por barbershop_id
- [x] Filtrar agendamentos por barbershop_id
- [x] Filtrar equipa por barbershop_id (admin vê sua equipa, super admin vê tudo)
- [x] Filtrar configurações por barbershop_id
- [x] Validar que usuários só acessam dados de sua barbearia

## ✅ Fase 4: UI - CRUD de Barbearias

- [x] Criar página de edição de barbearia (update)
- [x] Criar página de listagem com ações (edit, delete, toggle status)
- [x] Implementar confirmação de exclusão
- [x] Adicionar formulário de criação com validações
- [x] Adicionar indicadores visuais de status (ativa/inativa)

## ✅ Fase 5: UI - Gestão de Equipa

- [x] Criar página de gestão de equipa por barbearia
- [x] Implementar formulário de criação de usuário (admin cria barbeiros)
- [x] Adicionar listagem de equipa com ações (edit, deactivate)
- [x] Implementar filtro de roles
- [x] Adicionar indicadores de quem criou cada usuário

## ✅ Fase 6: Saudações Personalizadas

- [x] Atualizar Home para exibir saudação personalizada do usuário
- [x] Adicionar saudação personalizada por barbearia
- [x] Implementar fallback para usuários sem barbearia
- [x] Adicionar mensagem de boas-vindas customizável por barbearia

## ✅ Fase 7: Testes Vitest

- [x] Testes de CRUD de barbearias com permissões
- [x] Testes de gestão de equipa (create, update, list, deactivate)
- [x] Testes de isolamento de dados por barbershop_id
- [x] Testes de permissões granulares (admin vs super admin)
- [x] Testes de saudações personalizadas

## ✅ Fase 8: Dados de Teste e Documentação

- [x] Criar script de seed com Super Admin, Admins, Barbeiros e Clientes
- [x] Documentar credenciais de acesso
- [x] Documentar arquitetura e fluxos de permissão
- [x] Documentar guia de uso completo
- [x] Documentar hospedagem, banco de dados e configurações

## ✅ Fase 9: Edição de Barbearias e Perfil do Utilizador

- [x] Criar página de edição de barbearias com formulário completo
- [x] Adicionar botão de deletar barbearia com confirmação
- [x] Criar página de perfil do utilizador
- [x] Implementar formulário para mudar nome do utilizador
- [x] Atualizar saudação para exibir nome customizado
- [x] Testar edição de barbearias
- [x] Testar edição de perfil do utilizador

## ✅ Itens Opcionais (Não Bloqueantes)

- [ ] Implementar upload real de foto de perfil com S3 (opcional)
- [ ] Integração com Stripe para pagamentos (futura)
- [ ] Sistema de notificações por email (futura)
- [ ] Dashboard de analytics avançado (futura)
- [ ] Relatórios PDF exportáveis (futura)

---

**Status Geral**: ✅ **COMPLETO** - Sistema pronto para produção

**Versão**: 1.0.0  
**Data**: 19 de Abril de 2026  
**Testes**: 22/22 passando ✅


## ✅ Fase 10: Funcionalidades de Agendamento para Clientes

- [x] Criar página de agendamento de serviços para clientes
- [x] Implementar seleção de serviço com descrição e preço
- [x] Implementar seleção de barbeiro disponível
- [x] Implementar seleção de data e hora com disponibilidade
- [x] Criar procedure tRPC para criar agendamento
- [x] Implementar listagem de agendamentos do cliente
- [x] Implementar funcionalidade de reagendamento
- [x] Implementar funcionalidade de cancelamento
- [ ] Adicionar confirmação de agendamento por email (opcional)
- [x] Testar fluxos completos de agendamento


## Fase 11: Integração com WhatsApp, Instagram e TikTok

- [x] Criar tabela `social_media_settings` no schema para armazenar configurações
- [x] Adicionar campos: barbershop_id, whatsapp_number, whatsapp_messages, instagram_url, tiktok_url, enabled_buttons
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
- [x] Fazer checkpoint final com todas as funcionalidades
