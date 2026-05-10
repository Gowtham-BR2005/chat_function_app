const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION);
const db = client.database(process.env.COSMOS_DB);

// cosmosClient.js — add this line
module.exports = {
    messagesContainer: db.container("messages"),
    groupsContainer: db.container("groups"),
    usersContainer: db.container("users"),
};