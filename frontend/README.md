# Mr Fit Blu Control - Frontend

Este é o frontend do Mr Fit Blu Control, desenvolvido com React, TypeScript e Material-UI.

## Tecnologias Utilizadas

- React
- TypeScript
- Material-UI
- React Query
- React Router DOM
- Axios
- Formik
- Yup

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

## Configuração

1. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Executando o Projeto

```bash
npm start
# ou
yarn start
```

O projeto será executado em modo de desenvolvimento em [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

- `src/components`: Componentes reutilizáveis
- `src/contexts`: Contextos da aplicação (AuthContext)
- `src/pages`: Páginas da aplicação
- `src/routes`: Configuração de rotas
- `src/services`: Serviços de API
- `src/styles`: Estilos globais
- `src/types`: Tipos TypeScript
- `src/config`: Configurações da aplicação

## Funcionalidades

- Autenticação de usuários
- Gerenciamento de usuários (apenas para administradores)
- Alteração de senha
- Visualização de logs de usuários
- Layout responsivo
- Proteção de rotas baseada em papéis

## Scripts Disponíveis

- `npm start`: Inicia o servidor de desenvolvimento
- `npm build`: Cria a versão de produção
- `npm test`: Executa os testes
- `npm run eject`: Ejeta as configurações do Create React App
