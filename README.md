# Biblio Frontend - GitHub Pages

Clone esta pasta como repositório do frontend.

## Configuração

1. GitHub repo > Settings > Pages > Source: GitHub Actions.
2. GitHub repo > Settings > Secrets and variables > Actions > Variables.
3. Crie variável:
   - `VITE_API_URL=https://xpwejczbdwjdvgjmxzsg.supabase.co/functions/v1/api`

## Local

```bash
cp .env.example .env
npm install
npm run dev
```

## Segurança

- Não coloque `SUPABASE_SERVICE_ROLE_KEY` aqui.
- `VITE_API_URL` é público.
- Rotas admin dependem JWT do backend Supabase.
