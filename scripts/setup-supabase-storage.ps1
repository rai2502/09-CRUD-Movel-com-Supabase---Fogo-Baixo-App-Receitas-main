$ErrorActionPreference = 'Stop'

$projectRef = Read-Host 'Informe o Project Ref (Supabase > Project Settings > General)'
if ([string]::IsNullOrWhiteSpace($projectRef)) {
  throw 'O Project Ref é obrigatório.'
}

Write-Host 'A CLI abrirá o fluxo de login do Supabase, se necessário.'
npx supabase login
if ($LASTEXITCODE -ne 0) { throw 'Falha ao autenticar na Supabase CLI.' }

npx supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { throw 'Falha ao vincular o projeto Supabase.' }

Write-Host 'A próxima etapa aplica a migration que cria o bucket e as policies.'
$securePassword = Read-Host 'Senha do banco de dados Supabase (entrada oculta)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:SUPABASE_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npx supabase db push --remote
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar migrations no projeto remoto.' }
}
finally {
  Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $securePassword.Dispose()
}

Write-Host 'Bucket fotos-camera e policies configurados.'
