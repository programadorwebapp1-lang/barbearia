# Sistema de Gestão Médico

Aplicação Next.js com autenticação por perfil, MongoDB/Mongoose, painel de admin, médico e paciente.

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Preencha `MONGODB_URI`, `JWT_SECRET` e `NEXT_PUBLIC_APP_URL`.
3. Rode `npm install`.
4. Rode `npm run dev`.

### Mercado Pago

Para conectar a conta da barbearia, configure:

```env
MERCADO_PAGO_CLIENT_ID=
MERCADO_PAGO_CLIENT_SECRET=
MERCADO_PAGO_REDIRECT_URI=http://localhost:3000/api/integrations/mercadopago/callback
MERCADO_PAGO_TOKEN_ENCRYPTION_KEY=
```

O administrador acessa `Integrações -> Mercado Pago`, clica em `Conectar Mercado Pago` e autoriza a própria conta. O token autorizado fica salvo no banco de forma criptografada e o sistema usa essa conta para Pix de serviços e produtos.

### Integração com o bot da clínica

Para os lembretes automáticos, configure:

```env
BOT_CLINICA_URL=https://bot-clinica.onrender.com
BOT_CLINICA_TOKEN=token_do_bot_clinica
CLINIC_NAME=Clínica
```

Opcionalmente, o sistema pode disparar o sweep manual de lembretes em:

```http
GET /api/reminders/appointments
```

Se `REMINDER_CRON_TOKEN` estiver definido, envie também:

```http
Authorization: Bearer <REMINDER_CRON_TOKEN>
```

O sweep automático também roda no processo Node do app, então o endpoint manual fica como apoio para testes ou execução externa.

## Build

Use `npm run build` para validar a compilação antes do deploy na Vercel.
