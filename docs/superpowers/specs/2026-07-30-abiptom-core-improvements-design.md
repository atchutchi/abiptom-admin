# Evolução do ABIPTOM Core

Data: 30 de Julho de 2026

Estado: desenho aprovado para planeamento

## 1. Objectivo

Evoluir o ABIPTOM Core de uma aplicação centrada no registo de operações para uma plataforma de gestão que transforme dados financeiros e operacionais em alertas, análises e acções concretas.

O trabalho deve preservar o funcionamento actual de facturação, pagamentos, despesas, folha salarial, dividendos, projectos, tarefas, stock, relatórios e chat.

## 2. Âmbito aprovado

O âmbito inclui:

1. Segurança e estabilidade sem MFA.
2. Qualidade dos dados e rastreabilidade.
3. Relatórios financeiros e operacionais com comparação e detalhe.
4. Painéis adaptados ao papel do utilizador.
5. Centro de alertas e acções pendentes.
6. Melhorias na gestão de projectos.
7. Melhorias no módulo de tarefas.
8. Integração simples com WhatsApp através do número +245 966 865 331.
9. Testes automatizados e documentação operacional.

## 3. Fora do âmbito

Não serão implementados nesta fase:

1. MFA obrigatório para `ca` ou `dg`.
2. Facebook, Instagram, TikTok ou LinkedIn.
3. Publicação automática em redes sociais.
4. Calendário editorial de publicações.
5. WhatsApp Cloud API.
6. Recepção de mensagens WhatsApp dentro da aplicação.
7. Chatbot ou respostas automáticas no WhatsApp.
8. Alterações à fórmula salarial sem aprovação separada.

## 4. Princípios de desenho

### 4.1 Informação antes de volume

Os relatórios devem começar com uma leitura executiva curta. O detalhe deve ficar disponível por aprofundamento até aos registos de origem. Uma página com mais números não é necessariamente mais útil.

### 4.2 Dados verificáveis

Cada indicador deve ter definição, período, fonte e regra de cálculo. Valores indisponíveis não devem ser inventados. O sistema deve mostrar avisos de qualidade quando faltarem relações necessárias.

### 4.3 Acções ligadas aos indicadores

Um alerta deve conduzir directamente ao cliente, factura, projecto, despesa, tarefa ou colaborador que precisa de intervenção.

### 4.4 Permissões em profundidade

O middleware protege rotas, mas cada acção do servidor deve validar sessão e papel. A interface não deve ser a única barreira de segurança.

### 4.5 Entregas faseadas

Cada fase deve ter migração isolada, testes, verificação visual e possibilidade de reversão. Não devem ser misturadas alterações financeiras críticas com melhorias visuais sem relação.

## 5. Fases de implementação

### Fase 1. Segurança e estabilidade

Objectivo: remover vulnerabilidades conhecidas e reduzir o risco de acessos ou operações indevidas.

Inclui:

1. Actualizar Next.js para uma versão corrigida compatível com a linha 15.5.
2. Actualizar dependências transitivas vulneráveis e validar os dois ficheiros de lock existentes.
3. Adicionar cabeçalhos de segurança, incluindo Content Security Policy, protecção contra enquadramento, `X-Content-Type-Options`, política de referência e política de permissões.
4. Manter HSTS e validar que PDFs, imagens, Supabase e downloads continuam funcionais.
5. Centralizar helpers de autorização para administração, finanças, coordenação e área pessoal.
6. Rever acções que usam `dbAdmin` e adicionar validações explícitas na fronteira da função.
7. Adicionar testes negativos por papel para operações sensíveis.
8. Implementar limites de tentativas persistentes para login, recuperação de palavra-passe, exportações e operações críticas.
9. Melhorar o registo de auditoria para alterações de papéis, salários, pagamentos, datas de pagamento, anulações, exportações, eliminações e falhas de autorização.
10. Adicionar uma área de consulta do histórico de auditoria apenas para `ca`.
11. Permitir revogação administrativa de sessões quando suportada de forma segura pelo Supabase.
12. Deixar de ignorar lint durante o build de produção.
13. Documentar e testar um restauro real de backup num ambiente isolado.

O MFA permanece excluído por decisão do utilizador.

### Fase 2. Contrato de dados e qualidade

