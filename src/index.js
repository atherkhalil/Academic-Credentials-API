import express from "express";
import { ApolloServer } from "apollo-server-express";
import { GraphQLUpload, graphqlUploadExpress } from "graphql-upload";
import cors from "cors";
import path from "path";
//must use lodash for project
import _ from "lodash";
//*For Subscriptions
import { createServer } from "http";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import { PubSub } from "graphql-subscriptions";
const pubsub = new PubSub();
// *import files
import { connectToDB, PORT } from "./utils";
import { verifyToken } from "./auth/jwt/jwt";
// * importing resolvers and typeDefs
import resolvers from "./graphql/resolvers";
import moeTypeDefs from "./graphql/typeDefs/moe.graphql";
import issuerTypeDefs from "./graphql/typeDefs/issuer.graphql";
import learnerTypeDefs from "./graphql/typeDefs/learner.graphql";
import programTypeDefs from "./graphql/typeDefs/program.graphql";
import notificationsTypeDefs from "./graphql/typeDefs/notifications.graphql";
import equivalencyTypeDefs from "./graphql/typeDefs/equivalency.graphql";
import { restVerify } from "./auth/jwt/jwt";
import { importLearner } from "./services/helper";

// * DB Connection
connectToDB();
// Create the schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({
  typeDefs: [
    moeTypeDefs,
    issuerTypeDefs,
    learnerTypeDefs,
    programTypeDefs,
    notificationsTypeDefs,
    equivalencyTypeDefs,
  ],
  resolvers,
});
// ...
// Create an Express app and HTTP server; we will attach both the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
app.use(cors());

app.use(
  graphqlUploadExpress({
    maxFileSize: 500000000, //50 MB
    maxFiles: 20,
  })
);

const funtio = (req) => {
  console.log(req.body, "params");
};

app.use("/files", express.static(path.join(__dirname, "/assets/images")));
app.use("/file", express.static(path.join(__dirname, "/assets/files")));

app.use(
  express.json({
    extended: true,
    limit: "50mb",
  })
);
app.post("/importLearners", restVerify, importLearner);
// app.use(express.json({ limit: "50mb" }));
// app.use(json({ limit: "50mb" }));

const httpServer = createServer(app);
// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});
// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer(
  {
    schema,
    context: {
      pubsub,
    },
    onConnect: (ctx) => {
      console.log("socket server Connected");
    },
    onSubscribe: (ctx, msg) => {
      // console.log("Subscribe", { ctx, msg });
    },
    onNext: (ctx, msg, args, result) => {
      // console.debug("Next", { ctx, msg, args, result });
    },
    onError: (ctx, msg, errors) => {
      // console.error("Error", { ctx, msg, errors });
    },
    onComplete: (ctx, msg) => {
      // console.log("Complete", { ctx, msg });
    },
  },
  wsServer
);

// Set up ApolloServer.
const server = new ApolloServer({
  schema,
  playground: true,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
  context: {
    pubsub,
  },

  context: async ({ req }) => {
    let currentUser;
    let token;
    if (req.headers.authorization) {
      token = req.headers.authorization;
      currentUser = await verifyToken(token, "accessToken");
      return {
        user: currentUser,
        pubsub: pubsub,
      };
    }
    return pubsub;
  },
});
const main = async () => {
  await server.start();
  server.applyMiddleware({ app });
  // Now that our HTTP server is fully set up, we can listen to it.
  httpServer.listen(PORT, () => {
    console.log(
      `Server is now running on http://localhost:${PORT}${server.graphqlPath}`
    );
  });
};

main();
