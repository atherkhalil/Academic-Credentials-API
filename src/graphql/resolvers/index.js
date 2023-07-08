import moeResolvers from "./moe.resolvers";
import issuerResolvers from "./issuer.resolver";
import learnerResolver from "./learner.resolver";
import { GraphQLUpload, graphqlUploadExpress } from "graphql-upload";
const { GraphQLJSON } = require("graphql-scalars");

module.exports = {
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,
  Query: {
    ...moeResolvers.Query,
    ...issuerResolvers.Query,
    ...learnerResolver.Query,
  },
  Mutation: {
    ...moeResolvers.Mutation,
    ...issuerResolvers.Mutation,
    ...learnerResolver.Mutation,
  },
  Subscription: {
    // ...moeResolvers.Subscription,
    ...issuerResolvers.Subscription,
  },
};