Objectivo: garantir que os relatórios são explicáveis e comparáveis.

Inclui:

1. Criar definições centrais para facturado, recebido, em aberto, vencido, margem bruta, margem líquida, saldo de caixa e rentabilidade do projecto.
2. Reutilizar as mesmas definições no painel, relatórios, PDF e exportações.
3. Detectar facturas sem projecto, projectos sem ponto focal, tarefas sem contexto, despesas sem comprovativo e valores incompatíveis.
4. Criar um indicador de cobertura dos dados por relatório.
5. Mostrar a data e hora da última actualização.
6. Manter ligações dos indicadores para os registos que os compõem.
7. Criar testes de reconciliação para impedir divergências entre painel, relatório e exportação.

### Fase 3. Relatórios e inteligência de gestão

Objectivo: transformar os dados existentes em decisões mensais, trimestrais e anuais.

Inclui:

1. Comparação com período anterior e com o mesmo período do ano anterior.
2. Variação absoluta e percentual.
3. Relatório de antiguidade da dívida com intervalos de 0 a 30, 31 a 60, 61 a 90 e mais de 90 dias.
4. Rentabilidade por projecto com facturado, recebido, despesas directas, custo salarial atribuído e margem.
5. Rentabilidade e concentração por cliente.
6. Análise por serviço.
7. Previsão de caixa para 30, 60 e 90 dias baseada em vencimentos, despesas previstas e compromissos conhecidos.
8. Receita recorrente e receita pontual quando os dados permitirem uma classificação verificável.
9. Relatório de execução de projectos e desempenho de tarefas.
10. Relatório de qualidade dos dados.
11. Recomendações específicas com ligação ao registo que exige acção.
12. Exportação PDF e Excel com filtros, metodologia e período.

O relatório terá três níveis:

1. Resumo executivo.
2. Diagnóstico por área.
3. Detalhe dos registos de origem.

### Fase 4. Painéis e centro de alertas

Objectivo: apresentar a cada papel apenas a informação necessária para agir.

Painel de `ca` e `dg`:

1. Liquidez, margem, cobrança e concentração de clientes.
2. Projectos em risco.
3. Folha e despesas fora do padrão.
4. Alertas de segurança e qualidade de dados.

Painel de `coord`:

1. Facturas por cobrar.
2. Projectos e tarefas em atraso.
3. Validações pendentes.
4. Carga de trabalho da equipa.
5. Próximas entregas.

Painel de `staff`:

1. Tarefas actuais.
2. Prazos e correcções pedidas.
3. Submissões pendentes de validação.
4. Desempenho pessoal e recibos disponíveis.

Centro de alertas:

1. Facturas vencidas.
2. Tarefas atrasadas.
3. Projectos sem ponto focal.
4. Facturas pagas sem projecto.
5. Despesas sem comprovativo.
6. Folha salarial ainda não confirmada.
7. Backups ou crons com falhas.

Cada alerta terá severidade, responsável, data, estado e ligação para resolução.

### Fase 5. Gestão de projectos

Objectivo: oferecer uma visão única da saúde de cada projecto.

Inclui:

1. Indicadores de execução, tarefas atrasadas, facturado, recebido, por receber, despesas directas e margem.
2. Próxima entrega e data da última actividade.
3. Estado de risco calculado por regras explícitas.
4. Linha temporal com facturas, pagamentos, despesas, tarefas, mensagens e alterações relevantes.
5. Filtros por risco, ponto focal, cliente, estado e atraso.
6. Ordenação por urgência e impacto financeiro.
7. Ligações directas para as áreas relacionadas.

### Fase 6. Gestão de tarefas

Objectivo: melhorar planeamento, execução, validação e responsabilização.

Inclui:

1. Vista de lista, quadro por estado e calendário.
2. Tarefas recorrentes.
3. Subtarefas e listas de verificação.
4. Comentários e anexos com controlo de acesso.
5. Histórico de mudanças.
6. Notificações antes e depois do prazo.
7. Caixa de validações pendentes.
8. Carga de trabalho por colaborador.
9. Indicadores de cumprimento, atraso, aprovação, qualidade e correcções.
10. Modelos de tarefas operacionais reutilizáveis.

### Fase 7. WhatsApp simples

Objectivo: facilitar o contacto sem criar uma integração externa complexa.

Inclui:

