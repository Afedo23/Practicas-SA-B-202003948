import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type Usuario {
    id: ID!
    username: String!
    rol: String!
  }

  type LoginResult {
    token: String!
    rol: String!
  }

  type Query {
    me(token: String!): Usuario
  }

  type Mutation {
    login(username: String!, password: String!): LoginResult
  }
`;
