# Fogo Baixo — receitas com Capacitor e Supabase

O Fogo Baixo é um caderno digital de receitas feito com React, Vite e Capacitor. Ele combina receitas culinárias com recursos nativos para acompanhar o preparo: captura e envio de fotos ao Supabase Storage e lembretes locais que avisam quando é hora de voltar à cozinha.

### O que o app oferece

- Catálogo de receitas e cadastro conectado ao Supabase Database.
- Captura de foto pela câmera/galeria do Android e envio ao bucket público `fotos-camera`.
- Notificação imediata e lembretes locais programados para 5, 10 ou 15 segundos.
- Consulta e solicitação de permissão de notificações, com controle de alarmes exatos no Android.
- Cancelamento dos lembretes pendentes criados pelo app.

## APK Android

[Baixar APK de depuração](downloads/fogo-baixo-camera-debug.apk)

## Requisitos

- Node.js 20 ou superior e npm
- Projeto Supabase com as tabelas usadas pelo app
- Para Android: Android Studio e SDK Android

## Configurar e executar

```bash
npm install
cp .env.example .env.local
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` com os valores de **Project Settings → API** no Supabase. No PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.

```bash
npm run dev
```

O `.env.local` está no `.gitignore`. Nunca coloque uma `service_role` key no aplicativo cliente nem faça commit de credenciais.

## Fotos no Supabase Storage

Para criar o bucket e as policies pelo terminal no Windows, execute na raiz do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-supabase-storage.ps1
```

O script pede o Project Ref, autentica/vincula a Supabase CLI e aplica a migration em `supabase/migrations/`. A CLI solicitará confirmação antes de alterar o projeto remoto. O bucket público `fotos-camera` aceita imagens de até 10 MB e permite upload/listagem anônimos apenas na pasta `capturas/`.

O app converte o `webPath` retornado por `@capacitor/camera` em `Blob`, envia o arquivo para `capturas/` com `supabase.storage.from('fotos-camera').upload()` e exibe a URL obtida por `getPublicUrl()`.

Alternativamente, crie manualmente bucket e policies no painel. A migration usa as seguintes policies de INSERT e SELECT:

```sql
create policy "Aula: permitir upload de fotos"
on storage.objects for insert to anon
with check (bucket_id = 'fotos-camera');

create policy "Aula: permitir leitura/listagem de fotos"
on storage.objects for select to anon
using (bucket_id = 'fotos-camera');
```

Essas permissões públicas são adequadas apenas para demonstração: qualquer pessoa com a anon key pode enviar arquivos ao bucket. Para uso real, exija autenticação e restrinja as policies por usuário. Um bucket público permite leitura dos objetos por URL; a policy SELECT também é necessária para listagem via API.

Toque em **Fotografar meu prato**, capture ou selecione a imagem e aguarde a confirmação. No navegador, o plugin usa o seletor de imagem; no Android, a câmera/galeria nativa. Depois de alterar plugins nativos:

```bash
npm run build
npx cap sync android
npx cap open android
```

Confira o bucket `fotos-camera` no painel e a imagem exibida na seção da câmera. É preciso configurar o bucket e as policies no seu próprio projeto Supabase antes do upload.

## Notificações locais

O app usa `@capacitor/local-notifications`. A seção **Lembretes do Fogo Baixo** permite consultar e solicitar a permissão, disparar um aviso imediato e programar um lembrete. O desafio extra implementado permite cancelar os lembretes pendentes do app.

No Android 13 ou superior, autorize as notificações quando o sistema solicitar. Para o agendamento preciso em Android 12 ou superior, permita também **Alarmes e lembretes** nas configurações do app. O navegador mostra a interface, mas a API de notificações locais deve ser validada no app instalado em um dispositivo Android.

Depois de instalar ou atualizar um plugin nativo:

```bash
npm run build
npx cap sync android
```

Abra o projeto Android Studio e instale/execute no celular. Para testar, toque em **Permitir notificações**, depois em **Avisar agora**; em seguida escolha 5, 10 ou 15 segundos e toque em **Agendar lembrete**. Minimize o app para conferir o aviso na tela do aparelho. O botão **Cancelar lembretes pendentes** remove apenas os agendamentos criados pelo Fogo Baixo.

## Evidências da atividade

Para concluir a entrega, grave a tela do celular mostrando a permissão, o aviso imediato e um lembrete agendado. Adicione a captura e o GIF/vídeo ao repositório, por exemplo em `docs/evidencias/`, e insira os links nesta seção. As evidências precisam ser capturadas no dispositivo real; o navegador de desenvolvimento não substitui essa gravação.

## Estrutura de dados

O **Database** guarda dados estruturados como nome, categoria e tempo de uma receita em colunas e linhas. O **Storage** guarda arquivos binários como fotos; a aplicação pode armazenar no Database a URL/caminho do arquivo para relacioná-lo a uma receita.

## Scripts

- `npm run dev` — servidor local Vite
- `npm run build` — build web para `www/dist`
- `npm run sync` — sincronização Capacitor
- `npm run android` — abrir projeto Android Studio
