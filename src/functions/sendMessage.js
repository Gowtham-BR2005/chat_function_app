const { app } = require("@azure/functions");
const { WebPubSubServiceClient } = require("@azure/web-pubsub");
const { messagesContainer } = require("./utils/cosmosClient");
const { verifyToken } = require("./utils/authMiddleware");
const { v4: uuidv4 } = require("uuid");

app.http("sendMessage", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "messages",
  handler: async (req, context) => {
    try {
      const user = await verifyToken(req);
      const { type, content, toUserId, groupId } = await req.json();

      const partitionKey = type === "direct"
        ? `dm_${[user.oid, toUserId].sort().join("_")}`
        : `group_${groupId}`;

      const message = {
        id: uuidv4(), type, content,
        senderId: user.oid, senderName: user.name,
        timestamp: new Date().toISOString(), partitionKey,
        ...(type === "direct" && { toUserId }),
        ...(type === "group" && { groupId }),
      };

      await messagesContainer.items.create(message);
      context.log("Saved to CosmosDB OK");

      const channel = type === "direct" ? `user_${toUserId}` : `group_${groupId}`;

      const pubSubClient = new WebPubSubServiceClient(
        process.env.PUBSUB_CONNECTION,
        process.env.PUBSUB_HUB
      );
      const hubClient = pubSubClient.group(channel);
      await hubClient.sendToAll(JSON.stringify(message), { contentType: "application/json" });
      context.log("PubSub broadcast OK to:", channel);

      return { status: 200, jsonBody: { success: true, message } };
    } catch (err) {
      context.log("sendMessage error:", err.message);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
