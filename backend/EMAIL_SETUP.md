# Configuração de Email

## Email de Aprovação de Curso

Quando um admin aprova um curso ou comprovante de pagamento, um email automático é enviado ao usuário informando que:
- A inscrição foi aprovada
- O usuário tem acesso completo ao curso
- Informações sobre o app mobile Zenda
- Link para acessar a área do aluno

## Configuração

### Desenvolvimento (Console Backend)

Por padrão, em desenvolvimento, os emails são exibidos no console. Não é necessária configuração adicional.

### Produção (SMTP)

Configure as seguintes variáveis de ambiente no arquivo `.env`:

```env
# Email Backend (use 'django.core.mail.backends.smtp.EmailBackend' para SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Configurações SMTP (exemplo para Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app
DEFAULT_FROM_EMAIL=Rubiane Joaquim <noreply@rubianejoaquim.com>

# URL do Frontend (para links no email)
FRONTEND_URL=https://rubianejoaquim.com
```

### Gmail - Senha de App

Se usar Gmail, você precisa criar uma "Senha de App":

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "App" e "Outro (nome personalizado)"
3. Digite "Django" ou outro nome
4. Clique em "Gerar"
5. Use a senha gerada em `EMAIL_HOST_PASSWORD`

### Outros Provedores SMTP

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=sua-api-key-sendgrid
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_HOST_USER=postmaster@seu-dominio.mailgun.org
EMAIL_HOST_PASSWORD=sua-senha-mailgun
```

#### AWS SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=sua-access-key-id
EMAIL_HOST_PASSWORD=sua-secret-access-key
```

## Template de Email

O template HTML está localizado em:
`backend/courses/templates/emails/enrollment_approved.html`

Você pode personalizar o template editando este arquivo.

## Testando

Para testar o envio de email em desenvolvimento:

1. Configure `EMAIL_BACKEND` para console:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   ```

2. Aprove um enrollment ou payment proof no admin

3. Verifique o console do Django - o email será exibido lá

## Troubleshooting

### Email não está sendo enviado

1. Verifique se as variáveis de ambiente estão configuradas corretamente
2. Verifique os logs do Django para erros
3. Teste com console backend primeiro
4. Verifique se o servidor SMTP está acessível

### Email vai para spam

1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um provedor de email confiável (SendGrid, Mailgun, AWS SES)
3. Evite palavras que podem ser consideradas spam
4. Use um endereço de email válido em `DEFAULT_FROM_EMAIL`