1. Configurar o número oficial +245 966 865 331 numa definição central.
2. Adicionar botão de WhatsApp em clientes e contactos com número válido.
3. Criar mensagens predefinidas para cobrança, envio de factura, envio de recibo, lembrete e acompanhamento de projecto.
4. Abrir `wa.me` com destinatário e mensagem preenchida.
5. Nunca enviar automaticamente.
6. Pedir confirmação visual antes de abrir a conversa.
7. Registar opcionalmente no histórico do cliente que foi iniciada uma acção de contacto, sem afirmar que a mensagem foi enviada.
8. Não guardar tokens ou credenciais da Meta.
9. Normalizar números para formato internacional.
10. Não expor informação salarial, financeira interna ou dados de outros clientes na mensagem.

## 6. Arquitectura

As novas funcionalidades serão divididas em módulos pequenos:

1. `security`: autorização, limites, cabeçalhos e eventos de auditoria.
2. `analytics`: definições de métricas e agregações verificáveis.
3. `alerts`: regras, severidade, estado e resolução.
4. `reports`: composição dos relatórios a partir de `analytics`.
5. `projects/health`: cálculo da saúde e resumo financeiro do projecto.
6. `tasks/planning`: recorrência, subtarefas e carga de trabalho.
7. `whatsapp`: normalização de telefone e criação de ligações e mensagens.

O objectivo é reduzir a concentração actual de responsabilidades em ficheiros extensos, sobretudo na folha salarial e nos relatórios.

## 7. Dados novos previstos

As migrações poderão introduzir:

1. Eventos e falhas de segurança.
2. Limites de utilização por chave e janela temporal.
3. Alertas operacionais e estado de resolução.
4. Subtarefas e dependências.
5. Regras de recorrência.
6. Anexos e comentários de tarefas.
7. Modelos de tarefas.
8. Registos de contacto com cliente.

As migrações não apagarão dados actuais. Novos campos opcionais devem ser introduzidos antes de se tornarem obrigatórios.

## 8. Tratamento de erros

1. Erros de autorização devolvem mensagens genéricas ao utilizador e detalhes seguros ao registo interno.
2. Falhas de relatório identificam a fonte ou relação em falta.
3. Cálculos parciais mostram cobertura e não simulam valores ausentes.
4. Falhas ao abrir o WhatsApp não registam a mensagem como enviada.
5. Tarefas recorrentes usam chaves de idempotência para evitar duplicados.
6. Alertas repetidos são agrupados quando representam o mesmo problema.

## 9. Testes e verificação

Cada fase exige:

1. Testes unitários das regras.
2. Testes de autorização positiva e negativa.
3. Testes de integração das consultas e migrações.
4. Testes de reconciliação financeira.
5. Verificação de TypeScript e lint.
6. Build de produção.
7. Testes visuais nos principais ecrãs.
8. Testes de navegação por teclado nos fluxos alterados.
9. Verificação em desktop e telemóvel.
10. Plano de reversão quando existir migração ou mudança de comportamento.

## 10. Critérios de aceitação globais

O programa é considerado concluído quando:

1. Não existem vulnerabilidades de produção elevadas conhecidas no gestor de dependências.
2. Todas as operações sensíveis validam sessão e papel dentro da função.
3. Painel, relatórios e exportações usam as mesmas definições financeiras.
4. Indicadores permitem chegar aos registos de origem.
5. Relatórios mostram comparações e qualidade dos dados.
6. Cada papel recebe um painel adequado às suas responsabilidades.
7. Alertas conduzem a uma acção concreta.
8. Projectos apresentam execução e saúde financeira.
9. Tarefas suportam planeamento e validação com histórico.
10. O contacto por WhatsApp usa apenas ligações preparadas e confirmação humana.
11. Redes sociais, publicação automática e MFA permanecem fora do âmbito.
12. A suite de testes, TypeScript, lint e build termina sem erros.

## 11. Ordem de entrega

A ordem aprovada para planeamento é:

1. Segurança e estabilidade.
2. Contrato de dados e qualidade.
3. Relatórios e inteligência de gestão.
4. Painéis e centro de alertas.
5. Gestão de projectos.
6. Gestão de tarefas.
7. WhatsApp simples.

Cada fase terá plano próprio e validação antes da fase seguinte.
