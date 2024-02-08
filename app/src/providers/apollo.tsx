import React, { ReactElement, ReactNode } from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  from,
  ApolloLink,
  FetchResult,
  Observable,
  Operation,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

import { getOperationAST, GraphQLError, print } from "graphql";
import { Client, createClient } from "graphql-ws";

// loadDevMessages();
// loadErrorMessages();

let wsClient: Client | null = null;
const ROOT_URL = import.meta.env.VITE_GRAPHQL_API_URL;

class WebSocketLink extends ApolloLink {
  public request(operation: Operation): Observable<FetchResult> {
    return new Observable((sink) => {
      if (!wsClient) {
        sink.error(new Error("No websocket connection"));
        return;
      }
      return wsClient.subscribe<FetchResult>(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: (err) => {
            if (err instanceof Error) {
              sink.error(err);
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : ""
                )
              );
            } else if (Array.isArray(err)) {
              sink.error(
                new Error(
                  (err as GraphQLError[])
                    .map(({ message }) => message)
                    .join(", ")
                )
              );
            } else {
              console.error(
                "Error was neither a list nor an instanceof Error?",
                err
              );
              sink.error(
                new Error(`Unknown error occurred in the websocket client.`, {
                  cause: err,
                })
              );
            }
          },
        }
      );
    });
  }
}

export default function PostgresApolloProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const client = React.useMemo(() => {
    const httpLink = new HttpLink({
      uri: ROOT_URL,
    });

    const url = ROOT_URL.replace(/^https/, "wss");
    wsClient = createClient({
      url,
      connectionParams: async () => {
        return {
          headers: {
            // TODO: Add authentication headers here
            // authorization:
          },
        };
      },
    });

    const wsLink = new WebSocketLink();

    // Using the ability to split links, you can send data to each link
    // depending on what kind of operation is being sent.
    const mainLink = split(
      // split based on operation type
      ({ query, operationName }) => {
        const op = getOperationAST(query, operationName);
        return (op && op.operation === "subscription") || false;
      },
      wsLink,
      httpLink
    );

    const authLink = setContext(async (_, { headers }) => {
      return {
        headers: {
          ...headers,

          // TODO: Add authentication headers here
          // authorization: token ? `Bearer ${token}` : "",
        },
      };
    });

    return new ApolloClient({
      link: from([authLink, mainLink]),
      cache: new InMemoryCache({
        typePolicies: {
          Query: {
            queryType: true,
          },
        },
      }),
      connectToDevTools: true,
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
