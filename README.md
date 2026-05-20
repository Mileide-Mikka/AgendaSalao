# 💈 BeautyFlow - Sistema de Agendamento para Salão de Beleza
### Projeto de Extensão I - Curso de Análise e Desenvolvimento de Sistemas (Faculdade Anhanguera)

Este projeto consiste em uma API REST robusta desenvolvida para solucionar um problema real de gestão e organização de tempo enfrentado por microempreendedores locais do nicho de estética e beleza (salões, barbearias e clínicas de manicure) inseridos na nossa comunidade.

## 🎯 Objetivo Social e Contexto de Extensão
Alinhado com o **Programa de Contexto à Comunidade**, o sistema substitui as tradicionais e ineficientes agendas de papel por um motor digital automatizado de horários. Isso otimiza o fluxo de caixa, previne o desgaste na recepção por duplicidade de horários e capacita o comércio local através da inserção de tecnologias modernas de mercado.

## 🛠️ Tecnologias Utilizadas
- **Runtime:** Node.js v18+ / Yarn
- **Framework Principal:** NestJS (Arquitetura modular de alto desempenho)
- **Modelagem e ORM:** Prisma Client & Migrations (v5.22 para máxima estabilidade)
- **Validação e Tipagem Estrita:** Zod & nestjs-zod
- **Banco de Dados Relacional:** PostgreSQL
- **Linguagem:** TypeScript

## 🧠 Algoritmo de Prevenção de Concorrência (Anti-Choque de Horários)
O coração da aplicação reside na regra de negócio contida no `AppointmentsService`. Antes de consolidar qualquer agendamento, o sistema calcula dinamicamente o horário de término (`endTime`) com base na duração em minutos cadastrada no serviço selecionado e executa uma busca condicional cruzando dados com operadores lógicos relacionais no banco. Se houver qualquer sobreposição parcial ou completa de horários na agenda do profissional escolhido, a requisição é abortada com o disparo de uma `409 ConflictException`.