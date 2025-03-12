# Mr Fit Blu Control

Sistema de controle de usuários desenvolvido para Mr Fit Blumenau.

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

### Backend

API REST desenvolvida com:
- Node.js
- Express
- MongoDB
- JWT para autenticação
- TypeScript

[Documentação do Backend](./backend/README.md)

### Frontend

Interface web desenvolvida com:
- React
- TypeScript
- Material-UI
- React Query
- React Router DOM

[Documentação do Frontend](./frontend/README.md)

## Pré-requisitos

- Node.js (versão 14 ou superior)
- MongoDB
- npm ou yarn

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/mrfitblucontrol.git
cd mrfitblucontrol
```

2. Instale as dependências do backend:
```bash
cd backend
npm install
```

3. Instale as dependências do frontend:
```bash
cd ../frontend
npm install
```

## Configuração

1. Backend:
   - Crie um arquivo `.env` na pasta `backend` com as configurações necessárias
   - Exemplo de `.env`:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/mrfitblucontrol
   JWT_SECRET=sua_chave_secreta
   ```

2. Frontend:
   - Crie um arquivo `.env` na pasta `frontend`
   - Exemplo de `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:3001/api
   ```

## Executando o Projeto

1. Inicie o backend:
```bash
cd backend
npm run dev
```

2. Em outro terminal, inicie o frontend:
```bash
cd frontend
npm start
```

O backend estará disponível em `http://localhost:3001` e o frontend em `http://localhost:3000`.

## Funcionalidades

- Autenticação de usuários
- Gerenciamento de usuários (CRUD)
- Controle de acesso baseado em papéis (admin/user)
- Registro de logs de ações
- Interface responsiva
- Alteração de senha no primeiro acesso

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das mudanças (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 