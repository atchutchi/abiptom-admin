# Verificação de restauro dos backups

Este procedimento confirma se um backup da ABIPTOM pode ser restaurado e lido. Deve ser executado trimestralmente e depois de qualquer alteração relevante no esquema da base de dados.

Nunca uses a base de produção como destino. O comando recusa um destino igual a `DATABASE_URL` ou `DATABASE_DIRECT_URL`. O nome da base isolada também tem de conter `restore`, `verify` ou `test`.

## Pré-requisitos

1. PostgreSQL com `psql` e `pg_restore` disponíveis no `PATH`.
2. Um dump `.sql`, `.dump` ou `.backup` guardado localmente.
3. Uma instância PostgreSQL isolada e descartável.
4. Dependências do projecto instaladas com `pnpm install`.

## Criar a base isolada

Exemplo local:

```powershell
createdb abiptom_restore_verify
$env:BACKUP_RESTORE_DATABASE_URL='postgresql://postgres:SENHA@localhost:5432/abiptom_restore_verify'
```

Se `DATABASE_URL` e `DATABASE_DIRECT_URL` estiverem definidos no terminal, o script compara o servidor, a porta e o nome da base. As credenciais diferentes não tornam a mesma base segura.

## Executar a verificação

Consulta primeiro a ajuda:

```powershell
npm.cmd run backup:verify-restore -- --help
```

Executa o restauro com um caminho absoluto:

```powershell
npm.cmd run backup:verify-restore -- --file 'C:\Backups\abiptom-backup-2026-07-30.sql'
```

Para um dump SQL, o comando usa `psql` com interrupção no primeiro erro. Para um dump binário, usa `pg_restore` e limpa apenas os objectos da base isolada antes do restauro.

## Validar o resultado

O comando termina com código zero apenas quando encontra e conta estas tabelas:

1. `users`
2. `clients`
3. `projects`
4. `invoices`
5. `expenses`
6. `salary_periods`
7. `audit_log`

O relatório apresenta o destino sem utilizador nem palavra-passe, o tamanho do dump e a contagem por tabela. Confirma que as contagens são plausíveis para a data do backup. Uma contagem zero pode ser válida numa tabela recente, mas deve ser investigada quando contradiz a operação conhecida.

## Eliminar a base temporária

Depois de guardar o resultado da verificação, termina ligações abertas e elimina apenas a base isolada criada para este teste:

```powershell
dropdb abiptom_restore_verify
Remove-Item Env:BACKUP_RESTORE_DATABASE_URL
```

Confirma o nome exacto antes de executar `dropdb`. Não uses variáveis genéricas ou padrões para eliminar bases.

## Registo operacional

Guarda a data, o nome do ficheiro, o tamanho, as contagens, o resultado e o responsável pela verificação. Não guardes a URL com credenciais. Se o restauro falhar, preserva o dump e o erro, corrige o processo de backup e repete a verificação antes de considerar o backup utilizável.
