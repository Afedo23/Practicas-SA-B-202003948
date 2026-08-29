import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type Solicitud {
    id: ID!
    titulo: String!
    areaSolicitante: String!
    prioridad: String!
    costoEstimado: Float!
    estado: String!
    creadaPor: String!
  }

  type Query {
    solicitudes: [Solicitud!]!
    solicitud(id: ID!): Solicitud
  }

  input NuevaSolicitudInput {
    titulo: String!
    areaSolicitante: String!
    prioridad: String!
    costoEstimado: Float!
    creadaPor: String!
  }

  type Mutation {
    crearSolicitud(input: NuevaSolicitudInput!): Solicitud!
    cambiarEstado(id: ID!, estado: String!): Solicitud
  }
`;
