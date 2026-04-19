# Barbearia Gestão - TODO

## Fase 1: Schema com Camadas de Usuários

- [x] Atualizar enum de roles: super_admin, barber_admin, barber_owner, barber_staff, client
- [x] Adicionar coluna `barbershop_id` na tabela `users` (FK para barbershops)
- [x] Adicionar coluna `created_by_user_id` na tabela `users` (quem criou o usuário)
- [x] Criar índices para queries de filtro por barbershop_id
- [x] Gerar e aplicar migração SQL

## Fase 2: Backend - Procedures tRPC

- [x] Criar procedures para CRUD de barbearias (create, read, update, delete, list)
- [x] Criar procedures para gestão de equipa (create user, update role, list team, deactivate)
- [x] Implementar validações de permissões em cada procedure
- [ ] Adicionar procedures para saudações personalizadas por usuário
- [ ] Testar todas as procedures com permissões corretas

## Fase 3: Isolamento de Dados

- [ ] Filtrar serviços por barbershop_id
- [ ] Filtrar agendamentos por barbershop_id
- [ ] Filtrar equipa por barbershop_id (admin vê sua equipa, super admin vê tudo)
- [ ] Filtrar configurações por barbershop_id
- [ ] Validar que usuários só acessam dados de sua barbearia

## Fase 4: UI - CRUD de Barbearias

- [ ] Criar página de edição de barbearia (update)
- [ ] Criar página de listagem com ações (edit, delete, toggle status)
- [ ] Implementar confirmação de exclusão
- [ ] Adicionar formulário de criação com validações
- [ ] Adicionar indicadores visuais de status (ativa/inativa)

## Fase 5: UI - Gestão de Equipa

- [ ] Criar página de gestão de equipa por barbearia
- [ ] Implementar formulário de criação de usuário (admin cria barbeiros)
- [ ] Adicionar listagem de equipa com ações (edit, deactivate)
- [ ] Implementar filtro de roles
- [ ] Adicionar indicadores de quem criou cada usuário

## Fase 6: Saudações Personalizadas

- [ ] Atualizar Home para exibir saudação personalizada do usuário
- [ ] Adicionar saudação personalizada por barbearia
- [ ] Implementar fallback para usuários sem barbearia
- [ ] Adicionar mensagem de boas-vindas customizável por barbearia

## Fase 7: Testes Vitest

- [ ] Testes de CRUD de barbearias com permissões
- [ ] Testes de gestão de equipa (create, update, list, deactivate)
- [ ] Testes de isolamento de dados por barbershop_id
- [ ] Testes de permissões granulares (admin vs super admin)
- [ ] Testes de saudações personalizadas

## Fase 8: Dados de Teste e Documentação

- [ ] Criar script de seed com Super Admin, Admins, Barbeiros e Clientes
- [ ] Documentar credenciais de acesso
- [ ] Documentar arquitetura e fluxos de permissão
- [ ] Documentar guia de uso completo
- [ ] Documentar hospedagem, banco de dados e configurações


## Fase 4: Edição de Barbearias e Perfil do Utilizador

- [x] Criar página de edição de barbearias com formulário completo
- [x] Adicionar botão de deletar barbearia com confirmação
- [x] Criar página de perfil do utilizador
- [x] Implementar formulário para mudar nome do utilizador
- [ ] Implementar upload de foto de perfil (placeholder adicionado)
- [x] Atualizar saudação para exibir nome customizado
- [x] Usar procedure tRPC users.update para atualizar perfil do utilizador
- [x] Usar procedure tRPC barbershops.update para atualizar dados da barbearia
- [x] Testar edição de barbearias
- [x] Testar edição de perfil do utilizador
- [x] Fazer checkpoint final com todas as funcionalidades
