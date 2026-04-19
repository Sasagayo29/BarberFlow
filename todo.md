# Project TODO

- [x] Definir a direção visual elegante e sofisticada da aplicação, incluindo tema global, tipografia, paleta e padrões de interface.
- [x] Estender o modelo de utilizadores para suportar os perfis Super Admin, Barbeiro Chef, Barbeiro Operacional e Cliente com permissões claramente separadas.
- [x] Modelar a base de dados para clientes, barbeiros, serviços, vínculos entre barbeiros e serviços, horários de funcionamento, disponibilidades individuais e agendamentos.
- [x] Implementar autenticação com login, cadastro de clientes com nome, telefone, e-mail e senha, e recuperação de senha.
- [x] Implementar regras de autorização no backend para garantir que cada perfil apenas acede às funcionalidades e dados pertinentes.
- [x] Implementar gestão de utilizadores pelo Super Admin e pelo Barbeiro Chef, incluindo criar, editar e excluir barbeiros e administradores elegíveis.
- [x] Implementar gestão de serviços com nome, descrição, preço, duração estimada e associação a barbeiros específicos.
- [x] Implementar sistema de agendamento com escolha de serviço, barbeiro, data e horário.
- [x] Implementar bloqueio automático e em tempo real de horários ocupados, evitando dupla marcação sem intervenção manual.
- [x] Implementar confirmação, cancelamento e reagendamento de agendamentos.
- [x] Implementar calendário com vistas por dia, semana e mês, incluindo agenda individual por barbeiro e destaque visual de horários livres e ocupados.
- [x] Implementar histórico de agendamentos e cortes acessível para clientes e barbeiros.
- [x] Implementar configuração de horários de funcionamento da barbearia e disponibilidade individual por barbeiro.
- [x] Implementar painel administrativo com dashboard de total de agendamentos, faturamento, serviços mais utilizados e relatórios básicos.
- [x] Implementar frontend responsivo com experiência distinta por perfil, incluindo login, área do cliente, agenda da equipa e área administrativa.
- [x] Escrever testes automatizados para regras críticas de autorização, disponibilidade e agendamento.
- [x] Validar o comportamento da aplicação no navegador e corrigir estados de erro, vazio e carregamento.
- [x] Criar checkpoint final do projeto após conclusão e validação.
- [x] Implementar e evidenciar o fluxo completo de recuperação de senha, incluindo redefinição com token e respetivos testes.
- [x] Adicionar e comprovar procedures e testes do dashboard para métricas administrativas e relatórios básicos.
- [x] Escrever testes automatizados para disponibilidade, conflitos de horários, criação, reagendamento e cancelamento de agendamentos.
- [x] Concluir a validação visual das páginas principais no navegador para a área de gestão e comprovar a separação restante por perfil através da navegação filtrada e dos testes de permissões implementados.
- [x] Adicionar estados explícitos de carregamento e erro nas páginas secundárias do frontend e revalidá-los visualmente.
- [x] Alinhar o escopo entregue do dashboard aos relatórios básicos implementados: resumo executivo, serviços mais utilizados e próximos atendimentos.
- [x] Adicionar testes Vitest para disponibilidade e listagem de slots, criação bem-sucedida de agendamento e reagendamento, complementando os testes já existentes de conflito e cancelamento.
- [x] Alinhar explicitamente o escopo final da gestão da equipa para arquivamento administrativo de utilizadores elegíveis, em vez de eliminação definitiva.

## Novos Requisitos - Multi-Tenancy e Customização

- [x] Criar tabela `barbershops` na base de dados com campos: id, name, status (ativo/inativo), owner_id, created_at, updated_at
- [x] Adicionar coluna `barbershop_id` às tabelas existentes (users, services, appointments, business_hours, availability_overrides) para suportar multi-tenancy
- [x] Implementar procedure backend para Super Admin criar novas barbearias
- [x] Implementar procedure backend para Super Admin ativar/desativar barbearias
- [x] Implementar filtro de dados por barbershop_id em todas as queries do backend
- [x] Atualizar frontend Home.tsx para exibir "Bem-vindo, [Nome do Utilizador]" em vez de "Bem-vindo, Utilizador"
- [x] Criar UI do Super Admin para gestão de barbearias (criar, listar, ativar/desativar)
- [x] Alterar formatação de moeda de EUR (€) para BRL (R$) em toda a aplicação
- [x] Implementar sistema de customização global com tabela `settings` (theme, colors, company_name, currency, etc.)
- [x] Criar página de Configurações para permitir customização de temas, cores, textos e outros parâmetros
- [x] Testar fluxos de multi-tenancy com múltiplas barbearias
- [x] Validar personalização de mensagens e moeda em toda a aplicação
- [x] Escrever testes Vitest para procedures de gestão de barbearias
